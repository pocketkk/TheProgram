#!/bin/bash
# Production Docker deployment script for The Program
# Manages production deployment with SQLite database

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
        print_error ".env file not found!"
        print_info "Please copy .env.example to .env and configure it"
        exit 1
    fi
}

# Function to create data directory
ensure_data_directory() {
    if [ ! -d ./data ]; then
        print_info "Creating data directory..."
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

# Function to start production services
start_services() {
    print_info "Starting production services..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    print_success "Production services started"
}

# Function to stop services
stop_services() {
    print_info "Stopping services..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml down
    print_success "Services stopped"
}

# Function to view logs
view_logs() {
    local service=$1
    if [ -z "$service" ]; then
        docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
    else
        docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f "$service"
    fi
}

# Function to show status
show_status() {
    print_info "Service Status:"
    docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
}

# Function to rebuild and restart
rebuild_services() {
    print_info "Rebuilding services..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache
    print_success "Services rebuilt"

    print_info "Restarting services..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate
    print_success "Services restarted"
}

# Function to show health status
health_check() {
    print_info "Checking service health..."

    # Check backend health
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        print_success "Backend is healthy"
    else
        print_error "Backend is not responding"
    fi

    # Check frontend
    if curl -f http://localhost:3000/ > /dev/null 2>&1; then
        print_success "Frontend is healthy"
    else
        print_error "Frontend is not responding"
    fi
}

# Function to start with nginx
start_with_nginx() {
    print_info "Starting production services with Nginx..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile with-nginx up -d
    print_success "Production services with Nginx started"
}

# Function to show help
show_help() {
    cat << EOF
Usage: ./docker-prod.sh [COMMAND]

Production Docker management script for The Program (SQLite)

Commands:
    start               Start production services
    stop                Stop all services
    restart             Restart all services
    rebuild             Rebuild and restart services
    logs [service]      View logs (optionally for specific service)
    status              Show service status
    health              Check service health
    backup              Backup SQLite database
    nginx               Start with Nginx reverse proxy
    help                Show this help message

Examples:
    ./docker-prod.sh start          # Start production
    ./docker-prod.sh logs backend   # View backend logs
    ./docker-prod.sh backup         # Backup database
    ./docker-prod.sh nginx          # Start with Nginx

EOF
}

# Main script logic
main() {
    local command=${1:-help}

    case $command in
        start)
            check_env_file
            ensure_data_directory
            start_services
            print_info "Waiting for services to start..."
            sleep 10
            health_check
            print_success "Production deployment complete!"
            print_info "Backend: http://localhost:8000"
            print_info "Frontend: http://localhost:3000"
            print_info "API Docs: http://localhost:8000/docs"
            ;;
        stop)
            stop_services
            ;;
        restart)
            stop_services
            start_services
            ;;
        rebuild)
            backup_database
            rebuild_services
            sleep 10
            health_check
            ;;
        logs)
            view_logs "$2"
            ;;
        status)
            show_status
            ;;
        health)
            health_check
            ;;
        backup)
            backup_database
            ;;
        nginx)
            check_env_file
            ensure_data_directory
            start_with_nginx
            print_info "Waiting for services to start..."
            sleep 10
            print_success "Production deployment with Nginx complete!"
            print_info "Application: http://localhost"
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
