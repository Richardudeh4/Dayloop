// Package store is the scheduler's Postgres access. It connects with the
// service role, bypassing RLS.
package store

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Job struct {
	ID       int64
	AlertKey string
	UserID   string
	FireAt   time.Time
	Payload  json.RawMessage
	Attempts int
}

type Device struct {
	ID        string
	Platform  string
	PushToken string
}

type Store struct{ pool *pgxpool.Pool }

func Open(ctx context.Context, dsn string) (*Store, error) {
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &Store{pool: pool}, nil
}

func (s *Store) Close() { s.pool.Close() }

// WithDueJobs claims due jobs inside one transaction and calls fn. Jobs that
// any device acknowledged are marked "acked" without being returned.
func (s *Store) WithDueJobs(ctx context.Context, limit int, fn func(pgx.Tx, []Job) error) error {
	return pgx.BeginFunc(ctx, s.pool, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `
			update public.backup_jobs j set status = 'acked'
			where j.status = 'pending' and j.fire_at <= now()
			  and exists (select 1 from public.delivery_acks a
			              where a.alert_key = j.alert_key and a.user_id = j.user_id)`); err != nil {
			return err
		}

		rows, err := tx.Query(ctx, `
			select id, alert_key, user_id, fire_at, payload, attempts
			from public.backup_jobs
			where status = 'pending' and fire_at <= now()
			order by fire_at
			limit $1
			for update skip locked`, limit)
		if err != nil {
			return err
		}
		jobs, err := pgx.CollectRows(rows, func(r pgx.CollectableRow) (Job, error) {
			var j Job
			err := r.Scan(&j.ID, &j.AlertKey, &j.UserID, &j.FireAt, &j.Payload, &j.Attempts)
			return j, err
		})
		if err != nil {
			return err
		}
		return fn(tx, jobs)
	})
}

func (s *Store) Devices(ctx context.Context, tx pgx.Tx, userID string) ([]Device, error) {
	rows, err := tx.Query(ctx, `
		select id, platform, push_token from public.devices
		where user_id = $1 and push_token is not null and platform in ('ios', 'android')`, userID)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, pgx.RowToStructByPos[Device])
}

func (s *Store) Mark(ctx context.Context, tx pgx.Tx, id int64, status string, errMsg string) error {
	_, err := tx.Exec(ctx, `
		update public.backup_jobs
		set status = $2,
		    attempts = attempts + 1,
		    sent_at = case when $2 = 'sent' then now() else sent_at end,
		    last_error = nullif($3, '')
		where id = $1`, id, status, errMsg)
	return err
}

// DropToken clears a push token that the push service rejected (spec 7.11).
func (s *Store) DropToken(ctx context.Context, tx pgx.Tx, deviceID string) error {
	_, err := tx.Exec(ctx, `update public.devices set push_token = null where id = $1`, deviceID)
	return err
}
