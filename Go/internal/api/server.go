// Package api is The Ending's HTTP API: viewer app, admin panel and media, backed by SQLite.
package api

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	_ "time/tzdata" // Asia/Yangon and friends on machines without zoneinfo
)

type Config struct {
	Addr           string   // listen address
	DataDir        string   // SQLite database and uploaded media
	WebDir         string   // optional Next.js static export to serve at /
	Timezone       string   // day boundary for check-in, ad limits and daily stats
	AllowedOrigins []string // extra origins allowed to call the API (the Next.js dev server)
	DemoCode       string   // the mock email sign-in code
	CookieSecure   bool     // set when served over HTTPS
}

func ConfigFromEnv() Config {
	env := func(k, def string) string {
		if v := strings.TrimSpace(os.Getenv(k)); v != "" {
			return v
		}
		return def
	}
	origins := []string{}
	for _, o := range strings.Split(env("ALLOWED_ORIGINS", "http://127.0.0.1:3000,http://localhost:3000"), ",") {
		if o = strings.TrimSpace(o); o != "" {
			origins = append(origins, o)
		}
	}
	return Config{
		Addr:           env("ADDR", "127.0.0.1:8080"),
		DataDir:        env("DATA_DIR", "data"),
		WebDir:         env("WEB_DIR", filepath.Join("..", "NextJS", "out")),
		Timezone:       env("TIMEZONE", "Asia/Yangon"),
		AllowedOrigins: origins,
		DemoCode:       env("DEMO_CODE", "123456"),
		CookieSecure:   env("COOKIE_SECURE", "false") == "true",
	}
}

type Server struct {
	cfg Config
	db  *sql.DB
	loc *time.Location
	now func() time.Time
	mux *http.ServeMux
}

func New(ctx context.Context, cfg Config) (*Server, error) {
	loc, err := time.LoadLocation(cfg.Timezone)
	if err != nil {
		return nil, fmt.Errorf("timezone %q: %w", cfg.Timezone, err)
	}
	for _, dir := range []string{cfg.DataDir, filepath.Join(cfg.DataDir, "media", "videos"), filepath.Join(cfg.DataDir, "media", "images")} {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, err
		}
	}
	db, err := openDB(cfg.DataDir)
	if err != nil {
		return nil, err
	}
	s := &Server{cfg: cfg, db: db, loc: loc, now: time.Now, mux: http.NewServeMux()}
	fresh, err := migrate(ctx, db)
	if err != nil {
		db.Close()
		return nil, err
	}
	if fresh {
		if err := s.seed(ctx); err != nil {
			db.Close()
			return nil, fmt.Errorf("seed: %w", err)
		}
		log.Printf("created a new database with sample data in %s", cfg.DataDir)
	}
	s.routes()
	return s, nil
}

func (s *Server) Close() error { return s.db.Close() }

func (s *Server) Handler() http.Handler {
	return s.withHeaders(s.mux)
}

// ---------- time ----------

func (s *Server) unix() int64 { return s.now().Unix() }

func (s *Server) day(t time.Time) string { return t.In(s.loc).Format("2006-01-02") }

func (s *Server) today() string { return s.day(s.now()) }

func (s *Server) yesterday() string { return s.day(s.now().AddDate(0, 0, -1)) }

// ms converts stored Unix seconds to the JavaScript milliseconds the clients use.
func ms(sec int64) int64 {
	if sec == 0 {
		return 0
	}
	return sec * 1000
}

// ---------- errors and responses ----------

type httpError struct {
	Status int
	Msg    string
}

func (e *httpError) Error() string { return e.Msg }

func fail(status int, format string, args ...any) error {
	return &httpError{Status: status, Msg: fmt.Sprintf(format, args...)}
}

var errNotFound = fail(http.StatusNotFound, "Not found")

// handled tells the wrapper the handler already wrote the response (files, streams).
type handled struct{}

type ok struct {
	OK bool `json:"ok"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		log.Printf("write response: %v", err)
	}
}

// ---------- request context ----------

type Req struct {
	*http.Request
	W    http.ResponseWriter
	User *User
	s    *Server
}

func (r *Req) decode(v any) error {
	dec := json.NewDecoder(http.MaxBytesReader(r.W, r.Body, 64<<10))
	if err := dec.Decode(v); err != nil {
		return fail(http.StatusBadRequest, "Invalid request body")
	}
	return nil
}

func (r *Req) intParam(name string) (int, error) {
	n, err := strconv.Atoi(r.PathValue(name))
	if err != nil || n < 1 {
		return 0, fail(http.StatusBadRequest, "Invalid %s", name)
	}
	return n, nil
}

type access int

const (
	public   access = iota // no session needed (a session is still loaded if present)
	viewer                 // any session, guest or signed in
	signedIn               // a signed-in (non-guest) account
	staff                  // an admin role; the perm argument names the write permission, "" for read
)

type handlerFunc func(*Req) (any, error)

func (s *Server) handle(pattern string, acc access, perm string, fn handlerFunc) {
	s.mux.HandleFunc(pattern, func(w http.ResponseWriter, hr *http.Request) {
		r := &Req{Request: hr, W: w, s: s}
		v, err := s.serve(r, acc, perm, fn)
		if err != nil {
			var he *httpError
			if errors.As(err, &he) {
				writeJSON(w, he.Status, map[string]string{"error": he.Msg})
				return
			}
			log.Printf("%s %s: %v", hr.Method, hr.URL.Path, err)
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Something went wrong. Try again."})
			return
		}
		if _, done := v.(handled); done {
			return
		}
		if v == nil {
			v = ok{OK: true}
		}
		writeJSON(w, http.StatusOK, v)
	})
}

func (s *Server) serve(r *Req, acc access, perm string, fn handlerFunc) (any, error) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead && !s.originAllowed(r.Request) {
		return nil, fail(http.StatusForbidden, "Cross-site request refused")
	}
	user, err := s.sessionUser(r.Context(), r.Request)
	if err != nil {
		return nil, err
	}
	r.User = user
	switch acc {
	case viewer:
		if user == nil {
			return nil, fail(http.StatusUnauthorized, "No session")
		}
	case signedIn:
		if user == nil {
			return nil, fail(http.StatusUnauthorized, "No session")
		}
		if !user.SignedIn() {
			return nil, fail(http.StatusForbidden, "Sign in to continue")
		}
	case staff:
		if user == nil || !user.SignedIn() {
			return nil, fail(http.StatusUnauthorized, "Sign in with an admin account")
		}
		if !validRole(user.Role) {
			return nil, fail(http.StatusForbidden, "This account isn't an admin")
		}
		if perm != "" && !roleAllows(user.Role, perm) {
			return nil, fail(http.StatusForbidden, "Your role (%s) can't do this", user.Role)
		}
	}
	if acc != staff && r.Method != http.MethodGet && !strings.HasPrefix(r.URL.Path, "/api/auth/") {
		if (user == nil || !validRole(user.Role)) && s.maintenance(r.Context()) {
			return nil, fail(http.StatusServiceUnavailable, "The Ending is down for maintenance. Back soon.")
		}
	}
	return fn(r)
}

// originAllowed blocks cross-site writes: browsers always send Origin on cross-site POSTs.
func (s *Server) originAllowed(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	u, err := url.Parse(origin)
	if err == nil && u.Host == r.Host && localHost(u.Hostname()) {
		return true
	}
	for _, o := range s.cfg.AllowedOrigins {
		if o == origin {
			return true
		}
	}
	return false
}

// localHost accepts IP addresses and localhost. A web page that rebinds its own domain name to
// this machine fails the check, because its Origin is that domain.
func localHost(h string) bool {
	return h == "localhost" || net.ParseIP(h) != nil
}

func (s *Server) withHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		if origin := r.Header.Get("Origin"); origin != "" && strings.HasPrefix(r.URL.Path, "/api/") {
			for _, o := range s.cfg.AllowedOrigins {
				if o == origin {
					h.Set("Access-Control-Allow-Origin", origin)
					h.Set("Access-Control-Allow-Credentials", "true")
					h.Set("Vary", "Origin")
					if r.Method == http.MethodOptions {
						h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE")
						h.Set("Access-Control-Allow-Headers", "Content-Type")
						w.WriteHeader(http.StatusNoContent)
						return
					}
				}
			}
		}
		next.ServeHTTP(w, r)
	})
}

// ---------- sessions ----------

const sessionCookie = "te_session"
const sessionDays = 90

func randomToken(n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

func hashToken(t string) string {
	sum := sha256.Sum256([]byte(t))
	return hex.EncodeToString(sum[:])
}

func (s *Server) sessionUser(ctx context.Context, r *http.Request) (*User, error) {
	c, err := r.Cookie(sessionCookie)
	if err != nil || c.Value == "" {
		return nil, nil
	}
	row := s.db.QueryRowContext(ctx, `SELECT `+userColumns+` FROM sessions s JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = ? AND s.expires_at > ? AND u.status = 'Active'`, hashToken(c.Value), s.unix())
	u, err := scanUser(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	// Refresh last_seen at most every 10 minutes.
	if s.unix()-u.LastSeen > 600 {
		if _, err := s.db.ExecContext(ctx, "UPDATE users SET last_seen = ? WHERE id = ?", s.unix(), u.ID); err != nil {
			return nil, err
		}
	}
	return u, nil
}

// startSession creates a session for the user and sets the cookie. A previous session on this
// browser is ended first.
func (s *Server) startSession(ctx context.Context, q querier, r *Req, userID int64) error {
	if c, err := r.Cookie(sessionCookie); err == nil && c.Value != "" {
		if _, err := q.ExecContext(ctx, "DELETE FROM sessions WHERE token_hash = ?", hashToken(c.Value)); err != nil {
			return err
		}
	}
	token := randomToken(32)
	now := s.unix()
	if _, err := q.ExecContext(ctx, "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
		hashToken(token), userID, now, now+sessionDays*86400); err != nil {
		return err
	}
	http.SetCookie(r.W, &http.Cookie{
		Name: sessionCookie, Value: token, Path: "/", MaxAge: sessionDays * 86400,
		HttpOnly: true, Secure: s.cfg.CookieSecure, SameSite: http.SameSiteLaxMode,
	})
	return nil
}

func (s *Server) endSession(ctx context.Context, r *Req) error {
	if c, err := r.Cookie(sessionCookie); err == nil && c.Value != "" {
		if _, err := s.db.ExecContext(ctx, "DELETE FROM sessions WHERE token_hash = ?", hashToken(c.Value)); err != nil {
			return err
		}
	}
	http.SetCookie(r.W, &http.Cookie{Name: sessionCookie, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: s.cfg.CookieSecure, SameSite: http.SameSiteLaxMode})
	return nil
}

// ---------- transactions ----------

func (s *Server) tx(ctx context.Context, fn func(tx *sql.Tx) error) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}
