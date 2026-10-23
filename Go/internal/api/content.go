package api

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

func (s *Server) adminContentRoutes() {
	s.handle("GET /api/admin/dramas", staff, "", s.getAdminDramas)
	s.handle("POST /api/admin/dramas", staff, "content", s.postDrama)
	s.handle("GET /api/admin/dramas/{id}", staff, "", s.getAdminDrama)
	s.handle("PUT /api/admin/dramas/{id}", staff, "content", s.putDrama)
	s.handle("POST /api/admin/dramas/{id}/image", staff, "content", s.postDramaImage)
	s.handle("GET /api/admin/dramas/{id}/episodes", staff, "", s.getAdminEpisodes)
	s.handle("PATCH /api/admin/dramas/{id}/episodes", staff, "content", s.patchEpisodes)
	s.handle("POST /api/admin/dramas/{id}/episodes/{n}/video", staff, "content", s.postEpisodeVideo)
	s.handle("GET /api/admin/home", staff, "", s.getAdminHome)
	s.handle("PUT /api/admin/home", staff, "content", s.putAdminHome)

	s.handle("GET /api/episodes/{id}/{n}/video", public, "", s.getEpisodeVideo)
	s.handle("GET /api/media/images/{name}", public, "", s.getImage)
}

// ---------- dramas ----------

type AdminDrama struct {
	*Drama
	Uploaded  int `json:"uploaded"`
	Published int `json:"published"`
	Failed    int `json:"failed"`
}

func (s *Server) getAdminDramas(r *Req) (any, error) {
	ctx := r.Context()
	list, err := s.dramas(ctx, s.db, "ORDER BY d.updated_at DESC")
	if err != nil {
		return nil, err
	}
	out := []AdminDrama{}
	for _, d := range list {
		a := AdminDrama{Drama: d}
		if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*), COALESCE(SUM(published), 0), COALESCE(SUM(video_status = 'Failed'), 0)
			FROM episodes WHERE drama_id = ?`, d.ID).Scan(&a.Uploaded, &a.Published, &a.Failed); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, nil
}

func (s *Server) getAdminDrama(r *Req) (any, error) {
	return s.drama(r.Context(), s.db, r.PathValue("id"))
}

type dramaBody struct {
	Title           string   `json:"title"`
	Synopsis        string   `json:"synopsis"`
	Genres          []string `json:"genres"`
	TotalEpisodes   int      `json:"totalEpisodes"`
	FreeEpisodes    int      `json:"freeEpisodes"`
	CoinsPerEpisode int      `json:"coinsPerEpisode"`
	Status          string   `json:"status"`
	Completed       bool     `json:"completed"`
	Language        string   `json:"language"`
	ReleaseAt       int64    `json:"releaseAt"` // milliseconds
	Badge           string   `json:"badge"`
	Color           string   `json:"color"`
	Color2          string   `json:"color2"`
}

var colorRe = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)
var badges = map[string]bool{"": true, "Hot": true, "New": true, "Exclusive": true}
var dramaLanguages = map[string]bool{"English": true, "Burmese": true, "Chinese": true, "Thai": true, "Vietnamese": true, "Indonesian": true, "Spanish": true, "Portuguese": true}

func (s *Server) validDrama(b *dramaBody) error {
	b.Title, b.Synopsis = strings.TrimSpace(b.Title), strings.TrimSpace(b.Synopsis)
	if b.Title == "" || len([]rune(b.Title)) > 80 {
		return badRequest("Add a title (up to 80 characters)")
	}
	if len([]rune(b.Synopsis)) > 400 {
		return badRequest("The synopsis is up to 400 characters")
	}
	known := map[string]bool{}
	for _, g := range Genres {
		known[g] = true
	}
	for _, g := range b.Genres {
		if !known[g] {
			return badRequest("Unknown genre " + g)
		}
	}
	b.Genres = uniq(b.Genres)
	if b.TotalEpisodes < 0 || b.TotalEpisodes > 500 || b.FreeEpisodes < 0 || b.FreeEpisodes > 500 || b.CoinsPerEpisode < 0 || b.CoinsPerEpisode > 10000 {
		return badRequest("Episode counts and prices must be 0 or more")
	}
	if b.Status != "Published" && b.Status != "Scheduled" && b.Status != "Draft" {
		return badRequest("Status must be Published, Scheduled or Draft")
	}
	if b.Status == "Scheduled" && b.ReleaseAt/1000 <= s.unix() {
		return badRequest("A scheduled drama needs a release time in the future")
	}
	if !badges[b.Badge] {
		return badRequest("Unknown badge")
	}
	if b.Language == "" {
		b.Language = "English"
	}
	if !dramaLanguages[b.Language] {
		return badRequest("Unknown language")
	}
	if b.Color != "" && !colorRe.MatchString(b.Color) || b.Color2 != "" && !colorRe.MatchString(b.Color2) {
		return badRequest("Colours are #RRGGBB")
	}
	return nil
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func (s *Server) postDrama(r *Req) (any, error) {
	var b dramaBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	if b.Status == "" {
		b.Status = "Draft"
	}
	if err := s.validDrama(&b); err != nil {
		return nil, err
	}
	ctx := r.Context()
	base := strings.Trim(slugRe.ReplaceAllString(strings.ToLower(b.Title), "-"), "-")
	if len(base) > 40 {
		base = strings.Trim(base[:40], "-")
	}
	if base == "" || base == "_" {
		base = "drama"
	}
	var id string
	err := s.tx(ctx, func(tx *sql.Tx) error {
		id = base
		for i := 2; ; i++ {
			var n int
			if err := tx.QueryRowContext(ctx, "SELECT COUNT(*) FROM dramas WHERE id = ?", id).Scan(&n); err != nil {
				return err
			}
			if n == 0 {
				break
			}
			id = fmt.Sprintf("%s-%d", base, i)
		}
		color, color2 := b.Color, b.Color2
		if color == "" {
			color, color2 = "#3A2A4E", "#52406E"
		}
		if color2 == "" {
			color2 = color
		}
		now := s.unix()
		releaseAt := b.ReleaseAt / 1000
		if releaseAt == 0 && b.Status == "Published" {
			releaseAt = now
		}
		if _, err := tx.ExecContext(ctx, `INSERT INTO dramas (id, title, synopsis, genres, total_episodes, free_episodes, coins_per_episode, status, completed,
			color, color2, badge, language, release_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			id, b.Title, b.Synopsis, mustJSON(b.Genres), b.TotalEpisodes, b.FreeEpisodes, b.CoinsPerEpisode, b.Status, b.Completed,
			color, color2, b.Badge, b.Language, releaseAt, now, now); err != nil {
			return err
		}
		return s.audit(ctx, tx, r.User, "Created drama "+b.Title+" ("+b.Status+")")
	})
	if err != nil {
		return nil, err
	}
	return s.drama(ctx, s.db, id)
}

func (s *Server) putDrama(r *Req) (any, error) {
	var b dramaBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	ctx := r.Context()
	id := r.PathValue("id")
	err := s.tx(ctx, func(tx *sql.Tx) error {
		old, err := s.drama(ctx, tx, id)
		if err != nil {
			return err
		}
		// A drama that already premiered keeps its past release time when it is saved again.
		if b.Status == "Scheduled" && old.Status == "Scheduled" && b.ReleaseAt == old.ReleaseAt && b.ReleaseAt/1000 <= s.unix() {
			b.Status = "Published"
		}
		if err := s.validDrama(&b); err != nil {
			return err
		}
		if b.Color == "" {
			b.Color, b.Color2 = old.Color, old.Color2
		}
		if b.Color2 == "" {
			b.Color2 = b.Color
		}
		releaseAt := b.ReleaseAt / 1000
		if b.Status == "Published" && releaseAt == 0 {
			releaseAt = s.unix()
		}
		if _, err := tx.ExecContext(ctx, `UPDATE dramas SET title = ?, synopsis = ?, genres = ?, total_episodes = ?, free_episodes = ?, coins_per_episode = ?,
			status = ?, completed = ?, color = ?, color2 = ?, badge = ?, language = ?, release_at = ?, updated_at = ? WHERE id = ?`,
			b.Title, b.Synopsis, mustJSON(b.Genres), b.TotalEpisodes, b.FreeEpisodes, b.CoinsPerEpisode, b.Status, b.Completed,
			b.Color, b.Color2, b.Badge, b.Language, releaseAt, s.unix(), id); err != nil {
			return err
		}
		if b.FreeEpisodes != old.FreeEpisodes {
			if _, err := tx.ExecContext(ctx, "UPDATE episodes SET free = (n <= ?) WHERE drama_id = ?", b.FreeEpisodes, id); err != nil {
				return err
			}
		}
		changes := []string{}
		if old.Status != b.Status {
			changes = append(changes, old.Status+" → "+b.Status)
		}
		if old.CoinsPerEpisode != b.CoinsPerEpisode {
			changes = append(changes, fmt.Sprintf("coins per episode %d → %d", old.CoinsPerEpisode, b.CoinsPerEpisode))
		}
		if old.FreeEpisodes != b.FreeEpisodes {
			changes = append(changes, fmt.Sprintf("free episodes %d → %d", old.FreeEpisodes, b.FreeEpisodes))
		}
		what := "Edited " + b.Title
		if len(changes) > 0 {
			what += " · " + strings.Join(changes, ", ")
		}
		if err := s.audit(ctx, tx, r.User, what); err != nil {
			return err
		}
		if old.Status != "Published" && b.Status == "Published" {
			return s.announcePremiere(ctx, tx, id)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.drama(ctx, s.db, id)
}

// announcePremiere tells everyone with a reminder that the drama is out.
func (s *Server) announcePremiere(ctx context.Context, tx *sql.Tx, dramaID string) error {
	d, err := s.drama(ctx, tx, dramaID)
	if err != nil {
		return err
	}
	rows, err := tx.QueryContext(ctx, `SELECT u.id, u.notify FROM users u JOIN user_dramas r ON r.user_id = u.id
		WHERE r.drama_id = ? AND r.kind = 'reminders' AND u.status = 'Active'`, dramaID)
	if err != nil {
		return err
	}
	ids := []int64{}
	for rows.Next() {
		var id int64
		var raw string
		if err := rows.Scan(&id, &raw); err != nil {
			rows.Close()
			return err
		}
		if parseNotify(raw).Premieres {
			ids = append(ids, id)
		}
	}
	rows.Close()
	for _, id := range ids {
		if err := s.notifyUser(ctx, tx, id, "ep", d.Title+" is out now", "You asked us to remind you. Episode 1 is ready.", "/drama/"+d.ID+"/"); err != nil {
			return err
		}
	}
	return nil
}

// ---------- episodes ----------

type AdminEpisode struct {
	N           int    `json:"n"`
	Title       string `json:"title"`
	Length      int    `json:"length"`
	Free        bool   `json:"free"`
	Published   bool   `json:"published"`
	VideoStatus string `json:"videoStatus"`
	UpdatedAt   int64  `json:"updatedAt"`
}

func (s *Server) getAdminEpisodes(r *Req) (any, error) {
	ctx := r.Context()
	d, err := s.drama(ctx, s.db, r.PathValue("id"))
	if err != nil {
		return nil, err
	}
	rows, err := s.db.QueryContext(ctx, "SELECT n, title, length_sec, free, published, video_status, updated_at FROM episodes WHERE drama_id = ? ORDER BY n", d.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	eps := []AdminEpisode{}
	for rows.Next() {
		var e AdminEpisode
		if err := rows.Scan(&e.N, &e.Title, &e.Length, &e.Free, &e.Published, &e.VideoStatus, &e.UpdatedAt); err != nil {
			return nil, err
		}
		e.UpdatedAt = ms(e.UpdatedAt)
		eps = append(eps, e)
	}
	return map[string]any{"drama": d, "episodes": eps}, rows.Err()
}

type patchEpisodesBody struct {
	Ns        []int   `json:"ns"`
	Free      *bool   `json:"free"`
	Published *bool   `json:"published"`
	Title     *string `json:"title"`
}

func (s *Server) patchEpisodes(r *Req) (any, error) {
	var b patchEpisodesBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	if len(b.Ns) == 0 || len(b.Ns) > 500 {
		return nil, badRequest("Select episodes first")
	}
	if b.Title != nil && (len(b.Ns) != 1 || strings.TrimSpace(*b.Title) == "" || len([]rune(*b.Title)) > 80) {
		return nil, badRequest("Episode titles are 1 to 80 characters")
	}
	ctx := r.Context()
	id := r.PathValue("id")
	err := s.tx(ctx, func(tx *sql.Tx) error {
		d, err := s.drama(ctx, tx, id)
		if err != nil {
			return err
		}
		newlyPublished := 0
		for _, n := range b.Ns {
			var published bool
			err := tx.QueryRowContext(ctx, "SELECT published FROM episodes WHERE drama_id = ? AND n = ?", id, n).Scan(&published)
			if errors.Is(err, sql.ErrNoRows) {
				return fail(http.StatusNotFound, "EP %d doesn't exist", n)
			}
			if err != nil {
				return err
			}
			sets, args := []string{"updated_at = ?"}, []any{s.unix()}
			if b.Free != nil {
				sets, args = append(sets, "free = ?"), append(args, *b.Free)
			}
			if b.Published != nil {
				sets, args = append(sets, "published = ?"), append(args, *b.Published)
				if *b.Published && !published {
					newlyPublished = max(newlyPublished, n)
				}
			}
			if b.Title != nil {
				sets, args = append(sets, "title = ?"), append(args, strings.TrimSpace(*b.Title))
			}
			if _, err := tx.ExecContext(ctx, "UPDATE episodes SET "+strings.Join(sets, ", ")+" WHERE drama_id = ? AND n = ?", append(args, id, n)...); err != nil {
				return err
			}
		}
		what := ""
		switch {
		case b.Free != nil:
			what = map[bool]string{true: "Set free", false: "Set locked"}[*b.Free]
		case b.Published != nil:
			what = map[bool]string{true: "Published", false: "Unpublished"}[*b.Published]
		default:
			what = "Renamed"
		}
		if err := s.audit(ctx, tx, r.User, fmt.Sprintf("%s %s of %s", what, epList(b.Ns), d.Title)); err != nil {
			return err
		}
		if newlyPublished > 0 && d.Status == "Published" {
			return s.announceEpisode(ctx, tx, d, newlyPublished)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return s.getAdminEpisodes(r)
}

func epList(ns []int) string {
	if len(ns) == 1 {
		return "EP " + itoa(ns[0])
	}
	return plural(len(ns), "episode", "episodes")
}

// announceEpisode tells people who saved the drama that a new episode is out.
func (s *Server) announceEpisode(ctx context.Context, tx *sql.Tx, d *Drama, n int) error {
	rows, err := tx.QueryContext(ctx, `SELECT u.id, u.notify FROM users u JOIN user_dramas x ON x.user_id = u.id
		WHERE x.drama_id = ? AND x.kind = 'saved' AND u.status = 'Active'`, d.ID)
	if err != nil {
		return err
	}
	ids := []int64{}
	for rows.Next() {
		var id int64
		var raw string
		if err := rows.Scan(&id, &raw); err != nil {
			rows.Close()
			return err
		}
		if parseNotify(raw).Episodes {
			ids = append(ids, id)
		}
	}
	rows.Close()
	for _, id := range ids {
		if err := s.notifyUser(ctx, tx, id, "ep", fmt.Sprintf("EP %d is out", n), d.Title+" has a new episode.", fmt.Sprintf("/watch/%s/?ep=%d", d.ID, n)); err != nil {
			return err
		}
	}
	return nil
}

// ---------- uploads ----------

const maxVideoBytes = 500 << 20
const maxImageBytes = 8 << 20

var videoExt = map[string]string{".mp4": "video/mp4", ".m4v": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm"}

// saveUpload streams the multipart "file" part to dir and returns the stored name, the
// sniffed content type and any other form fields.
func saveUpload(r *Req, dir, prefix string, limit int64, allowed func(name, sniffed string) (ext, ctype string, ok bool)) (string, string, map[string]string, error) {
	r.Body = http.MaxBytesReader(r.W, r.Body, limit+1<<20)
	mr, err := r.MultipartReader()
	if err != nil {
		return "", "", nil, badRequest("Send the file as multipart form data")
	}
	fields := map[string]string{}
	for {
		part, err := mr.NextPart()
		if err == io.EOF {
			return "", "", nil, badRequest("No file was sent")
		}
		if err != nil {
			return "", "", nil, fail(http.StatusRequestEntityTooLarge, "The file is too large")
		}
		if part.FormName() != "file" {
			v, _ := io.ReadAll(io.LimitReader(part, 1024))
			fields[part.FormName()] = string(v)
			continue
		}
		head := make([]byte, 512)
		n, _ := io.ReadFull(part, head)
		head = head[:n]
		ext, ctype, ok := allowed(strings.ToLower(filepath.Ext(part.FileName())), http.DetectContentType(head))
		if !ok {
			return "", "", nil, fail(http.StatusUnsupportedMediaType, "This file type isn't supported")
		}
		name := prefix + "-" + randomToken(9) + ext
		tmp, err := os.CreateTemp(dir, ".upload-*")
		if err != nil {
			return "", "", nil, err
		}
		written, err := io.Copy(tmp, io.MultiReader(strings.NewReader(string(head)), io.LimitReader(part, limit+1-int64(len(head)))))
		closeErr := tmp.Close()
		if err != nil || closeErr != nil || written > limit {
			os.Remove(tmp.Name())
			if written > limit {
				return "", "", nil, fail(http.StatusRequestEntityTooLarge, "The file is larger than %d MB", limit>>20)
			}
			return "", "", nil, fail(http.StatusBadRequest, "The upload was interrupted. Try again.")
		}
		if err := os.Rename(tmp.Name(), filepath.Join(dir, name)); err != nil {
			os.Remove(tmp.Name())
			return "", "", nil, err
		}
		// Fields after the file part (rare) are still read.
		for {
			p, err := mr.NextPart()
			if err != nil {
				break
			}
			v, _ := io.ReadAll(io.LimitReader(p, 1024))
			fields[p.FormName()] = string(v)
		}
		return name, ctype, fields, nil
	}
}

func (s *Server) postDramaImage(r *Req) (any, error) {
	ctx := r.Context()
	kind := r.URL.Query().Get("kind")
	if kind != "poster" && kind != "banner" {
		return nil, badRequest("kind must be poster or banner")
	}
	d, err := s.drama(ctx, s.db, r.PathValue("id"))
	if err != nil {
		return nil, err
	}
	dir := filepath.Join(s.cfg.DataDir, "media", "images")
	name, _, _, err := saveUpload(r, dir, d.ID+"-"+kind, maxImageBytes, func(_, sniffed string) (string, string, bool) {
		switch sniffed {
		case "image/jpeg":
			return ".jpg", sniffed, true
		case "image/png":
			return ".png", sniffed, true
		case "image/webp":
			return ".webp", sniffed, true
		}
		return "", "", false
	})
	if err != nil {
		return nil, err
	}
	url := "/api/media/images/" + name
	err = s.tx(ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, "UPDATE dramas SET "+kind+" = ?, updated_at = ? WHERE id = ?", url, s.unix(), d.ID); err != nil {
			return err
		}
		return s.audit(ctx, tx, r.User, "Uploaded a new "+kind+" for "+d.Title)
	})
	if err != nil {
		os.Remove(filepath.Join(dir, name))
		return nil, err
	}
	old := map[string]string{"poster": d.Poster, "banner": d.Banner}[kind]
	if strings.HasPrefix(old, "/api/media/images/") {
		os.Remove(filepath.Join(dir, filepath.Base(old)))
	}
	return s.drama(ctx, s.db, d.ID)
}

func (s *Server) postEpisodeVideo(r *Req) (any, error) {
	ctx := r.Context()
	n, err := r.intParam("n")
	if err != nil {
		return nil, err
	}
	if n > 500 {
		return nil, badRequest("Episode numbers go up to 500")
	}
	d, err := s.drama(ctx, s.db, r.PathValue("id"))
	if err != nil {
		return nil, err
	}
	dir := filepath.Join(s.cfg.DataDir, "media", "videos")
	name, ctype, fields, err := saveUpload(r, dir, fmt.Sprintf("%s-%d", d.ID, n), maxVideoBytes, func(ext, sniffed string) (string, string, bool) {
		if t, ok := videoExt[ext]; ok && (strings.HasPrefix(sniffed, "video/") || sniffed == "application/octet-stream") {
			return ext, t, true
		}
		return "", "", false
	})
	if err != nil {
		return nil, err
	}
	length, _ := strconv.Atoi(fields["length"])
	length = max(0, min(length, 3*3600))
	var old string
	err = s.tx(ctx, func(tx *sql.Tx) error {
		err := tx.QueryRowContext(ctx, "SELECT video FROM episodes WHERE drama_id = ? AND n = ?", d.ID, n).Scan(&old)
		if errors.Is(err, sql.ErrNoRows) {
			if _, err := tx.ExecContext(ctx, `INSERT INTO episodes (drama_id, n, title, length_sec, free, published, video, video_type, video_status, updated_at)
				VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'Ready', ?)`, d.ID, n, fmt.Sprintf("Episode %d", n), length, n <= d.FreeEpisodes, name, ctype, s.unix()); err != nil {
				return err
			}
		} else if err != nil {
			return err
		} else if _, err := tx.ExecContext(ctx, `UPDATE episodes SET video = ?, video_type = ?, video_status = 'Ready', length_sec = CASE WHEN ? > 0 THEN ? ELSE length_sec END,
			updated_at = ? WHERE drama_id = ? AND n = ?`, name, ctype, length, length, s.unix(), d.ID, n); err != nil {
			return err
		}
		if _, err := tx.ExecContext(ctx, "UPDATE dramas SET total_episodes = MAX(total_episodes, ?), updated_at = ? WHERE id = ?", n, s.unix(), d.ID); err != nil {
			return err
		}
		return s.audit(ctx, tx, r.User, fmt.Sprintf("Uploaded the video for EP %d of %s", n, d.Title))
	})
	if err != nil {
		os.Remove(filepath.Join(dir, name))
		return nil, err
	}
	if old != "" {
		os.Remove(filepath.Join(dir, filepath.Base(old)))
	}
	return s.getAdminEpisodes(r)
}

// getEpisodeVideo streams an episode (with HTTP range support) only to viewers allowed to watch it.
func (s *Server) getEpisodeVideo(r *Req) (any, error) {
	ctx := r.Context()
	n, err := r.intParam("n")
	if err != nil {
		return nil, err
	}
	d, e, err := s.publishedEpisode(ctx, s.db, r.PathValue("id"), n)
	if err != nil {
		return nil, err
	}
	if !e.Free {
		if r.User == nil {
			return nil, fail(http.StatusForbidden, "Unlock this episode to watch it")
		}
		if ok, err := s.canWatch(ctx, s.db, r.User, d.ID, e); err != nil {
			return nil, err
		} else if !ok {
			return nil, fail(http.StatusForbidden, "Unlock this episode to watch it")
		}
	}
	var name, ctype string
	if err := s.db.QueryRowContext(ctx, "SELECT video, video_type FROM episodes WHERE drama_id = ? AND n = ? AND video_status = 'Ready'", d.ID, n).Scan(&name, &ctype); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fail(http.StatusNotFound, "This episode has no video yet")
		}
		return nil, err
	}
	f, err := os.Open(filepath.Join(s.cfg.DataDir, "media", "videos", filepath.Base(name)))
	if err != nil {
		return nil, fail(http.StatusNotFound, "This episode has no video yet")
	}
	defer f.Close()
	st, err := f.Stat()
	if err != nil {
		return nil, err
	}
	r.W.Header().Set("Content-Type", ctype)
	r.W.Header().Set("Cache-Control", "private, max-age=3600")
	http.ServeContent(r.W, r.Request, name, st.ModTime(), f)
	return handled{}, nil
}

var imageNameRe = regexp.MustCompile(`^[a-z0-9_-]+\.(jpg|png|webp)$`)

func (s *Server) getImage(r *Req) (any, error) {
	name := r.PathValue("name")
	if !imageNameRe.MatchString(strings.ToLower(name)) {
		return nil, errNotFound
	}
	f, err := os.Open(filepath.Join(s.cfg.DataDir, "media", "images", name))
	if err != nil {
		return nil, errNotFound
	}
	defer f.Close()
	r.W.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	http.ServeContent(r.W, r.Request, name, time.Time{}, f)
	return handled{}, nil
}

// ---------- Home curation ----------

type Slot struct {
	DramaID string `json:"dramaId"`
	Meta    string `json:"meta"`
}

var homeSections = []string{"banner", "trending", "soon"}

func (s *Server) getAdminHome(r *Req) (any, error) {
	out := map[string][]Slot{}
	for _, sec := range homeSections {
		out[sec] = []Slot{}
	}
	rows, err := s.db.QueryContext(r.Context(), "SELECT section, drama_id, meta FROM home_slots ORDER BY section, pos")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var sec string
		var sl Slot
		if err := rows.Scan(&sec, &sl.DramaID, &sl.Meta); err != nil {
			return nil, err
		}
		out[sec] = append(out[sec], sl)
	}
	return out, rows.Err()
}

func (s *Server) putAdminHome(r *Req) (any, error) {
	var b map[string][]Slot
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	if len(b["banner"]) > 5 {
		return nil, badRequest("The banner holds up to 5 dramas")
	}
	ctx := r.Context()
	err := s.tx(ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(ctx, "DELETE FROM home_slots"); err != nil {
			return err
		}
		for _, sec := range homeSections {
			seen := map[string]bool{}
			for i, sl := range b[sec] {
				if seen[sl.DramaID] {
					return badRequest("A drama appears twice in " + sec)
				}
				seen[sl.DramaID] = true
				d, err := s.drama(ctx, tx, sl.DramaID)
				if err != nil || d.Status == "Draft" {
					return badRequest("Only published or scheduled dramas can be on Home")
				}
				meta := strings.TrimSpace(sl.Meta)
				if len([]rune(meta)) > 60 {
					meta = string([]rune(meta)[:60])
				}
				if _, err := tx.ExecContext(ctx, "INSERT INTO home_slots (section, pos, drama_id, meta) VALUES (?, ?, ?, ?)", sec, i, sl.DramaID, meta); err != nil {
					return err
				}
			}
		}
		return s.audit(ctx, tx, r.User, "Published Home curation changes")
	})
	if err != nil {
		return nil, err
	}
	return s.getAdminHome(r)
}
