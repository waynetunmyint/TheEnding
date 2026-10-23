package api

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"time"
)

// RunJobs sends scheduled notifications, premieres scheduled dramas and cleans up expired
// data until ctx is done.
func (s *Server) RunJobs(ctx context.Context) {
	tick := time.NewTicker(30 * time.Second)
	defer tick.Stop()
	lastCleanup := time.Time{}
	for {
		if err := s.runDue(ctx); err != nil && ctx.Err() == nil {
			log.Printf("jobs: %v", err)
		}
		if time.Since(lastCleanup) > time.Hour {
			if err := s.cleanup(ctx); err != nil && ctx.Err() == nil {
				log.Printf("cleanup: %v", err)
			}
			lastCleanup = time.Now()
		}
		select {
		case <-ctx.Done():
			return
		case <-tick.C:
		}
	}
}

func (s *Server) ids(ctx context.Context, query string, args ...any) ([]string, error) {
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

func (s *Server) runDue(ctx context.Context) error {
	now := s.unix()
	campaigns, err := s.ids(ctx, "SELECT id FROM campaigns WHERE status = 'Scheduled' AND send_at <= ?", now)
	if err != nil {
		return err
	}
	for _, id := range campaigns {
		err := s.tx(ctx, func(tx *sql.Tx) error { return s.deliverCampaign(ctx, tx, atoi64(id)) })
		if err != nil && !errors.Is(err, sql.ErrNoRows) { // ErrNoRows: canceled meanwhile
			log.Printf("jobs: campaign %s: %v", id, err)
		}
	}
	dramas, err := s.ids(ctx, "SELECT id FROM dramas WHERE status = 'Scheduled' AND release_at > 0 AND release_at <= ?", now)
	if err != nil {
		return err
	}
	for _, id := range dramas {
		err := s.tx(ctx, func(tx *sql.Tx) error {
			res, err := tx.ExecContext(ctx, "UPDATE dramas SET status = 'Published', updated_at = ? WHERE id = ? AND status = 'Scheduled' AND release_at > 0 AND release_at <= ?", now, id, now)
			if err != nil {
				return err
			}
			if n, _ := res.RowsAffected(); n == 0 {
				return nil // an admin changed it meanwhile
			}
			if _, err := tx.ExecContext(ctx, "INSERT INTO audit (who, what, created_at) VALUES ('System', ?, ?)", "Premiered "+id+" on schedule", now); err != nil {
				return err
			}
			return s.announcePremiere(ctx, tx, id)
		})
		if err != nil {
			log.Printf("jobs: premiere %s: %v", id, err)
		}
	}
	return nil
}

func (s *Server) cleanup(ctx context.Context) error {
	now := s.unix()
	stmts := []struct {
		query string
		args  []any
	}{
		{"DELETE FROM sessions WHERE expires_at < ?", []any{now}},
		{"DELETE FROM login_codes WHERE created_at < ?", []any{now - 86400}},
		{"DELETE FROM ad_tickets WHERE started_at < ?", []any{now - 86400}},
		{"DELETE FROM searches WHERE created_at < ?", []any{now - 90*86400}},
		{"DELETE FROM daily WHERE day < ?", []any{s.day(s.now().AddDate(0, 0, -30))}},
		// Guest accounts nobody has used for 30 days and that never paid.
		{"DELETE FROM users WHERE via = 'Guest' AND last_seen < ? AND id NOT IN (SELECT user_id FROM payments)", []any{now - 30*86400}},
	}
	for _, st := range stmts {
		if _, err := s.db.ExecContext(ctx, st.query, st.args...); err != nil {
			return err
		}
	}
	return nil
}
