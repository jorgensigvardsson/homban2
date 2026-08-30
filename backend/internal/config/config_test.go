package config

import (
	"strings"
	"testing"

	"github.com/jorgensigvardsson/homban2/backend/internal/auth"
)

func TestParseUsers(t *testing.T) {
	users, err := parseUsers(" admin@Example.com : admin , kid@example.com:user ,,")
	if err != nil {
		t.Fatalf("parseUsers: %v", err)
	}
	want := map[string]auth.Role{
		"admin@example.com": auth.RoleAdmin,
		"kid@example.com":   auth.RoleUser,
	}
	if len(users) != len(want) {
		t.Fatalf("users = %v, want %v", users, want)
	}
	for email, role := range want {
		if users[email] != role {
			t.Errorf("users[%q] = %q, want %q", email, users[email], role)
		}
	}
}

func TestParseUsersEmpty(t *testing.T) {
	users, err := parseUsers("  ")
	if err != nil {
		t.Fatalf("parseUsers: %v", err)
	}
	if users != nil {
		t.Errorf("users = %v, want nil", users)
	}
}

func TestParseUsersRejectsMissingRole(t *testing.T) {
	if _, err := parseUsers("admin@example.com"); err == nil {
		t.Fatal("expected an error for an entry with no :role")
	}
}

func TestParseUsersRejectsUnknownRole(t *testing.T) {
	if _, err := parseUsers("admin@example.com:superadmin"); err == nil {
		t.Fatal("expected an error for an unknown role")
	}
}

func TestParseUsersRejectsBadAddress(t *testing.T) {
	if _, err := parseUsers("not-an-email:admin"); err == nil {
		t.Fatal("expected an error for an invalid address")
	}
}

func TestLoadAuthRequiresUsersOutsideDevelopment(t *testing.T) {
	t.Setenv("JWT_SECRET", strings.Repeat("x", auth.MinSecretLength))
	t.Setenv("RECOGNIZED_USERS", "")

	if _, err := loadAuth("production"); err == nil {
		t.Fatal("expected an error when RECOGNIZED_USERS is unset outside development")
	}

	t.Setenv("RECOGNIZED_USERS", "admin@example.com:admin")
	a, err := loadAuth("production")
	if err != nil {
		t.Fatalf("loadAuth: %v", err)
	}
	if a.Users["admin@example.com"] != auth.RoleAdmin {
		t.Errorf("users = %v, want admin@example.com -> admin", a.Users)
	}
}

func TestLoadAuthAllowsEmptyUsersInDevelopment(t *testing.T) {
	t.Setenv("RECOGNIZED_USERS", "")

	a, err := loadAuth("development")
	if err != nil {
		t.Fatalf("loadAuth: %v", err)
	}
	if len(a.Users) != 0 {
		t.Errorf("users = %v, want empty", a.Users)
	}
}
