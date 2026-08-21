# Backend container image, targeting Azure Container Apps.
#
# Build from the backend directory:
#   docker build -t homban-api:dev --build-arg VERSION=$(git rev-parse --short HEAD) .

FROM golang:1.26-alpine AS build
WORKDIR /src

# Download modules first so this layer is cached while only sources change.
COPY go.mod go.sum* ./
RUN go mod download

COPY . .

ARG VERSION=dev
ARG TARGETOS=linux
ARG TARGETARCH=amd64
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags "-s -w -X main.version=${VERSION}" -o /out/server ./cmd/server

# Distroless: no shell, no package manager, runs as a non-root user.
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /
COPY --from=build /out/server /server

# Container Apps injects PORT; bind all interfaces so ingress can reach us.
ENV HOST=0.0.0.0 \
    PORT=8080 \
    APP_ENV=production \
    LOG_FORMAT=json
EXPOSE 8080

USER nonroot:nonroot
ENTRYPOINT ["/server"]
