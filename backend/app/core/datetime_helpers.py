"""
DateTime helper utilities for SQLite storage

SQLite stores datetimes as ISO 8601 TEXT strings.
These helpers ensure consistent datetime formatting and parsing.
"""
from datetime import datetime, date, time
from typing import Optional, Union


def now_iso() -> str:
    """
    Get current UTC datetime as ISO 8601 string

    Returns:
        ISO 8601 datetime string (e.g., '2025-11-15T14:30:45.123456')

    Example:
        >>> now = now_iso()
        >>> '2025' in now
        True
    """
    return datetime.utcnow().isoformat()


def datetime_to_iso(dt: datetime) -> str:
    """
    Convert datetime object to ISO 8601 string for SQLite

    Args:
        dt: Python datetime object

    Returns:
        ISO 8601 datetime string

    Example:
        >>> from datetime import datetime
        >>> dt = datetime(2025, 11, 15, 14, 30, 45)
        >>> datetime_to_iso(dt)
        '2025-11-15T14:30:45'
    """
    return dt.isoformat()


def date_to_iso(d: date) -> str:
    """
    Convert date object to ISO 8601 string for SQLite

    Args:
        d: Python date object

    Returns:
        ISO 8601 date string (YYYY-MM-DD)

    Example:
        >>> from datetime import date
        >>> d = date(1990, 5, 15)
        >>> date_to_iso(d)
        '1990-05-15'
    """
    return d.isoformat()


def time_to_iso(t: time) -> str:
    """
    Convert time object to ISO 8601 string for SQLite

    Args:
        t: Python time object

    Returns:
        ISO 8601 time string (HH:MM:SS)

    Example:
        >>> from datetime import time
        >>> t = time(14, 30, 0)
        >>> time_to_iso(t)
        '14:30:00'
    """
    return t.isoformat()


def parse_iso_datetime(iso_str: Optional[str]) -> Optional[datetime]:
    """
    Parse ISO 8601 string from SQLite to datetime object

    Args:
        iso_str: ISO 8601 datetime string or None

    Returns:
        Python datetime object or None

    Raises:
        ValueError: If string is not valid ISO 8601 format

    Example:
        >>> dt = parse_iso_datetime('2025-11-15T14:30:45')
        >>> dt.year
        2025
        >>> parse_iso_datetime(None)
        None
    """
    if iso_str is None:
        return None
    try:
        return datetime.fromisoformat(iso_str)
    except (ValueError, AttributeError) as e:
        raise ValueError(f"Invalid ISO 8601 datetime: {iso_str}") from e


def parse_iso_date(iso_str: Optional[str]) -> Optional[date]:
    """
    Parse ISO 8601 date string from SQLite to date object

    Args:
        iso_str: ISO 8601 date string (YYYY-MM-DD) or None

    Returns:
        Python date object or None

    Raises:
        ValueError: If string is not valid ISO 8601 date format

    Example:
        >>> d = parse_iso_date('1990-05-15')
        >>> d.year
        1990
    """
    if iso_str is None:
        return None
    try:
        return date.fromisoformat(iso_str)
    except (ValueError, AttributeError) as e:
        raise ValueError(f"Invalid ISO 8601 date: {iso_str}") from e


def parse_iso_time(iso_str: Optional[str]) -> Optional[time]:
    """
    Parse ISO 8601 time string from SQLite to time object

    Args:
        iso_str: ISO 8601 time string (HH:MM:SS) or None

    Returns:
        Python time object or None

    Raises:
        ValueError: If string is not valid ISO 8601 time format

    Example:
        >>> t = parse_iso_time('14:30:00')
        >>> t.hour
        14
    """
    if iso_str is None:
        return None
    try:
        return time.fromisoformat(iso_str)
    except (ValueError, AttributeError) as e:
        raise ValueError(f"Invalid ISO 8601 time: {iso_str}") from e


def normalize_datetime(value: Union[datetime, str, None]) -> Optional[str]:
    """
    Normalize datetime to ISO 8601 string for SQLite

    Handles both datetime objects and ISO strings

    Args:
        value: datetime object, ISO string, or None

    Returns:
        ISO 8601 string or None

    Example:
        >>> from datetime import datetime
        >>> dt = datetime(2025, 11, 15, 14, 30, 45)
        >>> normalize_datetime(dt)
        '2025-11-15T14:30:45'
        >>> normalize_datetime('2025-11-15T14:30:45')
        '2025-11-15T14:30:45'
        >>> normalize_datetime(None)
        None
    """
    if value is None:
        return None
    elif isinstance(value, datetime):
        return datetime_to_iso(value)
    elif isinstance(value, str):
        # Validate by parsing
        parse_iso_datetime(value)
        return value
    else:
        raise ValueError(f"Expected datetime, string, or None, got {type(value)}")
