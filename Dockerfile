FROM node:22-bookworm-slim

# Set non-interactive debian frontend
ENV DEBIAN_FRONTEND=noninteractive
ENV PORT=4000

# Install system dependencies: git, curl, tar, gzip, python3
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    ca-certificates \
    tar \
    gzip \
    python3 \
    python3-pip \
    python3-setuptools \
    && rm -rf /var/lib/apt/lists/*

# Install Gitleaks (supports both x86_64 and arm64 architectures)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then GITLEAKS_ARCH="x64"; else GITLEAKS_ARCH="arm64"; fi && \
    curl -sSL "https://github.com/gitleaks/gitleaks/releases/download/v8.18.2/gitleaks_8.18.2_linux_${GITLEAKS_ARCH}.tar.gz" | tar -xz -C /usr/local/bin gitleaks && \
    chmod +x /usr/local/bin/gitleaks && \
    /usr/local/bin/gitleaks version

# Install Trivy (supports both x86_64 and arm64 architectures)
RUN ARCH=$(uname -m) && \
    if [ "$ARCH" = "x86_64" ]; then TRIVY_ARCH="64bit"; else TRIVY_ARCH="ARM64"; fi && \
    curl -sSL "https://github.com/aquasecurity/trivy/releases/download/v0.76.1/trivy_0.76.1_Linux-${TRIVY_ARCH}.tar.gz" | tar -xz -C /usr/local/bin trivy && \
    chmod +x /usr/local/bin/trivy && \
    /usr/local/bin/trivy --version

# Attempt Semgrep installation (if omitted or memory-constrained on free tier, Obsyra uses its built-in AST engine)
RUN pip3 install --no-cache-dir --break-system-packages semgrep || true

WORKDIR /app

# Copy dependency manifests first to leverage layer caching
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install all dependencies including devDependencies (TypeScript/tsc & Vite) needed to compile
RUN npm install --include=dev

# Copy application source code
COPY backend ./backend
COPY frontend ./frontend

# Build both backend (tsc) and frontend (vite)
RUN npm run build

# Switch to production mode for runtime
ENV NODE_ENV=production

# Expose default port (Render & Railway inject PORT environment variable dynamically)
EXPOSE 4000

# Start single-process server with experimental sqlite enabled for node:sqlite
CMD ["node", "--experimental-sqlite", "backend/dist/server.js"]
