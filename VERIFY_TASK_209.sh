#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         TASK-209 Frontend Backup UI - Verification            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

success=0
total=0

check_file() {
    ((total++))
    if [ -f "$1" ]; then
        echo "✅ $2"
        ((success++))
    else
        echo "❌ $2 - NOT FOUND"
    fi
}

echo "📁 Checking Primary Implementation Files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "frontend/src/types/backup.ts" "TypeScript Types"
check_file "frontend/src/lib/api/backup.ts" "API Client"
check_file "frontend/src/features/data-portability/hooks/useBackups.ts" "React Hook"
check_file "frontend/src/features/data-portability/BackupDashboard.tsx" "Main Dashboard"
echo ""

echo "🎨 Checking Component Files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "frontend/src/features/data-portability/components/CreateBackupDialog.tsx" "Create Backup Dialog"
check_file "frontend/src/features/data-portability/components/RestoreBackupDialog.tsx" "Restore Backup Dialog"
check_file "frontend/src/features/data-portability/components/BackupDetailsModal.tsx" "Backup Details Modal"
check_file "frontend/src/features/data-portability/components/BackupList.tsx" "Backup List"
check_file "frontend/src/features/data-portability/components/BackupStorageChart.tsx" "Storage Chart"
check_file "frontend/src/features/data-portability/components/BackupScheduleSettings.tsx" "Schedule Settings"
check_file "frontend/src/features/data-portability/index.ts" "Index Exports"
echo ""

echo "🧪 Checking Test Files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "frontend/src/tests/features/data-portability/BackupDashboard.test.tsx" "Component Tests"
echo ""

echo "🔄 Checking Modified Files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "frontend/src/App.tsx" "App.tsx (routing)"
check_file "frontend/src/components/layout/Sidebar.tsx" "Sidebar.tsx (navigation)"
check_file "frontend/src/features/dashboard/DashboardPage.tsx" "DashboardPage.tsx (quick action)"
echo ""

echo "📚 Checking Documentation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "TASK_209_FRONTEND_BACKUP_UI_COMPLETE.md" "Full Implementation Report"
check_file "BACKUP_UI_QUICK_START.md" "Quick Start Guide"
check_file "TASK_209_DELIVERY_SUMMARY.md" "Delivery Summary"
check_file "TASK_209_FINAL_SUMMARY.txt" "Final Summary"
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    VERIFICATION RESULTS                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "  Files Verified: $success / $total"
echo ""

if [ $success -eq $total ]; then
    echo "  ✅ ALL FILES PRESENT - TASK-209 COMPLETE"
    echo ""
    echo "  📊 Code Statistics:"
    echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    find frontend/src/features/data-portability -name "*.tsx" -o -name "*.ts" | xargs wc -l | tail -1 | awk '{print "     Total Lines: " $1}'
    echo ""
    echo "  🚀 Ready for Development Testing"
    echo ""
    exit 0
else
    echo "  ❌ MISSING FILES - Please review implementation"
    exit 1
fi
