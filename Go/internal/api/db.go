package api

import (
	"context"
	"database/sql"
	"fmt"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// openDB opens (or creates) the SQLite database in WAL mode. Write transactions take the
// write lock up front (_txlock=immediate) so concurrent requests wait instead of failing.
func openDB(dataDir string) (*sql.DB, error) {
	path := filepath.Join(dataDir, "the-ending.db")
	dsn := fmt.Sprintf("file:%s?_txlock=immediate&_pragma=busy_timeout(10000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)&_pragma=synchronous(NORMAL)", path)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(4)
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}
	return db, nil
}

// Schema migrations, applied in order. PRAGMA user_version records how many have run.
var migrations = []string{`
CREATE TABLE users (
	id INTEGER PRIMARY KEY,
	name TEXT NOT NULL DEFAULT '',
	email TEXT UNIQUE,
	via TEXT NOT NULL DEFAULT 'Guest',
	color TEXT NOT NULL DEFAULT '#7A3546',
	role TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'Active',
	coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
	vip_plan TEXT NOT NULL DEFAULT '',
	vip_until INTEGER NOT NULL DEFAULT 0,
	muted_until INTEGER NOT NULL DEFAULT 0,
	onboarded INTEGER NOT NULL DEFAULT 0,
	genres TEXT NOT NULL DEFAULT '[]',
	settings TEXT NOT NULL DEFAULT '{}',
	notify TEXT NOT NULL DEFAULT '{}',
	notify_prompted INTEGER NOT NULL DEFAULT 0,
	notify_bonus INTEGER NOT NULL DEFAULT 0,
	signin_bonus INTEGER NOT NULL DEFAULT 0,
	checkin_streak INTEGER NOT NULL DEFAULT 0,
	checkin_last TEXT NOT NULL DEFAULT '',
	created_at INTEGER NOT NULL,
	last_seen INTEGER NOT NULL
);
CREATE TABLE sessions (
	token_hash TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at INTEGER NOT NULL,
	expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);
CREATE TABLE login_codes (
	id TEXT PRIMARY KEY,
	email TEXT NOT NULL,
	attempts INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL,
	expires_at INTEGER NOT NULL,
	used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE dramas (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	synopsis TEXT NOT NULL DEFAULT '',
	genres TEXT NOT NULL DEFAULT '[]',
	total_episodes INTEGER NOT NULL DEFAULT 0,
	free_episodes INTEGER NOT NULL DEFAULT 10,
	coins_per_episode INTEGER NOT NULL DEFAULT 60,
	status TEXT NOT NULL DEFAULT 'Draft',
	completed INTEGER NOT NULL DEFAULT 0,
	color TEXT NOT NULL DEFAULT '#26202A',
	color2 TEXT NOT NULL DEFAULT '#3A3340',
	badge TEXT NOT NULL DEFAULT '',
	language TEXT NOT NULL DEFAULT 'English',
	release_at INTEGER NOT NULL DEFAULT 0,
	poster TEXT NOT NULL DEFAULT '',
	banner TEXT NOT NULL DEFAULT '',
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);
CREATE TABLE episodes (
	drama_id TEXT NOT NULL REFERENCES dramas(id) ON DELETE CASCADE,
	n INTEGER NOT NULL,
	title TEXT NOT NULL DEFAULT '',
	length_sec INTEGER NOT NULL DEFAULT 0,
	free INTEGER NOT NULL DEFAULT 0,
	published INTEGER NOT NULL DEFAULT 0,
	video TEXT NOT NULL DEFAULT '',
	video_type TEXT NOT NULL DEFAULT '',
	video_status TEXT NOT NULL DEFAULT 'None',
	updated_at INTEGER NOT NULL,
	PRIMARY KEY (drama_id, n)
);
CREATE TABLE unlocks (
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	drama_id TEXT NOT NULL,
	n INTEGER NOT NULL,
	via TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	PRIMARY KEY (user_id, drama_id, n)
);
CREATE INDEX unlocks_time ON unlocks(created_at);
CREATE TABLE progress (
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	drama_id TEXT NOT NULL,
	ep INTEGER NOT NULL,
	updated_at INTEGER NOT NULL,
	PRIMARY KEY (user_id, drama_id)
);
CREATE TABLE user_dramas (
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	drama_id TEXT NOT NULL,
	kind TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	PRIMARY KEY (user_id, drama_id, kind)
);
CREATE INDEX user_dramas_drama ON user_dramas(drama_id, kind);
CREATE TABLE views (
	drama_id TEXT NOT NULL,
	day TEXT NOT NULL,
	count INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (drama_id, day)
);
CREATE TABLE daily (
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	day TEXT NOT NULL,
	ads INTEGER NOT NULL DEFAULT 0,
	watch_sec INTEGER NOT NULL DEFAULT 0,
	watch_at INTEGER NOT NULL DEFAULT 0,
	watch_claimed INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (user_id, day)
);
CREATE TABLE ad_tickets (
	id TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	purpose TEXT NOT NULL,
	drama_id TEXT NOT NULL DEFAULT '',
	n INTEGER NOT NULL DEFAULT 0,
	started_at INTEGER NOT NULL,
	used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE wallet (
	id INTEGER PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	amount INTEGER NOT NULL,
	what TEXT NOT NULL,
	created_at INTEGER NOT NULL
);
CREATE INDEX wallet_user ON wallet(user_id, created_at);
CREATE TABLE payments (
	id INTEGER PRIMARY KEY,
	order_no TEXT NOT NULL UNIQUE,
	user_id INTEGER NOT NULL REFERENCES users(id),
	kind TEXT NOT NULL,
	product_id TEXT NOT NULL,
	item TEXT NOT NULL,
	amount_cents INTEGER NOT NULL,
	store TEXT NOT NULL,
	status TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	updated_at INTEGER NOT NULL
);
CREATE INDEX payments_time ON payments(created_at);
CREATE TABLE referrals (
	invitee_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
	inviter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at INTEGER NOT NULL
);
CREATE TABLE comments (
	id INTEGER PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	drama_id TEXT NOT NULL,
	ep INTEGER NOT NULL,
	text TEXT NOT NULL,
	state TEXT NOT NULL DEFAULT 'Visible',
	reports INTEGER NOT NULL DEFAULT 0,
	reasons TEXT NOT NULL DEFAULT '',
	created_at INTEGER NOT NULL
);
CREATE INDEX comments_ep ON comments(drama_id, ep, created_at);
CREATE TABLE comment_reports (
	comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	reason TEXT NOT NULL,
	created_at INTEGER NOT NULL,
	PRIMARY KEY (comment_id, user_id)
);
CREATE TABLE inbox (
	id INTEGER PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	kind TEXT NOT NULL,
	title TEXT NOT NULL,
	body TEXT NOT NULL,
	href TEXT NOT NULL DEFAULT '',
	read INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL
);
CREATE INDEX inbox_user ON inbox(user_id, created_at);
CREATE TABLE campaigns (
	id INTEGER PRIMARY KEY,
	title TEXT NOT NULL,
	body TEXT NOT NULL,
	audience TEXT NOT NULL,
	drama_id TEXT NOT NULL DEFAULT '',
	target_user INTEGER NOT NULL DEFAULT 0,
	send_at INTEGER NOT NULL,
	status TEXT NOT NULL,
	sent_count INTEGER NOT NULL DEFAULT 0,
	created_by TEXT NOT NULL DEFAULT '',
	created_at INTEGER NOT NULL
);
CREATE TABLE home_slots (
	section TEXT NOT NULL,
	pos INTEGER NOT NULL,
	drama_id TEXT NOT NULL REFERENCES dramas(id) ON DELETE CASCADE,
	meta TEXT NOT NULL DEFAULT '',
	PRIMARY KEY (section, pos)
);
CREATE TABLE config (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
);
CREATE TABLE audit (
	id INTEGER PRIMARY KEY,
	admin_id INTEGER NOT NULL DEFAULT 0,
	who TEXT NOT NULL,
	what TEXT NOT NULL,
	created_at INTEGER NOT NULL
);
CREATE TABLE help_messages (
	id INTEGER PRIMARY KEY,
	user_id INTEGER NOT NULL DEFAULT 0,
	email TEXT NOT NULL DEFAULT '',
	topic TEXT NOT NULL,
	message TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'New',
	created_at INTEGER NOT NULL
);
CREATE TABLE searches (
	id INTEGER PRIMARY KEY,
	q TEXT NOT NULL,
	created_at INTEGER NOT NULL
);
CREATE TABLE ratings (
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	drama_id TEXT NOT NULL,
	value INTEGER NOT NULL,
	created_at INTEGER NOT NULL,
	PRIMARY KEY (user_id, drama_id)
);
`, `
ALTER TABLE payments ADD COLUMN grant_coins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN grant_days INTEGER NOT NULL DEFAULT 0;
`}

func migrate(ctx context.Context, db *sql.DB) (fresh bool, err error) {
	var version int
	if err := db.QueryRowContext(ctx, "PRAGMA user_version").Scan(&version); err != nil {
		return false, err
	}
	for i := version; i < len(migrations); i++ {
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return false, err
		}
		if _, err := tx.ExecContext(ctx, migrations[i]); err != nil {
			tx.Rollback()
			return false, fmt.Errorf("migration %d: %w", i+1, err)
		}
		if _, err := tx.ExecContext(ctx, fmt.Sprintf("PRAGMA user_version = %d", i+1)); err != nil {
			tx.Rollback()
			return false, err
		}
		if err := tx.Commit(); err != nil {
			return false, err
		}
	}
	return version == 0, nil
}

// querier is satisfied by both *sql.DB and *sql.Tx.
type querier interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}
