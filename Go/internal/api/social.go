package api

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"
)

func (s *Server) socialRoutes() {
	s.handle("GET /api/comments", public, "", s.getComments)
	s.handle("POST /api/comments", signedIn, "", s.postComment)
	s.handle("DELETE /api/comments/{id}", signedIn, "", s.deleteComment)
	s.handle("POST /api/comments/{id}/report", viewer, "", s.postReport)
	s.handle("GET /api/inbox", signedIn, "", s.getInbox)
	s.handle("POST /api/inbox/read", signedIn, "", s.postInboxRead)
	s.handle("DELETE /api/inbox", signedIn, "", s.deleteInbox)
	s.handle("POST /api/help", viewer, "", s.postHelp)
	s.handle("POST /api/me/vip/cancel", signedIn, "", s.postCancelVip)
}

type Comment struct {
	ID      int64  `json:"id"`
	UserID  int64  `json:"userId"`
	Name    string `json:"name"`
	Initial string `json:"initial"`
	Color   string `json:"color"`
	Text    string `json:"text"`
	At      int64  `json:"at"`
	Mine    bool   `json:"mine"`
}

func (s *Server) getComments(r *Req) (any, error) {
	q := r.URL.Query()
	rows, err := s.db.QueryContext(r.Context(), `SELECT c.id, c.user_id, u.name, u.color, c.text, c.created_at FROM comments c
		JOIN users u ON u.id = c.user_id
		WHERE c.drama_id = ? AND c.ep = ? AND c.state != 'Hidden' AND u.status = 'Active'
		ORDER BY c.created_at DESC, c.id DESC LIMIT 100`, q.Get("drama"), q.Get("ep"))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Comment{}
	for rows.Next() {
		var c Comment
		if err := rows.Scan(&c.ID, &c.UserID, &c.Name, &c.Color, &c.Text, &c.At); err != nil {
			return nil, err
		}
		// Names and colours come from the profile, so renames show on old comments too.
		c.Initial, c.At, c.Mine = initial(c.Name), ms(c.At), r.User != nil && r.User.ID == c.UserID
		out = append(out, c)
	}
	return out, rows.Err()
}

type commentBody struct {
	DramaID string `json:"dramaId"`
	Ep      int    `json:"ep"`
	Text    string `json:"text"`
}

func (s *Server) postComment(r *Req) (any, error) {
	var b commentBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	text := strings.TrimSpace(b.Text)
	if text == "" || len([]rune(text)) > 500 {
		return nil, badRequest("Comments are 1 to 500 characters")
	}
	ctx := r.Context()
	if r.User.MutedUntil > s.unix() {
		return nil, fail(http.StatusForbidden, "You can comment again on %s", time.Unix(r.User.MutedUntil, 0).In(s.loc).Format("02/01/2006"))
	}
	if _, _, err := s.publishedEpisode(ctx, s.db, b.DramaID, b.Ep); err != nil {
		return nil, err
	}
	var recent int
	if err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM comments WHERE user_id = ? AND created_at > ?", r.User.ID, s.unix()-60).Scan(&recent); err != nil {
		return nil, err
	}
	if recent >= 5 {
		return nil, fail(http.StatusTooManyRequests, "You're commenting too fast. Wait a minute.")
	}
	if _, err := s.db.ExecContext(ctx, "INSERT INTO comments (user_id, drama_id, ep, text, created_at) VALUES (?, ?, ?, ?, ?)",
		r.User.ID, b.DramaID, b.Ep, text, s.unix()); err != nil {
		return nil, err
	}
	return nil, nil
}

func (s *Server) deleteComment(r *Req) (any, error) {
	res, err := s.db.ExecContext(r.Context(), "DELETE FROM comments WHERE id = ? AND user_id = ?", r.PathValue("id"), r.User.ID)
	if err != nil {
		return nil, err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil, errNotFound
	}
	return nil, nil
}

var reportReasons = map[string]bool{"spam": true, "spoiler": true, "harassment": true, "other": true}

type reportBody struct {
	Reason string `json:"reason"`
}

func (s *Server) postReport(r *Req) (any, error) {
	var b reportBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	if !reportReasons[b.Reason] {
		return nil, badRequest("Choose a reason")
	}
	ctx := r.Context()
	return nil, s.tx(ctx, func(tx *sql.Tx) error {
		var owner int64
		var state string
		err := tx.QueryRowContext(ctx, "SELECT user_id, state FROM comments WHERE id = ?", r.PathValue("id")).Scan(&owner, &state)
		if errors.Is(err, sql.ErrNoRows) {
			return errNotFound
		}
		if err != nil {
			return err
		}
		if owner == r.User.ID {
			return badRequest("You can't report your own comment")
		}
		res, err := tx.ExecContext(ctx, "INSERT OR IGNORE INTO comment_reports (comment_id, user_id, reason, created_at) VALUES (?, ?, ?, ?)",
			r.PathValue("id"), r.User.ID, b.Reason, s.unix())
		if err != nil {
			return err
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return nil // one report per viewer
		}
		// A moderator's "Keep" stands; new reports only queue comments nobody has reviewed.
		_, err = tx.ExecContext(ctx, `UPDATE comments SET reports = reports + 1,
			reasons = (SELECT group_concat(reason, ', ') FROM (SELECT DISTINCT reason FROM comment_reports WHERE comment_id = comments.id)),
			state = CASE WHEN state = 'Visible' THEN 'Reported' ELSE state END WHERE id = ?`, r.PathValue("id"))
		return err
	})
}

type InboxItem struct {
	ID    int64  `json:"id"`
	Kind  string `json:"kind"`
	Title string `json:"title"`
	Body  string `json:"body"`
	Href  string `json:"href"`
	Read  bool   `json:"read"`
	At    int64  `json:"at"`
}

func (s *Server) getInbox(r *Req) (any, error) {
	rows, err := s.db.QueryContext(r.Context(), "SELECT id, kind, title, body, href, read, created_at FROM inbox WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100", r.User.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []InboxItem{}
	for rows.Next() {
		var i InboxItem
		if err := rows.Scan(&i.ID, &i.Kind, &i.Title, &i.Body, &i.Href, &i.Read, &i.At); err != nil {
			return nil, err
		}
		i.At = ms(i.At)
		out = append(out, i)
	}
	return out, rows.Err()
}

type readBody struct {
	ID int64 `json:"id"` // 0 marks everything read
}

func (s *Server) postInboxRead(r *Req) (any, error) {
	var b readBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	var err error
	if b.ID == 0 {
		_, err = s.db.ExecContext(r.Context(), "UPDATE inbox SET read = 1 WHERE user_id = ?", r.User.ID)
	} else {
		_, err = s.db.ExecContext(r.Context(), "UPDATE inbox SET read = 1 WHERE user_id = ? AND id = ?", r.User.ID, b.ID)
	}
	return nil, err
}

func (s *Server) deleteInbox(r *Req) (any, error) {
	_, err := s.db.ExecContext(r.Context(), "DELETE FROM inbox WHERE user_id = ?", r.User.ID)
	return nil, err
}

var helpTopics = map[string]bool{"Payment or coins": true, "Playback problem": true, "Account and sign-in": true, "Something else": true}

type helpBody struct {
	Topic   string `json:"topic"`
	Message string `json:"message"`
}

func (s *Server) postHelp(r *Req) (any, error) {
	var b helpBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	msg := strings.TrimSpace(b.Message)
	if !helpTopics[b.Topic] || msg == "" || len([]rune(msg)) > 2000 {
		return nil, badRequest("Choose a topic and write a message (up to 2000 characters)")
	}
	_, err := s.db.ExecContext(r.Context(), "INSERT INTO help_messages (user_id, email, topic, message, created_at) VALUES (?, ?, ?, ?, ?)",
		r.User.ID, r.User.Email, b.Topic, msg, s.unix())
	return nil, err
}

// postCancelVip ends VIP now. In the apps VIP is cancelled in the store; this stands in for that.
func (s *Server) postCancelVip(r *Req) (any, error) {
	if !s.vipActive(r.User) {
		return nil, fail(http.StatusConflict, "VIP isn't active")
	}
	if _, err := s.db.ExecContext(r.Context(), "UPDATE users SET vip_until = ? WHERE id = ?", s.unix(), r.User.ID); err != nil {
		return nil, err
	}
	return s.buildMe(r.Context(), r.User.ID)
}
