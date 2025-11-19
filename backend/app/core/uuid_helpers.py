"""
UUID helper utilities for SQLite storage

SQLite stores UUIDs as TEXT strings, these helpers ensure
consistent UUID generation and validation.
"""
import uuid
from typing import Union


def generate_uuid() -> str:
    """
    Generate a new UUID as a string for SQLite storage

    Returns:
        UUID string in standard format (e.g., '550e8400-e29b-41d4-a716-446655440000')
    """
    return str(uuid.uuid4())


def validate_uuid(uuid_str: str) -> bool:
    """
    Validate that a string is a valid UUID format

    Args:
        uuid_str: String to validate

    Returns:
        True if valid UUID format, False otherwise

    Example:
        >>> validate_uuid('550e8400-e29b-41d4-a716-446655440000')
        True
        >>> validate_uuid('not-a-uuid')
        False
    """
    try:
        uuid.UUID(uuid_str)
        return True
    except (ValueError, AttributeError, TypeError):
        return False


def normalize_uuid(value: Union[str, uuid.UUID]) -> str:
    """
    Normalize UUID to string format for SQLite

    Handles both UUID objects and strings

    Args:
        value: UUID object or string

    Returns:
        Normalized UUID string

    Raises:
        ValueError: If value is not a valid UUID

    Example:
        >>> import uuid
        >>> uuid_obj = uuid.uuid4()
        >>> normalize_uuid(uuid_obj)
        '550e8400-e29b-41d4-a716-446655440000'
        >>> normalize_uuid('550e8400-e29b-41d4-a716-446655440000')
        '550e8400-e29b-41d4-a716-446655440000'
    """
    if isinstance(value, uuid.UUID):
        return str(value)
    elif isinstance(value, str):
        if not validate_uuid(value):
            raise ValueError(f"Invalid UUID format: {value}")
        return value
    else:
        raise ValueError(f"Expected UUID or string, got {type(value)}")


def uuid_to_obj(uuid_str: str) -> uuid.UUID:
    """
    Convert UUID string from SQLite to Python UUID object

    Args:
        uuid_str: UUID string from database

    Returns:
        Python UUID object

    Raises:
        ValueError: If string is not a valid UUID

    Example:
        >>> uuid_obj = uuid_to_obj('550e8400-e29b-41d4-a716-446655440000')
        >>> type(uuid_obj)
        <class 'uuid.UUID'>
    """
    try:
        return uuid.UUID(uuid_str)
    except (ValueError, AttributeError, TypeError) as e:
        raise ValueError(f"Invalid UUID string: {uuid_str}") from e
