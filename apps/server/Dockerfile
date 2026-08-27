FROM golang:1.25.5-alpine AS builder

WORKDIR /src

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN set -eux; \
    for attempt in 1 2 3 4 5; do \
        GOPROXY="https://proxy.golang.org|direct" go mod download && exit 0; \
        sleep $((attempt * 5)); \
    done; \
    exit 1

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /out/server \
    .

FROM alpine:3.22

RUN apk add --no-cache ca-certificates \
    && adduser -D -H -u 10001 appuser

WORKDIR /app
COPY --from=builder /out/server ./server

USER appuser
ENTRYPOINT ["/app/server"]
