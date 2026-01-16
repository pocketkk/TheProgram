"""
Test Suite for Data Utilities

Tests helper utilities for data manipulation and validation.

Author: The Program Development Team
Date: 2025-11-16
"""

import pytest
from datetime import datetime, date, time
from decimal import Decimal
from uuid import uuid4
import json

from app.utils.data_utils import (
    calculate_data_hash,
    normalize_whitespace,
    truncate_string,
    sanitize_filename,
    deep_merge,
    deep_get,
    deep_set,
    chunk_list,
    deduplicate_list,
    parse_size_string,
    format_size,
    validate_email,
    validate_url,
    safe_int,
    safe_float,
    safe_str,
    is_json_serializable,
    make_json_serializable,
    extract_numbers,
    extract_emails,
    extract_urls,
    compare_versions,
    dict_diff,
    filter_dict,
    rename_keys,
    group_by,
    sort_by,
    nested_update,
    compact_dict,
)


class TestHashingAndValidation:
    """Test hashing and validation utilities."""

    def test_calculate_data_hash_string(self):
        """Test hash calculation for strings."""
        hash1 = calculate_data_hash("test data")
        hash2 = calculate_data_hash("test data")
        hash3 = calculate_data_hash("different data")

        assert hash1 == hash2
        assert hash1 != hash3
        assert len(hash1) == 64  # SHA256 hex length

    def test_calculate_data_hash_bytes(self):
        """Test hash calculation for bytes."""
        hash_val = calculate_data_hash(b"test data")
        assert len(hash_val) == 64

    def test_calculate_data_hash_dict(self):
        """Test hash calculation for dict."""
        hash1 = calculate_data_hash({"a": 1, "b": 2})
        hash2 = calculate_data_hash({"b": 2, "a": 1})  # Different order

        assert hash1 == hash2  # Should be same (sorted keys)

    def test_validate_email(self):
        """Test email validation."""
        assert validate_email("test@example.com") is True
        assert validate_email("user.name+tag@example.co.uk") is True
        assert validate_email("invalid@") is False
        assert validate_email("@example.com") is False
        assert validate_email("not-an-email") is False

    def test_validate_url(self):
        """Test URL validation."""
        assert validate_url("https://example.com") is True
        assert validate_url("http://example.com/path") is True
        assert validate_url("https://sub.example.com/path?query=1") is True
        assert validate_url("not-a-url") is False
        assert validate_url("ftp://example.com") is False


class TestStringUtilities:
    """Test string manipulation utilities."""

    def test_normalize_whitespace(self):
        """Test whitespace normalization."""
        assert normalize_whitespace("  too   many   spaces  ") == "too many spaces"
        assert normalize_whitespace("tab\t\tspaces") == "tab spaces"

    def test_normalize_whitespace_preserve_newlines(self):
        """Test preserving newlines."""
        text = "line1  \n  line2"
        result = normalize_whitespace(text, preserve_newlines=True)
        assert result == "line1\nline2"

    def test_truncate_string(self):
        """Test string truncation."""
        long_text = "This is a very long text that needs truncation"
        truncated = truncate_string(long_text, 20)

        assert len(truncated) == 20
        assert truncated.endswith("...")

    def test_truncate_string_no_truncation(self):
        """Test truncation when not needed."""
        short_text = "Short"
        result = truncate_string(short_text, 20)
        assert result == "Short"

    def test_sanitize_filename(self):
        """Test filename sanitization."""
        assert sanitize_filename("valid.txt") == "valid.txt"
        assert sanitize_filename("file<>name.txt") == "file__name.txt"
        assert sanitize_filename('bad/path\\file.txt') == "bad_path_file.txt"
        assert sanitize_filename("..hidden") == "hidden"
        assert sanitize_filename("") == "unnamed"


class TestDictionaryUtilities:
    """Test dictionary manipulation utilities."""

    def test_deep_merge(self):
        """Test deep dictionary merging."""
        dict1 = {"a": 1, "b": {"x": 10}}
        dict2 = {"b": {"y": 20}, "c": 3}

        result = deep_merge(dict1, dict2)

        assert result["a"] == 1
        assert result["b"]["x"] == 10
        assert result["b"]["y"] == 20
        assert result["c"] == 3

    def test_deep_merge_no_overwrite(self):
        """Test deep merge without overwriting."""
        dict1 = {"a": 1, "b": 2}
        dict2 = {"a": 99, "c": 3}

        result = deep_merge(dict1, dict2, overwrite=False)

        assert result["a"] == 1  # Not overwritten
        assert result["c"] == 3

    def test_deep_get(self):
        """Test nested value retrieval."""
        data = {
            "user": {
                "profile": {
                    "name": "Alice"
                }
            }
        }

        assert deep_get(data, "user.profile.name") == "Alice"
        assert deep_get(data, "user.profile.age", default=0) == 0
        assert deep_get(data, "invalid.path", default=None) is None

    def test_deep_set(self):
        """Test nested value setting."""
        data = {}
        deep_set(data, "user.profile.name", "Bob")

        assert data["user"]["profile"]["name"] == "Bob"

    def test_dict_diff(self):
        """Test dictionary difference."""
        dict1 = {"a": 1, "b": 2, "c": 3}
        dict2 = {"a": 1, "b": 99, "d": 4}

        diff = dict_diff(dict1, dict2)

        assert "a" not in diff  # Same value
        assert diff["b"] == (2, 99)
        assert diff["c"] == (3, None)
        assert diff["d"] == (None, 4)

    def test_filter_dict_include(self):
        """Test dictionary filtering (include)."""
        data = {"a": 1, "b": 2, "c": 3}
        filtered = filter_dict(data, ["a", "c"], include=True)

        assert filtered == {"a": 1, "c": 3}

    def test_filter_dict_exclude(self):
        """Test dictionary filtering (exclude)."""
        data = {"a": 1, "b": 2, "c": 3}
        filtered = filter_dict(data, ["b"], include=False)

        assert filtered == {"a": 1, "c": 3}

    def test_rename_keys(self):
        """Test key renaming."""
        data = {"old_name": 1, "other": 2}
        mapping = {"old_name": "new_name"}

        result = rename_keys(data, mapping)

        assert result == {"new_name": 1, "other": 2}

    def test_nested_update(self):
        """Test nested dictionary update."""
        data = {"a": 1, "b": {"x": 10, "y": 20}}
        updates = {"b": {"y": 99, "z": 30}}

        result = nested_update(data, updates)

        assert result["b"]["x"] == 10  # Preserved
        assert result["b"]["y"] == 99  # Updated
        assert result["b"]["z"] == 30  # Added

    def test_compact_dict(self):
        """Test dictionary compaction."""
        data = {"a": 1, "b": None, "c": "", "d": [], "e": 0}

        result = compact_dict(data, remove_none=True, remove_empty=False)
        assert "b" not in result
        assert "c" in result

        result = compact_dict(data, remove_none=True, remove_empty=True)
        assert "b" not in result
        assert "c" not in result
        assert "d" not in result
        assert "e" in result  # 0 is not empty


class TestListUtilities:
    """Test list manipulation utilities."""

    def test_chunk_list(self):
        """Test list chunking."""
        items = list(range(10))
        chunks = chunk_list(items, 3)

        assert len(chunks) == 4
        assert chunks[0] == [0, 1, 2]
        assert chunks[1] == [3, 4, 5]
        assert chunks[3] == [9]

    def test_deduplicate_list(self):
        """Test list deduplication."""
        items = [1, 2, 2, 3, 1, 4]
        result = deduplicate_list(items)

        assert result == [1, 2, 3, 4]

    def test_deduplicate_list_of_dicts(self):
        """Test deduplication with key."""
        items = [
            {"id": 1, "name": "A"},
            {"id": 2, "name": "B"},
            {"id": 1, "name": "C"}
        ]

        result = deduplicate_list(items, key="id")

        assert len(result) == 2
        assert result[0]["id"] == 1
        assert result[1]["id"] == 2

    def test_group_by(self):
        """Test grouping by key."""
        items = [
            {"type": "a", "value": 1},
            {"type": "b", "value": 2},
            {"type": "a", "value": 3}
        ]

        groups = group_by(items, "type")

        assert len(groups["a"]) == 2
        assert len(groups["b"]) == 1

    def test_sort_by(self):
        """Test sorting by key."""
        items = [
            {"name": "Charlie", "age": 30},
            {"name": "Alice", "age": 25},
            {"name": "Bob", "age": 35}
        ]

        sorted_items = sort_by(items, "age")

        assert sorted_items[0]["age"] == 25
        assert sorted_items[2]["age"] == 35

    def test_sort_by_reverse(self):
        """Test reverse sorting."""
        items = [{"x": 1}, {"x": 3}, {"x": 2}]
        sorted_items = sort_by(items, "x", reverse=True)

        assert sorted_items[0]["x"] == 3


class TestSizeUtilities:
    """Test size parsing and formatting."""

    def test_parse_size_string(self):
        """Test size string parsing."""
        assert parse_size_string("10B") == 10
        assert parse_size_string("1KB") == 1024
        assert parse_size_string("1MB") == 1024 * 1024
        assert parse_size_string("1GB") == 1024 * 1024 * 1024

    def test_parse_size_string_decimal(self):
        """Test decimal size strings."""
        assert parse_size_string("1.5KB") == int(1.5 * 1024)

    def test_format_size(self):
        """Test size formatting."""
        assert format_size(0) == "0 B"
        assert format_size(1024) == "1.00 KB"
        assert format_size(1024 * 1024) == "1.00 MB"
        assert format_size(1536) == "1.50 KB"

    def test_format_size_precision(self):
        """Test size formatting with precision."""
        assert format_size(1536, precision=0) == "2 KB"
        assert format_size(1536, precision=3) == "1.500 KB"


class TestSafeConversions:
    """Test safe type conversion utilities."""

    def test_safe_int(self):
        """Test safe integer conversion."""
        assert safe_int("123") == 123
        assert safe_int("45.6") == 0  # Float strings return default (int() can't parse directly)
        assert safe_int("invalid", default=0) == 0
        assert safe_int(None, default=-1) == -1

    def test_safe_float(self):
        """Test safe float conversion."""
        assert safe_float("123.45") == 123.45
        assert safe_float("invalid", default=0.0) == 0.0
        assert safe_float(None, default=-1.0) == -1.0

    def test_safe_str(self):
        """Test safe string conversion."""
        assert safe_str(123) == "123"
        assert safe_str(None, default="N/A") == "N/A"
        assert safe_str(True) == "True"


class TestJSONUtilities:
    """Test JSON serialization utilities."""

    def test_is_json_serializable(self):
        """Test JSON serializability check."""
        assert is_json_serializable({"a": 1})
        assert is_json_serializable([1, 2, 3])
        assert is_json_serializable("string")
        assert is_json_serializable(123)
        assert is_json_serializable(True)
        assert is_json_serializable(None)

    def test_is_not_json_serializable(self):
        """Test non-serializable objects."""
        assert not is_json_serializable(set([1, 2, 3]))
        assert not is_json_serializable(datetime.now())

    def test_make_json_serializable_basic(self):
        """Test making basic types serializable."""
        assert make_json_serializable("string") == "string"
        assert make_json_serializable(123) == 123
        assert make_json_serializable(True) is True
        assert make_json_serializable(None) is None

    def test_make_json_serializable_datetime(self):
        """Test datetime serialization."""
        dt = datetime(2025, 11, 16, 12, 30)
        result = make_json_serializable(dt)

        assert isinstance(result, str)
        assert "2025-11-16" in result

    def test_make_json_serializable_uuid(self):
        """Test UUID serialization."""
        uid = uuid4()
        result = make_json_serializable(uid)

        assert isinstance(result, str)
        assert len(result) == 36

    def test_make_json_serializable_decimal(self):
        """Test Decimal serialization."""
        dec = Decimal("123.45")
        result = make_json_serializable(dec)

        assert isinstance(result, float)
        assert result == 123.45

    def test_make_json_serializable_nested(self):
        """Test nested structure serialization."""
        data = {
            "dt": datetime(2025, 11, 16),
            "uid": uuid4(),
            "nested": {
                "decimal": Decimal("10.5")
            },
            "list": [datetime(2025, 1, 1)]
        }

        result = make_json_serializable(data)

        # Should be JSON serializable now
        json_str = json.dumps(result)
        assert isinstance(json_str, str)


class TestExtractionUtilities:
    """Test data extraction utilities."""

    def test_extract_numbers(self):
        """Test number extraction."""
        text = "The price is $19.99 and quantity is 5"
        numbers = extract_numbers(text)

        assert 19.99 in numbers
        assert 5.0 in numbers

    def test_extract_numbers_negative(self):
        """Test negative number extraction."""
        text = "Temperature: -5.3 degrees"
        numbers = extract_numbers(text)

        assert -5.3 in numbers

    def test_extract_emails(self):
        """Test email extraction."""
        text = "Contact us at info@example.com or support@test.org"
        emails = extract_emails(text)

        assert "info@example.com" in emails
        assert "support@test.org" in emails

    def test_extract_urls(self):
        """Test URL extraction."""
        text = "Visit https://example.com or http://test.org for more info"
        urls = extract_urls(text)

        assert "https://example.com" in urls
        assert "http://test.org" in urls


class TestVersionComparison:
    """Test version comparison utility."""

    def test_compare_versions_equal(self):
        """Test equal versions."""
        assert compare_versions("1.2.3", "1.2.3") == 0

    def test_compare_versions_less_than(self):
        """Test version less than."""
        assert compare_versions("1.2.3", "1.2.4") == -1
        assert compare_versions("1.2.3", "1.3.0") == -1
        assert compare_versions("1.2.3", "2.0.0") == -1

    def test_compare_versions_greater_than(self):
        """Test version greater than."""
        assert compare_versions("1.2.4", "1.2.3") == 1
        assert compare_versions("1.3.0", "1.2.3") == 1
        assert compare_versions("2.0.0", "1.2.3") == 1

    def test_compare_versions_different_lengths(self):
        """Test versions with different segment counts."""
        assert compare_versions("1.2", "1.2.0") == 0
        assert compare_versions("1.2.1", "1.2") == 1


class TestEdgeCases:
    """Test edge cases and error handling."""

    def test_empty_inputs(self):
        """Test handling of empty inputs."""
        assert normalize_whitespace("") == ""
        assert chunk_list([], 5) == []
        assert deduplicate_list([]) == []
        assert deep_merge({}, {}) == {}
        assert filter_dict({}, ["a"]) == {}

    def test_none_handling(self):
        """Test None value handling."""
        assert safe_int(None) == 0
        assert safe_float(None) == 0.0
        assert safe_str(None) == ""

    def test_invalid_inputs(self):
        """Test invalid input handling."""
        with pytest.raises(ValueError):
            parse_size_string("invalid")

        assert extract_numbers("no numbers here") == []
        assert extract_emails("no emails here") == []
        assert extract_urls("no urls here") == []

    def test_special_characters(self):
        """Test special character handling."""
        # Email with special chars
        assert validate_email("user+tag@example.com") is True

        # Filename with Unicode
        filename = sanitize_filename("测试文件.txt")
        assert "测试文件" in filename or filename == "unnamed"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
