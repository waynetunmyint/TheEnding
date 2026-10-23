package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"
)

type User struct {
	ID             int64
	Name           string
	Email          string
	Via            string
	Color          string
	Role           string
	Status         string
	Coins          int
	VipPlan        string
	VipUntil       int64
	MutedUntil     int64
	Onboarded      bool
	Genres         string
	Settings       string
	Notify         string
	NotifyPrompted bool
	NotifyBonus    bool
	SigninBonus    bool
	CheckinStreak  int
	CheckinLast    string
	CreatedAt      int64
	LastSeen       int64
}

func (u *User) SignedIn() bool { return u.Via != "Guest" }

const userColumns = `u.id, u.name, COALESCE(u.email, ''), u.via, u.color, u.role, u.status, u.coins, u.vip_plan, u.vip_until,
	u.muted_until, u.onboarded, u.genres, u.settings, u.notify, u.notify_prompted, u.notify_bonus, u.signin_bonus,
	u.checkin_streak, u.checkin_last, u.created_at, u.last_seen`

func scanUser(row interface{ Scan(...any) error }) (*User, error) {
	u := &User{}
	err := row.Scan(&u.ID, &u.Name, &u.Email, &u.Via, &u.Color, &u.Role, &u.Status, &u.Coins, &u.VipPlan, &u.VipUntil,
		&u.MutedUntil, &u.Onboarded, &u.Genres, &u.Settings, &u.Notify, &u.NotifyPrompted, &u.NotifyBonus, &u.SigninBonus,
		&u.CheckinStreak, &u.CheckinLast, &u.CreatedAt, &u.LastSeen)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func loadUser(ctx context.Context, q querier, id int64) (*User, error) {
	u, err := scanUser(q.QueryRowContext(ctx, "SELECT "+userColumns+" FROM users u WHERE u.id = ?", id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errNotFound
	}
	return u, err
}

// ---------- roles ----------

var roles = []string{"Owner", "Editor", "Support", "Moderator"}

func validRole(r string) bool {
	for _, x := range roles {
		if x == r {
			return true
		}
	}
	return false
}

// Write permissions per role. Every admin role can read every admin page.
var rolePerms = map[string][]string{
	"Editor":    {"content", "notify"},
	"Support":   {"users", "payments"},
	"Moderator": {"comments"},
}

func roleAllows(role, perm string) bool {
	if role == "Owner" {
		return true
	}
	for _, p := range rolePerms[role] {
		if p == perm {
			return true
		}
	}
	return false
}

// ---------- per-user settings ----------

type Settings struct {
	Autoplay   bool   `json:"autoplay"`
	AutoUnlock bool   `json:"autoUnlock"`
	Cellular   bool   `json:"cellular"`
	Language   string `json:"language"`
}

type NotifyPrefs struct {
	Episodes  bool `json:"episodes"`
	Premieres bool `json:"premieres"`
	Replies   bool `json:"replies"`
	Offers    bool `json:"offers"`
	Checkin   bool `json:"checkin"`
}

func parseSettings(raw string) Settings {
	s := Settings{Autoplay: true, Cellular: true, Language: "en"}
	_ = json.Unmarshal([]byte(raw), &s)
	return s
}

func parseNotify(raw string) NotifyPrefs {
	n := NotifyPrefs{Episodes: true, Premieres: true, Replies: true, Checkin: true}
	_ = json.Unmarshal([]byte(raw), &n)
	return n
}

func parseStrings(raw string) []string {
	out := []string{}
	_ = json.Unmarshal([]byte(raw), &out)
	return out
}

func mustJSON(v any) string {
	b, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return string(b)
}

var avatarColors = []string{"#7A3546", "#2F5480", "#3E6651", "#52407E", "#80532F", "#683058", "#38486F", "#6E552D"}

func initial(name string) string {
	for _, r := range strings.TrimSpace(name) {
		return strings.ToUpper(string(r))
	}
	return "?"
}

// ---------- app configuration (admin › Coins, VIP & rewards, and Settings) ----------

type CoinPack struct {
	ID         string `json:"id"`
	Coins      int    `json:"coins"`
	Bonus      int    `json:"bonus"`
	PriceCents int    `json:"priceCents"`
	Tag        string `json:"tag"`
	OnSale     bool   `json:"onSale"`
}

type VipPlan struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	PriceCents int    `json:"priceCents"`
	Days       int    `json:"days"`
	Note       string `json:"note"`
	Tag        string `json:"tag"`
}

type TaskAmounts struct {
	Ad     int `json:"ad"`
	Watch  int `json:"watch"`
	Notify int `json:"notify"`
	Invite int `json:"invite"`
	Signin int `json:"signin"`
}

type Versions struct {
	AndroidMin    string `json:"androidMin"`
	AndroidLatest string `json:"androidLatest"`
	IosMin        string `json:"iosMin"`
	IosLatest     string `json:"iosLatest"`
}

type AppConfig struct {
	CoinsPerEpisode int         `json:"coinsPerEpisode"`
	FreeEpisodes    int         `json:"freeEpisodes"`
	AdsPerDay       int         `json:"adsPerDay"`
	VipBonus        int         `json:"vipBonus"`
	WelcomeCoins    int         `json:"welcomeCoins"`
	CoinPacks       []CoinPack  `json:"coinPacks"`
	VipPlans        []VipPlan   `json:"vipPlans"`
	Checkin         []int       `json:"checkin"`
	Tasks           TaskAmounts `json:"tasks"`
	Versions        Versions    `json:"versions"`
	Maintenance     bool        `json:"maintenance"`
	SupportEmail    string      `json:"supportEmail"`
}

func defaultConfig() AppConfig {
	return AppConfig{
		CoinsPerEpisode: 60, FreeEpisodes: 10, AdsPerDay: 3, VipBonus: 20, WelcomeCoins: 100,
		CoinPacks: []CoinPack{
			{ID: "coins_100", Coins: 100, Bonus: 100, PriceCents: 99, Tag: "First top-up x2", OnSale: true},
			{ID: "coins_500", Coins: 500, Bonus: 50, PriceCents: 499, Tag: "Popular", OnSale: true},
			{ID: "coins_1000", Coins: 1000, Bonus: 150, PriceCents: 999, OnSale: true},
			{ID: "coins_2000", Coins: 2000, Bonus: 400, PriceCents: 1999, OnSale: true},
			{ID: "coins_5000", Coins: 5000, Bonus: 1500, PriceCents: 4999, Tag: "Best value", OnSale: true},
			{ID: "coins_10000", Coins: 10000, Bonus: 4000, PriceCents: 9999, OnSale: true},
		},
		VipPlans: []VipPlan{
			{ID: "vip_weekly", Name: "Weekly", PriceCents: 499, Days: 7, Note: "Renews every 7 days"},
			{ID: "vip_monthly", Name: "Monthly", PriceCents: 1499, Days: 30, Note: "Renews every month", Tag: "Most popular"},
			{ID: "vip_yearly", Name: "Yearly", PriceCents: 9999, Days: 365, Note: "$8.33 a month · save 44%", Tag: "Best value"},
		},
		Checkin:      []int{10, 10, 15, 15, 20, 20, 50},
		Tasks:        TaskAmounts{Ad: 20, Watch: 30, Notify: 20, Invite: 50, Signin: 30},
		Versions:     Versions{AndroidMin: "1.0.0", AndroidLatest: "1.3.0", IosMin: "1.0.0", IosLatest: "1.3.0"},
		SupportEmail: "support@example.com",
	}
}

func (s *Server) config(ctx context.Context, q querier) (AppConfig, error) {
	c := defaultConfig()
	var raw string
	err := q.QueryRowContext(ctx, "SELECT value FROM config WHERE key = 'app'").Scan(&raw)
	if errors.Is(err, sql.ErrNoRows) {
		return c, nil
	}
	if err != nil {
		return c, err
	}
	if err := json.Unmarshal([]byte(raw), &c); err != nil {
		return c, err
	}
	return c, nil
}

func (s *Server) saveConfig(ctx context.Context, q querier, c AppConfig) error {
	_, err := q.ExecContext(ctx, "INSERT INTO config (key, value) VALUES ('app', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", mustJSON(c))
	return err
}

func (s *Server) maintenance(ctx context.Context) bool {
	c, err := s.config(ctx, s.db)
	return err == nil && c.Maintenance
}

// ---------- the viewer's own state ----------

type MeUser struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Initial  string `json:"initial"`
	Email    string `json:"email"`
	Via      string `json:"via"`
	Color    string `json:"color"`
	Role     string `json:"role"`
	SignedIn bool   `json:"signedIn"`
	Joined   int64  `json:"joined"`
}

type Subscription struct {
	State string `json:"state"` // none, pending, active, expired, failed
	Plan  string `json:"plan"`
	Until int64  `json:"until"`
}

type Progress struct {
	Ep      int   `json:"ep"`
	Updated int64 `json:"updated"`
}

type Checkin struct {
	Streak     int  `json:"streak"`
	CanCheckIn bool `json:"canCheckIn"`
	NextAmount int  `json:"nextAmount"`
}

type Ads struct {
	Left  int `json:"left"`
	Limit int `json:"limit"`
}

type Task struct {
	Key       string `json:"key"`
	Name      string `json:"name"`
	Amount    int    `json:"amount"`
	Note      string `json:"note"`
	Done      bool   `json:"done"`
	Claimable bool   `json:"claimable"`
}

type Me struct {
	User           MeUser              `json:"user"`
	Coins          int                 `json:"coins"`
	Subscription   Subscription        `json:"subscription"`
	Saved          []string            `json:"saved"`
	Liked          []string            `json:"liked"`
	Reminders      []string            `json:"reminders"`
	Unlocked       map[string][]int    `json:"unlocked"`
	Progress       map[string]Progress `json:"progress"`
	Checkin        Checkin             `json:"checkin"`
	Ads            Ads                 `json:"ads"`
	Tasks          []Task              `json:"tasks"`
	Settings       Settings            `json:"settings"`
	Notify         NotifyPrefs         `json:"notify"`
	NotifyPrompted bool                `json:"notifyPrompted"`
	Onboarded      bool                `json:"onboarded"`
	Genres         []string            `json:"genres"`
	Unread         int                 `json:"unread"`
	Muted          bool                `json:"muted"`
}

func (s *Server) vipActive(u *User) bool { return u.VipUntil > s.unix() }

// checkinState returns the streak that still counts (a missed day resets it) and whether today
// is still open.
func (s *Server) checkinState(u *User, amounts []int) Checkin {
	streak := u.CheckinStreak
	if u.CheckinLast != s.today() && u.CheckinLast != s.yesterday() {
		streak = 0
	}
	next := 0
	if len(amounts) > 0 {
		next = amounts[streak%len(amounts)]
	}
	return Checkin{Streak: streak, CanCheckIn: u.CheckinLast != s.today(), NextAmount: next}
}

func (s *Server) subscription(ctx context.Context, q querier, u *User) (Subscription, error) {
	now := s.unix()
	if u.VipUntil > now {
		return Subscription{State: "active", Plan: u.VipPlan, Until: ms(u.VipUntil)}, nil
	}
	var status, item string
	var at int64
	err := q.QueryRowContext(ctx, `SELECT status, item, created_at FROM payments WHERE user_id = ? AND kind = 'VIP'
		ORDER BY created_at DESC, id DESC LIMIT 1`, u.ID).Scan(&status, &item, &at)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return Subscription{}, err
	}
	switch {
	case err == nil && status == "Pending" && now-at < 7*86400:
		return Subscription{State: "pending", Plan: strings.TrimPrefix(item, "VIP ")}, nil
	case err == nil && status == "Failed" && now-at < 3*86400:
		return Subscription{State: "failed", Plan: strings.TrimPrefix(item, "VIP ")}, nil
	case u.VipUntil > 0:
		return Subscription{State: "expired", Plan: u.VipPlan, Until: ms(u.VipUntil)}, nil
	}
	return Subscription{State: "none"}, nil
}

func (s *Server) buildMe(ctx context.Context, userID int64) (*Me, error) {
	q := s.db
	u, err := loadUser(ctx, q, userID)
	if err != nil {
		return nil, err
	}
	cfg, err := s.config(ctx, q)
	if err != nil {
		return nil, err
	}
	m := &Me{
		User:  MeUser{ID: u.ID, Name: u.Name, Initial: initial(u.Name), Email: u.Email, Via: u.Via, Color: u.Color, Role: u.Role, SignedIn: u.SignedIn(), Joined: ms(u.CreatedAt)},
		Coins: u.Coins, Saved: []string{}, Liked: []string{}, Reminders: []string{},
		Unlocked: map[string][]int{}, Progress: map[string]Progress{},
		Settings: parseSettings(u.Settings), Notify: parseNotify(u.Notify), NotifyPrompted: u.NotifyPrompted,
		Onboarded: u.Onboarded, Genres: parseStrings(u.Genres), Muted: u.MutedUntil > s.unix(),
	}
	if m.Subscription, err = s.subscription(ctx, q, u); err != nil {
		return nil, err
	}

	rows, err := q.QueryContext(ctx, "SELECT drama_id, kind FROM user_dramas WHERE user_id = ? ORDER BY created_at DESC", u.ID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id, kind string
		if err := rows.Scan(&id, &kind); err != nil {
			rows.Close()
			return nil, err
		}
		switch kind {
		case "saved":
			m.Saved = append(m.Saved, id)
		case "liked":
			m.Liked = append(m.Liked, id)
		case "reminders":
			m.Reminders = append(m.Reminders, id)
		}
	}
	rows.Close()

	rows, err = q.QueryContext(ctx, "SELECT drama_id, n FROM unlocks WHERE user_id = ? ORDER BY drama_id, n", u.ID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id string
		var n int
		if err := rows.Scan(&id, &n); err != nil {
			rows.Close()
			return nil, err
		}
		m.Unlocked[id] = append(m.Unlocked[id], n)
	}
	rows.Close()

	rows, err = q.QueryContext(ctx, "SELECT drama_id, ep, updated_at FROM progress WHERE user_id = ?", u.ID)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var id string
		var p Progress
		if err := rows.Scan(&id, &p.Ep, &p.Updated); err != nil {
			rows.Close()
			return nil, err
		}
		p.Updated = ms(p.Updated)
		m.Progress[id] = p
	}
	rows.Close()

	var adsUsed, watchSec int
	var watchClaimed bool
	err = q.QueryRowContext(ctx, "SELECT ads, watch_sec, watch_claimed FROM daily WHERE user_id = ? AND day = ?", u.ID, s.today()).Scan(&adsUsed, &watchSec, &watchClaimed)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}
	m.Ads = Ads{Left: max(0, cfg.AdsPerDay-adsUsed), Limit: cfg.AdsPerDay}
	m.Checkin = s.checkinState(u, cfg.Checkin)

	if err := q.QueryRowContext(ctx, "SELECT COUNT(*) FROM inbox WHERE user_id = ? AND read = 0", u.ID).Scan(&m.Unread); err != nil {
		return nil, err
	}
	var invited int
	if err := q.QueryRowContext(ctx, "SELECT COUNT(*) FROM referrals WHERE inviter_id = ?", u.ID).Scan(&invited); err != nil {
		return nil, err
	}
	watchMin := min(30, watchSec/60)
	m.Tasks = []Task{
		{Key: "ad", Name: "Watch a short ad", Amount: cfg.Tasks.Ad, Note: itoa(min(adsUsed, cfg.AdsPerDay)) + "/" + itoa(cfg.AdsPerDay) + " today", Done: m.Ads.Left == 0},
		{Key: "watch", Name: "Watch 30 minutes today", Amount: cfg.Tasks.Watch, Note: itoa(watchMin) + "/30 min", Done: watchClaimed, Claimable: !watchClaimed && watchSec >= 1800},
		{Key: "notify", Name: "Turn on notifications", Amount: cfg.Tasks.Notify, Done: u.NotifyBonus, Claimable: !u.NotifyBonus},
		{Key: "invite", Name: "Invite a friend", Amount: cfg.Tasks.Invite, Note: plural(invited, "friend", "friends") + " joined"},
		{Key: "signin", Name: "Sign in with Google or email", Amount: cfg.Tasks.Signin, Done: u.SignedIn()},
	}
	return m, nil
}

// addCoins changes a balance and writes the wallet record in the same transaction.
func (s *Server) addCoins(ctx context.Context, q querier, userID int64, amount int, what string) error {
	if amount == 0 {
		return nil
	}
	res, err := q.ExecContext(ctx, "UPDATE users SET coins = coins + ? WHERE id = ? AND coins + ? >= 0", amount, userID, amount)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return fail(409, "Not enough coins")
	}
	_, err = q.ExecContext(ctx, "INSERT INTO wallet (user_id, amount, what, created_at) VALUES (?, ?, ?, ?)", userID, amount, what, s.unix())
	return err
}

func (s *Server) notifyUser(ctx context.Context, q querier, userID int64, kind, title, body, href string) error {
	_, err := q.ExecContext(ctx, "INSERT INTO inbox (user_id, kind, title, body, href, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		userID, kind, title, body, href, s.unix())
	return err
}
