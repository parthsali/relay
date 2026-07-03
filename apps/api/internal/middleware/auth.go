package middleware

import (
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/parthsali/relay/apps/api/internal/response"
)

// Context keys injected by the Auth middleware.
const (
	UserIDKey = "userID"
	EmailKey  = "email"
)

// Claims is the JWT payload shape used across the app.
type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	jwt.RegisteredClaims
}

// Auth validates a Bearer JWT and injects userID + email into the gin context.
// Routes behind this middleware can read values with c.GetString(middleware.UserIDKey).
// Invalid or missing tokens abort the request with 401.
func Auth(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			response.Unauthorized(c, "authorization header required")
			return
		}

		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			response.Unauthorized(c, "expected: Bearer <token>")
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(parts[1], claims, func(t *jwt.Token) (any, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return []byte(jwtSecret), nil
		})
		if err != nil || !token.Valid {
			response.Unauthorized(c, "invalid or expired token")
			return
		}

		c.Set(UserIDKey, claims.UserID)
		c.Set(EmailKey, claims.Email)
		c.Next()
	}
}
