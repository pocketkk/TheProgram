#!/bin/bash
# Development Docker environment script for The Program
# Manages development environment with hot reload and SQLite database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project name
PROJECT_NAME="theprogram"

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if .env file exists
check_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env file not found, creating from example..."
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success ".env file created"
            print_warning "Please review and update .env file with your settings"
        else
            print_error ".env.example not found!"
            exit 1
        fi
    fi
}

# Function to create data directory
ensure_data_directory() {
    if [ ! -d ./data ]; then
        print_info "Creating data directory for SQLite database..."
        mkdir -p ./data
        print_success "Data directory created"
    fi
}

# Function to backup database
backup_database() {
    if [ -f ./data/app.db ]; then
        local backup_file="./data/backups/app-$(date +%Y%m%d-%H%M%S).db"
        print_info "Creating database backup: $backup_file"
        mkdir -p ./data/backups
        cp ./data/app.db "$backup_file"
        print_success "Database backup created"
    else
        print_warning "No database file found to backup"
    fi
}

# Function to start development services
start_dev() {
    print_info "Starting development environment with hot reload..."
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up
}

# Function to start in background
start_dev_detached() {
    print_info "Starting development environment in background..."
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
    print_success "Development environment started"
    print_info "Waiting for services to start..."
    sleep 10
    show_status
    print_info ""
    print_success "Development environment ready!"
    print_info "Backend: http://localhost:8000"
    print_info "Frontend: http://localhost:3000"
    print_info "API Docs: http://localhost:8000/docs"
    print_info ""
    print_info "To view logs: ./docker-dev.sh logs"
    print_info "To stop: ./docker-dev.sh stop"
}

# Function to stop services
stop_services() {
    print_info "Stopping development services..."
    docker compose -f docker-compose.yml -f docker-compose.dev.yml down
    print_success "Services stopped"
}

# Function to rebuild services
rebuild_services() {
    print_info "Rebuilding development services..."
    docker compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache
    print_success "Services rebuilt"
}

# Function to view logs
view_logs() {
    local service=$1
    if [ -z "$service" ]; then
        docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
    else
        docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f "$service"
    fi
}

# Function to show status
show_status() {
    print_info "Service Status:"
    docker compose -f docker-compose.yml -f docker-compose.dev.yml ps
}

# Function to execute shell in backend container
backend_shell() {
    print_info "Opening shell in backend container..."
    docker compose -f docker-compose.yml -f docker-compose.dev.yml exec backend /bin/bash
}

# Function to execute shell in frontend container
frontend_shell() {
    print_info "Opening shell in frontend container..."
    docker compose -f docker-compose.yml -f docker-compose.dev.yml exec frontend /bin/sh
}

# Function to run backend tests
run_backend_tests() {
    print_info "Running backend tests..."
    docker compose -f docker-compose.yml -f docker-compose.dev.yml exec backend pytest
}

# Function to clean up
cleanup() {
    print_warning "This will remove all containers, volumes, and images for this project"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Stopping services..."
        docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
        print_info "Removing images..."
        docker compose -f docker-compose.yml -f docker-compose.dev.yml down --rmi all
        print_success "Cleanup complete"
    else
        print_info "Cleanup cancelled"
    fi
}

# Function to reset database
reset_database() {
    print_warning "This will delete the SQLite database and recreate it"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Backup first
        backup_database

        print_info "Removing database file..."
        rm -f ./data/app.db

        print_info "Restarting backend to recreate database..."
        docker compose -f docker-compose.yml -f docker-compose.dev.yml restart backend

        print_success "Database reset complete"
    else
        print_info "Reset cancelled"
    fi
}

# Function to show help
show_help() {
    cat << EOF
Usage: ./docker-dev.sh [COMMAND]

Development Docker management script for The Program (SQLite)

Commands:
    start               Start development environment (foreground, with logs)
    up                  Start development environment in background (detached)
    stop                Stop all services
    restart             Restart all services
    rebuild             Rebuild all services
    logs [service]      View logs (optionally for specific service)
    status              Show service status
    shell-backend       Open shell in backend container
    shell-frontend      Open shell in frontend container
    test                Run backend tests
    backup              Backup SQLite database
    reset-db            Reset database (delete and recreate)
    cleanup             Remove all containers, volumes, and images
    help                Show this help message

Examples:
    ./docker-dev.sh start           # Start with logs visible
    ./docker-dev.sh up              # Start in background
    ./docker-dev.sh logs backend    # View backend logs
    ./docker-dev.sh shell-backend   # Open backend shell
    ./docker-dev.sh test            # Run tests

Development Features:
    - Hot reload enabled for both frontend and backend
    - SQLite database in ./data/app.db
    - Source code mounted for live changes
    - Debug mode enabled with verbose logging

EOF
}

# Main script logic
main() {
    local command=${1:-help}

    case $command in
        start)
            check_env_file
            ensure_data_directory
            start_dev
            ;;
        up)
            check_env_file
            ensure_data_directory
            start_dev_detached
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            sleep 2
            start_dev_detached
            ;;
        rebuild)
            rebuild_services
            print_info "Rebuild complete. Use 'start' or 'up' to run services"
            ;;
        logs)
            view_logs "$2"
            ;;
        status)
            show_status
            ;;
        shell-backend)
            backend_shell
            ;;
        shell-frontend)
            frontend_shell
            ;;
        test)
            run_backend_tests
            ;;
        backup)
            backup_database
            ;;
        reset-db)
            reset_database
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
