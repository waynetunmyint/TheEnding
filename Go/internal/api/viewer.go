package api

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"
)

var languageCodes = map[string]bool{"en": true, "my": true, "th": true, "vi": true, "id": true, "zh": true, "es": true, "pt": true}

func (s *Server) viewerRoutes() {
	s.handle("GET /api/me", viewer, "", func(r *Req) (any, error) { return s.buildMe(r.Context(), r.User.ID) })
	s.handle("PATCH /api/me", viewer, "", s.patchMe)
	s.handle("DELETE /api/me", signedIn, "", s.deleteMe)
	s.handle("PUT /api/me/{kind}/{id}", viewer, "", s.putListItem)
	s.handle("DELETE /api/me/{kind}/{id}", viewer, "", s.deleteListItem)
	s.handle("DELETE /api/me/history", viewer, "", s.deleteHistory)
	s.handle("POST /api/me/progress", viewer, "", s.postProgress)
	s.handle("POST /api/me/watch", viewer, "", s.postWatch)
	s.handle("POST /api/unlock", viewer, "", s.postUnlock)
	s.handle("POST /api/ads/start", viewer, "", s.postAdStart)
	s.handle("POST /api/ads/complete", viewer, "", s.postAdComplete)
	s.handle("POST /api/checkin", viewer, "", s.postCheckin)
	s.handle("POST /api/tasks/{key}/claim", viewer, "", s.postClaimTask)
	s.handle("GET /api/wallet", viewer, "", s.getWallet)
	s.handle("POST /api/ratings", viewer, "", s.postRating)
}

type patchMeBody struct {
	Name           *string      `json:"name"`
	Settings       *Settings    `json:"settings"`
	Notify         *NotifyPrefs `json:"notify"`
	NotifyPrompted *bool        `json:"notifyPrompted"`
	Onboarded      *bool        `json:"onboarded"`
	Genres         *[]string    `json:"genres"`
}

func (s *Server) patchMe(r *Req) (any, error) {
	var b patchMeBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	sets, args := []string{}, []any{}
	if b.Name != nil {
		name := strings.TrimSpace(*b.Name)
		if name == "" || len([]rune(name)) > 30 {
			return nil, badRequest("Display name must be 1 to 30 characters")
		}
		sets, args = append(sets, "name = ?"), append(args, name)
	}
	if b.Settings != nil {
		if !languageCodes[b.Settings.Language] {
			return nil, badRequest("Unknown language")
		}
		sets, args = append(sets, "settings = ?"), append(args, mustJSON(b.Settings))
	}
	if b.Notify != nil {
		sets, args = append(sets, "notify = ?"), append(args, mustJSON(b.Notify))
	}
	if b.NotifyPrompted != nil {
		sets, args = append(sets, "notify_prompted = ?"), append(args, *b.NotifyPrompted)
	}
	if b.Onboarded != nil {
		sets, args = append(sets, "onboarded = ?"), append(args, *b.Onboarded)
	}
	if b.Genres != nil {
		known := map[string]bool{}
		for _, g := range Genres {
			known[g] = true
		}
		clean := []string{}
		for _, g := range *b.Genres {
			if known[g] {
				clean = append(clean, g)
			}
		}
		sets, args = append(sets, "genres = ?"), append(args, mustJSON(uniq(clean)))
	}
	if len(sets) > 0 {
		args = append(args, r.User.ID)
		if _, err := s.db.ExecContext(r.Context(), "UPDATE users SET "+strings.Join(sets, ", ")+" WHERE id = ?", args...); err != nil {
			return nil, err
		}
	}
	return s.buildMe(r.Context(), r.User.ID)
}

type deleteMeBody struct {
	Confirm string `json:"confirm"`
}

// deleteMe removes the account's personal data. Payment rows are kept for bookkeeping and point
// at the anonymised user row.
func (s *Server) deleteMe(r *Req) (any, error) {
	var b deleteMeBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	if strings.ToUpper(strings.TrimSpace(b.Confirm)) != "DELETE" {
		return nil, badRequest("Type DELETE to confirm")
	}
	if r.User.Role != "" {
		return nil, fail(http.StatusConflict, "Admins must be removed from the admin team before deleting the account")
	}
	ctx := r.Context()
	err := s.tx(ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, `UPDATE comments SET reports = MAX(0, reports - 1)
			WHERE id IN (SELECT comment_id FROM comment_reports WHERE user_id = ?)`, r.User.ID); err != nil {
			return err
		}
		for _, table := range []string{"sessions", "unlocks", "progress", "user_dramas", "daily", "ad_tickets", "wallet", "inbox", "comments", "comment_reports", "ratings", "help_messages"} {
			if _, err := tx.ExecContext(ctx, "DELETE FROM "+table+" WHERE user_id = ?", r.User.ID); err != nil {
				return err
			}
		}
		if _, err := tx.ExecContext(ctx, "DELETE FROM referrals WHERE invitee_id = ? OR inviter_id = ?", r.User.ID, r.User.ID); err != nil {
			return err
		}
		_, err := tx.ExecContext(ctx, `UPDATE users SET name = 'Deleted user', email = NULL, status = 'Deleted', coins = 0, vip_until = 0,
			vip_plan = '', genres = '[]', settings = '{}', notify = '{}' WHERE id = ?`, r.User.ID)
		return err
	})
	if err != nil {
		return nil, err
	}
	return nil, s.endSession(ctx, r)
}

var listKinds = map[string]bool{"saved": true, "liked": true, "reminders": true}

func (s *Server) listItem(r *Req) (string, string, error) {
	kind, id := r.PathValue("kind"), r.PathValue("id")
	if !listKinds[kind] {
		return "", "", errNotFound
	}
	d, err := s.drama(r.Context(), s.db, id)
	if err != nil {
		return "", "", err
	}
	if d.Status == "Draft" {
		return "", "", errNotFound
	}
	return kind, id, nil
}

func (s *Server) putListItem(r *Req) (any, error) {
	kind, id, err := s.listItem(r)
	if err != nil {
		return nil, err
	}
	if _, err := s.db.ExecContext(r.Context(), "INSERT OR IGNORE INTO user_dramas (user_id, drama_id, kind, created_at) VALUES (?, ?, ?, ?)", r.User.ID, id, kind, s.unix()); err != nil {
		return nil, err
	}
	return s.buildMe(r.Context(), r.User.ID)
}

func (s *Server) deleteListItem(r *Req) (any, error) {
	kind, id := r.PathValue("kind"), r.PathValue("id")
	if !listKinds[kind] {
		return nil, errNotFound
	}
	if _, err := s.db.ExecContext(r.Context(), "DELETE FROM user_dramas WHERE user_id = ? AND drama_id = ? AND kind = ?", r.User.ID, id, kind); err != nil {
		return nil, err
	}
	return s.buildMe(r.Context(), r.User.ID)
}

func (s *Server) deleteHistory(r *Req) (any, error) {
	if _, err := s.db.ExecContext(r.Context(), "DELETE FROM progress WHERE user_id = ?", r.User.ID); err != nil {
		return nil, err
	}
	return s.buildMe(r.Context(), r.User.ID)
}

type epBody struct {
	DramaID string `json:"dramaId"`
	Ep      int    `json:"ep"`
}

// publishedEpisode loads a published episode of a published drama.
func (s *Server) publishedEpisode(ctx context.Context, q querier, dramaID string, n int) (*Drama, *Episode, error) {
	d, err := s.drama(ctx, q, dramaID)
	if err != nil {
		return nil, nil, err
	}
	if d.Status != "Published" {
		return nil, nil, errNotFound
	}
	var e Episode
	err = q.QueryRowContext(ctx, "SELECT n, title, length_sec, free, video_status = 'Ready' FROM episodes WHERE drama_id = ? AND n = ? AND published = 1", dramaID, n).
		Scan(&e.N, &e.Title, &e.Length, &e.Free, &e.HasVideo)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil, fail(http.StatusNotFound, "Episode not found")
	}
	if err != nil {
		return nil, nil, err
	}
	return d, &e, nil
}

func (s *Server) canWatch(ctx context.Context, q querier, u *User, dramaID string, e *Episode) (bool, error) {
	if e.Free || s.vipActive(u) {
		return true, nil
	}
	var n int
	err := q.QueryRowContext(ctx, "SELECT COUNT(*) FROM unlocks WHERE user_id = ? AND drama_id = ? AND n = ?", u.ID, dramaID, e.N).Scan(&n)
	return n > 0, err
}

func (s *Server) postProgress(r *Req) (any, error) {
	var b epBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	ctx := r.Context()
	if _, _, err := s.publishedEpisode(ctx, s.db, b.DramaID, b.Ep); err != nil {
		return nil, err
	}
	err := s.tx(ctx, func(tx *sql.Tx) error {
		var prevAt int64
		err := tx.QueryRowContext(ctx, "SELECT updated_at FROM progress WHERE user_id = ? AND drama_id = ?", r.User.ID, b.DramaID).Scan(&prevAt)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		if _, err := tx.ExecContext(ctx, `INSERT INTO progress (user_id, drama_id, ep, updated_at) VALUES (?, ?, ?, ?)
			ON CONFLICT(user_id, drama_id) DO UPDATE SET ep = excluded.ep, updated_at = excluded.updated_at`, r.User.ID, b.DramaID, b.Ep, s.unix()); err != nil {
			return err
		}
		if prevAt > 0 && s.day(time.Unix(prevAt, 0)) == s.today() {
			return nil // one play per viewer, drama and day feeds the rankings
		}
		_, err = tx.ExecContext(ctx, `INSERT INTO views (drama_id, day, count) VALUES (?, ?, 1)
			ON CONFLICT(drama_id, day) DO UPDATE SET count = count + 1`, b.DramaID, s.today())
		return err
	})
	if err != nil {
		return nil, err
	}
	return s.buildMe(ctx, r.User.ID)
}

func (s *Server) ensureDaily(ctx context.Context, q querier, userID int64) error {
	_, err := q.ExecContext(ctx, "INSERT OR IGNORE INTO daily (user_id, day) VALUES (?, ?)", userID, s.today())
	return err
}

type watchBody struct {
	Seconds int `json:"seconds"`
}

// postWatch records watch time for the "watch 30 minutes" task. A heartbeat can't claim more
// time than has passed since the previous one.
func (s *Server) postWatch(r *Req) (any, error) {
	var b watchBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	ctx := r.Context()
	var total int
	err := s.tx(ctx, func(tx *sql.Tx) error {
		if err := s.ensureDaily(ctx, tx, r.User.ID); err != nil {
			return err
		}
		var last int64
		if err := tx.QueryRowContext(ctx, "SELECT watch_at FROM daily WHERE user_id = ? AND day = ?", r.User.ID, s.today()).Scan(&last); err != nil {
			return err
		}
		now := s.unix()
		elapsed := int(now - last)
		if last == 0 {
			elapsed = 30 // first heartbeat of the day
		}
		add := max(0, min(b.Seconds, 60, elapsed))
		if _, err := tx.ExecContext(ctx, "UPDATE daily SET watch_sec = watch_sec + ?, watch_at = ? WHERE user_id = ? AND day = ?", add, now, r.User.ID, s.today()); err != nil {
			return err
		}
		return tx.QueryRowContext(ctx, "SELECT watch_sec FROM daily WHERE user_id = ? AND day = ?", r.User.ID, s.today()).Scan(&total)
	})
	if err != nil {
		return nil, err
	}
	return map[string]int{"watchSec": total}, nil
}

func (s *Server) postUnlock(r *Req) (any, error) {
	var b epBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	ctx := r.Context()
	err := s.tx(ctx, func(tx *sql.Tx) error {
		u, err := loadUser(ctx, tx, r.User.ID)
		if err != nil {
			return err
		}
		d, e, err := s.publishedEpisode(ctx, tx, b.DramaID, b.Ep)
		if err != nil {
			return err
		}
		if ok, err := s.canWatch(ctx, tx, u, d.ID, e); err != nil || ok {
			return err // already watchable: nothing to charge
		}
		if u.Coins < d.CoinsPerEpisode {
			return fail(http.StatusConflict, "Not enough coins")
		}
		if err := s.addCoins(ctx, tx, u.ID, -d.CoinsPerEpisode, "Unlocked EP "+itoa(e.N)+" · "+d.Title); err != nil {
			return err
		}
		_, err = tx.ExecContext(ctx, "INSERT INTO unlocks (user_id, drama_id, n, via, created_at) VALUES (?, ?, ?, 'coins', ?)", u.ID, d.ID, e.N, s.unix())
		return err
	})
	if err != nil {
		return nil, err
	}
	return s.buildMe(ctx, r.User.ID)
}

type adStartBody struct {
	Purpose string `json:"purpose"` // unlock or reward
	DramaID string `json:"dramaId"`
	Ep      int    `json:"ep"`
}

// The rewarded ad is simulated: the client shows a 5-second placeholder, and the server only
// pays out for a ticket that is at least that old.
const adSeconds = 5

func (s *Server) adsUsed(ctx context.Context, q querier, userID int64) (int, error) {
	var n int
	err := q.QueryRowContext(ctx, "SELECT ads FROM daily WHERE user_id = ? AND day = ?", userID, s.today()).Scan(&n)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil
	}
	return n, err
}

func (s *Server) postAdStart(r *Req) (any, error) {
	var b adStartBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	ctx := r.Context()
	cfg, err := s.config(ctx, s.db)
	if err != nil {
		return nil, err
	}
	used, err := s.adsUsed(ctx, s.db, r.User.ID)
	if err != nil {
		return nil, err
	}
	if used >= cfg.AdsPerDay {
		return nil, fail(http.StatusConflict, "No free ad unlocks left today")
	}
	switch b.Purpose {
	case "unlock":
		d, e, err := s.publishedEpisode(ctx, s.db, b.DramaID, b.Ep)
		if err != nil {
			return nil, err
		}
		if ok, err := s.canWatch(ctx, s.db, r.User, d.ID, e); err != nil || ok {
			if err == nil {
				err = fail(http.StatusConflict, "This episode is already unlocked")
			}
			return nil, err
		}
	case "reward":
		b.DramaID, b.Ep = "", 0
	default:
		return nil, badRequest("Unknown ad purpose")
	}
	id := randomToken(16)
	if _, err := s.db.ExecContext(ctx, "INSERT INTO ad_tickets (id, user_id, purpose, drama_id, n, started_at) VALUES (?, ?, ?, ?, ?, ?)",
		id, r.User.ID, b.Purpose, b.DramaID, b.Ep, s.unix()); err != nil {
		return nil, err
	}
	return map[string]any{"ticket": id, "seconds": adSeconds}, nil
}

type adCompleteBody struct {
	Ticket string `json:"ticket"`
}

func (s *Server) postAdComplete(r *Req) (any, error) {
	var b adCompleteBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	ctx := r.Context()
	err := s.tx(ctx, func(tx *sql.Tx) error {
		var purpose, dramaID string
		var n, used int
		var started int64
		err := tx.QueryRowContext(ctx, "SELECT purpose, drama_id, n, started_at, used FROM ad_tickets WHERE id = ? AND user_id = ?", b.Ticket, r.User.ID).
			Scan(&purpose, &dramaID, &n, &started, &used)
		if errors.Is(err, sql.ErrNoRows) || (err == nil && used == 1) {
			return fail(http.StatusGone, "This ad was already used. Watch another one.")
		}
		if err != nil {
			return err
		}
		age := s.unix() - started
		if age < adSeconds-1 {
			return fail(http.StatusConflict, "Watch the whole ad to get the reward")
		}
		if age > 600 {
			return fail(http.StatusGone, "This ad expired. Watch another one.")
		}
		cfg, err := s.config(ctx, tx)
		if err != nil {
			return err
		}
		adsUsed, err := s.adsUsed(ctx, tx, r.User.ID)
		if err != nil {
			return err
		}
		if adsUsed >= cfg.AdsPerDay {
			return fail(http.StatusConflict, "No free ad unlocks left today")
		}
		if _, err := tx.ExecContext(ctx, "UPDATE ad_tickets SET used = 1 WHERE id = ?", b.Ticket); err != nil {
			return err
		}
		if err := s.ensureDaily(ctx, tx, r.User.ID); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, "UPDATE daily SET ads = ads + 1 WHERE user_id = ? AND day = ?", r.User.ID, s.today()); err != nil {
			return err
		}
		if purpose == "reward" {
			return s.addCoins(ctx, tx, r.User.ID, cfg.Tasks.Ad, "Watched a short ad")
		}
		_, err = tx.ExecContext(ctx, "INSERT OR IGNORE INTO unlocks (user_id, drama_id, n, via, created_at) VALUES (?, ?, ?, 'ad', ?)", r.User.ID, dramaID, n, s.unix())
		return err
	})
	if err != nil {
		return nil, err
	}
	return s.buildMe(ctx, r.User.ID)
}

func (s *Server) postCheckin(r *Req) (any, error) {
	ctx := r.Context()
	var amount, bonus int
	err := s.tx(ctx, func(tx *sql.Tx) error {
		u, err := loadUser(ctx, tx, r.User.ID)
		if err != nil {
			return err
		}
		cfg, err := s.config(ctx, tx)
		if err != nil {
			return err
		}
		st := s.checkinState(u, cfg.Checkin)
		if !st.CanCheckIn {
			return fail(http.StatusConflict, "Already checked in today. Come back tomorrow.")
		}
		amount = st.NextAmount
		day := st.Streak%max(1, len(cfg.Checkin)) + 1
		if err := s.addCoins(ctx, tx, u.ID, amount, "Daily check-in · day "+itoa(day)); err != nil {
			return err
		}
		if s.vipActive(u) && cfg.VipBonus > 0 {
			bonus = cfg.VipBonus
			if err := s.addCoins(ctx, tx, u.ID, bonus, "VIP daily bonus"); err != nil {
				return err
			}
		}
		_, err = tx.ExecContext(ctx, "UPDATE users SET checkin_streak = ?, checkin_last = ? WHERE id = ?", st.Streak+1, s.today(), u.ID)
		return err
	})
	if err != nil {
		return nil, err
	}
	me, err := s.buildMe(ctx, r.User.ID)
	if err != nil {
		return nil, err
	}
	return map[string]any{"amount": amount, "vipBonus": bonus, "me": me}, nil
}

func (s *Server) postClaimTask(r *Req) (any, error) {
	ctx := r.Context()
	err := s.tx(ctx, func(tx *sql.Tx) error {
		cfg, err := s.config(ctx, tx)
		if err != nil {
			return err
		}
		switch r.PathValue("key") {
		case "watch":
			if err := s.ensureDaily(ctx, tx, r.User.ID); err != nil {
				return err
			}
			res, err := tx.ExecContext(ctx, "UPDATE daily SET watch_claimed = 1 WHERE user_id = ? AND day = ? AND watch_claimed = 0 AND watch_sec >= 1800", r.User.ID, s.today())
			if err != nil {
				return err
			}
			if n, _ := res.RowsAffected(); n == 0 {
				return fail(http.StatusConflict, "Watch 30 minutes today first")
			}
			return s.addCoins(ctx, tx, r.User.ID, cfg.Tasks.Watch, "Watched 30 minutes")
		case "notify":
			res, err := tx.ExecContext(ctx, "UPDATE users SET notify_bonus = 1 WHERE id = ? AND notify_bonus = 0", r.User.ID)
			if err != nil {
				return err
			}
			if n, _ := res.RowsAffected(); n == 0 {
				return fail(http.StatusConflict, "Already claimed")
			}
			return s.addCoins(ctx, tx, r.User.ID, cfg.Tasks.Notify, "Turned on notifications")
		}
		return errNotFound
	})
	if err != nil {
		return nil, err
	}
	return s.buildMe(ctx, r.User.ID)
}

type WalletEntry struct {
	What   string `json:"what"`
	Amount int    `json:"amount"`
	At     int64  `json:"at"`
}

func (s *Server) wallet(ctx context.Context, userID int64, limit int) ([]WalletEntry, error) {
	rows, err := s.db.QueryContext(ctx, "SELECT what, amount, created_at FROM wallet WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?", userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []WalletEntry{}
	for rows.Next() {
		var e WalletEntry
		if err := rows.Scan(&e.What, &e.Amount, &e.At); err != nil {
			return nil, err
		}
		e.At = ms(e.At)
		out = append(out, e)
	}
	return out, rows.Err()
}

func (s *Server) getWallet(r *Req) (any, error) {
	return s.wallet(r.Context(), r.User.ID, 200)
}

type ratingBody struct {
	DramaID string `json:"dramaId"`
	Value   int    `json:"value"` // 1 loved it, -1 not for me
}

func (s *Server) postRating(r *Req) (any, error) {
	var b ratingBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	if b.Value != 1 && b.Value != -1 {
		return nil, badRequest("Invalid rating")
	}
	if d, err := s.drama(r.Context(), s.db, b.DramaID); err != nil || d.Status == "Draft" {
		return nil, errNotFound
	}
	_, err := s.db.ExecContext(r.Context(), `INSERT INTO ratings (user_id, drama_id, value, created_at) VALUES (?, ?, ?, ?)
		ON CONFLICT(user_id, drama_id) DO UPDATE SET value = excluded.value, created_at = excluded.created_at`, r.User.ID, b.DramaID, b.Value, s.unix())
	return nil, err
}
