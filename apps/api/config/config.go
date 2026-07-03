package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port               string
	Environment        string
	DatabaseURL        string
	JWTSecret          string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	FrontendURL        string
}

func Load() (*Config, error) {
	required := map[string]*string{
		"DATABASE_URL":         new(string),
		"JWT_SECRET":           new(string),
		"GOOGLE_CLIENT_ID":     new(string),
		"GOOGLE_CLIENT_SECRET": new(string),
	}
	for key, ptr := range required {
		val := os.Getenv(key)
		if val == "" {
			return nil, fmt.Errorf("%s environment variable is required", key)
		}
		*ptr = val
	}

	return &Config{
		Port:               getEnv("PORT", "8080"),
		Environment:        getEnv("ENVIRONMENT", "development"),
		DatabaseURL:        *required["DATABASE_URL"],
		JWTSecret:          *required["JWT_SECRET"],
		GoogleClientID:     *required["GOOGLE_CLIENT_ID"],
		GoogleClientSecret: *required["GOOGLE_CLIENT_SECRET"],
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/auth/google/callback"),
		FrontendURL:        getEnv("FRONTEND_URL", "http://localhost:3000"),
	}, nil
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists && value != "" {
		return value
	}
	return defaultValue
}
