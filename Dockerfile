FROM node:22-alpine
RUN apk add --no-cache openssl curl

EXPOSE 3000

WORKDIR /app

COPY package.json package-lock.json* ./

# Install all deps (including dev) so vite/remix build tools are available
RUN npm ci && npm cache clean --force
RUN npm remove @shopify/cli

COPY . .

RUN npm run build

# Prune dev deps after build to keep image lean
RUN npm prune --production

ENV NODE_ENV=production

# Run as non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# NOTE: node:22-alpine may carry upstream CVEs in bundled libs.
# Rebuild periodically or pin to a patched digest once upstream fixes are released.
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -sf --max-time 5 --location http://localhost:3000/ || exit 1

CMD ["npm", "run", "docker-start"]
