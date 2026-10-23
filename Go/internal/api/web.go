package api

import (
	"net/http"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
)

func (s *Server) routes() {
	s.authRoutes()
	s.catalogRoutes()
	s.viewerRoutes()
	s.paymentRoutes()
	s.socialRoutes()
	s.adminRoutes()
	s.mux.HandleFunc("/api/", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "Not found"})
	})
	s.mux.HandleFunc("/", s.serveWeb)
}

// Dynamic routes are exported once with the placeholder id "_"; any id is served from that
// shell, and the page reads the real id from the URL.
var dynamicRoutes = []struct {
	re   *regexp.Regexp
	repl string
}{
	{regexp.MustCompile(`^/drama/[^/]+/(.*)$`), "/drama/_/$1"},
	{regexp.MustCompile(`^/watch/[^/]+/(.*)$`), "/watch/_/$1"},
	{regexp.MustCompile(`^/admin/dramas/[^/]+/episodes/(.*)$`), "/admin/dramas/_/episodes/$1"},
	{regexp.MustCompile(`^/admin/dramas/[^/]+/(.*)$`), "/admin/dramas/_/$1"},
	{regexp.MustCompile(`^/admin/users/[^/]+/(.*)$`), "/admin/users/_/$1"},
}

// serveWeb serves the Next.js static export (NextJS/out) when it has been built.
func (s *Server) serveWeb(w http.ResponseWriter, r *http.Request) {
	root := s.cfg.WebDir
	if _, err := os.Stat(filepath.Join(root, "index.html")); err != nil {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`<!doctype html><meta charset="utf-8"><title>The Ending API</title><body style="font-family:system-ui;background:#0F0C11;color:#F5F0F7;padding:40px">
<h1>The Ending API is running</h1><p>The web app isn't built yet. Run <code>cd NextJS &amp;&amp; npm ci &amp;&amp; npm run build</code>, then reload,
or run <code>npm run dev</code> and open http://127.0.0.1:3000.</p><p>Health: <a style="color:#FF5C7A" href="/api/health">/api/health</a></p></body>`))
		return
	}
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	p := path.Clean("/" + r.URL.Path)
	if strings.HasSuffix(r.URL.Path, "/") && p != "/" {
		p += "/"
	}
	file := func(p string) string {
		f := filepath.Join(root, filepath.FromSlash(p))
		if strings.HasSuffix(p, "/") {
			f = filepath.Join(f, "index.html")
		}
		if st, err := os.Stat(f); err == nil && !st.IsDir() {
			return f
		}
		return ""
	}
	found := file(p)
	if found == "" && !strings.HasSuffix(p, "/") && path.Ext(p) == "" && file(p+"/") != "" {
		target := p + "/"
		if r.URL.RawQuery != "" {
			target += "?" + r.URL.RawQuery
		}
		http.Redirect(w, r, target, http.StatusMovedPermanently)
		return
	}
	if found == "" {
		probe := p
		if !strings.HasSuffix(probe, "/") && path.Ext(probe) == "" {
			probe += "/"
		}
		for _, d := range dynamicRoutes {
			if d.re.MatchString(probe) {
				if f := file(d.re.ReplaceAllString(probe, d.repl)); f != "" {
					found = f
					break
				}
			}
		}
		if found != "" && probe != p {
			target := probe
			if r.URL.RawQuery != "" {
				target += "?" + r.URL.RawQuery
			}
			http.Redirect(w, r, target, http.StatusMovedPermanently)
			return
		}
	}
	if found == "" {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusNotFound)
		if b, err := os.ReadFile(filepath.Join(root, "404.html")); err == nil {
			_, _ = w.Write(b)
		}
		return
	}
	if strings.HasPrefix(p, "/_next/static/") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		w.Header().Set("Cache-Control", "no-cache")
	}
	http.ServeFile(w, r, found)
}
