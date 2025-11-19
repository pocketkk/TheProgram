#!/bin/bash
# SQLite Database Restore Script for The Program
# Restores SQLite database from a backup file

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

# Function to list available backups
list_backups() {
    print_info "Available backups:"
    echo ""

    if [ -d "$BACKUP_DIR" ]; then
        local backups=($(ls -1t "$BACKUP_DIR"/app-*.db 2>/dev/null))

        if [ ${#backups[@]} -eq 0 ]; then
            print_warning "No backups found in $BACKUP_DIR"
            return 1
        fi

        local i=1
        for backup in "${backups[@]}"; do
            local size=$(du -h "$backup" | cut -f1)
            local date=$(stat -c %y "$backup" | cut -d'.' -f1)
            echo "  [$i] $(basename $backup) - $size - $date"
            ((i++))
        done
        echo ""
        return 0
    else
        print_error "Backup directory does not exist: $BACKUP_DIR"
        return 1
    fi
}

# Function to backup current database before restore
backup_current_database() {
    if [ -f "$DB_FILE" ]; then
        local timestamp=$(date +%Y%m%d-%H%M%S)
        local safety_backup="${BACKUP_DIR}/app-before-restore-${timestamp}.db"

        print_info "Creating safety backup of current database..."
        mkdir -p "$BACKUP_DIR"
        cp "$DB_FILE" "$safety_backup"
        print_success "Safety backup created: $safety_backup"
        echo ""
    else
        print_warning "No current database file to backup"
    fi
}

# Function to restore database from backup
restore_database() {
    local backup_file=$1

    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi

    # Create safety backup
    backup_current_database

    # Restore
    print_info "Restoring database from: $backup_file"
    cp "$backup_file" "$DB_FILE"

    # Verify
    if [ -f "$DB_FILE" ]; then
        local size=$(du -h "$DB_FILE" | cut -f1)
        print_success "Database restored successfully!"
        print_info "Database file: $DB_FILE"
        print_info "Size: $size"
    else
        print_error "Restore failed!"
        exit 1
    fi
}

# Function to restore from latest backup
restore_latest() {
    if [ -d "$BACKUP_DIR" ]; then
        local latest=$(ls -1t "$BACKUP_DIR"/app-*.db 2>/dev/null | head -n1)

        if [ -z "$latest" ]; then
            print_error "No backups found in $BACKUP_DIR"
            exit 1
        fi

        print_info "Latest backup: $latest"
        echo ""

        # Ask for confirmation
        read -p "Restore from this backup? (yes/no): " confirm
        if [ "$confirm" == "yes" ]; then
            restore_database "$latest"
        else
            print_info "Restore cancelled"
        fi
    else
        print_error "Backup directory does not exist: $BACKUP_DIR"
        exit 1
    fi
}

# Function to restore interactively
restore_interactive() {
    if ! list_backups; then
        exit 1
    fi

    local backups=($(ls -1t "$BACKUP_DIR"/app-*.db 2>/dev/null))

    read -p "Enter backup number to restore (or 'q' to quit): " choice

    if [ "$choice" == "q" ] || [ "$choice" == "Q" ]; then
        print_info "Restore cancelled"
        exit 0
    fi

    if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt ${#backups[@]} ]; then
        print_error "Invalid selection"
        exit 1
    fi

    local selected_backup="${backups[$((choice-1))]}"

    echo ""
    print_warning "This will replace the current database with the selected backup"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" == "yes" ]; then
        restore_database "$selected_backup"

        echo ""
        print_warning "Remember to restart the application to use the restored database"
        print_info "Docker: docker compose restart backend"
    else
        print_info "Restore cancelled"
    fi
}

# Function to restore from specific file
restore_from_file() {
    local backup_file=$1

    if [ -z "$backup_file" ]; then
        print_error "No backup file specified"
        exit 1
    fi

    if [ ! -f "$backup_file" ]; then
        print_error "Backup file not found: $backup_file"
        exit 1
    fi

    echo ""
    print_warning "This will replace the current database with: $backup_file"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" == "yes" ]; then
        restore_database "$backup_file"

        echo ""
        print_warning "Remember to restart the application to use the restored database"
        print_info "Docker: docker compose restart backend"
    else
        print_info "Restore cancelled"
    fi
}

# Function to show help
show_help() {
    cat << EOF
Usage: ./scripts/db-restore.sh [COMMAND] [OPTIONS]

SQLite Database Restore Script for The Program

Commands:
    interactive         Select backup interactively (default)
    latest              Restore from the most recent backup
    file <path>         Restore from a specific backup file
    list                List all available backups
    help                Show this help message

Configuration:
    Database file:      $DB_FILE
    Backup directory:   $BACKUP_DIR

Examples:
    ./scripts/db-restore.sh                         # Interactive restore
    ./scripts/db-restore.sh latest                  # Restore latest backup
    ./scripts/db-restore.sh file ./data/backups/app-20231115-143022.db
    ./scripts/db-restore.sh list                    # List backups

Safety:
    - A safety backup of the current database is created before restoring
    - Confirmation is required before restoring
    - Remember to restart the application after restore

EOF
}

# Main script logic
main() {
    local command=${1:-interactive}

    case $command in
        interactive)
            restore_interactive
            ;;
        latest)
            restore_latest
            ;;
        file)
            restore_from_file "$2"
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
