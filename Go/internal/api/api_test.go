package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type client struct {
	t    *testing.T
	base string
	http *http.Client
}

func newTest(t *testing.T) (*Server, func() *client) {
	t.Helper()
	srv, err := New(context.Background(), Config{DataDir: t.TempDir(), WebDir: t.TempDir(), Timezone: "Asia/Yangon", DemoCode: "123456"})
	if err != nil {
		t.Fatal(err)
	}
	ts := httptest.NewServer(srv.Handler())
	t.Cleanup(func() { ts.Close(); srv.Close() })
	return srv, func() *client {
		jar, _ := cookiejar.New(nil)
		return &client{t: t, base: ts.URL, http: &http.Client{Jar: jar}}
	}
}

func (c *client) do(method, path string, body any) (int, map[string]any) {
	c.t.Helper()
	var rd io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rd = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, c.base+path, rd)
	req.Header.Set("Content-Type", "application/json")
	res, err := c.http.Do(req)
	if err != nil {
		c.t.Fatal(err)
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	out := map[string]any{}
	if err := json.Unmarshal(raw, &out); err != nil {
		out = map[string]any{"_raw": string(raw)}
	}
	return res.StatusCode, out
}

func (c *client) must(method, path string, body any) map[string]any {
	c.t.Helper()
	status, out := c.do(method, path, body)
	if status != http.StatusOK {
		c.t.Fatalf("%s %s: %d %v", method, path, status, out)
	}
	return out
}

func (c *client) signIn(email string) map[string]any {
	c.t.Helper()
	ch := c.must("POST", "/api/auth/email/start", map[string]string{"email": email})
	return c.must("POST", "/api/auth/email/verify", map[string]any{"challengeId": ch["challengeId"], "code": "123456"})
}

func coins(me map[string]any) int { return int(me["coins"].(float64)) }

func TestGuestUpgradeKeepsProgressAndGrantsBonusOnce(t *testing.T) {
	_, newClient := newTest(t)
	c := newClient()
	me := c.must("POST", "/api/auth/guest", nil)
	if coins(me) != 100 {
		t.Fatalf("guest coins = %d, want 100 welcome coins", coins(me))
	}
	c.must("PUT", "/api/me/saved/contract-bride", nil)
	me = c.signIn("new@example.org")
	if coins(me) != 130 {
		t.Fatalf("coins after sign-in = %d, want 130", coins(me))
	}
	if saved := me["saved"].([]any); len(saved) != 1 || saved[0] != "contract-bride" {
		t.Fatalf("saved list lost on upgrade: %v", saved)
	}
	c.must("POST", "/api/auth/logout", nil)
	c.must("POST", "/api/auth/guest", nil)
	me = c.signIn("new@example.org")
	if coins(me) != 130 {
		t.Fatalf("second sign-in changed coins to %d", coins(me))
	}
}

func TestWrongCodeLimit(t *testing.T) {
	_, newClient := newTest(t)
	c := newClient()
	ch := c.must("POST", "/api/auth/email/start", map[string]string{"email": "x@example.org"})
	for i := 0; i < 3; i++ {
		if status, _ := c.do("POST", "/api/auth/email/verify", map[string]any{"challengeId": ch["challengeId"], "code": "000000"}); status == 200 {
			t.Fatal("wrong code accepted")
		}
	}
	if status, _ := c.do("POST", "/api/auth/email/verify", map[string]any{"challengeId": ch["challengeId"], "code": "123456"}); status != http.StatusTooManyRequests {
		t.Fatalf("right code after 3 wrong tries: status %d, want 429", status)
	}
}

func TestUnlockWithCoins(t *testing.T) {
	_, newClient := newTest(t)
	c := newClient()
	c.must("POST", "/api/auth/guest", nil) // 100 coins
	if status, _ := c.do("POST", "/api/unlock", map[string]any{"dramaId": "contract-bride", "ep": 11}); status != 200 {
		t.Fatalf("unlock status %d", status)
	}
	me := c.must("GET", "/api/me", nil)
	if coins(me) != 40 {
		t.Fatalf("coins = %d, want 40", coins(me))
	}
	// Unlocking again doesn't charge again.
	me = c.must("POST", "/api/unlock", map[string]any{"dramaId": "contract-bride", "ep": 11})
	if coins(me) != 40 {
		t.Fatalf("double unlock charged: %d", coins(me))
	}
	if status, out := c.do("POST", "/api/unlock", map[string]any{"dramaId": "contract-bride", "ep": 12}); status != http.StatusConflict {
		t.Fatalf("unlock with 40 coins: %d %v, want 409", status, out)
	}
	// Free episodes never charge.
	me = c.must("POST", "/api/unlock", map[string]any{"dramaId": "contract-bride", "ep": 1})
	if coins(me) != 40 {
		t.Fatalf("free episode charged")
	}
}

func TestRewardedAdNeedsFullWatchAndDailyLimit(t *testing.T) {
	srv, newClient := newTest(t)
	now := time.Now()
	srv.now = func() time.Time { return now }
	c := newClient()
	c.must("POST", "/api/auth/guest", nil)
	ad := c.must("POST", "/api/ads/start", map[string]any{"purpose": "unlock", "dramaId": "alpha-king", "ep": 20})
	if status, _ := c.do("POST", "/api/ads/complete", map[string]any{"ticket": ad["ticket"]}); status != http.StatusConflict {
		t.Fatal("ad paid out before it was watched")
	}
	now = now.Add(6 * time.Second)
	me := c.must("POST", "/api/ads/complete", map[string]any{"ticket": ad["ticket"]})
	if got := me["unlocked"].(map[string]any)["alpha-king"].([]any); len(got) != 1 {
		t.Fatalf("ad unlock missing: %v", got)
	}
	if status, _ := c.do("POST", "/api/ads/complete", map[string]any{"ticket": ad["ticket"]}); status != http.StatusGone {
		t.Fatal("ticket reused")
	}
	for i := 0; i < 2; i++ {
		ad = c.must("POST", "/api/ads/start", map[string]any{"purpose": "reward"})
		now = now.Add(6 * time.Second)
		me = c.must("POST", "/api/ads/complete", map[string]any{"ticket": ad["ticket"]})
	}
	if coins(me) != 140 {
		t.Fatalf("coins after two reward ads = %d, want 140", coins(me))
	}
	if status, _ := c.do("POST", "/api/ads/start", map[string]any{"purpose": "reward"}); status != http.StatusConflict {
		t.Fatal("fourth ad allowed past the daily limit")
	}
}

func TestCheckinStreakResetsAfterMissedDay(t *testing.T) {
	srv, newClient := newTest(t)
	now := time.Date(2026, 10, 23, 12, 0, 0, 0, srv.loc)
	srv.now = func() time.Time { return now }
	c := newClient()
	c.must("POST", "/api/auth/guest", nil)
	out := c.must("POST", "/api/checkin", nil)
	if out["amount"].(float64) != 10 {
		t.Fatalf("day 1 amount %v", out["amount"])
	}
	if status, _ := c.do("POST", "/api/checkin", nil); status != http.StatusConflict {
		t.Fatal("checked in twice in one day")
	}
	now = now.AddDate(0, 0, 1)
	c.must("POST", "/api/checkin", nil)
	now = now.AddDate(0, 0, 1)
	out = c.must("POST", "/api/checkin", nil)
	if out["amount"].(float64) != 15 {
		t.Fatalf("day 3 amount %v, want 15", out["amount"])
	}
	now = now.AddDate(0, 0, 2) // missed a day
	out = c.must("POST", "/api/checkin", nil)
	if out["amount"].(float64) != 10 {
		t.Fatalf("streak didn't reset: %v", out["amount"])
	}
}

func TestPaymentsAndRecheck(t *testing.T) {
	_, newClient := newTest(t)
	c := newClient()
	c.must("POST", "/api/auth/guest", nil)
	if status, _ := c.do("POST", "/api/payments", map[string]string{"productId": "coins_500"}); status != http.StatusForbidden {
		t.Fatal("guest could buy")
	}
	c.signIn("buyer@example.org")
	p := c.must("POST", "/api/payments", map[string]string{"productId": "coins_500"})
	out := c.must("POST", "/api/payments/"+p["order"].(string)+"/complete", map[string]string{"outcome": "success"})
	if got := coins(out["me"].(map[string]any)); got != 130+550 {
		t.Fatalf("coins after purchase %d", got)
	}
	out = c.must("POST", "/api/payments/"+p["order"].(string)+"/complete", map[string]string{"outcome": "success"})
	if got := coins(out["me"].(map[string]any)); got != 680 {
		t.Fatalf("completing twice granted twice: %d", got)
	}

	vip := c.must("POST", "/api/payments", map[string]string{"productId": "vip_monthly"})
	out = c.must("POST", "/api/payments/"+vip["order"].(string)+"/complete", map[string]string{"outcome": "pending"})
	if st := out["me"].(map[string]any)["subscription"].(map[string]any)["state"]; st != "pending" {
		t.Fatalf("subscription state %v, want pending", st)
	}
	support := newClient()
	support.signIn("support@example.com")
	support.must("POST", "/api/admin/payments/"+vip["order"].(string)+"/recheck", nil)
	me := c.must("GET", "/api/me", nil)
	if st := me["subscription"].(map[string]any)["state"]; st != "active" {
		t.Fatalf("subscription after recheck %v", st)
	}
	// VIP watches locked episodes without coins.
	before := coins(me)
	me = c.must("POST", "/api/unlock", map[string]any{"dramaId": "reborn-empire", "ep": 50})
	if coins(me) != before {
		t.Fatal("VIP was charged coins")
	}
}

func TestRolePermissions(t *testing.T) {
	_, newClient := newTest(t)
	viewer := newClient()
	viewer.signIn("someone@example.org")
	if status, _ := viewer.do("GET", "/api/admin/dashboard", nil); status != http.StatusForbidden {
		t.Fatalf("non-admin got dashboard: %d", status)
	}
	editor := newClient()
	editor.signIn("editor@example.com")
	editor.must("GET", "/api/admin/dashboard", nil)
	if status, _ := editor.do("POST", "/api/admin/users/10293847/coins", map[string]any{"amount": 10, "reason": "Promotion"}); status != http.StatusForbidden {
		t.Fatalf("editor adjusted coins: %d", status)
	}
	mod := newClient()
	mod.signIn("mod@example.com")
	if status, _ := mod.do("PUT", "/api/admin/monetization", defaultConfig()); status != http.StatusForbidden {
		t.Fatalf("moderator changed monetization: %d", status)
	}
	support := newClient()
	support.signIn("support@example.com")
	out := support.must("POST", "/api/admin/users/10293847/coins", map[string]any{"amount": 100, "reason": "Promotion"})
	if got := out["user"].(map[string]any)["coins"].(float64); got != 345 {
		t.Fatalf("Mya's coins %v, want 345", got)
	}
	owner := newClient()
	owner.must("POST", "/api/auth/admin-demo", nil)
	settings := owner.must("GET", "/api/admin/settings", nil)
	if log := settings["audit"].([]any); !strings.Contains(log[0].(map[string]any)["what"].(string), "Added 100 coins to Mya Thandar") {
		t.Fatalf("adjustment not audited: %v", log[0])
	}
}

func TestBanEndsSessions(t *testing.T) {
	_, newClient := newTest(t)
	v := newClient()
	me := v.signIn("bad@example.org")
	id := int64(me["user"].(map[string]any)["id"].(float64))
	owner := newClient()
	owner.must("POST", "/api/auth/admin-demo", nil)
	owner.must("POST", "/api/admin/users/"+itoa(int(id))+"/ban", map[string]bool{"banned": true})
	if status, _ := v.do("GET", "/api/me", nil); status != http.StatusUnauthorized {
		t.Fatalf("banned session still works: %d", status)
	}
	ch := v.must("POST", "/api/auth/email/start", map[string]string{"email": "bad@example.org"})
	if status, _ := v.do("POST", "/api/auth/email/verify", map[string]any{"challengeId": ch["challengeId"], "code": "123456"}); status != http.StatusForbidden {
		t.Fatalf("banned account signed in: %d", status)
	}
}

func TestCommentsReportAndModeration(t *testing.T) {
	_, newClient := newTest(t)
	a := newClient()
	a.signIn("author@example.org")
	a.must("POST", "/api/comments", map[string]any{"dramaId": "alpha-king", "ep": 2, "text": "spoiler: he is the king"})
	list := listOf(a.must2("GET", "/api/comments?drama=alpha-king&ep=2"))
	id := itoa(int(list[0]["id"].(float64)))
	b := newClient()
	b.must("POST", "/api/auth/guest", nil)
	b.must("POST", "/api/comments/"+id+"/report", map[string]string{"reason": "spoiler"})
	mod := newClient()
	mod.signIn("mod@example.com")
	q := mod.must("GET", "/api/admin/comments?state=Reported", nil)
	if q["counts"].(map[string]any)["Reported"].(float64) != 4 {
		t.Fatalf("reported count %v, want 3 seeded + 1", q["counts"])
	}
	mod.must("POST", "/api/admin/comments/"+id, map[string]string{"action": "mute"})
	if len(listOf(a.must2("GET", "/api/comments?drama=alpha-king&ep=2"))) != 0 {
		t.Fatal("hidden comment still public")
	}
	if status, _ := a.do("POST", "/api/comments", map[string]any{"dramaId": "alpha-king", "ep": 2, "text": "again"}); status != http.StatusForbidden {
		t.Fatalf("muted user commented: %d", status)
	}
}

func (c *client) must2(method, path string) []any {
	c.t.Helper()
	req, _ := http.NewRequest(method, c.base+path, nil)
	res, err := c.http.Do(req)
	if err != nil {
		c.t.Fatal(err)
	}
	defer res.Body.Close()
	var out []any
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		c.t.Fatal(err)
	}
	return out
}

func listOf(items []any) []map[string]any {
	out := []map[string]any{}
	for _, i := range items {
		out = append(out, i.(map[string]any))
	}
	return out
}

func TestVideoUploadAndStreamingAccess(t *testing.T) {
	_, newClient := newTest(t)
	owner := newClient()
	owner.must("POST", "/api/auth/admin-demo", nil)
	// A minimal MP4 header is enough for the type check.
	video := append([]byte{0, 0, 0, 0x18, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm', 0, 0, 2, 0, 'i', 's', 'o', 'm', 'm', 'p', '4', '1'}, bytes.Repeat([]byte{1}, 4000)...)
	upload := func(n string) int {
		var buf bytes.Buffer
		w := multipart.NewWriter(&buf)
		_ = w.WriteField("length", "95")
		fw, _ := w.CreateFormFile("file", "EP"+n+".mp4")
		fw.Write(video)
		w.Close()
		req, _ := http.NewRequest("POST", owner.base+"/api/admin/dramas/alpha-king/episodes/"+n+"/video", &buf)
		req.Header.Set("Content-Type", w.FormDataContentType())
		res, err := owner.http.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		return res.StatusCode
	}
	if s := upload("1"); s != 200 {
		t.Fatalf("upload EP1: %d", s)
	}
	if s := upload("20"); s != 200 {
		t.Fatalf("upload EP20: %d", s)
	}
	anon := newClient()
	get := func(c *client, n string) int {
		res, err := c.http.Get(c.base + "/api/episodes/alpha-king/" + n + "/video")
		if err != nil {
			t.Fatal(err)
		}
		res.Body.Close()
		return res.StatusCode
	}
	if s := get(anon, "1"); s != 200 {
		t.Fatalf("free episode video: %d", s)
	}
	if s := get(anon, "20"); s != http.StatusForbidden {
		t.Fatalf("locked episode streamed to anonymous viewer: %d", s)
	}
	anon.must("POST", "/api/auth/guest", nil)
	anon.must("POST", "/api/unlock", map[string]any{"dramaId": "alpha-king", "ep": 20})
	if s := get(anon, "20"); s != 200 {
		t.Fatalf("unlocked episode video: %d", s)
	}
	// Uploading a non-video is refused.
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	fw, _ := w.CreateFormFile("file", "notes.mp4")
	fw.Write([]byte("<html>not a video</html>"))
	w.Close()
	req, _ := http.NewRequest("POST", owner.base+"/api/admin/dramas/alpha-king/episodes/3/video", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	res, _ := owner.http.Do(req)
	res.Body.Close()
	if res.StatusCode != http.StatusUnsupportedMediaType {
		t.Fatalf("html upload: %d", res.StatusCode)
	}
}

func TestScheduledDramaPremieresAndNotifies(t *testing.T) {
	srv, newClient := newTest(t)
	c := newClient()
	c.signIn("fan@example.org")
	c.must("PUT", "/api/me/reminders/duke-maid", nil)
	srv.now = func() time.Time { return time.Now().AddDate(0, 0, 3) }
	if err := srv.runDue(context.Background()); err != nil {
		t.Fatal(err)
	}
	d := c.must("GET", "/api/dramas/duke-maid", nil)
	if d["drama"].(map[string]any)["status"] != "Published" {
		t.Fatal("drama didn't premiere")
	}
	inbox := listOf(c.must2("GET", "/api/inbox"))
	found := false
	for _, i := range inbox {
		if strings.Contains(i["title"].(string), "is out now") {
			found = true
		}
	}
	if !found {
		t.Fatalf("no premiere notification: %v", inbox)
	}
}

func TestCrossSiteWriteRefused(t *testing.T) {
	_, newClient := newTest(t)
	c := newClient()
	req, _ := http.NewRequest("POST", c.base+"/api/auth/guest", nil)
	req.Header.Set("Origin", "https://evil.example")
	res, err := c.http.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusForbidden {
		t.Fatalf("cross-site POST: %d", res.StatusCode)
	}
}

func TestDeleteAccount(t *testing.T) {
	_, newClient := newTest(t)
	c := newClient()
	c.signIn("leaving@example.org")
	if status, _ := c.do("DELETE", "/api/me", map[string]string{"confirm": "nope"}); status != http.StatusBadRequest {
		t.Fatal("deleted without confirmation")
	}
	c.must("DELETE", "/api/me", map[string]string{"confirm": "DELETE"})
	if status, _ := c.do("GET", "/api/me", nil); status != http.StatusUnauthorized {
		t.Fatal("session survived account deletion")
	}
	// The email is free again: signing in makes a brand-new account.
	c.must("POST", "/api/auth/guest", nil)
	me := c.signIn("leaving@example.org")
	if coins(me) != 130 {
		t.Fatalf("new account coins %d", coins(me))
	}
}

// Regression tests from the independent review.

func TestReferralRewardsAreCapped(t *testing.T) {
	_, newClient := newTest(t)
	inviter := newClient()
	me := inviter.signIn("inviter@example.org")
	ref := me["user"].(map[string]any)["id"]
	for i := 0; i < 6; i++ {
		newClient().must("POST", "/api/auth/google", map[string]any{"ref": ref})
	}
	if got := coins(inviter.must("GET", "/api/me", nil)); got != 130+3*50 {
		t.Fatalf("inviter coins %d, want 3 rewarded referrals a day", got)
	}
}

func TestWatchTimeCantOutrunTheClock(t *testing.T) {
	srv, newClient := newTest(t)
	now := time.Now()
	srv.now = func() time.Time { return now }
	c := newClient()
	c.must("POST", "/api/auth/guest", nil)
	var out map[string]any
	for i := 0; i < 50; i++ {
		out = c.must("POST", "/api/me/watch", map[string]int{"seconds": 30})
	}
	if got := out["watchSec"].(float64); got != 30 {
		t.Fatalf("50 instant heartbeats credited %v seconds, want 30", got)
	}
	now = now.Add(20 * time.Second)
	if got := c.must("POST", "/api/me/watch", map[string]int{"seconds": 30})["watchSec"].(float64); got != 50 {
		t.Fatalf("after 20s credited %v, want 50", got)
	}
}

func TestPlaysCountOncePerViewerPerDay(t *testing.T) {
	srv, newClient := newTest(t)
	c := newClient()
	c.must("POST", "/api/auth/guest", nil)
	views := func() int {
		var n int
		srv.db.QueryRow("SELECT COALESCE(SUM(count), 0) FROM views WHERE drama_id = 'night-market' AND day = ?", srv.today()).Scan(&n)
		return n
	}
	before := views()
	for i := 1; i <= 6; i++ {
		c.must("POST", "/api/me/progress", map[string]any{"dramaId": "night-market", "ep": 1 + i%2})
	}
	if got := views() - before; got != 1 {
		t.Fatalf("plays counted %d times, want 1", got)
	}
}

func TestPaidOrderGrantsWhatItSaidAtPurchase(t *testing.T) {
	_, newClient := newTest(t)
	c := newClient()
	c.signIn("buyer2@example.org")
	p := c.must("POST", "/api/payments", map[string]string{"productId": "coins_500"})
	c.must("POST", "/api/payments/"+p["order"].(string)+"/complete", map[string]string{"outcome": "pending"})
	owner := newClient()
	owner.must("POST", "/api/auth/admin-demo", nil)
	cfg := defaultConfig()
	cfg.CoinPacks[1].Coins = 5000
	owner.must("PUT", "/api/admin/monetization", cfg)
	owner.must("POST", "/api/admin/payments/"+p["order"].(string)+"/recheck", nil)
	if got := coins(c.must("GET", "/api/me", nil)); got != 130+550 {
		t.Fatalf("coins %d, want the 550 the order was for", got)
	}
}

func TestRebindingOriginRefused(t *testing.T) {
	_, newClient := newTest(t)
	c := newClient()
	req, _ := http.NewRequest("POST", c.base+"/api/auth/admin-demo", nil)
	req.Host = "attacker.example:8080"
	req.Header.Set("Origin", "http://attacker.example:8080")
	res, err := c.http.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	res.Body.Close()
	if res.StatusCode != http.StatusForbidden {
		t.Fatalf("rebinding origin: %d", res.StatusCode)
	}
}
