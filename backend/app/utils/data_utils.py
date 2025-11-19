"""
Data Utilities

Helper utilities for data manipulation and validation in The Program.

Author: The Program Development Team
Date: 2025-11-16
"""

import re
from typing import Any, Dict, List, Optional, Union, Tuple
from datetime import datetime, date, time
from decimal import Decimal
from uuid import UUID
import hashlib
import json


def calculate_data_hash(data: Union[str, bytes, dict, list]) -> str:
    """
    Calculate SHA256 hash of data for integrity verification.

    Args:
        data: Data to hash (string, bytes, or JSON-serializable object)

    Returns:
        Hexadecimal hash string
    """
    if isinstance(data, bytes):
        data_bytes = data
    elif isinstance(data, str):
        data_bytes = data.encode('utf-8')
    else:
        # Convert to JSON string first
        json_str = json.dumps(data, sort_keys=True, ensure_ascii=True)
        data_bytes = json_str.encode('utf-8')

    return hashlib.sha256(data_bytes).hexdigest()


def normalize_whitespace(text: str, preserve_newlines: bool = False) -> str:
    """
    Normalize whitespace in text.

    Args:
        text: Text to normalize
        preserve_newlines: Keep newlines, only collapse spaces/tabs

    Returns:
        Normalized text
    """
    if preserve_newlines:
        # Collapse spaces/tabs but preserve newlines
        lines = text.split('\n')
        return '\n'.join(' '.join(line.split()) for line in lines)
    else:
        # Collapse all whitespace
        return ' '.join(text.split())


def truncate_string(text: str, max_length: int, suffix: str = '...') -> str:
    """
    Truncate string to maximum length.

    Args:
        text: Text to truncate
        max_length: Maximum length
        suffix: Suffix to append if truncated

    Returns:
        Truncated string
    """
    if len(text) <= max_length:
        return text

    truncate_at = max_length - len(suffix)
    return text[:truncate_at] + suffix


def sanitize_filename(filename: str, replacement: str = '_') -> str:
    """
    Sanitize filename by removing/replacing invalid characters.

    Args:
        filename: Original filename
        replacement: Character to replace invalid chars with

    Returns:
        Sanitized filename
    """
    # Remove path separators and other invalid chars
    invalid_chars = r'[<>:"/\\|?*\x00-\x1f]'
    sanitized = re.sub(invalid_chars, replacement, filename)

    # Remove leading/trailing dots and spaces
    sanitized = sanitized.strip('. ')

    # Ensure not empty
    if not sanitized:
        sanitized = 'unnamed'

    return sanitized


def deep_merge(dict1: Dict, dict2: Dict, overwrite: bool = True) -> Dict:
    """
    Deep merge two dictionaries.

    Args:
        dict1: Base dictionary
        dict2: Dictionary to merge in
        overwrite: Overwrite existing values

    Returns:
        Merged dictionary
    """
    result = dict1.copy()

    for key, value in dict2.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            # Recursively merge nested dicts
            result[key] = deep_merge(result[key], value, overwrite)
        elif key in result and not overwrite:
            # Keep existing value
            pass
        else:
            # Set/overwrite value
            result[key] = value

    return result


def deep_get(data: Dict, path: str, separator: str = '.', default: Any = None) -> Any:
    """
    Get value from nested dictionary using path.

    Args:
        data: Dictionary to search
        path: Dot-separated path (e.g., "user.profile.name")
        separator: Path separator
        default: Default value if not found

    Returns:
        Value at path or default

    Example:
        deep_get({"user": {"name": "John"}}, "user.name") → "John"
    """
    keys = path.split(separator)
    current = data

    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return default

    return current


def deep_set(data: Dict, path: str, value: Any, separator: str = '.') -> Dict:
    """
    Set value in nested dictionary using path.

    Args:
        data: Dictionary to modify
        path: Dot-separated path
        value: Value to set
        separator: Path separator

    Returns:
        Modified dictionary

    Example:
        deep_set({}, "user.name", "John") → {"user": {"name": "John"}}
    """
    keys = path.split(separator)
    current = data

    # Navigate to parent
    for key in keys[:-1]:
        if key not in current:
            current[key] = {}
        current = current[key]

    # Set value
    current[keys[-1]] = value

    return data


def chunk_list(items: List, chunk_size: int) -> List[List]:
    """
    Split list into chunks of specified size.

    Args:
        items: List to chunk
        chunk_size: Maximum chunk size

    Returns:
        List of chunks
    """
    return [items[i:i + chunk_size] for i in range(0, len(items), chunk_size)]


def deduplicate_list(items: List, key: Optional[str] = None) -> List:
    """
    Remove duplicates from list while preserving order.

    Args:
        items: List to deduplicate
        key: Key to use for comparison (for list of dicts)

    Returns:
        Deduplicated list
    """
    if not items:
        return []

    seen = set()
    result = []

    for item in items:
        # Get comparison value
        if key and isinstance(item, dict):
            compare_val = item.get(key)
        else:
            compare_val = item

        # Check for hashable type
        try:
            if compare_val not in seen:
                seen.add(compare_val)
                result.append(item)
        except TypeError:
            # Unhashable type (list, dict), compare directly
            if item not in result:
                result.append(item)

    return result


def parse_size_string(size_str: str) -> int:
    """
    Parse size string to bytes.

    Args:
        size_str: Size string (e.g., "10KB", "5MB", "1.5GB")

    Returns:
        Size in bytes

    Examples:
        "10KB" → 10240
        "5MB" → 5242880
        "1.5GB" → 1610612736
    """
    size_str = size_str.strip().upper()

    # Extract number and unit
    match = re.match(r'^([\d.]+)\s*([KMGT]?B?)$', size_str)
    if not match:
        raise ValueError(f"Invalid size string: {size_str}")

    number, unit = match.groups()
    number = float(number)

    # Define multipliers
    multipliers = {
        'B': 1,
        'KB': 1024,
        'MB': 1024 ** 2,
        'GB': 1024 ** 3,
        'TB': 1024 ** 4,
    }

    # Default to bytes if no unit
    if not unit or unit == 'B':
        unit = 'B'

    multiplier = multipliers.get(unit)
    if multiplier is None:
        raise ValueError(f"Unknown unit: {unit}")

    return int(number * multiplier)


def format_size(bytes_count: int, precision: int = 2) -> str:
    """
    Format byte count as human-readable string.

    Args:
        bytes_count: Number of bytes
        precision: Decimal precision

    Returns:
        Formatted string (e.g., "1.5 MB")
    """
    if bytes_count == 0:
        return "0 B"

    units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
    unit_index = 0

    size = float(bytes_count)
    while size >= 1024 and unit_index < len(units) - 1:
        size /= 1024
        unit_index += 1

    return f"{size:.{precision}f} {units[unit_index]}"


def validate_email(email: str) -> bool:
    """
    Validate email address format.

    Args:
        email: Email address to validate

    Returns:
        True if valid email format
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_url(url: str) -> bool:
    """
    Validate URL format.

    Args:
        url: URL to validate

    Returns:
        True if valid URL format
    """
    pattern = r'^https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(/.*)?$'
    return bool(re.match(pattern, url))


def safe_int(value: Any, default: int = 0) -> int:
    """
    Safely convert value to integer.

    Args:
        value: Value to convert
        default: Default value if conversion fails

    Returns:
        Integer value or default
    """
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def safe_float(value: Any, default: float = 0.0) -> float:
    """
    Safely convert value to float.

    Args:
        value: Value to convert
        default: Default value if conversion fails

    Returns:
        Float value or default
    """
    try:
        return float(value)
    except (ValueError, TypeError):
        return default


def safe_str(value: Any, default: str = '') -> str:
    """
    Safely convert value to string.

    Args:
        value: Value to convert
        default: Default value if None

    Returns:
        String value or default
    """
    if value is None:
        return default
    return str(value)


def is_json_serializable(obj: Any) -> bool:
    """
    Check if object is JSON serializable.

    Args:
        obj: Object to check

    Returns:
        True if JSON serializable
    """
    try:
        json.dumps(obj)
        return True
    except (TypeError, ValueError):
        return False


def make_json_serializable(obj: Any) -> Any:
    """
    Convert object to JSON-serializable form.

    Args:
        obj: Object to convert

    Returns:
        JSON-serializable version of object
    """
    if isinstance(obj, (str, int, float, bool, type(None))):
        return obj
    elif isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, time):
        return obj.isoformat()
    elif isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, UUID):
        return str(obj)
    elif isinstance(obj, bytes):
        return obj.decode('utf-8', errors='replace')
    elif isinstance(obj, dict):
        return {key: make_json_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [make_json_serializable(item) for item in obj]
    elif isinstance(obj, set):
        return [make_json_serializable(item) for item in sorted(obj)]
    else:
        # Try to convert to string
        return str(obj)


def extract_numbers(text: str) -> List[float]:
    """
    Extract all numbers from text.

    Args:
        text: Text to search

    Returns:
        List of numbers found
    """
    pattern = r'-?\d+\.?\d*'
    matches = re.findall(pattern, text)
    return [float(m) for m in matches]


def extract_emails(text: str) -> List[str]:
    """
    Extract email addresses from text.

    Args:
        text: Text to search

    Returns:
        List of email addresses found
    """
    pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    return re.findall(pattern, text)


def extract_urls(text: str) -> List[str]:
    """
    Extract URLs from text.

    Args:
        text: Text to search

    Returns:
        List of URLs found
    """
    pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
    return re.findall(pattern, text)


def compare_versions(version1: str, version2: str) -> int:
    """
    Compare two version strings.

    Args:
        version1: First version (e.g., "1.2.3")
        version2: Second version (e.g., "1.2.4")

    Returns:
        -1 if version1 < version2
         0 if version1 == version2
         1 if version1 > version2
    """
    def parse_version(v: str) -> List[int]:
        return [int(x) for x in v.split('.')]

    v1_parts = parse_version(version1)
    v2_parts = parse_version(version2)

    # Pad shorter version with zeros
    max_len = max(len(v1_parts), len(v2_parts))
    v1_parts.extend([0] * (max_len - len(v1_parts)))
    v2_parts.extend([0] * (max_len - len(v2_parts)))

    for p1, p2 in zip(v1_parts, v2_parts):
        if p1 < p2:
            return -1
        elif p1 > p2:
            return 1

    return 0


def generate_random_string(length: int = 16, charset: str = 'alphanumeric') -> str:
    """
    Generate random string.

    Args:
        length: Length of string
        charset: Character set ('alphanumeric', 'alpha', 'numeric', 'hex')

    Returns:
        Random string
    """
    import random
    import string

    charsets = {
        'alphanumeric': string.ascii_letters + string.digits,
        'alpha': string.ascii_letters,
        'numeric': string.digits,
        'hex': string.hexdigits.lower(),
    }

    chars = charsets.get(charset, charsets['alphanumeric'])
    return ''.join(random.choice(chars) for _ in range(length))


def dict_diff(dict1: Dict, dict2: Dict) -> Dict[str, Tuple[Any, Any]]:
    """
    Find differences between two dictionaries.

    Args:
        dict1: First dictionary
        dict2: Second dictionary

    Returns:
        Dictionary of differences {key: (value1, value2)}
    """
    all_keys = set(dict1.keys()) | set(dict2.keys())
    diff = {}

    for key in all_keys:
        val1 = dict1.get(key)
        val2 = dict2.get(key)

        if val1 != val2:
            diff[key] = (val1, val2)

    return diff


def filter_dict(data: Dict, keys: List[str], include: bool = True) -> Dict:
    """
    Filter dictionary by keys.

    Args:
        data: Dictionary to filter
        keys: Keys to include/exclude
        include: True to include only these keys, False to exclude

    Returns:
        Filtered dictionary
    """
    if include:
        return {k: v for k, v in data.items() if k in keys}
    else:
        return {k: v for k, v in data.items() if k not in keys}


def rename_keys(data: Dict, mapping: Dict[str, str]) -> Dict:
    """
    Rename dictionary keys.

    Args:
        data: Dictionary with original keys
        mapping: Key mapping {old_key: new_key}

    Returns:
        Dictionary with renamed keys
    """
    result = {}

    for key, value in data.items():
        new_key = mapping.get(key, key)
        result[new_key] = value

    return result


def group_by(items: List[Dict], key: str) -> Dict[Any, List[Dict]]:
    """
    Group list of dictionaries by key.

    Args:
        items: List of dictionaries
        key: Key to group by

    Returns:
        Dictionary of grouped items {key_value: [items]}
    """
    groups = {}

    for item in items:
        group_key = item.get(key)
        if group_key not in groups:
            groups[group_key] = []
        groups[group_key].append(item)

    return groups


def sort_by(items: List[Dict], key: str, reverse: bool = False) -> List[Dict]:
    """
    Sort list of dictionaries by key.

    Args:
        items: List of dictionaries
        key: Key to sort by
        reverse: Reverse sort order

    Returns:
        Sorted list
    """
    return sorted(items, key=lambda x: x.get(key), reverse=reverse)


def nested_update(data: Dict, updates: Dict) -> Dict:
    """
    Update nested dictionary recursively.

    Args:
        data: Dictionary to update
        updates: Updates to apply

    Returns:
        Updated dictionary
    """
    result = data.copy()

    for key, value in updates.items():
        if isinstance(value, dict) and key in result and isinstance(result[key], dict):
            result[key] = nested_update(result[key], value)
        else:
            result[key] = value

    return result


def compact_dict(data: Dict, remove_none: bool = True, remove_empty: bool = False) -> Dict:
    """
    Remove None/empty values from dictionary.

    Args:
        data: Dictionary to compact
        remove_none: Remove None values
        remove_empty: Remove empty strings/lists/dicts

    Returns:
        Compacted dictionary
    """
    result = {}

    for key, value in data.items():
        # Check if should skip
        if remove_none and value is None:
            continue
        if remove_empty and value in ('', [], {}):
            continue

        # Recursively compact nested dicts
        if isinstance(value, dict):
            value = compact_dict(value, remove_none, remove_empty)

        result[key] = value

    return result
