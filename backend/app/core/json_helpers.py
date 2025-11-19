"""
JSON helper utilities for SQLite storage

SQLite stores JSON as TEXT strings. These helpers ensure consistent
JSON serialization/deserialization and provide a custom SQLAlchemy type.
"""
import json
from typing import Any, Optional, Dict, List, Union
from sqlalchemy.types import TypeDecorator, String


def serialize_json(data: Union[Dict, List, None]) -> Optional[str]:
    """
    Convert Python dict/list to JSON string for SQLite storage

    Args:
        data: Dictionary, list, or None to serialize

    Returns:
        JSON string or None

    Example:
        >>> serialize_json({"key": "value"})
        '{"key": "value"}'
        >>> serialize_json(None)
        None
    """
    if data is None:
        return None
    return json.dumps(data, separators=(',', ':'), ensure_ascii=False)


def deserialize_json(json_str: Optional[str]) -> Optional[Union[Dict, List]]:
    """
    Convert JSON string from SQLite to Python dict/list

    Args:
        json_str: JSON string from database or None

    Returns:
        Dictionary, list, or None

    Raises:
        ValueError: If string is not valid JSON

    Example:
        >>> deserialize_json('{"key": "value"}')
        {'key': 'value'}
        >>> deserialize_json(None)
        None
    """
    if json_str is None:
        return None
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError) as e:
        raise ValueError(f"Invalid JSON string: {json_str}") from e


class JSONEncodedDict(TypeDecorator):
    """
    SQLAlchemy custom type for JSON storage in SQLite TEXT field

    Automatically serializes Python dicts/lists to JSON strings on write,
    and deserializes JSON strings to Python objects on read.

    Usage in SQLAlchemy models:
        class MyModel(Base):
            __tablename__ = 'my_table'

            id = Column(String, primary_key=True)
            data = Column(JSONEncodedDict)  # Stores JSON as TEXT

        # Usage:
        obj = MyModel(id='1', data={'key': 'value'})
        session.add(obj)
        session.commit()

        # Retrieval:
        obj = session.query(MyModel).first()
        print(obj.data)  # {'key': 'value'}
    """
    impl = String
    cache_ok = True

    def process_bind_param(self, value: Optional[Union[Dict, List]], dialect) -> Optional[str]:
        """
        Convert Python object to JSON string before storing

        Called when writing to database
        """
        if value is not None:
            return serialize_json(value)
        return None

    def process_result_value(self, value: Optional[str], dialect) -> Optional[Union[Dict, List]]:
        """
        Convert JSON string to Python object after retrieving

        Called when reading from database
        """
        if value is not None:
            return deserialize_json(value)
        return None


class JSONEncodedList(JSONEncodedDict):
    """
    Specialized JSON type for lists

    Same as JSONEncodedDict but semantically indicates that
    the field should contain a list/array.

    Usage:
        class MyModel(Base):
            __tablename__ = 'my_table'

            id = Column(String, primary_key=True)
            tags = Column(JSONEncodedList)  # Stores array as JSON TEXT
    """
    pass


def validate_json(json_str: str) -> bool:
    """
    Check if a string is valid JSON

    Args:
        json_str: String to validate

    Returns:
        True if valid JSON, False otherwise

    Example:
        >>> validate_json('{"key": "value"}')
        True
        >>> validate_json('not json')
        False
    """
    try:
        json.loads(json_str)
        return True
    except (json.JSONDecodeError, TypeError):
        return False


def pretty_json(data: Union[Dict, List]) -> str:
    """
    Serialize to pretty-printed JSON for debugging/display

    Args:
        data: Dictionary or list to pretty-print

    Returns:
        Formatted JSON string with indentation

    Example:
        >>> data = {"key": "value", "nested": {"a": 1}}
        >>> print(pretty_json(data))
        {
          "key": "value",
          "nested": {
            "a": 1
          }
        }
    """
    return json.dumps(data, indent=2, ensure_ascii=False)
