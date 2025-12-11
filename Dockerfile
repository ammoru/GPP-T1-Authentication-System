# ---------- Stage 1: Builder ----------
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files first for caching
COPY app/package.json app/package-lock.json* /app/

# Install build deps and node modules
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm ci --silent

# Copy application source
COPY app /app

# ---------- Stage 2: Runtime ----------
FROM node:20-slim AS runtime

# Ensure UTC timezone in container
ENV TZ=UTC
ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /app

# Install system packages required at runtime (cron, tzdata)
RUN apt-get update && apt-get install -y --no-install-recommends \
    cron \
    tzdata \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy node modules and app from builder
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app /app

# Copy required keys (assignment requires keys in repo)
COPY student_private.pem /app/student_private.pem
COPY student_public.pem /app/student_public.pem
COPY instructor_public.pem /app/instructor_public.pem

# Copy cron and scripts
COPY cron/2fa-cron /etc/cron.d/2fa-cron
COPY scripts/log_2fa_cron.js /app/scripts/log_2fa_cron.js
COPY scripts/start.sh /app/start.sh

# Permissions
RUN chmod 0644 /etc/cron.d/2fa-cron \
    && chmod +x /app/scripts/log_2fa_cron.js \
    && chmod +x /app/start.sh \
    && chmod 600 /app/student_private.pem \
    && chmod 644 /app/student_public.pem /app/instructor_public.pem

# Create persistent directories
RUN mkdir -p /data /cron && chmod 755 /data /cron

EXPOSE 8080

# Start cron service and node server via start.sh
CMD ["/app/start.sh"]
