// Package jobs decides what happens to each due backup reminder.
package jobs

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/richardudeh/kairo/backend/scheduler/internal/push"
	"github.com/richardudeh/kairo/backend/scheduler/internal/store"
)

const maxAttempts = 3

type Runner struct {
	Store     *store.Store
	Sender    push.Sender
	BatchSize int
	MaxLate   time.Duration
}

func (r *Runner) Tick(ctx context.Context) error {
	return r.Store.WithDueJobs(ctx, r.BatchSize, func(tx pgx.Tx, due []store.Job) error {
		for _, job := range due {
			if err := r.handle(ctx, tx, job); err != nil {
				return err
			}
		}
		if len(due) > 0 {
			slog.Info("processed backup jobs", "count", len(due))
		}
		return nil
	})
}

func (r *Runner) handle(ctx context.Context, tx pgx.Tx, job store.Job) error {
	if time.Since(job.FireAt) > r.MaxLate {
		return r.Store.Mark(ctx, tx, job.ID, "expired", "")
	}

	devices, err := r.Store.Devices(ctx, tx, job.UserID)
	if err != nil {
		return err
	}
	if len(devices) == 0 {
		return r.Store.Mark(ctx, tx, job.ID, "failed", "no devices with push tokens")
	}

	msg := push.Message{AlertKey: job.AlertKey, Payload: job.Payload}
	sent := 0
	var lastErr error
	for _, d := range devices {
		err := r.Sender.Send(ctx, d.Platform, d.PushToken, msg)
		switch {
		case err == nil:
			sent++
		case errors.Is(err, push.ErrInvalidToken):
			if err := r.Store.DropToken(ctx, tx, d.ID); err != nil {
				return err
			}
		default:
			lastErr = err
		}
	}

	switch {
	case sent > 0:
		return r.Store.Mark(ctx, tx, job.ID, "sent", "")
	case lastErr != nil && job.Attempts+1 < maxAttempts:
		return r.Store.Mark(ctx, tx, job.ID, "pending", lastErr.Error()) // retried next tick
	default:
		reason := "all tokens invalid"
		if lastErr != nil {
			reason = lastErr.Error()
		}
		return r.Store.Mark(ctx, tx, job.ID, "failed", reason)
	}
}
