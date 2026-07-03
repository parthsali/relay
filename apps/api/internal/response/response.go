// Package response provides standardized HTTP response helpers for gin handlers.
//
// Every response follows one of two shapes:
//
//	Success: { "success": true,  "data": <payload> }
//	Error:   { "success": false, "error": { "code": "SNAKE_CODE", "message": "..." } }
//
// Middleware-layer errors (401, 403) call c.Abort() automatically so the
// request chain stops. Handler-layer errors (400, 404, 500) do not abort.
package response

import (
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

// ── Error codes ──────────────────────────────────────────────────────────────

// ErrCode is a machine-readable, stable identifier for an error class.
type ErrCode string

const (
	ErrBadRequest   ErrCode = "BAD_REQUEST"
	ErrUnauthorized ErrCode = "UNAUTHORIZED"
	ErrForbidden    ErrCode = "FORBIDDEN"
	ErrNotFound     ErrCode = "NOT_FOUND"
	ErrConflict     ErrCode = "CONFLICT"
	ErrValidation   ErrCode = "VALIDATION_ERROR"
	ErrInternal     ErrCode = "INTERNAL_ERROR"
)

// ── Internal shapes ──────────────────────────────────────────────────────────

type successBody struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
}

type errorBody struct {
	Success bool        `json:"success"`
	Error   errorDetail `json:"error"`
}

type errorDetail struct {
	Code    ErrCode `json:"code"`
	Message string  `json:"message"`
}

// ── Success helpers ──────────────────────────────────────────────────────────

// OK sends 200 with a data payload.
func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, successBody{Success: true, Data: data})
}

// OKMessage sends 200 with a plain message and no data (e.g. logout).
func OKMessage(c *gin.Context, message string) {
	c.JSON(http.StatusOK, successBody{Success: true, Message: message})
}

// Created sends 201 with the newly created resource.
func Created(c *gin.Context, data any) {
	c.JSON(http.StatusCreated, successBody{Success: true, Data: data})
}

// NoContent sends 204 — use for deletes / actions with no return value.
func NoContent(c *gin.Context) {
	c.Status(http.StatusNoContent)
}

// ── Error helpers ────────────────────────────────────────────────────────────

// Err sends a JSON error response with the given HTTP status code.
// Use for handler-level errors (does not abort the middleware chain).
func Err(c *gin.Context, status int, code ErrCode, message string) {
	c.JSON(status, errorBody{
		Success: false,
		Error:   errorDetail{Code: code, Message: message},
	})
}

// AbortErr sends a JSON error and stops the middleware chain.
// Use for auth/middleware errors where the request must not continue.
func AbortErr(c *gin.Context, status int, code ErrCode, message string) {
	c.AbortWithStatusJSON(status, errorBody{
		Success: false,
		Error:   errorDetail{Code: code, Message: message},
	})
}

// ── Convenience shortcuts ────────────────────────────────────────────────────

// BadRequest sends 400.
func BadRequest(c *gin.Context, message string) {
	Err(c, http.StatusBadRequest, ErrBadRequest, message)
}

// Unauthorized sends 401 and aborts — intended for middleware.
func Unauthorized(c *gin.Context, message string) {
	AbortErr(c, http.StatusUnauthorized, ErrUnauthorized, message)
}

// Forbidden sends 403 and aborts — intended for middleware.
func Forbidden(c *gin.Context, message string) {
	AbortErr(c, http.StatusForbidden, ErrForbidden, message)
}

// NotFound sends 404.
func NotFound(c *gin.Context, message string) {
	Err(c, http.StatusNotFound, ErrNotFound, message)
}

// Conflict sends 409 — use for duplicate-key / already-exists errors.
func Conflict(c *gin.Context, message string) {
	Err(c, http.StatusConflict, ErrConflict, message)
}

// Validation sends 422 — use for failed input validation.
func Validation(c *gin.Context, message string) {
	Err(c, http.StatusUnprocessableEntity, ErrValidation, message)
}

// Internal logs the real error server-side and sends a generic 500.
// Never expose internal error details to the client.
func Internal(c *gin.Context, err error) {
	slog.Error("internal server error",
		"method", c.Request.Method,
		"path", c.Request.URL.Path,
		"error", err,
	)
	Err(c, http.StatusInternalServerError, ErrInternal, "an unexpected error occurred")
}
