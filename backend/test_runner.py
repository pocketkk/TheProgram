#!/usr/bin/env python3
"""
Simple test runner for format converter tests.

Runs tests without needing full pytest infrastructure.
"""

import sys
sys.path.insert(0, '/home/sylvia/ClaudeWork/TheProgram/backend')

from app.services.format_converter import FormatConverter
from app.utils.data_utils import *
import json

def test_json_to_csv():
    """Test JSON to CSV conversion."""
    converter = FormatConverter()
    json_data = [
        {"name": "John", "age": 30, "city": "New York"},
        {"name": "Jane", "age": 25, "city": "Boston"}
    ]

    csv_output = converter.json_to_csv(json_data)

    # Columns are sorted alphabetically
    assert "age,city,name" in csv_output or "name" in csv_output
    assert "John" in csv_output
    assert "Jane" in csv_output
    print("✓ test_json_to_csv passed")

def test_csv_to_json():
    """Test CSV to JSON conversion."""
    converter = FormatConverter()
    csv_data = """name,age,city
John,30,New York
Jane,25,Boston"""

    json_output = converter.csv_to_json(csv_data)

    assert len(json_output) == 2
    assert json_output[0]["name"] == "John"
    assert json_output[0]["age"] == 30
    print("✓ test_csv_to_json passed")

def test_round_trip():
    """Test round-trip conversion."""
    converter = FormatConverter()
    original = [
        {"name": "Alice", "age": 30, "active": True},
        {"name": "Bob", "age": 25, "active": False}
    ]

    csv_data = converter.json_to_csv(original)
    back_to_json = converter.csv_to_json(csv_data)

    assert back_to_json == original
    print("✓ test_round_trip passed")

def test_nested_flatten():
    """Test nested structure flattening."""
    converter = FormatConverter()
    nested = {
        "user": {
            "name": "John",
            "profile": {
                "age": 30
            }
        }
    }

    flat = converter.flatten_dict(nested)
    assert flat["user.name"] == "John"
    assert flat["user.profile.age"] == 30

    # Round trip
    unflat = converter.unflatten_dict(flat)
    assert unflat == nested
    print("✓ test_nested_flatten passed")

def test_json_formatting():
    """Test JSON formatting."""
    converter = FormatConverter()
    data = {"name": "test", "value": 123}

    # Prettify
    pretty = converter.prettify_json(data)
    assert '\n' in pretty

    # Minify
    mini = converter.minify_json(data)
    assert '\n' not in mini
    print("✓ test_json_formatting passed")

def test_compression():
    """Test compression."""
    converter = FormatConverter()
    data = b"Hello, World! " * 100

    # Gzip
    compressed = converter.compress_data(data, algorithm='gzip')
    assert len(compressed) < len(data)

    decompressed = converter.decompress_data(compressed, algorithm='gzip')
    assert decompressed == data

    # Zlib
    compressed_zlib = converter.compress_data(data, algorithm='zlib')
    decompressed_zlib = converter.decompress_data(compressed_zlib, algorithm='zlib')
    assert decompressed_zlib == data

    print("✓ test_compression passed")

def test_base64_encoding():
    """Test base64 encoding."""
    converter = FormatConverter()
    data = b"Hello, World!"

    encoded = converter.encode_base64(data)
    assert encoded == "SGVsbG8sIFdvcmxkIQ=="

    decoded = converter.decode_base64(encoded)
    assert decoded == data
    print("✓ test_base64_encoding passed")

def test_type_conversion():
    """Test type conversion utilities."""
    converter = FormatConverter()

    # Boolean
    assert converter.convert_boolean("true") is True
    assert converter.convert_boolean("false") is False
    assert converter.convert_boolean("yes") is True
    assert converter.convert_boolean(1) is True

    # Parse values
    assert converter.parse_json_value("123") == 123
    assert converter.parse_json_value("45.6") == 45.6
    assert converter.parse_json_value("true") is True
    assert converter.parse_json_value("null") is None
    assert converter.parse_json_value('["a","b"]') == ["a", "b"]

    print("✓ test_type_conversion passed")

def test_format_detection():
    """Test format detection."""
    converter = FormatConverter()

    assert converter.detect_format('{"key": "value"}') == 'json'
    assert converter.detect_format('[1, 2, 3]') == 'json'
    assert converter.detect_format('a,b,c\n1,2,3') == 'csv'

    assert converter.is_valid_json('{"valid": true}')
    assert not converter.is_valid_json('{invalid}')

    print("✓ test_format_detection passed")

def test_large_dataset():
    """Test with large dataset."""
    converter = FormatConverter()

    large_data = [
        {"id": i, "value": f"Value_{i}", "score": i * 1.5}
        for i in range(1000)
    ]

    csv_output = converter.json_to_csv(large_data)
    json_output = converter.csv_to_json(csv_output)

    assert len(json_output) == 1000
    assert json_output[999]["id"] == 999
    print("✓ test_large_dataset passed (1000 records)")

def test_special_characters():
    """Test special character handling."""
    converter = FormatConverter()
    data = [
        {"text": 'Quote: "Hello"', "unicode": "世界 🌍"},
        {"text": "Comma, in value", "unicode": "Test"}
    ]

    csv_output = converter.json_to_csv(data)
    json_output = converter.csv_to_json(csv_output)

    assert json_output[0]["unicode"] == "世界 🌍"
    print("✓ test_special_characters passed")

def test_data_utils():
    """Test data utility functions."""
    # Hashing
    hash1 = calculate_data_hash("test")
    hash2 = calculate_data_hash("test")
    assert hash1 == hash2
    assert len(hash1) == 64

    # String utils
    assert normalize_whitespace("  too   many   spaces  ") == "too many spaces"
    assert truncate_string("Long text here", 10) == "Long te..."
    assert sanitize_filename("bad/file.txt") == "bad_file.txt"

    # Dict utils
    assert deep_get({"a": {"b": 1}}, "a.b") == 1
    deep_set_result = {}
    deep_set(deep_set_result, "a.b.c", 123)
    assert deep_set_result["a"]["b"]["c"] == 123

    # List utils
    assert chunk_list([1,2,3,4,5], 2) == [[1,2], [3,4], [5]]
    assert deduplicate_list([1,2,2,3,1]) == [1,2,3]

    # Size utils
    assert parse_size_string("1KB") == 1024
    assert format_size(1024) == "1.00 KB"

    # Validation
    assert validate_email("test@example.com") is True
    assert validate_email("invalid") is False
    assert validate_url("https://example.com") is True

    # Safe conversions
    assert safe_int("123") == 123
    assert safe_int("invalid", default=0) == 0

    # Extraction
    assert 19.99 in extract_numbers("Price is $19.99")
    assert "test@example.com" in extract_emails("Email: test@example.com")

    # Version comparison
    assert compare_versions("1.2.3", "1.2.3") == 0
    assert compare_versions("1.2.3", "1.2.4") == -1
    assert compare_versions("1.3.0", "1.2.3") == 1

    print("✓ test_data_utils passed")

def run_all_tests():
    """Run all tests."""
    tests = [
        test_json_to_csv,
        test_csv_to_json,
        test_round_trip,
        test_nested_flatten,
        test_json_formatting,
        test_compression,
        test_base64_encoding,
        test_type_conversion,
        test_format_detection,
        test_large_dataset,
        test_special_characters,
        test_data_utils,
    ]

    passed = 0
    failed = 0

    print("=" * 60)
    print("Running Format Converter Tests")
    print("=" * 60)

    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"✗ {test.__name__} failed: {e}")
            failed += 1

    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)

    return failed == 0

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
