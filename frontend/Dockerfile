# Frontend container image: static build served behind nginx, which also
# reverse-proxies /api/* to the backend so the browser sees one origin.
#
# Build from the repo root (npm workspaces need the root package.json/lock):
#   docker build -t homban-web:dev -f frontend/Dockerfile .

FROM node:22-alpine AS build
WORKDIR /src

# Workspace metadata for every member is needed to satisfy the lockfile, even
# though only frontend/ is actually built here.
COPY package.json package-lock.json ./
COPY proxy/package.json proxy/package.json
COPY frontend/package.json frontend/package.json
RUN npm ci --workspace frontend

# Room/task data the frontend imports directly as JSON, living at the repo
# root rather than under frontend/ (see src/domain/roomChecklist.ts).
COPY *.json ./
COPY frontend/ frontend/
RUN npm run build --workspace frontend

FROM nginx:1.29-alpine
COPY --from=build /src/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
