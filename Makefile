.PHONY: help dev dev-frontend dev-backend prod up down restart rebuild logs logs-frontend logs-backend ps shell-frontend shell-backend clean status

# Default target
help:
	@echo "\033[0;32mThe Program - Makefile Commands\033[0m"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev             - Start all services in development mode (Vite dev server)"
	@echo "  make dev-frontend    - Rebuild and restart frontend in dev mode"
	@echo "  make dev-backend     - Rebuild and restart backend in dev mode"
	@echo ""
	@echo "Production Commands:"
	@echo "  make prod            - Start all services in production mode (static build)"
	@echo ""
	@echo "Service Management:"
	@echo "  make up              - Alias for 'make dev'"
	@echo "  make down            - Stop all services"
	@echo "  make restart         - Restart all services"
	@echo "  make rebuild         - Rebuild all services (dev mode)"
	@echo ""
	@echo "Logs & Monitoring:"
	@echo "  make logs            - Show logs for all services"
	@echo "  make logs-frontend   - Show frontend logs"
	@echo "  make logs-backend    - Show backend logs"
	@echo "  make ps              - Show running containers"
	@echo "  make status          - Show detailed service status"
	@echo ""
	@echo "Interactive Shells:"
	@echo "  make shell-frontend  - Open shell in frontend container"
	@echo "  make shell-backend   - Open shell in backend container"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean           - Remove all containers and volumes"
	@echo ""

# Development mode (default)
dev:
	@echo "\033[0;34mStarting services in DEVELOPMENT mode...\033[0m"
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo "\033[0;32m✓ Services started!\033[0m"
	@echo "\033[0;34mFrontend (Vite): http://localhost:3000\033[0m"
	@echo "\033[0;34mBackend API: http://localhost:8000\033[0m"
	@echo "\033[0;34mAPI Docs: http://localhost:8000/docs\033[0m"

# Rebuild and restart specific services in dev mode
dev-frontend:
	@echo "\033[0;34mRebuilding frontend in development mode...\033[0m"
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d frontend --build
	@echo "\033[0;32m✓ Frontend restarted!\033[0m"

dev-backend:
	@echo "\033[0;34mRebuilding backend in development mode...\033[0m"
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d backend --build
	@echo "\033[0;32m✓ Backend restarted!\033[0m"

# Production mode
prod:
	@echo "\033[1;33m⚠ Starting services in PRODUCTION mode...\033[0m"
	docker compose up -d
	@echo "\033[0;32m✓ Services started!\033[0m"
	@echo "\033[0;34mFrontend: http://localhost:3000\033[0m"
	@echo "\033[0;34mBackend API: http://localhost:8000\033[0m"

# Alias for dev
up: dev

# Stop services
down:
	@echo "\033[0;34mStopping services...\033[0m"
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down
	@echo "\033[0;32m✓ Services stopped!\033[0m"

# Restart services
restart:
	@echo "\033[0;34mRestarting services...\033[0m"
	docker compose -f docker-compose.yml -f docker-compose.dev.yml restart
	@echo "\033[0;32m✓ Services restarted!\033[0m"

# Rebuild all services
rebuild:
	@echo "\033[0;34mRebuilding all services (development mode)...\033[0m"
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down
	docker compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo "\033[0;32m✓ Services rebuilt and started!\033[0m"

# Logs
logs:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

logs-frontend:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f frontend

logs-backend:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f backend

# Container info
ps:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml ps

status:
	@echo "\033[0;34mService Status:\033[0m"
	@echo ""
	docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
	@echo ""
	@echo "\033[0;34mHealth Checks:\033[0m"
	docker compose -f docker-compose.yml -f docker-compose.dev.yml ps --format "table {{.Service}}\t{{.Status}}"

# Interactive shells
shell-frontend:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml exec frontend sh

shell-backend:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml exec backend sh

# Cleanup
clean:
	@echo "\033[1;33m⚠ Removing all containers, volumes, and networks...\033[0m"
	docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v --remove-orphans
	@echo "\033[0;32m✓ Cleanup complete!\033[0m"
