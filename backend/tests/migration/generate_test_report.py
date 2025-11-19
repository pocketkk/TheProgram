"""
Generate comprehensive migration test report.

This script runs all migration tests and generates a detailed report.
"""
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path


def run_pytest(test_path: str = ".", markers: str = None) -> dict:
    """
    Run pytest and return results.

    Args:
        test_path: Path to tests to run
        markers: Pytest markers to filter tests

    Returns:
        Dictionary with test results
    """
    cmd = ["pytest", test_path, "-v", "--tb=short", "--json-report", "--json-report-file=test_results.json"]

    if markers:
        cmd.extend(["-m", markers])

    print(f"Running: {' '.join(cmd)}")

    start_time = time.time()
    result = subprocess.run(cmd, capture_output=True, text=True)
    duration = time.time() - start_time

    # Try to load JSON report if available
    json_file = Path("test_results.json")
    if json_file.exists():
        with open(json_file) as f:
            test_data = json.load(f)
    else:
        test_data = {}

    return {
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
        "duration": duration,
        "json_data": test_data,
    }


def generate_markdown_report(results: dict) -> str:
    """
    Generate Markdown report from test results.

    Args:
        results: Dictionary of test results by category

    Returns:
        Markdown formatted report
    """
    report = []
    report.append("# Migration Test Report")
    report.append("")
    report.append(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report.append("")

    # Summary
    report.append("## Summary")
    report.append("")

    total_passed = sum(r.get("passed", 0) for r in results.values())
    total_failed = sum(r.get("failed", 0) for r in results.values())
    total_errors = sum(r.get("errors", 0) for r in results.values())
    total_tests = total_passed + total_failed + total_errors

    status = "✓ SUCCESS" if total_failed == 0 and total_errors == 0 else "✗ FAILURE"

    report.append(f"**Overall Status:** {status}")
    report.append("")
    report.append(f"- **Total Tests:** {total_tests}")
    report.append(f"- **Passed:** ✓ {total_passed}")
    report.append(f"- **Failed:** ✗ {total_failed}")
    report.append(f"- **Errors:** ⚠ {total_errors}")
    report.append("")

    # Test Categories
    report.append("## Test Categories")
    report.append("")

    for category, result in results.items():
        status_icon = "✓" if result.get("returncode") == 0 else "✗"
        report.append(f"### {status_icon} {category}")
        report.append("")
        report.append(f"- **Duration:** {result.get('duration', 0):.2f}s")
        report.append(f"- **Passed:** {result.get('passed', 0)}")
        report.append(f"- **Failed:** {result.get('failed', 0)}")
        report.append(f"- **Errors:** {result.get('errors', 0)}")
        report.append("")

    # Performance
    total_duration = sum(r.get("duration", 0) for r in results.values())
    report.append("## Performance")
    report.append("")
    report.append(f"- **Total Time:** {total_duration:.2f}s")
    report.append("")

    # Key Validations
    report.append("## Key Validations")
    report.append("")
    report.append("| Validation | Status |")
    report.append("|------------|--------|")

    validations = [
        ("Export from PostgreSQL", results.get("Export Tests", {}).get("returncode") == 0),
        ("Import to SQLite", results.get("Import Tests", {}).get("returncode") == 0),
        ("Data Transformation", results.get("Data Transformation", {}).get("returncode") == 0),
        ("Foreign Key Relationships", results.get("Relationship Tests", {}).get("returncode") == 0),
        ("CASCADE Deletes", results.get("CASCADE Delete Tests", {}).get("returncode") == 0),
        ("Validation Logic", results.get("Validation Tests", {}).get("returncode") == 0),
        ("Rollback Functionality", results.get("Rollback Tests", {}).get("returncode") == 0),
        ("End-to-End Migration", results.get("Full Migration", {}).get("returncode") == 0),
    ]

    for validation, passed in validations:
        status = "✓ PASS" if passed else "✗ FAIL"
        report.append(f"| {validation} | {status} |")

    report.append("")

    # Recommendations
    report.append("## Recommendations")
    report.append("")

    if total_failed == 0 and total_errors == 0:
        report.append("✓ **All tests passed!** Migration system is ready for production use.")
        report.append("")
        report.append("### Pre-Production Checklist")
        report.append("")
        report.append("- [ ] Run migration on staging environment")
        report.append("- [ ] Verify backup restoration process")
        report.append("- [ ] Test rollback procedure")
        report.append("- [ ] Validate data integrity with production data")
        report.append("- [ ] Document migration runbook")
        report.append("- [ ] Prepare rollback plan")
    else:
        report.append("⚠ **Tests failed.** Address issues before production migration.")
        report.append("")
        report.append("### Action Items")
        report.append("")
        report.append("1. Review failed test output")
        report.append("2. Fix identified issues")
        report.append("3. Re-run full test suite")
        report.append("4. Verify fixes don't break other functionality")

    report.append("")

    # Test Files
    report.append("## Test Files")
    report.append("")

    test_files = [
        "test_export_postgres.py - Export functionality",
        "test_import_sqlite.py - Import functionality",
        "test_data_transformation.py - Data type conversions",
        "test_relationships.py - Foreign key integrity",
        "test_cascade_deletes.py - CASCADE delete operations",
        "test_validation.py - Validation logic",
        "test_rollback.py - Backup and rollback",
        "test_full_migration.py - End-to-end workflow",
    ]

    for test_file in test_files:
        report.append(f"- `{test_file}`")

    report.append("")

    return "\n".join(report)


def main():
    """Main entry point."""
    print("=" * 80)
    print("MIGRATION TEST SUITE")
    print("=" * 80)
    print("")

    # Define test categories
    test_categories = {
        "Export Tests": "test_export_postgres.py",
        "Import Tests": "test_import_sqlite.py",
        "Data Transformation": "test_data_transformation.py",
        "Relationship Tests": "test_relationships.py",
        "CASCADE Delete Tests": "test_cascade_deletes.py",
        "Validation Tests": "test_validation.py",
        "Rollback Tests": "test_rollback.py",
        "Full Migration": "test_full_migration.py",
    }

    results = {}

    # Run each test category
    for category, test_file in test_categories.items():
        print(f"\nRunning {category}...")
        print("-" * 80)

        result = run_pytest(test_file)

        # Parse results
        passed = result["stdout"].count(" PASSED")
        failed = result["stdout"].count(" FAILED")
        errors = result["stdout"].count(" ERROR")

        results[category] = {
            "returncode": result["returncode"],
            "duration": result["duration"],
            "passed": passed,
            "failed": failed,
            "errors": errors,
            "stdout": result["stdout"],
            "stderr": result["stderr"],
        }

        # Print summary
        status = "✓ PASS" if result["returncode"] == 0 else "✗ FAIL"
        print(f"{status} - {passed} passed, {failed} failed, {errors} errors ({result['duration']:.2f}s)")

    # Generate report
    print("\n" + "=" * 80)
    print("GENERATING REPORT")
    print("=" * 80)

    markdown_report = generate_markdown_report(results)

    # Save report
    report_path = Path("migration_test_report.md")
    with open(report_path, "w") as f:
        f.write(markdown_report)

    print(f"\nReport saved to: {report_path}")

    # Also save detailed JSON results
    json_path = Path("migration_test_results.json")
    with open(json_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"Detailed results saved to: {json_path}")

    # Print report
    print("\n" + "=" * 80)
    print(markdown_report)
    print("=" * 80)

    # Exit with appropriate code
    total_failed = sum(r.get("failed", 0) for r in results.values())
    total_errors = sum(r.get("errors", 0) for r in results.values())

    if total_failed == 0 and total_errors == 0:
        print("\n✓ All tests passed!")
        return 0
    else:
        print(f"\n✗ Tests failed: {total_failed} failures, {total_errors} errors")
        return 1


if __name__ == "__main__":
    sys.exit(main())
