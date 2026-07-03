# ── Build stage ──────────────────────────────────────────────────────────────
FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download

COPY apps/api/ .

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /relay-api ./cmd/api

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /relay-api .

EXPOSE 8080

ENTRYPOINT ["./relay-api"]
