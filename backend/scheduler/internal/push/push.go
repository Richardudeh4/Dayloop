// Package push sends notifications through FCM (Android) and APNs (iOS).
// The app de-duplicates by AlertKey, so a push that races a local alarm shows once.
package push

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
)

// ErrInvalidToken means the token is dead and should be removed.
var ErrInvalidToken = errors.New("invalid push token")

type Message struct {
	AlertKey string
	Payload  json.RawMessage // {title, meetingUrl}
}

type Sender interface {
	Send(ctx context.Context, platform, token string, msg Message) error
}

// NewSender returns a sender that logs instead of sending.
// TODO: add FCM (service account JSON) and APNs (.p8 key) senders, selected by
// env vars, and route by platform.
func NewSender() Sender { return logSender{} }

type logSender struct{}

func (logSender) Send(_ context.Context, platform, token string, msg Message) error {
	slog.Info("would push", "platform", platform, "alert_key", msg.AlertKey, "token_suffix", tail(token))
	return nil
}

func tail(s string) string {
	if len(s) <= 6 {
		return s
	}
	return s[len(s)-6:]
}
