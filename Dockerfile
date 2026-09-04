# Central multi-stage Dockerfile for the Dwahfy monorepo.
# Lives in Dwahfy-Core/ but the build context must be the repo root (it also
# builds Dwahfy-Web). Run these from the repo root, not from Dwahfy-Core/.
#
#   docker build -f Dwahfy-Core/Dockerfile --target core -t dwahfy-core .
#   docker build -f Dwahfy-Core/Dockerfile --target web  -t dwahfy-web  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com .

# ---------- core (Dwahfy-Core, Express API) ----------
FROM node:20-alpine AS core

WORKDIR /app

COPY Dwahfy-Core/package*.json ./
RUN npm install

COPY Dwahfy-Core/ .

EXPOSE 8000

CMD ["node", "src/server.js"]

# ---------- web (Dwahfy-Web, Next.js frontend) ----------
FROM node:22-alpine AS web

WORKDIR /app

COPY Dwahfy-Web/package*.json ./
RUN npm install --legacy-peer-deps

COPY Dwahfy-Web/ .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_BETA_MODE
ENV NEXT_PUBLIC_BETA_MODE=$NEXT_PUBLIC_BETA_MODE

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
