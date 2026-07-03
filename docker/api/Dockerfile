FROM golang:1.25-alpine AS builder

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY apps/api/go.mod apps/api/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY apps/api/ .

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -trimpath -o /relay-api ./cmd/api

FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

COPY --from=builder /relay-api /relay-api

EXPOSE 8080

ENTRYPOINT ["/relay-api"]
