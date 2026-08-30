package email

import (
	"strings"
	"testing"
	"time"
)

func TestNewSMTPSenderValidatesConfig(t *testing.T) {
	base := SMTPConfig{Host: "smtp.example.com", Port: 587, From: "noreply@example.com"}

	if _, err := NewSMTPSender(base); err != nil {
		t.Fatalf("valid config rejected: %v", err)
	}

	missingHost := base
	missingHost.Host = ""
	if _, err := NewSMTPSender(missingHost); err == nil {
		t.Error("expected an error for a missing host")
	}

	badPort := base
	badPort.Port = 0
	if _, err := NewSMTPSender(badPort); err == nil {
		t.Error("expected an error for a non-positive port")
	}

	missingFrom := base
	missingFrom.From = ""
	if _, err := NewSMTPSender(missingFrom); err == nil {
		t.Error("expected an error for a missing from address")
	}

	badFrom := base
	badFrom.From = "not an address"
	if _, err := NewSMTPSender(badFrom); err == nil {
		t.Error("expected an error for an unparseable from address")
	}
}

func TestNewSMTPSenderExtractsBareFromAddress(t *testing.T) {
	sender, err := NewSMTPSender(SMTPConfig{
		Host: "smtp.example.com",
		Port: 587,
		From: "Homban <noreply@example.com>",
	})
	if err != nil {
		t.Fatalf("NewSMTPSender: %v", err)
	}
	if sender.fromAddr != "noreply@example.com" {
		t.Errorf("fromAddr = %q, want the bare address", sender.fromAddr)
	}
}

func TestBuildMessage(t *testing.T) {
	msg, err := buildMessage("Homban <noreply@example.com>", "user@example.com", "123456", 10*time.Minute)
	if err != nil {
		t.Fatalf("buildMessage: %v", err)
	}
	s := string(msg)

	for _, want := range []string{
		"From: Homban <noreply@example.com>\r\n",
		"To: user@example.com\r\n",
		"Subject: Your Homban sign-in code\r\n",
		"123456",
		"10m0s",
	} {
		if !strings.Contains(s, want) {
			t.Errorf("message missing %q:\n%s", want, s)
		}
	}
	if !strings.Contains(s, "\r\n\r\n") {
		t.Error("message is missing the header/body separator")
	}
}

func TestBuildMessageRejectsHeaderInjection(t *testing.T) {
	if _, err := buildMessage("noreply@example.com", "user@example.com\r\nBcc: evil@example.com", "123456", time.Minute); err == nil {
		t.Fatal("expected an error for a recipient containing CR/LF")
	}
}
