package api

import (
	"context"
	"database/sql"
	"fmt"
	"math/rand/v2"
	"time"
)

// Sample data for a fresh database: the catalogue from the design, a few hundred viewers'
// worth of activity so rankings and the admin dashboard have something to show, and the
// staff accounts for each admin role. Every person and order here is made up.

type seedDrama struct {
	id, title, synopsis string
	genres              []string
	episodes, free      int
	coins               int
	status              string
	completed           bool
	color, color2       string
	badge               string
	releaseDays         int // relative to today; negative is in the past
	published           int // episodes already published (0 = all)
	views               int // daily plays at the seed
	rising              bool
}

var seedDramas = []seedDrama{
	{"contract-bride", "The Billionaire's Contract Bride", "To pay her father's hospital bills, Lin Xia signs a one-year marriage contract with the coldest CEO in the city. No feelings, no questions. Then his ex-fiancée comes back, and the contract starts to burn.", []string{"Romance", "CEO", "Contract marriage"}, 80, 10, 60, "Published", true, "#5B2333", "#7A3546", "Hot", -5, 0, 900, false},
	{"reborn-empire", "Reborn to Rule the Empire", "Poisoned by the sister she trusted, the empress wakes up ten years earlier with every memory intact. This time she will choose the throne, and the man beside it.", []string{"Rebirth", "Revenge", "Historical"}, 72, 10, 60, "Published", true, "#3B2A5E", "#52407E", "Exclusive", -11, 0, 820, false},
	{"hidden-heir", "My Bodyguard Is a Hidden Heir", "She hired the quietest bodyguard in Yangon. She did not know he owns the company that is trying to buy hers.", []string{"Hidden identity", "Romance"}, 60, 10, 60, "Published", true, "#1F3A5B", "#2F5480", "New", -1, 0, 700, true},
	{"divorced-ceo", "Divorced, Now I'm the CEO", "Thrown out after three years of marriage, she returns as the head of the company that owns his.", []string{"Revenge", "Urban"}, 90, 8, 50, "Published", false, "#5E3A1F", "#80532F", "Hot", -22, 36, 640, false},
	{"alpha-king", "The Alpha King's Lost Mate", "Rejected on her wedding night, she runs. Five years later the Alpha King finds her, and the son he never knew about.", []string{"Werewolf", "Second chance"}, 68, 12, 60, "Published", true, "#2C4A3A", "#3E6651", "", -6, 0, 560, false},
	{"true-daughter", "Revenge of the True Daughter", "Switched at birth and raised in a village, the real heiress comes home. The fake daughter has had twenty years to prepare.", []string{"Family", "Revenge"}, 75, 10, 60, "Published", true, "#4A1F3D", "#683058", "New", -2, 0, 520, true},
	{"night-market", "Hidden Master of the Night Market", "He sells noodles by night. The city's gangs are about to learn who taught their bosses to fight.", []string{"Martial arts", "Hidden identity"}, 64, 10, 60, "Published", true, "#26324F", "#38486F", "", -5, 0, 430, false},
	{"rival-contract", "Love Contract With My Rival", "Two rival chefs fake a relationship for a TV contest. The cameras are not the only ones fooled.", []string{"Sweet love", "Romance"}, 58, 10, 60, "Published", true, "#5A2A2A", "#7A3D3D", "", -3, 0, 400, true},
	{"runaway-bride", "The Emperor's Runaway Bride", "She escaped the palace on her wedding day. He became emperor the same night, and he never stopped looking.", []string{"Historical", "Romance"}, 82, 10, 60, "Published", true, "#4D3B1E", "#6E552D", "", -4, 0, 300, false},
	{"duke-maid", "The Duke Who Married a Maid", "A duke needs a wife by midnight. The maid who spilled wine on him will do.", []string{"Romance", "Historical"}, 66, 10, 60, "Scheduled", true, "#3A2A4E", "#52406E", "", 2, 0, 0, false},
	{"ex-husband", "My Ex-Husband Begs Again", "He chose his first love over her. Now she is engaged to his boss.", []string{"Revenge"}, 70, 10, 60, "Draft", false, "#4E2A2A", "#6E3D3D", "", 5, 12, 0, false},
}

var episodeTitles = []string{
	"The contract", "A cold welcome", "Rules of the house", "The ex-fiancée returns", "The first lie", "A dinner gone wrong",
	"Behind closed doors", "The hospital bill", "Jealousy", "One kiss changes everything", "The secret letter", "Caught",
	"A deal with the devil", "The board meeting", "Breaking point", "The truth comes out",
}

type seedUser struct {
	id               int64
	name, email, via string
	color, role      string
	coins            int
	vipPlan          string
	vipDays          int
	joinedDays       int
	banned           bool
}

var seedUsers = []seedUser{
	{10280001, "Demo owner", demoOwnerEmail, "Email code", "#E0245E", "Owner", 0, "", 0, 120, false},
	{10280002, "Content editor", "editor@example.com", "Google", "#2F5480", "Editor", 0, "", 0, 110, false},
	{10280003, "Support agent", "support@example.com", "Email code", "#3E6651", "Support", 0, "", 0, 100, false},
	{10280004, "Moderator", "mod@example.com", "Google", "#52407E", "Moderator", 0, "", 0, 95, false},
	{10293847, "Mya Thandar", "mya@example.com", "Google", "#7A3546", "", 245, "Monthly", 31, 21, false},
	{10293112, "Ko Zaw", "zaw@example.com", "Email code", "#2F5480", "", 1020, "", 0, 25, false},
	{10292004, "Lin", "lin@example.com", "Apple", "#3E6651", "", 60, "Weekly", 9, 38, false},
	{10291876, "Su Su", "susu@example.com", "Google", "#52407E", "", 0, "", 0, 42, false},
	{10290455, "Aung", "aung@example.com", "Google", "#80532F", "", 3400, "Yearly", 322, 54, false},
	{10289930, "Kyaw Kyaw", "kyaw@example.com", "Email code", "#683058", "", 15, "", 0, 62, true},
	{10289210, "Nandar", "nandar@example.com", "Google", "#38486F", "", 410, "", 0, 65, false},
	{10288001, "Thu Zar", "thuzar@example.com", "Apple", "#6E552D", "", 90, "Weekly", 7, 83, false},
	{10287001, "Ray", "ray@example.com", "Google", "#38486F", "", 120, "", 0, 30, false},
	{10287002, "Phyo", "phyo@example.com", "Email code", "#80532F", "", 75, "", 0, 33, false},
}

func (s *Server) seed(ctx context.Context) error {
	rng := rand.New(rand.NewPCG(2026, 10))
	now := s.now().In(s.loc)
	midnight := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, s.loc)
	at := func(days, hour, minute int) int64 {
		return midnight.AddDate(0, 0, days).Add(time.Duration(hour)*time.Hour + time.Duration(minute)*time.Minute).Unix()
	}
	return s.tx(ctx, func(tx *sql.Tx) error {
		exec := func(q string, args ...any) error {
			_, err := tx.ExecContext(ctx, q, args...)
			return err
		}
		cfg := defaultConfig()
		if err := s.saveConfig(ctx, tx, cfg); err != nil {
			return err
		}

		// Dramas and episodes.
		for _, d := range seedDramas {
			if err := exec(`INSERT INTO dramas (id, title, synopsis, genres, total_episodes, free_episodes, coins_per_episode, status, completed, color, color2, badge,
				release_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				d.id, d.title, d.synopsis, mustJSON(d.genres), d.episodes, d.free, d.coins, d.status, d.completed, d.color, d.color2, d.badge,
				at(d.releaseDays, 20, 0), at(d.releaseDays-14, 10, 0), at(min(0, d.releaseDays), 9, 0)); err != nil {
				return err
			}
			rows := d.episodes
			if d.published > 0 {
				rows = d.published
			}
			for n := 1; n <= rows; n++ {
				published := d.status != "Draft"
				status := "None"
				if d.id == "reborn-empire" && n == 42 {
					published, status = false, "Failed"
				}
				if err := exec(`INSERT INTO episodes (drama_id, n, title, length_sec, free, published, video_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
					d.id, n, episodeTitles[(n-1)%len(episodeTitles)], 75+(n*37)%50, n <= d.free, published, status, at(min(0, d.releaseDays), 9, 0)); err != nil {
					return err
				}
			}
			// Plays per day since release; rising dramas are concentrated in the last three days.
			for back := 13; back >= 0; back-- {
				if -back < d.releaseDays || d.views == 0 {
					continue
				}
				v := d.views/2 + rng.IntN(d.views/4+1)
				if d.rising && back <= 2 {
					v *= 3
				}
				if err := exec("INSERT INTO views (drama_id, day, count) VALUES (?, ?, ?)", d.id, s.day(midnight.AddDate(0, 0, -back)), v); err != nil {
					return err
				}
			}
		}

		// Staff and named sample viewers.
		named := []int64{}
		for _, u := range seedUsers {
			status := "Active"
			if u.banned {
				status = "Banned"
			}
			vipUntil := int64(0)
			if u.vipDays > 0 {
				vipUntil = at(u.vipDays, 20, 0)
			}
			if err := exec(`INSERT INTO users (id, name, email, via, color, role, status, coins, vip_plan, vip_until, onboarded, signin_bonus, created_at, last_seen)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`, u.id, u.name, u.email, u.via, u.color, u.role, status, u.coins, u.vipPlan, vipUntil,
				at(-u.joinedDays, 11, 0), at(0, 8, 0)); err != nil {
				return err
			}
			if u.role == "" {
				named = append(named, u.id)
			}
		}

		// Anonymous sample viewers spread over the last 90 days.
		viewers := append([]int64{}, named...)
		for i := 0; i < 160; i++ {
			id := int64(10200000 + i)
			name := fmt.Sprintf("Viewer %d", 1000+i)
			via := []string{"Google", "Google", "Email code", "Apple"}[rng.IntN(4)]
			if err := exec(`INSERT INTO users (id, name, email, via, color, coins, onboarded, signin_bonus, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
				id, name, fmt.Sprintf("viewer%d@example.com", 1000+i), via, avatarColors[i%len(avatarColors)], rng.IntN(400),
				at(-rng.IntN(90), 8+rng.IntN(14), rng.IntN(60)), at(-rng.IntN(5), 9, 0)); err != nil {
				return err
			}
			viewers = append(viewers, id)
		}

		// Saves, progress and unlocks. Weights roughly follow each drama's popularity.
		saveWeight := map[string]int{"reborn-empire": 60, "contract-bride": 55, "alpha-king": 45, "divorced-ceo": 40, "night-market": 30, "runaway-bride": 25, "hidden-heir": 25, "true-daughter": 20, "rival-contract": 15}
		for id, w := range saveWeight {
			for _, uid := range pick(rng, viewers, w) {
				if err := exec("INSERT OR IGNORE INTO user_dramas (user_id, drama_id, kind, created_at) VALUES (?, ?, 'saved', ?)", uid, id, at(-rng.IntN(10), 20, 0)); err != nil {
					return err
				}
			}
		}
		for _, uid := range pick(rng, viewers, 30) {
			if err := exec("INSERT OR IGNORE INTO user_dramas (user_id, drama_id, kind, created_at) VALUES (?, 'duke-maid', 'reminders', ?)", uid, at(-rng.IntN(5), 21, 0)); err != nil {
				return err
			}
		}
		for _, d := range seedDramas {
			if d.status != "Published" {
				continue
			}
			eps := d.episodes
			if d.published > 0 {
				eps = d.published
			}
			for _, uid := range pick(rng, viewers, d.views/20) {
				ep := 1 + rng.IntN(eps)
				if err := exec("INSERT OR IGNORE INTO progress (user_id, drama_id, ep, updated_at) VALUES (?, ?, ?, ?)", uid, d.id, ep, at(-rng.IntN(7), 21, rng.IntN(60))); err != nil {
					return err
				}
				for n := d.free + 1; n <= ep && n <= d.free+6; n++ {
					via := []string{"coins", "coins", "ad"}[rng.IntN(3)]
					if err := exec("INSERT OR IGNORE INTO unlocks (user_id, drama_id, n, via, created_at) VALUES (?, ?, ?, ?, ?)", uid, d.id, n, via, at(-rng.IntN(7), 20, rng.IntN(60))); err != nil {
						return err
					}
				}
			}
		}

		// Mya's own history, so signing in as mya@example.com shows a lived-in account.
		mya := int64(10293847)
		for _, p := range []struct {
			id string
			ep int
			d  int
		}{{"divorced-ceo", 34, -1}, {"alpha-king", 12, -2}, {"reborn-empire", 61, -3}} {
			if err := exec("INSERT OR REPLACE INTO progress (user_id, drama_id, ep, updated_at) VALUES (?, ?, ?, ?)", mya, p.id, p.ep, at(p.d, 22, 0)); err != nil {
				return err
			}
		}
		for _, w := range []struct {
			what   string
			amount int
			when   int64
		}{
			{"Invited a friend", 50, at(-3, 18, 5)},
			{"Bought 550 coins", 550, at(-2, 14, 41)},
			{"Watched a short ad", 20, at(-1, 20, 30)},
			{"Unlocked EP 35 · Divorced, Now I'm the CEO", -50, at(-1, 23, 48)},
		} {
			if err := exec("INSERT INTO wallet (user_id, amount, what, created_at) VALUES (?, ?, ?, ?)", mya, w.amount, w.what, w.when); err != nil {
				return err
			}
		}
		for _, n := range []struct{ kind, title, body, href string }{
			{"ep", "EP 36 is out", "Divorced, Now I'm the CEO has a new episode.", "/watch/divorced-ceo/?ep=36"},
			{"ep", "Coming soon: The Duke Who Married a Maid", "You set a reminder. We'll tell you on premiere day.", "/new/"},
		} {
			if err := exec("INSERT INTO inbox (user_id, kind, title, body, href, created_at) VALUES (?, ?, ?, ?, ?, ?)", mya, n.kind, n.title, n.body, n.href, at(-1, 8, 0)); err != nil {
				return err
			}
		}

		// Payments over 90 days: mostly paid, a few failed or refunded, two still pending.
		order := 3200
		for back := 89; back >= 0; back-- {
			for i := 0; i < 3+rng.IntN(6); i++ {
				uid := viewers[rng.IntN(len(viewers))]
				status := "Paid"
				switch r := rng.IntN(40); {
				case r == 0:
					status = "Refunded"
				case r < 3:
					status = "Failed"
				}
				store := []string{"Google Play", "Google Play", "App Store"}[rng.IntN(3)]
				kind, product, item, cents := "Coins", "", "", 0
				if rng.IntN(4) == 0 {
					p := cfg.VipPlans[rng.IntN(len(cfg.VipPlans))]
					kind, product, item, cents = "VIP", p.ID, "VIP "+p.Name, p.PriceCents
				} else {
					p := cfg.CoinPacks[min(rng.IntN(5), rng.IntN(6))]
					product, item, cents = p.ID, fmt.Sprintf("%d coins", p.Coins+p.Bonus), p.PriceCents
				}
				order++
				orderNo := fmt.Sprintf("GPA.%04d-%04d", order, rng.IntN(10000))
				if store == "App Store" {
					orderNo = fmt.Sprintf("2000000%04d", order)
				}
				when := at(-back, 7+rng.IntN(16), rng.IntN(60))
				if back == 0 && when > s.unix() {
					when = s.unix() - int64(rng.IntN(3600))
				}
				if err := exec(`INSERT INTO payments (order_no, user_id, kind, product_id, item, amount_cents, store, status, created_at, updated_at)
					VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, orderNo, uid, kind, product, item, cents, store, status, when, when); err != nil {
					return err
				}
			}
		}
		for i, p := range []struct {
			uid     int64
			product string
			item    string
			cents   int
			store   string
		}{{10293112, "vip_monthly", "VIP Monthly", 1499, "App Store"}, {10289210, "coins_1000", "1150 coins", 999, "Google Play"}} {
			when := s.unix() - int64(2+i)*3600
			if err := exec(`INSERT INTO payments (order_no, user_id, kind, product_id, item, amount_cents, store, status, created_at, updated_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`, fmt.Sprintf("GPA.PEND-%04d", i+1), p.uid, map[bool]string{true: "VIP", false: "Coins"}[p.product == "vip_monthly"], p.product, p.item, p.cents, p.store, when, when); err != nil {
				return err
			}
		}

		// Comments, and the reported ones waiting for a moderator.
		comments := []struct {
			uid   int64
			drama string
			ep    int
			text  string
			days  int
		}{
			{10293847, "contract-bride", 1, "He finally noticed her! I screamed at 0:58", -1},
			{10293112, "contract-bride", 1, "The ex-fiancée is going to regret this so much.", -1},
			{10292004, "contract-bride", 1, "Who else unlocked all 80 in one night?", -2},
			{10291876, "contract-bride", 1, "The contract scene in EP 1 hits different now.", -2},
			{10290455, "contract-bride", 1, "Need season 2 please", -3},
			{10293847, "divorced-ceo", 1, "Best revenge drama this year.", -2},
			{10288001, "alpha-king", 1, "The son! I did not see that coming.", -1},
			{10289210, "reborn-empire", 1, "She is so calm this time, I love it.", -3},
		}
		for _, c := range comments {
			if err := exec("INSERT INTO comments (user_id, drama_id, ep, text, created_at) VALUES (?, ?, ?, ?, ?)", c.uid, c.drama, c.ep, c.text, at(c.days, 21, rng.IntN(60))); err != nil {
				return err
			}
		}
		reported := []struct {
			uid     int64
			drama   string
			ep      int
			text    string
			reason  string
			reports int
		}{
			{10289930, "reborn-empire", 12, "Free coins here!!! visit my page for unlimited VIP", "spam", 4},
			{10287001, "divorced-ceo", 33, "Lol she becomes the CEO in EP 60 and he loses everything", "spoiler", 3},
			{10287002, "contract-bride", 4, "[Comment text held for review]", "harassment", 2},
		}
		for i, c := range reported {
			res, err := tx.ExecContext(ctx, "INSERT INTO comments (user_id, drama_id, ep, text, state, reports, reasons, created_at) VALUES (?, ?, ?, ?, 'Reported', ?, ?, ?)",
				c.uid, c.drama, c.ep, c.text, c.reports, c.reason, at(-i, 10, 2))
			if err != nil {
				return err
			}
			cid, _ := res.LastInsertId()
			for _, uid := range pick(rng, named, c.reports) {
				if err := exec("INSERT OR IGNORE INTO comment_reports (comment_id, user_id, reason, created_at) VALUES (?, ?, ?, ?)", cid, uid, c.reason, at(-i, 11, 0)); err != nil {
					return err
				}
			}
		}

		// Home curation.
		for _, sl := range []struct {
			section, id, meta string
			pos               int
		}{
			{"banner", "contract-bride", "Featured this week", 0}, {"banner", "duke-maid", "Premiere", 1}, {"banner", "divorced-ceo", "Always on", 2},
			{"trending", "reborn-empire", "Pinned", 0}, {"trending", "hidden-heir", "Pinned", 1},
			{"soon", "duke-maid", "Premieres soon", 0},
		} {
			if err := exec("INSERT INTO home_slots (section, pos, drama_id, meta) VALUES (?, ?, ?, ?)", sl.section, sl.pos, sl.id, sl.meta); err != nil {
				return err
			}
		}

		// Notification history, one still scheduled before the Duke premiere.
		for _, c := range []struct {
			title, body, audience, drama, status string
			when                                 int64
			sent                                 int
		}{
			{"Coming soon: The Duke Who Married a Maid", "A duke needs a wife by midnight. Premieres in two days.", "Everyone", "", "Scheduled", at(2, 19, 0), 0},
			{"EP 35 is out", "She walks into the board meeting. He has no idea who she is.", "Followers", "divorced-ceo", "Sent", at(-1, 20, 0), 38},
			{"Weekend VIP deal", "Monthly VIP, every episode unlocked.", "Not VIP", "", "Sent", at(-5, 10, 0), 141},
		} {
			if err := exec(`INSERT INTO campaigns (title, body, audience, drama_id, send_at, status, sent_count, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'Content editor', ?)`,
				c.title, c.body, c.audience, c.drama, c.when, c.status, c.sent, at(-6, 9, 0)); err != nil {
				return err
			}
		}

		// Audit log, trending searches and a help message.
		for _, a := range []struct {
			who, what string
			when      int64
		}{
			{"Demo owner", "Changed coins per episode 50 → 60", at(-1, 18, 40)},
			{"Moderator", "Hid a comment by Kyaw Kyaw · spam", at(0, 10, 5)},
			{"Content editor", "Published EP 36 of Divorced, Now I'm the CEO", at(0, 13, 20)},
			{"Support agent", "Added 100 coins to Mya Thandar · Refund for playback problem", at(0, 14, 58)},
		} {
			if err := exec("INSERT INTO audit (who, what, created_at) VALUES (?, ?, ?)", a.who, a.what, min(a.when, s.unix()-60)); err != nil {
				return err
			}
		}
		for i, q := range []string{"Contract bride", "Hidden heir", "Rebirth revenge", "Alpha king", "Divorced CEO", "True daughter", "Runaway bride", "Night market", "Sweet love", "Bodyguard"} {
			for k := 0; k < 20-i*2; k++ {
				if err := exec("INSERT INTO searches (q, created_at) VALUES (?, ?)", q, s.unix()-int64(rng.IntN(7*86400))); err != nil {
					return err
				}
			}
		}
		return exec("INSERT INTO help_messages (user_id, email, topic, message, created_at) VALUES (?, ?, ?, ?, ?)",
			10291876, "susu@example.com", "Payment or coins", "I bought 200 coins but the payment failed and I was charged. Order 2000000735.", s.unix()-5*3600)
	})
}

// pick returns up to n distinct ids chosen at random.
func pick(rng *rand.Rand, ids []int64, n int) []int64 {
	idx := rng.Perm(len(ids))
	out := []int64{}
	for i := 0; i < n && i < len(idx); i++ {
		out = append(out, ids[idx[i]])
	}
	return out
}
