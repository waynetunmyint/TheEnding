package api

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"
)

func (s *Server) adminRoutes() {
	s.handle("GET /api/admin/me", staff, "", s.getAdminMe)
	s.handle("GET /api/admin/dashboard", staff, "", s.getDashboard)

	s.handle("GET /api/admin/users", staff, "", s.getAdminUsers)
	s.handle("GET /api/admin/users/{id}", staff, "", s.getAdminUser)
	s.handle("POST /api/admin/users/{id}/coins", staff, "users", s.postAdjustCoins)
	s.handle("POST /api/admin/users/{id}/ban", staff, "users", s.postBan)

	s.handle("GET /api/admin/payments", staff, "", s.getAdminPayments)
	s.handle("POST /api/admin/payments/{order}/recheck", staff, "payments", s.postRecheck)

	s.handle("GET /api/admin/comments", staff, "", s.getAdminComments)
	s.handle("POST /api/admin/comments/{id}", staff, "comments", s.postModerate)

	s.handle("GET /api/admin/monetization", staff, "", s.getMonetization)
	s.handle("PUT /api/admin/monetization", staff, "settings", s.putMonetization)

	s.handle("GET /api/admin/notifications", staff, "", s.getCampaigns)
	s.handle("POST /api/admin/notifications", staff, "notify", s.postCampaign)
	s.handle("POST /api/admin/notifications/test", staff, "notify", s.postTestNotification)
	s.handle("DELETE /api/admin/notifications/{id}", staff, "notify", s.deleteCampaign)

	s.handle("GET /api/admin/settings", staff, "", s.getAdminSettings)
	s.handle("PUT /api/admin/settings", staff, "settings", s.putAdminSettings)
	s.handle("POST /api/admin/admins", staff, "settings", s.postAdmin)
	s.handle("PATCH /api/admin/admins/{id}", staff, "settings", s.patchAdmin)

	s.adminContentRoutes()
}

func (s *Server) audit(ctx context.Context, q querier, who *User, what string) error {
	_, err := q.ExecContext(ctx, "INSERT INTO audit (admin_id, who, what, created_at) VALUES (?, ?, ?, ?)", who.ID, who.Name, what, s.unix())
	return err
}

func (s *Server) count(ctx context.Context, query string, args ...any) (int, error) {
	var n int
	err := s.db.QueryRowContext(ctx, query, args...).Scan(&n)
	return n, err
}

func (s *Server) getAdminMe(r *Req) (any, error) {
	ctx := r.Context()
	pending, err := s.count(ctx, "SELECT COUNT(*) FROM payments WHERE status = 'Pending'")
	if err != nil {
		return nil, err
	}
	reported, err := s.count(ctx, "SELECT COUNT(*) FROM comments WHERE state = 'Reported'")
	if err != nil {
		return nil, err
	}
	perms := []string{}
	for _, p := range []string{"content", "notify", "users", "payments", "comments", "settings"} {
		if roleAllows(r.User.Role, p) {
			perms = append(perms, p)
		}
	}
	return map[string]any{
		"id": r.User.ID, "name": r.User.Name, "email": r.User.Email, "role": r.User.Role, "perms": perms,
		"badges": map[string]int{"payments": pending, "comments": reported},
	}, nil
}

// ---------- dashboard ----------

func (s *Server) getDashboard(r *Req) (any, error) {
	ctx := r.Context()
	now := s.now().In(s.loc)
	midnight := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, s.loc)
	since := midnight.Unix()
	switch r.URL.Query().Get("range") {
	case "14d":
		since = midnight.AddDate(0, 0, -13).Unix()
	case "90d":
		since = midnight.AddDate(0, 0, -89).Unix()
	}
	var revenue, newUsers, vip, unlocks int
	queries := []struct {
		dst   *int
		query string
		args  []any
	}{
		{&revenue, "SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE status = 'Paid' AND created_at >= ?", []any{since}},
		{&newUsers, "SELECT COUNT(*) FROM users WHERE via != 'Guest' AND status != 'Deleted' AND created_at >= ?", []any{since}},
		{&vip, "SELECT COUNT(*) FROM users WHERE vip_until > ? AND status = 'Active'", []any{s.unix()}},
		{&unlocks, "SELECT COUNT(*) FROM unlocks WHERE created_at >= ?", []any{since}},
	}
	for _, q := range queries {
		if err := s.db.QueryRowContext(ctx, q.query, q.args...).Scan(q.dst); err != nil {
			return nil, err
		}
	}

	type dayRevenue struct {
		Day   int64 `json:"day"`
		Cents int   `json:"cents"`
	}
	days := []dayRevenue{}
	for i := 13; i >= 0; i-- {
		start := midnight.AddDate(0, 0, -i)
		var cents int
		if err := s.db.QueryRowContext(ctx, "SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE status = 'Paid' AND created_at >= ? AND created_at < ?",
			start.Unix(), start.AddDate(0, 0, 1).Unix()).Scan(&cents); err != nil {
			return nil, err
		}
		days = append(days, dayRevenue{Day: ms(start.Unix()), Cents: cents})
	}

	type attention struct {
		Text string `json:"text"`
		Tag  string `json:"tag"`
		Href string `json:"href"`
		Tone string `json:"tone"`
	}
	attn := []attention{}
	if n, err := s.count(ctx, "SELECT COUNT(*) FROM payments WHERE status = 'Pending' AND created_at < ?", s.unix()-3600); err != nil {
		return nil, err
	} else if n > 0 {
		attn = append(attn, attention{plural(n, "payment", "payments") + " pending over 1 hour", "Payments", "/admin/payments/", "warn"})
	}
	if n, err := s.count(ctx, "SELECT COUNT(*) FROM comments WHERE state = 'Reported'"); err != nil {
		return nil, err
	} else if n > 0 {
		attn = append(attn, attention{plural(n, "reported comment", "reported comments"), "Comments", "/admin/comments/", "accent"})
	}
	rows, err := s.db.QueryContext(ctx, `SELECT e.drama_id, d.title, e.n FROM episodes e JOIN dramas d ON d.id = e.drama_id
		WHERE e.video_status = 'Failed' ORDER BY e.updated_at DESC LIMIT 5`)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id, title string
		var n int
		if err := rows.Scan(&id, &title, &n); err != nil {
			rows.Close()
			return nil, err
		}
		attn = append(attn, attention{fmt.Sprintf("EP %d of %s failed to process", n, title), "Episodes", "/admin/dramas/" + id + "/episodes/", "accent"})
	}
	rows.Close()

	type top struct {
		ID      string `json:"id"`
		Title   string `json:"title"`
		Unlocks int    `json:"unlocks"`
	}
	tops := []top{}
	rows, err = s.db.QueryContext(ctx, `SELECT d.id, d.title, COUNT(*) AS n FROM unlocks u JOIN dramas d ON d.id = u.drama_id
		WHERE u.created_at >= ? GROUP BY d.id ORDER BY n DESC LIMIT 4`, s.unix()-7*86400)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var t top
		if err := rows.Scan(&t.ID, &t.Title, &t.Unlocks); err != nil {
			rows.Close()
			return nil, err
		}
		tops = append(tops, t)
	}
	rows.Close()

	type help struct {
		ID      int64  `json:"id"`
		UserID  int64  `json:"userId"`
		Name    string `json:"name"`
		Topic   string `json:"topic"`
		Message string `json:"message"`
		At      int64  `json:"at"`
	}
	helps := []help{}
	rows, err = s.db.QueryContext(ctx, `SELECT h.id, h.user_id, COALESCE(u.name, 'Guest'), h.topic, h.message, h.created_at FROM help_messages h
		LEFT JOIN users u ON u.id = h.user_id ORDER BY h.created_at DESC LIMIT 5`)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var h help
		if err := rows.Scan(&h.ID, &h.UserID, &h.Name, &h.Topic, &h.Message, &h.At); err != nil {
			rows.Close()
			return nil, err
		}
		h.At = ms(h.At)
		helps = append(helps, h)
	}
	rows.Close()

	return map[string]any{
		"revenueCents": revenue, "newUsers": newUsers, "activeVip": vip, "unlocks": unlocks,
		"revenue14": days, "attention": attn, "top": tops, "help": helps,
	}, nil
}

// ---------- users ----------

type AdminUser struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Initial  string `json:"initial"`
	Color    string `json:"color"`
	Email    string `json:"email"`
	Via      string `json:"via"`
	Role     string `json:"role"`
	Coins    int    `json:"coins"`
	VipPlan  string `json:"vipPlan"`
	VipUntil int64  `json:"vipUntil"`
	Muted    int64  `json:"mutedUntil"`
	Joined   int64  `json:"joined"`
	LastSeen int64  `json:"lastSeen"`
	Status   string `json:"status"`
}

func (s *Server) adminUser(u *User) AdminUser {
	vip := int64(0)
	if s.vipActive(u) {
		vip = ms(u.VipUntil)
	}
	muted := int64(0)
	if u.MutedUntil > s.unix() {
		muted = ms(u.MutedUntil)
	}
	return AdminUser{ID: u.ID, Name: u.Name, Initial: initial(u.Name), Color: u.Color, Email: u.Email, Via: u.Via, Role: u.Role, Coins: u.Coins,
		VipPlan: u.VipPlan, VipUntil: vip, Muted: muted, Joined: ms(u.CreatedAt), LastSeen: ms(u.LastSeen), Status: u.Status}
}

func (s *Server) getAdminUsers(r *Req) (any, error) {
	ctx := r.Context()
	where := []string{"u.via != 'Guest'", "u.status != 'Deleted'"}
	args := []any{}
	switch r.URL.Query().Get("filter") {
	case "VIP":
		where, args = append(where, "u.vip_until > ?"), append(args, s.unix())
	case "Has coins":
		where = append(where, "u.coins > 0")
	case "Banned":
		where = append(where, "u.status = 'Banned'")
	case "Admins":
		where = append(where, "u.role != ''")
	}
	if q := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q"))); q != "" {
		where = append(where, "(lower(u.name) LIKE ? OR lower(COALESCE(u.email, '')) LIKE ? OR CAST(u.id AS TEXT) LIKE ?)")
		like := "%" + q + "%"
		args = append(args, like, like, like)
	}
	rows, err := s.db.QueryContext(ctx, "SELECT "+userColumns+" FROM users u WHERE "+strings.Join(where, " AND ")+" ORDER BY u.created_at DESC LIMIT 300", args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []AdminUser{}
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, s.adminUser(u))
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	guests, err := s.count(ctx, "SELECT COUNT(*) FROM users WHERE via = 'Guest'")
	if err != nil {
		return nil, err
	}
	return map[string]any{"users": out, "guests": guests}, nil
}

func (s *Server) userPayments(ctx context.Context, where string, args ...any) ([]*Payment, error) {
	rows, err := s.db.QueryContext(ctx, "SELECT "+paymentColumns+" FROM payments p JOIN users u ON u.id = p.user_id "+where, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Payment{}
	for rows.Next() {
		p, err := scanPayment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Server) getAdminUser(r *Req) (any, error) {
	ctx := r.Context()
	u, err := loadUser(ctx, s.db, atoi64(r.PathValue("id")))
	if err != nil {
		return nil, err
	}
	activity, err := s.wallet(ctx, u.ID, 30)
	if err != nil {
		return nil, err
	}
	payments, err := s.userPayments(ctx, "WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 50", u.ID)
	if err != nil {
		return nil, err
	}
	unlocks, err := s.count(ctx, "SELECT COUNT(*) FROM unlocks WHERE user_id = ?", u.ID)
	if err != nil {
		return nil, err
	}
	comments, err := s.count(ctx, "SELECT COUNT(*) FROM comments WHERE user_id = ?", u.ID)
	if err != nil {
		return nil, err
	}
	return map[string]any{"user": s.adminUser(u), "activity": activity, "payments": payments, "unlocks": unlocks, "comments": comments}, nil
}

var adjustReasons = map[string]bool{"Refund for playback problem": true, "Missing purchase": true, "Promotion": true, "Correction": true}

type adjustBody struct {
	Amount int    `json:"amount"`
	Reason string `json:"reason"`
}

func (s *Server) postAdjustCoins(r *Req) (any, error) {
	var b adjustBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	if b.Amount == 0 || b.Amount > 100000 || b.Amount < -100000 || !adjustReasons[b.Reason] {
		return nil, badRequest("Enter a whole number up to 100,000 and choose a reason")
	}
	ctx := r.Context()
	err := s.tx(ctx, func(tx *sql.Tx) error {
		u, err := loadUser(ctx, tx, atoi64(r.PathValue("id")))
		if err != nil {
			return err
		}
		if u.Status == "Deleted" {
			return errNotFound
		}
		if u.Coins+b.Amount < 0 {
			return badRequest("That would take the balance below 0")
		}
		if err := s.addCoins(ctx, tx, u.ID, b.Amount, b.Reason); err != nil {
			return err
		}
		verb := "Added"
		if b.Amount < 0 {
			verb = "Removed"
		}
		if b.Amount > 0 {
			if err := s.notifyUser(ctx, tx, u.ID, "coin", fmt.Sprintf("%d coins added", b.Amount), b.Reason, "/wallet/"); err != nil {
				return err
			}
		}
		return s.audit(ctx, tx, r.User, fmt.Sprintf("%s %d coins %s %s · %s", verb, abs(b.Amount), map[bool]string{true: "to", false: "from"}[b.Amount > 0], u.Name, b.Reason))
	})
	if err != nil {
		return nil, err
	}
	return s.getAdminUser(r)
}

type banBody struct {
	Banned bool `json:"banned"`
}

func (s *Server) postBan(r *Req) (any, error) {
	var b banBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	ctx := r.Context()
	err := s.tx(ctx, func(tx *sql.Tx) error {
		u, err := loadUser(ctx, tx, atoi64(r.PathValue("id")))
		if err != nil {
			return err
		}
		if u.Status == "Deleted" {
			return errNotFound
		}
		if u.Role != "" {
			return fail(http.StatusConflict, "Remove this person from the admin team before banning them")
		}
		status, what := "Active", "Unbanned "+u.Name
		if b.Banned {
			status, what = "Banned", "Banned "+u.Name
			if _, err := tx.ExecContext(ctx, "DELETE FROM sessions WHERE user_id = ?", u.ID); err != nil {
				return err
			}
		}
		if _, err := tx.ExecContext(ctx, "UPDATE users SET status = ? WHERE id = ?", status, u.ID); err != nil {
			return err
		}
		return s.audit(ctx, tx, r.User, what)
	})
	if err != nil {
		return nil, err
	}
	return s.getAdminUser(r)
}

// ---------- payments ----------

func (s *Server) getAdminPayments(r *Req) (any, error) {
	q := r.URL.Query()
	where, args := []string{"1 = 1"}, []any{}
	if v := q.Get("status"); v != "" && v != "All" {
		where, args = append(where, "p.status = ?"), append(args, v)
	}
	if v := q.Get("kind"); v == "Coins" || v == "VIP" {
		where, args = append(where, "p.kind = ?"), append(args, v)
	}
	if v := q.Get("store"); v != "" && v != "All stores" {
		where, args = append(where, "p.store = ?"), append(args, v)
	}
	list, err := s.userPayments(r.Context(), "WHERE "+strings.Join(where, " AND ")+" ORDER BY p.created_at DESC LIMIT 500", args...)
	if err != nil {
		return nil, err
	}
	rows, err := s.db.QueryContext(r.Context(), "SELECT DISTINCT store FROM payments ORDER BY store")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	stores := []string{}
	for rows.Next() {
		var st string
		if err := rows.Scan(&st); err != nil {
			return nil, err
		}
		stores = append(stores, st)
	}
	return map[string]any{"payments": list, "stores": stores}, rows.Err()
}

// postRecheck asks the (simulated) store again; a pending order clears as paid.
func (s *Server) postRecheck(r *Req) (any, error) {
	ctx := r.Context()
	order := r.PathValue("order")
	err := s.tx(ctx, func(tx *sql.Tx) error {
		if err := s.settlePayment(ctx, tx, order, "Paid"); err != nil {
			return err
		}
		return s.audit(ctx, tx, r.User, "Rechecked payment "+order+" · confirmed by the store")
	})
	if err != nil {
		return nil, err
	}
	return s.payment(ctx, s.db, order)
}

// ---------- comments ----------

func (s *Server) getAdminComments(r *Req) (any, error) {
	ctx := r.Context()
	state := r.URL.Query().Get("state")
	if state != "Kept" && state != "Hidden" {
		state = "Reported"
	}
	type item struct {
		ID         int64  `json:"id"`
		UserID     int64  `json:"userId"`
		Name       string `json:"name"`
		Initial    string `json:"initial"`
		Color      string `json:"color"`
		DramaID    string `json:"dramaId"`
		DramaTitle string `json:"dramaTitle"`
		Ep         int    `json:"ep"`
		Text       string `json:"text"`
		Reports    int    `json:"reports"`
		Reasons    string `json:"reasons"`
		At         int64  `json:"at"`
		State      string `json:"state"`
	}
	rows, err := s.db.QueryContext(ctx, `SELECT c.id, c.user_id, u.name, u.color, c.drama_id, COALESCE(d.title, c.drama_id), c.ep, c.text, c.reports, c.reasons, c.created_at, c.state
		FROM comments c JOIN users u ON u.id = c.user_id LEFT JOIN dramas d ON d.id = c.drama_id
		WHERE c.state = ? ORDER BY c.reports DESC, c.created_at DESC LIMIT 200`, state)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []item{}
	for rows.Next() {
		var c item
		if err := rows.Scan(&c.ID, &c.UserID, &c.Name, &c.Color, &c.DramaID, &c.DramaTitle, &c.Ep, &c.Text, &c.Reports, &c.Reasons, &c.At, &c.State); err != nil {
			return nil, err
		}
		c.Initial, c.At = initial(c.Name), ms(c.At)
		items = append(items, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	counts := map[string]int{}
	for _, st := range []string{"Reported", "Kept", "Hidden"} {
		n, err := s.count(ctx, "SELECT COUNT(*) FROM comments WHERE state = ?", st)
		if err != nil {
			return nil, err
		}
		counts[st] = n
	}
	return map[string]any{"comments": items, "counts": counts}, nil
}

type moderateBody struct {
	Action string `json:"action"` // keep, hide, mute, restore
}

func (s *Server) postModerate(r *Req) (any, error) {
	var b moderateBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	ctx := r.Context()
	return nil, s.tx(ctx, func(tx *sql.Tx) error {
		var userID int64
		var name, reasons string
		var reports int
		err := tx.QueryRowContext(ctx, "SELECT c.user_id, u.name, c.reports, c.reasons FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?", r.PathValue("id")).
			Scan(&userID, &name, &reports, &reasons)
		if errors.Is(err, sql.ErrNoRows) {
			return errNotFound
		}
		if err != nil {
			return err
		}
		state, what := "", ""
		switch b.Action {
		case "keep":
			state, what = "Kept", "Kept a comment by "+name
		case "hide":
			state, what = "Hidden", "Hid a comment by "+name
		case "mute":
			state, what = "Hidden", "Hid a comment by "+name+" and muted them for 7 days"
			if _, err := tx.ExecContext(ctx, "UPDATE users SET muted_until = ? WHERE id = ?", s.unix()+7*86400, userID); err != nil {
				return err
			}
		case "restore":
			state, what = "Visible", "Moved a comment by "+name+" back to the queue"
			if reports > 0 {
				state = "Reported"
			}
		default:
			return badRequest("Unknown action")
		}
		if reasons != "" && b.Action != "restore" {
			what += " · " + reasons
		}
		if _, err := tx.ExecContext(ctx, "UPDATE comments SET state = ? WHERE id = ?", state, r.PathValue("id")); err != nil {
			return err
		}
		return s.audit(ctx, tx, r.User, what)
	})
}

// ---------- coins, VIP and rewards ----------

func (s *Server) getMonetization(r *Req) (any, error) {
	return s.config(r.Context(), s.db)
}

func (s *Server) putMonetization(r *Req) (any, error) {
	var b AppConfig
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	ctx := r.Context()
	err := s.tx(ctx, func(tx *sql.Tx) error {
		c, err := s.config(ctx, tx)
		if err != nil {
			return err
		}
		for _, v := range []int{b.CoinsPerEpisode, b.FreeEpisodes, b.AdsPerDay, b.VipBonus, b.WelcomeCoins, b.Tasks.Ad, b.Tasks.Watch, b.Tasks.Notify, b.Tasks.Invite, b.Tasks.Signin} {
			if v < 0 || v > 100000 {
				return badRequest("Amounts can't be negative")
			}
		}
		if len(b.Checkin) != 7 {
			return badRequest("The check-in cycle has 7 days")
		}
		for _, v := range b.Checkin {
			if v < 0 || v > 100000 {
				return badRequest("Amounts can't be negative")
			}
		}
		changes := []string{}
		note := func(label string, from, to int) {
			if from != to {
				changes = append(changes, fmt.Sprintf("%s %d → %d", label, from, to))
			}
		}
		note("coins per episode", c.CoinsPerEpisode, b.CoinsPerEpisode)
		note("free episodes", c.FreeEpisodes, b.FreeEpisodes)
		note("ad unlocks per day", c.AdsPerDay, b.AdsPerDay)
		note("VIP daily bonus", c.VipBonus, b.VipBonus)
		note("welcome coins", c.WelcomeCoins, b.WelcomeCoins)
		// Packs can be edited but not added or removed: product IDs and prices live in the stores.
		byID := map[string]CoinPack{}
		for _, p := range b.CoinPacks {
			byID[p.ID] = p
		}
		for i, p := range c.CoinPacks {
			n, found := byID[p.ID]
			if !found {
				continue
			}
			if n.Coins <= 0 || n.Bonus < 0 {
				return badRequest("Every pack needs coins")
			}
			note(p.ID+" coins", p.Coins, n.Coins)
			note(p.ID+" bonus", p.Bonus, n.Bonus)
			if p.OnSale != n.OnSale {
				changes = append(changes, fmt.Sprintf("%s on sale: %t", p.ID, n.OnSale))
			}
			c.CoinPacks[i].Coins, c.CoinPacks[i].Bonus, c.CoinPacks[i].OnSale = n.Coins, n.Bonus, n.OnSale
			c.CoinPacks[i].Tag = strings.TrimSpace(n.Tag)
		}
		if fmt.Sprint(c.Checkin) != fmt.Sprint(b.Checkin) {
			changes = append(changes, "check-in amounts")
		}
		if c.Tasks != b.Tasks {
			changes = append(changes, "task rewards")
		}
		c.CoinsPerEpisode, c.FreeEpisodes, c.AdsPerDay, c.VipBonus, c.WelcomeCoins = b.CoinsPerEpisode, b.FreeEpisodes, b.AdsPerDay, b.VipBonus, b.WelcomeCoins
		c.Checkin, c.Tasks = b.Checkin, b.Tasks
		if err := s.saveConfig(ctx, tx, c); err != nil {
			return err
		}
		if len(changes) == 0 {
			return nil
		}
		return s.audit(ctx, tx, r.User, "Changed "+strings.Join(changes, ", "))
	})
	if err != nil {
		return nil, err
	}
	return s.config(ctx, s.db)
}

// ---------- push notifications (delivered to the in-app inbox) ----------

type Campaign struct {
	ID         int64  `json:"id"`
	Title      string `json:"title"`
	Body       string `json:"body"`
	Audience   string `json:"audience"`
	DramaID    string `json:"dramaId"`
	DramaTitle string `json:"dramaTitle"`
	TargetUser int64  `json:"targetUser"`
	SendAt     int64  `json:"sendAt"`
	Status     string `json:"status"`
	SentCount  int    `json:"sentCount"`
	CreatedBy  string `json:"createdBy"`
}

var audiences = map[string]bool{"Everyone": true, "Followers": true, "VIP": true, "Not VIP": true, "User": true}

func (s *Server) getCampaigns(r *Req) (any, error) {
	rows, err := s.db.QueryContext(r.Context(), `SELECT c.id, c.title, c.body, c.audience, c.drama_id, COALESCE(d.title, ''), c.target_user, c.send_at, c.status, c.sent_count, c.created_by
		FROM campaigns c LEFT JOIN dramas d ON d.id = c.drama_id ORDER BY c.send_at DESC, c.id DESC LIMIT 100`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Campaign{}
	for rows.Next() {
		var c Campaign
		if err := rows.Scan(&c.ID, &c.Title, &c.Body, &c.Audience, &c.DramaID, &c.DramaTitle, &c.TargetUser, &c.SendAt, &c.Status, &c.SentCount, &c.CreatedBy); err != nil {
			return nil, err
		}
		c.SendAt = ms(c.SendAt)
		out = append(out, c)
	}
	return out, rows.Err()
}

type campaignBody struct {
	Title    string `json:"title"`
	Body     string `json:"body"`
	Audience string `json:"audience"`
	DramaID  string `json:"dramaId"`
	UserID   int64  `json:"userId"`
	SendAt   int64  `json:"sendAt"` // milliseconds; 0 sends now
}

func (s *Server) postCampaign(r *Req) (any, error) {
	var b campaignBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	b.Title, b.Body = strings.TrimSpace(b.Title), strings.TrimSpace(b.Body)
	if b.Title == "" || len([]rune(b.Title)) > 60 || b.Body == "" || len([]rune(b.Body)) > 160 {
		return nil, badRequest("Title (up to 60 characters) and message (up to 160) are required")
	}
	if !audiences[b.Audience] {
		return nil, badRequest("Choose who to send to")
	}
	ctx := r.Context()
	if b.Audience == "Followers" {
		if _, err := s.drama(ctx, s.db, b.DramaID); err != nil {
			return nil, badRequest("Choose a drama")
		}
	} else {
		b.DramaID = ""
	}
	if b.Audience == "User" {
		if u, err := loadUser(ctx, s.db, b.UserID); err != nil || u.Status != "Active" {
			return nil, badRequest("No active user with that ID")
		}
	} else {
		b.UserID = 0
	}
	sendAt := b.SendAt / 1000
	now := s.unix()
	if sendAt != 0 && sendAt < now-60 {
		return nil, badRequest("Pick a time in the future")
	}
	if sendAt == 0 {
		sendAt = now
	}
	err := s.tx(ctx, func(tx *sql.Tx) error {
		res, err := tx.ExecContext(ctx, `INSERT INTO campaigns (title, body, audience, drama_id, target_user, send_at, status, created_by, created_at)
			VALUES (?, ?, ?, ?, ?, ?, 'Scheduled', ?, ?)`, b.Title, b.Body, b.Audience, b.DramaID, b.UserID, sendAt, r.User.Name, now)
		if err != nil {
			return err
		}
		id, err := res.LastInsertId()
		if err != nil {
			return err
		}
		if sendAt <= now {
			if err := s.deliverCampaign(ctx, tx, id); err != nil {
				return err
			}
		}
		return s.audit(ctx, tx, r.User, fmt.Sprintf("%s notification \"%s\" to %s", map[bool]string{true: "Sent", false: "Scheduled"}[sendAt <= now], b.Title, b.Audience))
	})
	if err != nil {
		return nil, err
	}
	return s.getCampaigns(r)
}

// deliverCampaign writes the notification to each recipient's inbox, skipping people who
// turned that type off.
func (s *Server) deliverCampaign(ctx context.Context, tx *sql.Tx, id int64) error {
	var title, body, audience, dramaID string
	var target int64
	if err := tx.QueryRowContext(ctx, "SELECT title, body, audience, drama_id, target_user FROM campaigns WHERE id = ? AND status = 'Scheduled'", id).
		Scan(&title, &body, &audience, &dramaID, &target); err != nil {
		return err
	}
	where, args := "u.status = 'Active' AND u.via != 'Guest'", []any{}
	href, kind := "/", "vip"
	switch audience {
	case "Followers":
		where += " AND u.id IN (SELECT user_id FROM user_dramas WHERE drama_id = ? AND kind IN ('saved', 'reminders'))"
		args = append(args, dramaID)
		href, kind = "/drama/"+dramaID+"/", "ep"
	case "VIP":
		where, args = where+" AND u.vip_until > ?", append(args, s.unix())
	case "Not VIP":
		where, args = where+" AND u.vip_until <= ?", append(args, s.unix())
	case "User":
		where, args = "u.status = 'Active' AND u.id = ?", append(args, target)
		kind = "sys"
	}
	rows, err := tx.QueryContext(ctx, "SELECT u.id, u.notify FROM users u WHERE "+where, args...)
	if err != nil {
		return err
	}
	ids := []int64{}
	for rows.Next() {
		var uid int64
		var raw string
		if err := rows.Scan(&uid, &raw); err != nil {
			rows.Close()
			return err
		}
		prefs := parseNotify(raw)
		if audience == "User" || (audience == "Followers" && prefs.Episodes) || (audience != "Followers" && prefs.Offers) {
			ids = append(ids, uid)
		}
	}
	rows.Close()
	for _, uid := range ids {
		if err := s.notifyUser(ctx, tx, uid, kind, title, body, href); err != nil {
			return err
		}
	}
	_, err = tx.ExecContext(ctx, "UPDATE campaigns SET status = 'Sent', sent_count = ?, send_at = MIN(send_at, ?) WHERE id = ?", len(ids), s.unix(), id)
	return err
}

func (s *Server) postTestNotification(r *Req) (any, error) {
	var b campaignBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	if strings.TrimSpace(b.Title) == "" || strings.TrimSpace(b.Body) == "" {
		return nil, badRequest("Write a title and message first")
	}
	return nil, s.notifyUser(r.Context(), s.db, r.User.ID, "sys", "[Test] "+strings.TrimSpace(b.Title), strings.TrimSpace(b.Body), "/")
}

func (s *Server) deleteCampaign(r *Req) (any, error) {
	ctx := r.Context()
	err := s.tx(ctx, func(tx *sql.Tx) error {
		var title string
		err := tx.QueryRowContext(ctx, "SELECT title FROM campaigns WHERE id = ? AND status = 'Scheduled'", r.PathValue("id")).Scan(&title)
		if errors.Is(err, sql.ErrNoRows) {
			return fail(http.StatusConflict, "Only scheduled notifications can be canceled")
		}
		if err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, "UPDATE campaigns SET status = 'Canceled' WHERE id = ?", r.PathValue("id")); err != nil {
			return err
		}
		return s.audit(ctx, tx, r.User, "Canceled notification \""+title+"\"")
	})
	if err != nil {
		return nil, err
	}
	return s.getCampaigns(r)
}

// ---------- settings, admins and audit log ----------

var versionRe = regexp.MustCompile(`^\d+\.\d+\.\d+$`)

func (s *Server) getAdminSettings(r *Req) (any, error) {
	ctx := r.Context()
	c, err := s.config(ctx, s.db)
	if err != nil {
		return nil, err
	}
	rows, err := s.db.QueryContext(ctx, "SELECT "+userColumns+" FROM users u WHERE u.role != '' AND u.status != 'Deleted' ORDER BY CASE u.role WHEN 'Owner' THEN 0 ELSE 1 END, u.name")
	if err != nil {
		return nil, err
	}
	admins := []AdminUser{}
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			rows.Close()
			return nil, err
		}
		admins = append(admins, s.adminUser(u))
	}
	rows.Close()
	type entry struct {
		Who  string `json:"who"`
		What string `json:"what"`
		At   int64  `json:"at"`
	}
	log := []entry{}
	rows, err = s.db.QueryContext(ctx, "SELECT who, what, created_at FROM audit ORDER BY created_at DESC, id DESC LIMIT 100")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var e entry
		if err := rows.Scan(&e.Who, &e.What, &e.At); err != nil {
			return nil, err
		}
		e.At = ms(e.At)
		log = append(log, e)
	}
	return map[string]any{"versions": c.Versions, "maintenance": c.Maintenance, "supportEmail": c.SupportEmail, "admins": admins, "audit": log}, rows.Err()
}

type settingsBody struct {
	Versions     Versions `json:"versions"`
	Maintenance  bool     `json:"maintenance"`
	SupportEmail string   `json:"supportEmail"`
}

func (s *Server) putAdminSettings(r *Req) (any, error) {
	var b settingsBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	for _, v := range []string{b.Versions.AndroidMin, b.Versions.AndroidLatest, b.Versions.IosMin, b.Versions.IosLatest} {
		if !versionRe.MatchString(v) {
			return nil, badRequest("Use the version format 1.2.3")
		}
	}
	b.SupportEmail = strings.TrimSpace(b.SupportEmail)
	if !emailRe.MatchString(b.SupportEmail) {
		return nil, badRequest("Enter a valid support email")
	}
	ctx := r.Context()
	err := s.tx(ctx, func(tx *sql.Tx) error {
		c, err := s.config(ctx, tx)
		if err != nil {
			return err
		}
		changes := []string{}
		if c.Versions != b.Versions {
			changes = append(changes, fmt.Sprintf("app versions (Android %s–%s, iOS %s–%s)", b.Versions.AndroidMin, b.Versions.AndroidLatest, b.Versions.IosMin, b.Versions.IosLatest))
		}
		if c.Maintenance != b.Maintenance {
			changes = append(changes, map[bool]string{true: "turned maintenance mode on", false: "turned maintenance mode off"}[b.Maintenance])
		}
		if c.SupportEmail != b.SupportEmail {
			changes = append(changes, "support email")
		}
		c.Versions, c.Maintenance, c.SupportEmail = b.Versions, b.Maintenance, b.SupportEmail
		if err := s.saveConfig(ctx, tx, c); err != nil {
			return err
		}
		if len(changes) == 0 {
			return nil
		}
		return s.audit(ctx, tx, r.User, "Settings: "+strings.Join(changes, ", "))
	})
	if err != nil {
		return nil, err
	}
	return s.getAdminSettings(r)
}

type adminBody struct {
	Email string `json:"email"`
	Role  string `json:"role"`
}

func (s *Server) postAdmin(r *Req) (any, error) {
	var b adminBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	email := strings.ToLower(strings.TrimSpace(b.Email))
	if !emailRe.MatchString(email) {
		return nil, badRequest("Enter a valid email")
	}
	if b.Role == "" {
		b.Role = "Editor"
	}
	if !validRole(b.Role) || b.Role == "Owner" {
		return nil, badRequest("Choose Editor, Support or Moderator")
	}
	ctx := r.Context()
	err := s.tx(ctx, func(tx *sql.Tx) error {
		var id int64
		var role, status string
		err := tx.QueryRowContext(ctx, "SELECT id, role, status FROM users WHERE email = ?", email).Scan(&id, &role, &status)
		switch {
		case errors.Is(err, sql.ErrNoRows):
			// They can sign in with this email (code) and will land in the panel.
			if id, err = s.createUser(ctx, tx, email[:strings.Index(email, "@")], email, "Email code"); err != nil {
				return err
			}
		case err != nil:
			return err
		case role != "":
			return fail(http.StatusConflict, "%s is already on the admin team", email)
		case status != "Active":
			return fail(http.StatusConflict, "This account is %s", strings.ToLower(status))
		}
		if _, err := tx.ExecContext(ctx, "UPDATE users SET role = ? WHERE id = ?", b.Role, id); err != nil {
			return err
		}
		if err := s.notifyUser(ctx, tx, id, "sys", "You're on The Ending admin team", "Role: "+b.Role+". Open the admin panel from Me.", "/admin/"); err != nil {
			return err
		}
		return s.audit(ctx, tx, r.User, fmt.Sprintf("Added %s as %s", email, b.Role))
	})
	if err != nil {
		return nil, err
	}
	return s.getAdminSettings(r)
}

func (s *Server) patchAdmin(r *Req) (any, error) {
	var b adminBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	if b.Role != "" && (!validRole(b.Role) || b.Role == "Owner") {
		return nil, badRequest("Choose Editor, Support or Moderator")
	}
	ctx := r.Context()
	err := s.tx(ctx, func(tx *sql.Tx) error {
		u, err := loadUser(ctx, tx, atoi64(r.PathValue("id")))
		if err != nil {
			return err
		}
		if u.Role == "" {
			return errNotFound
		}
		if u.Role == "Owner" {
			return fail(http.StatusConflict, "The owner's role can't be changed here")
		}
		if _, err := tx.ExecContext(ctx, "UPDATE users SET role = ? WHERE id = ?", b.Role, u.ID); err != nil {
			return err
		}
		what := fmt.Sprintf("Changed %s's role %s → %s", u.Name, u.Role, b.Role)
		if b.Role == "" {
			what = "Removed " + u.Name + " from the admin team"
		}
		return s.audit(ctx, tx, r.User, what)
	})
	if err != nil {
		return nil, err
	}
	return s.getAdminSettings(r)
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

func atoi64(s string) int64 {
	var n int64
	for _, c := range s {
		if c < '0' || c > '9' || n > 1e15 {
			return 0
		}
		n = n*10 + int64(c-'0')
	}
	return n
}
