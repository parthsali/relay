package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port        string
	Environment string
	DatabaseURL string
}

func Load() (*Config, error) {
	var Port = getEnv("PORT", "8080")
	var Environment = getEnv("ENVIRONMENT", "development")
	var DatabaseURL = getEnv("DATABASE_URL", "postgres://localhost:5432/relay")

	if Port == "" {
		return nil, fmt.Errorf("PORT environment variable is required")
	}

	if DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	if Environment == "" {
		return nil, fmt.Errorf("ENVIRONMENT environment variable is required")
	}

	return &Config{
		Port:        Port,
		Environment: Environment,
		DatabaseURL: DatabaseURL,
	}, nil
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
