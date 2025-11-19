#!/bin/bash

# ============================================================================
# Development Docker Helper Script for The Program
# ============================================================================
# This script provides convenient commands for development with Docker
# Usage: ./docker-dev.sh [command]
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
print_green() {
    echo -e "${GREEN}$1${NC}"
}

print_yellow() {
    echo -e "${YELLOW}$1${NC}"
}

print_red() {
    echo -e "${RED}$1${NC}"
}

# Check if .env exists, create from template if not
check_env() {
    if [ ! -f .env ]; then
        print_yellow "No .env file found. Creating from .env.docker template..."
        cp .env.docker .env
        print_yellow "⚠️  Please edit .env and set your passwords and SECRET_KEY!"
        print_yellow "Generate SECRET_KEY with: openssl rand -hex 32"
        exit 1
    fi
}

# Main commands
case "$1" in
    # Start all services in development mode
    up)
        check_env
        print_green "🚀 Starting The Program in DEVELOPMENT mode..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
        print_green "✅ Services started!"
        print_green "API: http://localhost:8000"
        print_green "API Docs: http://localhost:8000/docs"
        print_green "PgAdmin: http://localhost:5050"
        ;;

    # Start with logs
    up-logs)
        check_env
        print_green "🚀 Starting The Program in DEVELOPMENT mode with logs..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
        ;;

    # Stop all services
    down)
        print_yellow "🛑 Stopping all services..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
        print_green "✅ Services stopped!"
        ;;

    # Stop and remove volumes (clean slate)
    down-clean)
        print_red "🗑️  Stopping services and removing volumes..."
        read -p "This will delete all data. Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v
            print_green "✅ Services and volumes removed!"
        else
            print_yellow "Cancelled."
        fi
        ;;

    # View logs
    logs)
        SERVICE=${2:-backend}
        print_green "📋 Viewing logs for $SERVICE..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f $SERVICE
        ;;

    # Rebuild containers
    rebuild)
        print_yellow "🔨 Rebuilding containers..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache
        print_green "✅ Rebuild complete!"
        ;;

    # Run database migrations
    migrate)
        print_green "📊 Running database migrations..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend alembic upgrade head
        print_green "✅ Migrations complete!"
        ;;

    # Create a new migration
    makemigrations)
        MESSAGE=${2:-"Auto-generated migration"}
        print_green "📝 Creating new migration: $MESSAGE"
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend \
            alembic revision --autogenerate -m "$MESSAGE"
        print_green "✅ Migration created!"
        ;;

    # Run tests
    test)
        print_green "🧪 Running tests..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend \
            pytest tests/ -v
        ;;

    # Run tests with coverage
    test-cov)
        print_green "🧪 Running tests with coverage..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend \
            pytest tests/ --cov=app --cov-report=html --cov-report=term
        print_green "✅ Coverage report generated in htmlcov/"
        ;;

    # Access backend shell
    shell)
        print_green "🐚 Opening backend shell..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend bash
        ;;

    # Access Python shell with app context
    python)
        print_green "🐍 Opening Python shell..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend python
        ;;

    # Access database shell
    dbshell)
        print_green "💾 Opening database shell..."
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec postgres \
            psql -U theprogram -d theprogram_db
        ;;

    # View service status
    ps)
        docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps
        ;;

    # Generate SECRET_KEY
    generate-key)
        print_green "🔑 Generating SECRET_KEY..."
        openssl rand -hex 32
        print_yellow "Copy this key to your .env file as SECRET_KEY"
        ;;

    # Help
    help|--help|-h|"")
        cat << EOF
${GREEN}The Program - Development Docker Helper${NC}

${YELLOW}Usage:${NC}
  ./docker-dev.sh [command]

${YELLOW}Commands:${NC}
  ${GREEN}up${NC}              Start all services in development mode
  ${GREEN}up-logs${NC}         Start services and follow logs
  ${GREEN}down${NC}            Stop all services
  ${GREEN}down-clean${NC}      Stop services and remove volumes (clean slate)
  ${GREEN}logs [service]${NC}  View logs (default: backend)
  ${GREEN}rebuild${NC}         Rebuild all containers
  ${GREEN}migrate${NC}         Run database migrations
  ${GREEN}makemigrations${NC}  Create new migration
  ${GREEN}test${NC}            Run all tests
  ${GREEN}test-cov${NC}        Run tests with coverage report
  ${GREEN}shell${NC}           Open backend container shell
  ${GREEN}python${NC}          Open Python shell
  ${GREEN}dbshell${NC}         Open PostgreSQL shell
  ${GREEN}ps${NC}              Show service status
  ${GREEN}generate-key${NC}    Generate a new SECRET_KEY
  ${GREEN}help${NC}            Show this help message

${YELLOW}Examples:${NC}
  ./docker-dev.sh up              # Start all services
  ./docker-dev.sh logs backend    # View backend logs
  ./docker-dev.sh test            # Run tests
  ./docker-dev.sh shell           # Access backend shell

${YELLOW}URLs (when running):${NC}
  API:        http://localhost:8000
  API Docs:   http://localhost:8000/docs
  PgAdmin:    http://localhost:5050
  PostgreSQL: localhost:5432

EOF
        ;;

    *)
        print_red "Unknown command: $1"
        print_yellow "Run './docker-dev.sh help' for usage information"
        exit 1
        ;;
esac
