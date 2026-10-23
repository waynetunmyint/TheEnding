package api

import (
	"context"
	"database/sql"
	"errors"
	"math/rand/v2"
	"net/http"
	"regexp"
	"strings"
)

// Sign-in is a mock: no email is sent and Google is simulated. Accounts, sessions and the rules
// around them (guest upgrade, one-time bonuses, referrals, bans) are real.

var emailRe = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

const demoOwnerEmail = "owner@the-ending.local"

const maxReferralsPerDay, maxReferrals = 3, 20

func (s *Server) authRoutes() {
	s.handle("POST /api/auth/guest", public, "", s.postGuest)
	s.handle("POST /api/auth/google", public, "", s.postGoogle)
	s.handle("POST /api/auth/email/start", public, "", s.postEmailStart)
	s.handle("POST /api/auth/email/verify", public, "", s.postEmailVerify)
	s.handle("POST /api/auth/admin-demo", public, "", s.postAdminDemo)
	s.handle("POST /api/auth/logout", public, "", s.postLogout)
}

func (s *Server) createUser(ctx context.Context, q querier, name, email, via string) (int64, error) {
	cfg, err := s.config(ctx, q)
	if err != nil {
		return 0, err
	}
	now := s.unix()
	var emailArg any
	if email != "" {
		emailArg = email
	}
	res, err := q.ExecContext(ctx, `INSERT INTO users (name, email, via, color, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)`,
		name, emailArg, via, avatarColors[rand.IntN(len(avatarColors))], now, now)
	if err != nil {
		return 0, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return 0, err
	}
	if err := s.addCoins(ctx, q, id, cfg.WelcomeCoins, "Welcome gift"); err != nil {
		return 0, err
	}
	return id, nil
}

func (s *Server) postGuest(r *Req) (any, error) {
	if r.User != nil {
		return s.buildMe(r.Context(), r.User.ID)
	}
	var id int64
	err := s.tx(r.Context(), func(tx *sql.Tx) error {
		var err error
		if id, err = s.createUser(r.Context(), tx, "Guest", "", "Guest"); err != nil {
			return err
		}
		return s.startSession(r.Context(), tx, r, id)
	})
	if err != nil {
		return nil, err
	}
	return s.buildMe(r.Context(), id)
}

type signInBody struct {
	Ref int64 `json:"ref"`
}

// completeSignIn grants the one-time sign-in bonus and, for a brand-new account, the referral
// reward on both sides.
func (s *Server) completeSignIn(ctx context.Context, q querier, userID int64, isNew bool, ref int64) error {
	cfg, err := s.config(ctx, q)
	if err != nil {
		return err
	}
	res, err := q.ExecContext(ctx, "UPDATE users SET signin_bonus = 1 WHERE id = ? AND signin_bonus = 0", userID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 1 {
		if err := s.addCoins(ctx, q, userID, cfg.Tasks.Signin, "Signed in bonus"); err != nil {
			return err
		}
	}
	if isNew {
		if err := s.notifyUser(ctx, q, userID, "coin", "Welcome to The Ending", "Your list, coins and progress now follow you. Check in daily for free coins.", "/rewards/"); err != nil {
			return err
		}
	}
	if !isNew || ref == 0 || ref == userID {
		return nil
	}
	inviter, err := loadUser(ctx, q, ref)
	if err != nil || !inviter.SignedIn() || inviter.Status != "Active" {
		return nil // an unknown or inactive inviter is ignored, not an error
	}
	// Caps stop one account from minting coins by inviting throwaway accounts.
	var today, total int
	if err := q.QueryRowContext(ctx, "SELECT COUNT(*), COALESCE(SUM(created_at >= ?), 0) FROM referrals WHERE inviter_id = ?", s.unix()-86400, ref).Scan(&total, &today); err != nil {
		return err
	}
	if today >= maxReferralsPerDay || total >= maxReferrals {
		return nil
	}
	res, err = q.ExecContext(ctx, "INSERT OR IGNORE INTO referrals (invitee_id, inviter_id, created_at) VALUES (?, ?, ?)", userID, ref, s.unix())
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return nil
	}
	if err := s.addCoins(ctx, q, ref, cfg.Tasks.Invite, "Invited a friend"); err != nil {
		return err
	}
	if err := s.notifyUser(ctx, q, ref, "coin", "A friend joined", "You both got "+itoa(cfg.Tasks.Invite)+" coins.", "/wallet/"); err != nil {
		return err
	}
	return s.addCoins(ctx, q, userID, cfg.Tasks.Invite, "Joined with a friend's invite")
}

func (s *Server) postGoogle(r *Req) (any, error) {
	var body signInBody
	_ = r.decode(&body)
	var id int64
	err := s.tx(r.Context(), func(tx *sql.Tx) error {
		if r.User != nil && !r.User.SignedIn() {
			// Upgrade this browser's guest account so its coins, list and progress carry over.
			id = r.User.ID
			if _, err := tx.ExecContext(r.Context(), "UPDATE users SET via = 'Google', name = ? WHERE id = ?", "Viewer "+itoa(int(id%10000)), id); err != nil {
				return err
			}
		} else {
			var err error
			if id, err = s.createUser(r.Context(), tx, "", "", "Google"); err != nil {
				return err
			}
			if _, err := tx.ExecContext(r.Context(), "UPDATE users SET name = ? WHERE id = ?", "Viewer "+itoa(int(id%10000)), id); err != nil {
				return err
			}
		}
		if err := s.completeSignIn(r.Context(), tx, id, true, body.Ref); err != nil {
			return err
		}
		return s.startSession(r.Context(), tx, r, id)
	})
	if err != nil {
		return nil, err
	}
	return s.buildMe(r.Context(), id)
}

type emailStartBody struct {
	Email string `json:"email"`
}

func (s *Server) postEmailStart(r *Req) (any, error) {
	var body emailStartBody
	if err := r.decode(&body); err != nil {
		return nil, err
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	if !emailRe.MatchString(email) || len(email) > 200 {
		return nil, fail(http.StatusBadRequest, "Enter a valid email address")
	}
	now := s.unix()
	var recent int
	if err := s.db.QueryRowContext(r.Context(), "SELECT COUNT(*) FROM login_codes WHERE email = ? AND created_at > ?", email, now-3600).Scan(&recent); err != nil {
		return nil, err
	}
	if recent >= 10 {
		return nil, fail(http.StatusTooManyRequests, "Too many codes requested. Try again in an hour.")
	}
	id := randomToken(16)
	if _, err := s.db.ExecContext(r.Context(), "INSERT INTO login_codes (id, email, created_at, expires_at) VALUES (?, ?, ?, ?)", id, email, now, now+600); err != nil {
		return nil, err
	}
	// Demo build: the code is shown in the app instead of being emailed.
	return map[string]any{"challengeId": id, "email": email, "demoCode": s.cfg.DemoCode, "expiresIn": 600}, nil
}

type emailVerifyBody struct {
	ChallengeID string `json:"challengeId"`
	Code        string `json:"code"`
	Ref         int64  `json:"ref"`
}

func (s *Server) postEmailVerify(r *Req) (any, error) {
	var body emailVerifyBody
	if err := r.decode(&body); err != nil {
		return nil, err
	}
	ctx := r.Context()
	var id int64
	err := s.tx(ctx, func(tx *sql.Tx) error {
		var email string
		var attempts, used int
		var expires int64
		err := tx.QueryRowContext(ctx, "SELECT email, attempts, expires_at, used FROM login_codes WHERE id = ?", body.ChallengeID).Scan(&email, &attempts, &expires, &used)
		if errors.Is(err, sql.ErrNoRows) || (err == nil && (used == 1 || expires < s.unix())) {
			return fail(http.StatusGone, "This code expired. Request a new one.")
		}
		if err != nil {
			return err
		}
		if attempts >= 3 {
			return fail(http.StatusTooManyRequests, "Too many tries. Request a new code.")
		}
		if strings.TrimSpace(body.Code) != s.cfg.DemoCode {
			left := 2 - attempts
			if left <= 0 {
				return &wrongCode{&httpError{http.StatusTooManyRequests, "Too many tries. Request a new code."}}
			}
			return &wrongCode{&httpError{http.StatusBadRequest, "That code is incorrect. " + plural(left, "try", "tries") + " left."}}
		}
		if _, err := tx.ExecContext(ctx, "UPDATE login_codes SET used = 1 WHERE id = ?", body.ChallengeID); err != nil {
			return err
		}

		existing, err := scanUser(tx.QueryRowContext(ctx, "SELECT "+userColumns+" FROM users u WHERE u.email = ?", email))
		switch {
		case err == nil:
			if existing.Status != "Active" {
				return fail(http.StatusForbidden, "This account is banned. Contact support if you think this is a mistake.")
			}
			id = existing.ID
			if err := s.notifyUser(ctx, tx, id, "sys", "New sign-in", "Signed in on a browser. Not you? Sign out and contact support.", "/settings/"); err != nil {
				return err
			}
			if err := s.completeSignIn(ctx, tx, id, false, 0); err != nil {
				return err
			}
		case errors.Is(err, sql.ErrNoRows):
			name := email[:strings.Index(email, "@")]
			if len(name) > 30 {
				name = name[:30]
			}
			if r.User != nil && !r.User.SignedIn() {
				id = r.User.ID
				if _, err := tx.ExecContext(ctx, "UPDATE users SET via = 'Email code', email = ?, name = ? WHERE id = ?", email, name, id); err != nil {
					return err
				}
			} else if id, err = s.createUser(ctx, tx, name, email, "Email code"); err != nil {
				return err
			}
			if err := s.completeSignIn(ctx, tx, id, true, body.Ref); err != nil {
				return err
			}
		default:
			return err
		}
		return s.startSession(ctx, tx, r, id)
	})
	// A wrong code must still count the attempt, so it is committed before reporting.
	var wc *wrongCode
	if errors.As(err, &wc) {
		if _, err := s.db.ExecContext(ctx, "UPDATE login_codes SET attempts = attempts + 1 WHERE id = ?", body.ChallengeID); err != nil {
			return nil, err
		}
		return nil, wc.httpError
	}
	if err != nil {
		return nil, err
	}
	return s.buildMe(ctx, id)
}

type wrongCode struct{ *httpError }

// postAdminDemo signs this browser in as the sample Owner account so the admin panel can be
// explored. This is a local, single-machine demo; there is no real admin authentication.
func (s *Server) postAdminDemo(r *Req) (any, error) {
	var id int64
	err := s.tx(r.Context(), func(tx *sql.Tx) error {
		if err := tx.QueryRowContext(r.Context(), "SELECT id FROM users WHERE email = ? AND status = 'Active'", demoOwnerEmail).Scan(&id); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return fail(http.StatusNotFound, "The demo owner account was removed")
			}
			return err
		}
		return s.startSession(r.Context(), tx, r, id)
	})
	if err != nil {
		return nil, err
	}
	return s.buildMe(r.Context(), id)
}

func (s *Server) postLogout(r *Req) (any, error) {
	return nil, s.endSession(r.Context(), r)
}
