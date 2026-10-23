package api

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math/rand/v2"
	"net/http"
	"strings"
)

// Checkout is simulated (the web demo has no store), but orders, statuses, grants and the admin
// recheck flow are real. The native apps would replace "complete" with store receipt checks.

func (s *Server) paymentRoutes() {
	s.handle("GET /api/payments", signedIn, "", func(r *Req) (any, error) {
		return s.userPayments(r.Context(), "WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 50", r.User.ID)
	})
	s.handle("POST /api/payments", signedIn, "", s.postPayment)
	s.handle("GET /api/payments/{order}", signedIn, "", s.getPayment)
	s.handle("POST /api/payments/{order}/complete", signedIn, "", s.postCompletePayment)
}

type Payment struct {
	Order       string `json:"order"`
	UserID      int64  `json:"userId"`
	UserName    string `json:"user"`
	Kind        string `json:"kind"`
	ProductID   string `json:"productId"`
	Item        string `json:"item"`
	AmountCents int    `json:"amountCents"`
	Store       string `json:"store"`
	Status      string `json:"status"`
	At          int64  `json:"at"`
	UpdatedAt   int64  `json:"updatedAt"`
}

const paymentColumns = `p.order_no, p.user_id, u.name, p.kind, p.product_id, p.item, p.amount_cents, p.store, p.status, p.created_at, p.updated_at`

func scanPayment(row interface{ Scan(...any) error }) (*Payment, error) {
	p := &Payment{}
	if err := row.Scan(&p.Order, &p.UserID, &p.UserName, &p.Kind, &p.ProductID, &p.Item, &p.AmountCents, &p.Store, &p.Status, &p.At, &p.UpdatedAt); err != nil {
		return nil, err
	}
	p.At, p.UpdatedAt = ms(p.At), ms(p.UpdatedAt)
	return p, nil
}

func (s *Server) payment(ctx context.Context, q querier, order string) (*Payment, error) {
	p, err := scanPayment(q.QueryRowContext(ctx, "SELECT "+paymentColumns+" FROM payments p JOIN users u ON u.id = p.user_id WHERE p.order_no = ?", order))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errNotFound
	}
	return p, err
}

type product struct {
	kind, item string
	cents      int
	coins      int
	plan       *VipPlan
}

func findProduct(cfg AppConfig, id string) (product, bool) {
	for _, p := range cfg.CoinPacks {
		if p.ID == id && p.OnSale {
			return product{kind: "Coins", item: fmt.Sprintf("%d coins", p.Coins+p.Bonus), cents: p.PriceCents, coins: p.Coins + p.Bonus}, true
		}
	}
	for i, p := range cfg.VipPlans {
		if p.ID == id {
			return product{kind: "VIP", item: "VIP " + p.Name, cents: p.PriceCents, plan: &cfg.VipPlans[i]}, true
		}
	}
	return product{}, false
}

type paymentBody struct {
	ProductID string `json:"productId"`
}

func (s *Server) postPayment(r *Req) (any, error) {
	var b paymentBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	ctx := r.Context()
	cfg, err := s.config(ctx, s.db)
	if err != nil {
		return nil, err
	}
	p, found := findProduct(cfg, b.ProductID)
	if !found {
		return nil, fail(http.StatusNotFound, "This product isn't on sale")
	}
	order := fmt.Sprintf("WEB-%04d-%06d", rand.IntN(10000), rand.IntN(1000000))
	now := s.unix()
	days := 0
	if p.plan != nil {
		days = p.plan.Days
	}
	// The order records what it grants, so later pack or plan edits don't change it.
	if _, err := s.db.ExecContext(ctx, `INSERT INTO payments (order_no, user_id, kind, product_id, item, amount_cents, store, status, grant_coins, grant_days, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, 'Web (demo)', 'Pending', ?, ?, ?, ?)`, order, r.User.ID, p.kind, b.ProductID, p.item, p.cents, p.coins, days, now, now); err != nil {
		return nil, err
	}
	return s.payment(ctx, s.db, order)
}

func (s *Server) getPayment(r *Req) (any, error) {
	p, err := s.payment(r.Context(), s.db, r.PathValue("order"))
	if err != nil {
		return nil, err
	}
	if p.UserID != r.User.ID {
		return nil, errNotFound
	}
	return p, nil
}

type completeBody struct {
	Outcome string `json:"outcome"` // success, pending or failed: the simulated store's answer
}

func (s *Server) postCompletePayment(r *Req) (any, error) {
	var b completeBody
	if err := r.decode(&b); err != nil {
		return nil, err
	}
	if b.Outcome != "success" && b.Outcome != "pending" && b.Outcome != "failed" {
		return nil, badRequest("Unknown outcome")
	}
	ctx := r.Context()
	order := r.PathValue("order")
	err := s.tx(ctx, func(tx *sql.Tx) error {
		p, err := s.payment(ctx, tx, order)
		if err != nil {
			return err
		}
		if p.UserID != r.User.ID {
			return errNotFound
		}
		if p.Status != "Pending" {
			return nil // already settled: completing twice never grants twice
		}
		switch b.Outcome {
		case "success":
			return s.settlePayment(ctx, tx, order, "Paid")
		case "failed":
			return s.settlePayment(ctx, tx, order, "Failed")
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	p, err := s.payment(ctx, s.db, order)
	if err != nil {
		return nil, err
	}
	me, err := s.buildMe(ctx, r.User.ID)
	if err != nil {
		return nil, err
	}
	return map[string]any{"payment": p, "me": me}, nil
}

// settlePayment moves a pending payment to Paid (granting coins or VIP) or Failed.
func (s *Server) settlePayment(ctx context.Context, tx *sql.Tx, order, status string) error {
	p, err := s.payment(ctx, tx, order)
	if err != nil {
		return err
	}
	if p.Status != "Pending" {
		return fail(http.StatusConflict, "This payment is already %s", p.Status)
	}
	if _, err := tx.ExecContext(ctx, "UPDATE payments SET status = ?, updated_at = ? WHERE order_no = ?", status, s.unix(), order); err != nil {
		return err
	}
	if status != "Paid" {
		return nil
	}
	var grantCoins, grantDays int
	if err := tx.QueryRowContext(ctx, "SELECT grant_coins, grant_days FROM payments WHERE order_no = ?", order).Scan(&grantCoins, &grantDays); err != nil {
		return err
	}
	cfg, err := s.config(ctx, tx)
	if err != nil {
		return err
	}
	// Orders from before grants were recorded fall back to the product as configured now.
	planName := strings.TrimPrefix(p.Item, "VIP ")
	for _, c := range cfg.CoinPacks {
		if c.ID == p.ProductID && grantCoins == 0 {
			grantCoins = c.Coins + c.Bonus
		}
	}
	for _, v := range cfg.VipPlans {
		if v.ID == p.ProductID && grantDays == 0 {
			grantDays = v.Days
		}
	}
	if p.Kind == "Coins" {
		if grantCoins == 0 {
			return fmt.Errorf("payment %s: unknown coin product %s", order, p.ProductID)
		}
		if err := s.addCoins(ctx, tx, p.UserID, grantCoins, fmt.Sprintf("Bought %d coins", grantCoins)); err != nil {
			return err
		}
		return s.notifyUser(ctx, tx, p.UserID, "coin", fmt.Sprintf("%d coins added", grantCoins), "Order "+order+" is complete.", "/wallet/")
	}
	if grantDays == 0 {
		return fmt.Errorf("payment %s: unknown VIP plan %s", order, p.ProductID)
	}
	u, err := loadUser(ctx, tx, p.UserID)
	if err != nil {
		return err
	}
	start := max(s.unix(), u.VipUntil)
	if _, err := tx.ExecContext(ctx, "UPDATE users SET vip_plan = ?, vip_until = ? WHERE id = ?", planName, start+int64(grantDays)*86400, p.UserID); err != nil {
		return err
	}
	return s.notifyUser(ctx, tx, p.UserID, "vip", "Welcome to VIP "+planName, "Every episode is unlocked. Enjoy.", "/vip/")
}
