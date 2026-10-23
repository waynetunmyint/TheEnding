package api

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"sort"
	"strconv"
	"strings"
)

var Genres = []string{"Romance", "CEO", "Revenge", "Rebirth", "Werewolf", "Family", "Historical", "Hidden identity", "Sweet love", "Martial arts", "Urban", "Contract marriage", "Second chance"}

func itoa(n int) string { return strconv.Itoa(n) }

func plural(n int, one, many string) string {
	if n == 1 {
		return "1 " + one
	}
	return itoa(n) + " " + many
}

type Drama struct {
	ID              string   `json:"id"`
	Title           string   `json:"title"`
	Synopsis        string   `json:"synopsis"`
	Genres          []string `json:"genres"`
	Episodes        int      `json:"episodes"`      // published episodes
	TotalEpisodes   int      `json:"totalEpisodes"` // planned episodes
	FreeEpisodes    int      `json:"freeEpisodes"`
	CoinsPerEpisode int      `json:"coinsPerEpisode"`
	Status          string   `json:"status"`
	Completed       bool     `json:"completed"`
	Color           string   `json:"color"`
	Color2          string   `json:"color2"`
	Badge           string   `json:"badge"`
	Language        string   `json:"language"`
	ReleaseAt       int64    `json:"releaseAt"`
	Poster          string   `json:"poster"`
	Banner          string   `json:"banner"`
	UpdatedAt       int64    `json:"updatedAt"`
}

type Episode struct {
	N        int    `json:"n"`
	Title    string `json:"title"`
	Length   int    `json:"length"`
	Free     bool   `json:"free"`
	HasVideo bool   `json:"hasVideo"`
}

const dramaColumns = `d.id, d.title, d.synopsis, d.genres, d.total_episodes, d.free_episodes, d.coins_per_episode, d.status,
	d.completed, d.color, d.color2, d.badge, d.language, d.release_at, d.poster, d.banner, d.updated_at,
	(SELECT COUNT(*) FROM episodes e WHERE e.drama_id = d.id AND e.published = 1)`

func scanDrama(row interface{ Scan(...any) error }) (*Drama, error) {
	d := &Drama{}
	var genres string
	if err := row.Scan(&d.ID, &d.Title, &d.Synopsis, &genres, &d.TotalEpisodes, &d.FreeEpisodes, &d.CoinsPerEpisode, &d.Status,
		&d.Completed, &d.Color, &d.Color2, &d.Badge, &d.Language, &d.ReleaseAt, &d.Poster, &d.Banner, &d.UpdatedAt, &d.Episodes); err != nil {
		return nil, err
	}
	d.Genres = parseStrings(genres)
	d.ReleaseAt = ms(d.ReleaseAt)
	d.UpdatedAt = ms(d.UpdatedAt)
	return d, nil
}

func (s *Server) dramas(ctx context.Context, q querier, where string, args ...any) ([]*Drama, error) {
	rows, err := q.QueryContext(ctx, "SELECT "+dramaColumns+" FROM dramas d "+where, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []*Drama{}
	for rows.Next() {
		d, err := scanDrama(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *Server) drama(ctx context.Context, q querier, id string) (*Drama, error) {
	d, err := scanDrama(q.QueryRowContext(ctx, "SELECT "+dramaColumns+" FROM dramas d WHERE d.id = ?", id))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errNotFound
	}
	return d, err
}

func (s *Server) catalogRoutes() {
	s.handle("GET /api/health", public, "", func(r *Req) (any, error) {
		if err := s.db.PingContext(r.Context()); err != nil {
			return nil, err
		}
		return map[string]any{"ok": true, "time": ms(s.unix())}, nil
	})
	s.handle("GET /api/config", public, "", s.getConfig)
	s.handle("GET /api/dramas", public, "", s.getDramas)
	s.handle("GET /api/dramas/{id}", public, "", s.getDrama)
	s.handle("GET /api/home", public, "", s.getHome)
	s.handle("GET /api/rankings", public, "", s.getRankings)
	s.handle("GET /api/search", public, "", s.getSearch)
	s.handle("GET /api/search/trending", public, "", s.getTrendingSearches)
}

func (s *Server) getConfig(r *Req) (any, error) {
	c, err := s.config(r.Context(), s.db)
	if err != nil {
		return nil, err
	}
	packs := []CoinPack{}
	for _, p := range c.CoinPacks {
		if p.OnSale {
			packs = append(packs, p)
		}
	}
	return map[string]any{
		"coinPacks": packs, "vipPlans": c.VipPlans, "checkin": c.Checkin, "adsPerDay": c.AdsPerDay, "tasks": c.Tasks,
		"vipBonus": c.VipBonus, "coinsPerEpisode": c.CoinsPerEpisode, "supportEmail": c.SupportEmail,
		"maintenance": c.Maintenance, "versions": c.Versions, "genres": Genres,
	}, nil
}

// Viewers see published dramas and announced (scheduled) ones; drafts stay in the admin panel.
const viewerVisible = "WHERE d.status IN ('Published', 'Scheduled')"

func (s *Server) getDramas(r *Req) (any, error) {
	return s.dramas(r.Context(), s.db, viewerVisible+" ORDER BY d.release_at DESC")
}

func (s *Server) getDrama(r *Req) (any, error) {
	d, err := s.drama(r.Context(), s.db, r.PathValue("id"))
	if err != nil {
		return nil, err
	}
	if d.Status == "Draft" {
		return nil, errNotFound
	}
	eps, err := s.episodes(r.Context(), s.db, d.ID, true)
	if err != nil {
		return nil, err
	}
	return map[string]any{"drama": d, "episodes": eps}, nil
}

func (s *Server) episodes(ctx context.Context, q querier, dramaID string, publishedOnly bool) ([]Episode, error) {
	where := ""
	if publishedOnly {
		where = " AND published = 1"
	}
	rows, err := q.QueryContext(ctx, "SELECT n, title, length_sec, free, video_status = 'Ready' FROM episodes WHERE drama_id = ?"+where+" ORDER BY n", dramaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Episode{}
	for rows.Next() {
		var e Episode
		if err := rows.Scan(&e.N, &e.Title, &e.Length, &e.Free, &e.HasVideo); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// ---------- rankings ----------

type rankings struct {
	Hot       []string `json:"Hot"`
	Rising    []string `json:"Rising"`
	MostSaved []string `json:"Most saved"`
	Completed []string `json:"Completed"`
}

// rank orders published dramas by recent activity: plays (views) and unlocks over the last 7
// days for Hot, the last 3 days against the 4 before for Rising, and saves for Most saved.
func (s *Server) rank(ctx context.Context) (rankings, error) {
	pub, err := s.dramas(ctx, s.db, "WHERE d.status = 'Published'")
	if err != nil {
		return rankings{}, err
	}
	now := s.now()
	day := func(back int) string { return s.day(now.AddDate(0, 0, -back)) }
	hot, recent, before, saved := map[string]float64{}, map[string]float64{}, map[string]float64{}, map[string]float64{}

	rows, err := s.db.QueryContext(ctx, "SELECT drama_id, day, count FROM views WHERE day >= ?", day(6))
	if err != nil {
		return rankings{}, err
	}
	for rows.Next() {
		var id, d string
		var n float64
		if err := rows.Scan(&id, &d, &n); err != nil {
			rows.Close()
			return rankings{}, err
		}
		hot[id] += n
		if d >= day(2) {
			recent[id] += n
		} else {
			before[id] += n
		}
	}
	rows.Close()
	if err := scanCounts(ctx, s.db, hot, 2, "SELECT drama_id, COUNT(*) FROM unlocks WHERE created_at >= ? GROUP BY drama_id", now.AddDate(0, 0, -7).Unix()); err != nil {
		return rankings{}, err
	}
	if err := scanCounts(ctx, s.db, saved, 1, "SELECT drama_id, COUNT(*) FROM user_dramas WHERE kind = 'saved' GROUP BY drama_id"); err != nil {
		return rankings{}, err
	}
	rising := map[string]float64{}
	for _, d := range pub {
		// Daily rate in the last 3 days over the daily rate in the 4 days before.
		rising[d.ID] = (recent[d.ID]/3 + 1) / (before[d.ID]/4 + 1)
	}
	order := func(score map[string]float64, keep func(*Drama) bool) []string {
		list := []*Drama{}
		for _, d := range pub {
			if keep == nil || keep(d) {
				list = append(list, d)
			}
		}
		sort.SliceStable(list, func(i, j int) bool {
			if score[list[i].ID] != score[list[j].ID] {
				return score[list[i].ID] > score[list[j].ID]
			}
			return list[i].ReleaseAt > list[j].ReleaseAt
		})
		ids := []string{}
		for _, d := range list {
			ids = append(ids, d.ID)
		}
		return ids
	}
	return rankings{
		Hot:       order(hot, nil),
		Rising:    order(rising, nil),
		MostSaved: order(saved, nil),
		Completed: order(hot, func(d *Drama) bool { return d.Completed }),
	}, nil
}

func scanCounts(ctx context.Context, q querier, into map[string]float64, weight float64, query string, args ...any) error {
	rows, err := q.QueryContext(ctx, query, args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var id string
		var n float64
		if err := rows.Scan(&id, &n); err != nil {
			return err
		}
		into[id] += n * weight
	}
	return rows.Err()
}

func (s *Server) getRankings(r *Req) (any, error) {
	return s.rank(r.Context())
}

func (s *Server) slots(ctx context.Context, section string) ([]string, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT h.drama_id FROM home_slots h JOIN dramas d ON d.id = h.drama_id
		WHERE h.section = ? AND d.status IN ('Published', 'Scheduled') ORDER BY h.pos`, section)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (s *Server) getHome(r *Req) (any, error) {
	ctx := r.Context()
	banner, err := s.slots(ctx, "banner")
	if err != nil {
		return nil, err
	}
	pinned, err := s.slots(ctx, "trending")
	if err != nil {
		return nil, err
	}
	soon, err := s.slots(ctx, "soon")
	if err != nil {
		return nil, err
	}
	rk, err := s.rank(ctx)
	if err != nil {
		return nil, err
	}
	trending := uniq(append(append([]string{}, pinned...), rk.Hot...))
	if len(trending) > 8 {
		trending = trending[:8]
	}
	// Upcoming dramas not curated by hand still show, after the curated ones.
	scheduled, err := s.dramas(ctx, s.db, "WHERE d.status = 'Scheduled' ORDER BY d.release_at")
	if err != nil {
		return nil, err
	}
	for _, d := range scheduled {
		soon = append(soon, d.ID)
	}
	soon = uniq(soon)

	// Picked for you: published dramas outside the top three, the viewer's favourite genres first.
	liked := map[string]bool{}
	if r.User != nil {
		for _, g := range parseStrings(r.User.Genres) {
			liked[g] = true
		}
	}
	hotPos := map[string]int{}
	for i, id := range rk.Hot {
		hotPos[id] = i
	}
	pub, err := s.dramas(ctx, s.db, "WHERE d.status = 'Published'")
	if err != nil {
		return nil, err
	}
	top := map[string]bool{}
	for i := 0; i < 3 && i < len(trending); i++ {
		top[trending[i]] = true
	}
	match := func(d *Drama) int {
		n := 0
		for _, g := range d.Genres {
			if liked[g] {
				n++
			}
		}
		return n
	}
	picks := []*Drama{}
	for _, d := range pub {
		if !top[d.ID] {
			picks = append(picks, d)
		}
	}
	sort.SliceStable(picks, func(i, j int) bool {
		if mi, mj := match(picks[i]), match(picks[j]); mi != mj {
			return mi > mj
		}
		return hotPos[picks[i].ID] < hotPos[picks[j].ID]
	})
	pickIDs := []string{}
	for _, d := range picks {
		pickIDs = append(pickIDs, d.ID)
	}
	if len(banner) == 0 && len(rk.Hot) > 0 {
		banner = rk.Hot[:1]
	}
	return map[string]any{"banner": banner, "trending": trending, "soon": soon, "picks": pickIDs, "hot": rk.Hot}, nil
}

func uniq(ids []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			out = append(out, id)
		}
	}
	return out
}

// ---------- search ----------

func (s *Server) getSearch(r *Req) (any, error) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if len(q) > 100 {
		q = q[:100]
	}
	words := strings.Fields(strings.ToLower(q))
	if len(words) == 0 {
		return map[string]any{"results": []string{}}, nil
	}
	pub, err := s.dramas(r.Context(), s.db, "WHERE d.status = 'Published'")
	if err != nil {
		return nil, err
	}
	type hit struct {
		id    string
		score int
	}
	hits := []hit{}
	for _, d := range pub {
		title := strings.ToLower(d.Title)
		rest := strings.ToLower(strings.Join(d.Genres, " ") + " " + d.Synopsis)
		score := 0
		for _, w := range words {
			if strings.Contains(title, w) {
				score += 3
			} else if strings.Contains(rest, w) {
				score++
			}
		}
		if score > 0 {
			hits = append(hits, hit{d.ID, score})
		}
	}
	sort.SliceStable(hits, func(i, j int) bool { return hits[i].score > hits[j].score })
	ids := []string{}
	for _, h := range hits {
		ids = append(ids, h.id)
	}
	if len(q) >= 2 && len(ids) > 0 {
		if _, err := s.db.ExecContext(r.Context(), "INSERT INTO searches (q, created_at) VALUES (?, ?)", q, s.unix()); err != nil {
			return nil, err
		}
	}
	return map[string]any{"results": ids}, nil
}

func (s *Server) getTrendingSearches(r *Req) (any, error) {
	rows, err := s.db.QueryContext(r.Context(), `SELECT q FROM searches WHERE created_at > ?
		GROUP BY lower(q) ORDER BY COUNT(*) DESC, MAX(created_at) DESC LIMIT 10`, s.unix()-14*86400)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var q string
		if err := rows.Scan(&q); err != nil {
			return nil, err
		}
		out = append(out, q)
	}
	return out, rows.Err()
}

func badRequest(msg string) error { return fail(http.StatusBadRequest, "%s", msg) }
