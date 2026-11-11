// Command scheduler sends backup reminder pushes for alerts the phone did not
// acknowledge in time (spec 5.3). Safe to run several copies: jobs are claimed
// with FOR UPDATE SKIP LOCKED.
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/richardudeh/kairo/backend/scheduler/internal/jobs"
	"github.com/richardudeh/kairo/backend/scheduler/internal/push"
	"github.com/richardudeh/kairo/backend/scheduler/internal/store"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		// Default for `supabase start`.
		dsn = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
	}

	st, err := store.Open(ctx, dsn)
	if err != nil {
		slog.Error("connect", "err", err)
		os.Exit(1)
	}
	defer st.Close()

	runner := jobs.Runner{
		Store:     st,
		Sender:    push.NewSender(), // logs only until FCM/APNs credentials are set
		BatchSize: 100,
		MaxLate:   15 * time.Minute, // spec 7.2: drop pushes more than 15 min late
	}

	slog.Info("scheduler started")
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()
	for {
		if err := runner.Tick(ctx); err != nil {
			slog.Error("tick", "err", err)
		}
		select {
		case <-ctx.Done():
			slog.Info("scheduler stopped")
			return
		case <-ticker.C:
		}
	}
}
