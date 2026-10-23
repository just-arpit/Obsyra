FROM node:20-bookworm-slim

# Set non-interactive debian frontend & default environment
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production
ENV PORT=4000

# Install system dependencies: git, curl, tar, python3
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    tar \
    python3 \
    python3-pip \
    python3-setuptools \
    && rm -rf /var/lib/apt/lists/*

# Install Gitleaks (supports both x86_64 and arm64 architectures)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then GITLEAKS_ARCH="x64"; else GITLEAKS_ARCH="arm64"; fi && \
    curl -sSL "https://github.com/gitleaks/gitleaks/releases/download/v8.18.2/gitleaks_8.18.2_linux_${GITLEAKS_ARCH}.tar.gz" | tar -xz -C /usr/local/bin gitleaks && \
    chmod +x /usr/local/bin/gitleaks || true

# Install Trivy
RUN curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin v0.50.0 || true

# Install Semgrep (built-in rule engine acts as fallback if not installed)
RUN pip3 install --no-cache-dir --break-system-packages semgrep || true

WORKDIR /app

# Copy dependency manifests first to leverage layer caching
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies needed for building
RUN npm install

# Copy application source code
COPY backend ./backend
COPY frontend ./frontend

# Build both backend (tsc) and frontend (vite)
RUN npm run build

# Expose default port (Render & Railway inject PORT environment variable dynamically)
EXPOSE 4000

# Start single-process server (Express serves /api routes + frontend static assets)
CMD ["node", "backend/dist/server.js"]
