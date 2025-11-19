#!/bin/bash
# SQLite Database Backup Script for The Program
# Creates timestamped backups of the SQLite database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_FILE="./data/app.db"
BACKUP_DIR="./data/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/app-${TIMESTAMP}.db"

# Max number of backups to keep
MAX_BACKUPS=30

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

# Function to check if database exists
check_database() {
    if [ ! -f "$DB_FILE" ]; then
        print_error "Database file not found: $DB_FILE"
        exit 1
    fi
}

# Function to create backup directory
ensure_backup_directory() {
    if [ ! -d "$BACKUP_DIR" ]; then
        print_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Function to backup database
backup_database() {
    print_info "Creating backup of SQLite database..."
    print_info "Source: $DB_FILE"
    print_info "Destination: $BACKUP_FILE"

    # Copy database file
    cp "$DB_FILE" "$BACKUP_FILE"

    # Get file size
    local size=$(du -h "$BACKUP_FILE" | cut -f1)

    print_success "Backup created successfully!"
    print_info "Backup file: $BACKUP_FILE"
    print_info "Size: $size"
}

# Function to cleanup old backups
cleanup_old_backups() {
    local backup_count=$(ls -1 "$BACKUP_DIR"/app-*.db 2>/dev/null | wc -l)

    if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
        print_info "Found $backup_count backups, keeping most recent $MAX_BACKUPS"

        # Remove oldest backups
        ls -1t "$BACKUP_DIR"/app-*.db | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f

        print_success "Old backups cleaned up"
    else
        print_info "Total backups: $backup_count (max: $MAX_BACKUPS)"
    fi
}

# Function to list existing backups
list_backups() {
    print_info "Existing backups:"
    echo ""

    if [ -d "$BACKUP_DIR" ]; then
        ls -lh "$BACKUP_DIR"/app-*.db 2>/dev/null | awk '{print $9, "(" $5 ")", $6, $7, $8}' || print_warning "No backups found"
    else
        print_warning "Backup directory does not exist"
    fi
}

# Function to show help
show_help() {
    cat << EOF
Usage: ./scripts/db-backup.sh [COMMAND]

SQLite Database Backup Script for The Program

Commands:
    backup              Create a new backup (default)
    list                List all existing backups
    help                Show this help message

Configuration:
    Database file:      $DB_FILE
    Backup directory:   $BACKUP_DIR
    Max backups kept:   $MAX_BACKUPS

Examples:
    ./scripts/db-backup.sh              # Create backup
    ./scripts/db-backup.sh backup       # Create backup
    ./scripts/db-backup.sh list         # List backups

EOF
}

# Main script logic
main() {
    local command=${1:-backup}

    case $command in
        backup)
            check_database
            ensure_backup_directory
            backup_database
            cleanup_old_backups
            echo ""
            list_backups
            ;;
        list)
            list_backups
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
