"""
Format Converter Service

Provides comprehensive format conversion utilities for The Program astrology application.
Supports JSON ↔ CSV conversion, compression, encoding, and data formatting.

Author: The Program Development Team
Date: 2025-11-16
"""

import json
import csv
import gzip
import zlib
import bz2
import base64
import io
from typing import Union, Dict, List, Any, Optional, Tuple
from datetime import datetime
from uuid import UUID
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class FormatConverterError(Exception):
    """Base exception for format conversion errors."""
    pass


class InvalidFormatError(FormatConverterError):
    """Raised when input format is invalid."""
    pass


class ConversionError(FormatConverterError):
    """Raised when conversion fails."""
    pass


class FormatConverter:
    """
    Main format converter class providing bidirectional conversion between formats.

    Features:
    - JSON ↔ CSV conversion with nested structure support
    - Compression/decompression (gzip, zlib, bz2)
    - Base64 encoding/decoding
    - JSON formatting (prettify, minify)
    - CSV normalization and delimiter conversion
    - Type preservation and schema-based conversion
    """

    def __init__(self):
        """Initialize the format converter."""
        self.compression_algorithms = {
            'gzip': (gzip.compress, gzip.decompress),
            'zlib': (zlib.compress, zlib.decompress),
            'bz2': (bz2.compress, bz2.decompress),
        }

    # ==================== JSON ↔ CSV Conversion ====================

    def json_to_csv(
        self,
        json_data: Union[str, dict, list],
        table_name: Optional[str] = None,
        delimiter: str = ',',
        quotechar: str = '"',
        include_header: bool = True,
        flatten_nested: bool = True,
        flatten_separator: str = '.'
    ) -> str:
        """
        Convert JSON data to CSV format.

        Args:
            json_data: JSON string, dict, or list of dicts
            table_name: Optional table name for reference
            delimiter: CSV field delimiter
            quotechar: CSV quote character
            include_header: Include column headers
            flatten_nested: Flatten nested dictionaries
            flatten_separator: Separator for flattened keys

        Returns:
            CSV formatted string

        Raises:
            InvalidFormatError: If JSON is invalid
            ConversionError: If conversion fails
        """
        try:
            # Parse JSON if string
            if isinstance(json_data, str):
                data = json.loads(json_data)
            else:
                data = json_data

            # Ensure we have a list of records
            if isinstance(data, dict):
                # Single record or wrapped data
                if table_name and table_name in data:
                    records = data[table_name]
                else:
                    records = [data]
            elif isinstance(data, list):
                records = data
            else:
                raise InvalidFormatError(f"Unsupported JSON structure: {type(data)}")

            if not records:
                return ""

            # Flatten nested structures if requested
            if flatten_nested:
                records = [self._flatten_dict(record, flatten_separator) for record in records]

            # Convert arrays to JSON strings for CSV compatibility
            records = [self._arrays_to_json_strings(record) for record in records]

            # Get all unique column names
            columns = self._get_all_keys(records)

            # Generate CSV
            output = io.StringIO()
            writer = csv.DictWriter(
                output,
                fieldnames=columns,
                delimiter=delimiter,
                quotechar=quotechar,
                quoting=csv.QUOTE_MINIMAL,
                extrasaction='ignore'
            )

            if include_header:
                writer.writeheader()

            writer.writerows(records)

            return output.getvalue()

        except json.JSONDecodeError as e:
            raise InvalidFormatError(f"Invalid JSON: {e}")
        except Exception as e:
            raise ConversionError(f"JSON to CSV conversion failed: {e}")

    def csv_to_json(
        self,
        csv_data: str,
        schema: Optional[Dict[str, str]] = None,
        delimiter: str = ',',
        quotechar: str = '"',
        unflatten: bool = True,
        flatten_separator: str = '.',
        parse_json_strings: bool = True
    ) -> List[Dict]:
        """
        Convert CSV data to JSON format.

        Args:
            csv_data: CSV formatted string
            schema: Optional type schema for conversion
            delimiter: CSV field delimiter
            quotechar: CSV quote character
            unflatten: Unflatten nested structures
            flatten_separator: Separator used in flattened keys
            parse_json_strings: Parse JSON string values back to objects

        Returns:
            List of dictionaries (JSON structure)

        Raises:
            InvalidFormatError: If CSV is invalid
            ConversionError: If conversion fails
        """
        try:
            if not csv_data.strip():
                return []

            # Parse CSV
            input_stream = io.StringIO(csv_data)
            reader = csv.DictReader(
                input_stream,
                delimiter=delimiter,
                quotechar=quotechar
            )

            records = list(reader)

            if not records:
                return []

            # Parse JSON strings back to arrays/objects
            if parse_json_strings:
                records = [self._json_strings_to_arrays(record) for record in records]

            # Apply schema if provided
            if schema:
                records = [self._apply_schema(record, schema) for record in records]
            else:
                # Smart type detection
                records = [self._auto_detect_types(record) for record in records]

            # Unflatten nested structures if requested
            if unflatten:
                records = [self._unflatten_dict(record, flatten_separator) for record in records]

            return records

        except csv.Error as e:
            raise InvalidFormatError(f"Invalid CSV: {e}")
        except Exception as e:
            raise ConversionError(f"CSV to JSON conversion failed: {e}")

    # ==================== JSON Formatting ====================

    def prettify_json(
        self,
        json_data: Union[str, dict, list],
        indent: int = 2,
        sort_keys: bool = False,
        ensure_ascii: bool = False
    ) -> str:
        """
        Pretty-print JSON with formatting.

        Args:
            json_data: JSON string or object
            indent: Indentation level
            sort_keys: Sort keys alphabetically
            ensure_ascii: Escape non-ASCII characters

        Returns:
            Formatted JSON string
        """
        try:
            if isinstance(json_data, str):
                data = json.loads(json_data)
            else:
                data = json_data

            return json.dumps(
                data,
                indent=indent,
                sort_keys=sort_keys,
                ensure_ascii=ensure_ascii
            )

        except json.JSONDecodeError as e:
            raise InvalidFormatError(f"Invalid JSON: {e}")

    def minify_json(self, json_data: Union[str, dict, list]) -> str:
        """
        Minify JSON by removing whitespace.

        Args:
            json_data: JSON string or object

        Returns:
            Minified JSON string
        """
        try:
            if isinstance(json_data, str):
                data = json.loads(json_data)
            else:
                data = json_data

            return json.dumps(data, separators=(',', ':'))

        except json.JSONDecodeError as e:
            raise InvalidFormatError(f"Invalid JSON: {e}")

    # ==================== CSV Formatting ====================

    def normalize_csv(
        self,
        csv_data: str,
        delimiter: str = ',',
        quotechar: str = '"',
        output_delimiter: Optional[str] = None,
        line_terminator: str = '\n'
    ) -> str:
        """
        Normalize CSV formatting.

        Args:
            csv_data: CSV formatted string
            delimiter: Input CSV delimiter
            quotechar: Quote character
            output_delimiter: Output delimiter (defaults to input)
            line_terminator: Line ending

        Returns:
            Normalized CSV string
        """
        if output_delimiter is None:
            output_delimiter = delimiter

        try:
            input_stream = io.StringIO(csv_data)
            reader = csv.reader(input_stream, delimiter=delimiter, quotechar=quotechar)

            output = io.StringIO()
            writer = csv.writer(
                output,
                delimiter=output_delimiter,
                quotechar=quotechar,
                quoting=csv.QUOTE_MINIMAL,
                lineterminator=line_terminator
            )

            for row in reader:
                writer.writerow(row)

            return output.getvalue()

        except csv.Error as e:
            raise InvalidFormatError(f"Invalid CSV: {e}")

    def convert_csv_delimiter(
        self,
        csv_data: str,
        from_delim: str,
        to_delim: str,
        quotechar: str = '"'
    ) -> str:
        """
        Convert CSV delimiter.

        Args:
            csv_data: CSV formatted string
            from_delim: Current delimiter
            to_delim: New delimiter
            quotechar: Quote character

        Returns:
            CSV with new delimiter
        """
        return self.normalize_csv(
            csv_data,
            delimiter=from_delim,
            quotechar=quotechar,
            output_delimiter=to_delim
        )

    # ==================== Compression ====================

    def compress_data(
        self,
        data: bytes,
        algorithm: str = 'gzip',
        level: int = 6
    ) -> bytes:
        """
        Compress data using specified algorithm.

        Args:
            data: Data to compress
            algorithm: Compression algorithm (gzip, zlib, bz2)
            level: Compression level (1-9, higher = better compression)

        Returns:
            Compressed data

        Raises:
            ValueError: If algorithm is unsupported
        """
        if algorithm not in self.compression_algorithms:
            raise ValueError(f"Unsupported algorithm: {algorithm}. "
                           f"Use one of: {list(self.compression_algorithms.keys())}")

        compress_func, _ = self.compression_algorithms[algorithm]

        if algorithm == 'gzip':
            return compress_func(data, compresslevel=level)
        elif algorithm == 'bz2':
            return compress_func(data, compresslevel=level)
        else:  # zlib
            return compress_func(data, level=level)

    def decompress_data(
        self,
        data: bytes,
        algorithm: str = 'gzip'
    ) -> bytes:
        """
        Decompress data using specified algorithm.

        Args:
            data: Compressed data
            algorithm: Compression algorithm used

        Returns:
            Decompressed data

        Raises:
            ValueError: If algorithm is unsupported
        """
        if algorithm not in self.compression_algorithms:
            raise ValueError(f"Unsupported algorithm: {algorithm}")

        _, decompress_func = self.compression_algorithms[algorithm]
        return decompress_func(data)

    # ==================== Encoding ====================

    def encode_base64(self, data: bytes) -> str:
        """
        Encode data to base64 string.

        Args:
            data: Binary data to encode

        Returns:
            Base64 encoded string
        """
        return base64.b64encode(data).decode('ascii')

    def decode_base64(self, data: str) -> bytes:
        """
        Decode base64 string to bytes.

        Args:
            data: Base64 encoded string

        Returns:
            Decoded binary data
        """
        return base64.b64decode(data)

    # ==================== Type Conversion ====================

    def convert_datetime(self, dt: Union[str, datetime]) -> str:
        """
        Convert datetime to ISO8601 string.

        Args:
            dt: Datetime object or string

        Returns:
            ISO8601 formatted string
        """
        if isinstance(dt, datetime):
            return dt.isoformat()
        elif isinstance(dt, str):
            # Validate and normalize
            parsed = datetime.fromisoformat(dt.replace('Z', '+00:00'))
            return parsed.isoformat()
        else:
            raise ValueError(f"Unsupported datetime type: {type(dt)}")

    def convert_uuid(self, uuid_val: Union[str, UUID]) -> str:
        """
        Convert UUID to string format.

        Args:
            uuid_val: UUID object or string

        Returns:
            UUID string
        """
        if isinstance(uuid_val, UUID):
            return str(uuid_val)
        elif isinstance(uuid_val, str):
            # Validate
            UUID(uuid_val)
            return uuid_val
        else:
            raise ValueError(f"Unsupported UUID type: {type(uuid_val)}")

    def convert_boolean(self, value: Any) -> bool:
        """
        Flexible boolean conversion.

        Args:
            value: Value to convert

        Returns:
            Boolean value
        """
        if isinstance(value, bool):
            return value
        elif isinstance(value, str):
            value_lower = value.lower().strip()
            if value_lower in ('true', 'yes', '1', 'on', 't', 'y'):
                return True
            elif value_lower in ('false', 'no', '0', 'off', 'f', 'n', ''):
                return False
            else:
                raise ValueError(f"Cannot convert '{value}' to boolean")
        elif isinstance(value, (int, float)):
            return bool(value)
        else:
            return bool(value)

    def parse_json_value(self, value: str) -> Any:
        """
        Smart type detection for string values.

        Args:
            value: String value to parse

        Returns:
            Parsed value with appropriate type
        """
        if not isinstance(value, str):
            return value

        value_stripped = value.strip()

        # Check for empty string
        if value_stripped == '':
            return None

        # Check for null
        if value_stripped.lower() in ('null', 'none'):
            return None

        # Check for boolean
        if value_stripped.lower() in ('true', 'false'):
            return value_stripped.lower() == 'true'

        # Check for number
        try:
            # Try integer first
            if '.' not in value_stripped and 'e' not in value_stripped.lower():
                return int(value_stripped)
            else:
                return float(value_stripped)
        except ValueError:
            pass

        # Check for JSON array or object
        if value_stripped.startswith(('[', '{')):
            try:
                return json.loads(value_stripped)
            except json.JSONDecodeError:
                pass

        # Return as string
        return value

    # ==================== Schema-Based Conversion ====================

    def apply_schema(self, data: Dict, schema: Dict[str, str]) -> Dict:
        """
        Apply type schema to data.

        Args:
            data: Data dictionary
            schema: Type schema mapping (field_name -> type_name)

        Returns:
            Data with types applied
        """
        return self._apply_schema(data, schema)

    def _apply_schema(self, data: Dict, schema: Dict[str, str]) -> Dict:
        """Internal schema application."""
        result = {}

        for key, value in data.items():
            if key in schema:
                type_name = schema[key]
                result[key] = self._convert_to_type(value, type_name)
            else:
                result[key] = value

        return result

    def _convert_to_type(self, value: Any, type_name: str) -> Any:
        """Convert value to specified type."""
        if value is None or value == '':
            return None

        type_converters = {
            'str': str,
            'string': str,
            'int': int,
            'integer': int,
            'float': float,
            'number': float,
            'bool': self.convert_boolean,
            'boolean': self.convert_boolean,
            'datetime': self.convert_datetime,
            'uuid': self.convert_uuid,
            'json': json.loads if isinstance(value, str) else lambda x: x,
        }

        converter = type_converters.get(type_name.lower())
        if converter:
            try:
                return converter(value)
            except (ValueError, TypeError) as e:
                logger.warning(f"Failed to convert {value} to {type_name}: {e}")
                return value

        return value

    def _auto_detect_types(self, data: Dict) -> Dict:
        """Automatically detect and convert types."""
        return {key: self.parse_json_value(value) for key, value in data.items()}

    # ==================== Nested Data Handling ====================

    def flatten_dict(
        self,
        nested_dict: Dict,
        separator: str = '.'
    ) -> Dict:
        """
        Flatten nested dictionary.

        Args:
            nested_dict: Nested dictionary
            separator: Key separator for flattened structure

        Returns:
            Flattened dictionary

        Example:
            {"user": {"name": "John"}} → {"user.name": "John"}
        """
        return self._flatten_dict(nested_dict, separator)

    def _flatten_dict(
        self,
        nested_dict: Dict,
        separator: str = '.',
        parent_key: str = ''
    ) -> Dict:
        """Internal recursive flattening."""
        items = []

        for key, value in nested_dict.items():
            new_key = f"{parent_key}{separator}{key}" if parent_key else key

            if isinstance(value, dict) and value:
                # Recursively flatten nested dict
                items.extend(self._flatten_dict(value, separator, new_key).items())
            else:
                items.append((new_key, value))

        return dict(items)

    def unflatten_dict(
        self,
        flat_dict: Dict,
        separator: str = '.'
    ) -> Dict:
        """
        Unflatten dictionary with nested structure.

        Args:
            flat_dict: Flattened dictionary
            separator: Key separator used in flat structure

        Returns:
            Nested dictionary

        Example:
            {"user.name": "John"} → {"user": {"name": "John"}}
        """
        return self._unflatten_dict(flat_dict, separator)

    def _unflatten_dict(self, flat_dict: Dict, separator: str = '.') -> Dict:
        """Internal recursive unflattening."""
        result = {}

        for key, value in flat_dict.items():
            parts = key.split(separator)
            current = result

            # Navigate/create nested structure
            for part in parts[:-1]:
                if part not in current:
                    current[part] = {}
                current = current[part]

            # Set the value
            current[parts[-1]] = value

        return result

    def arrays_to_json_strings(self, data: Dict) -> Dict:
        """
        Convert arrays to JSON strings for CSV compatibility.

        Args:
            data: Dictionary with potential array values

        Returns:
            Dictionary with arrays as JSON strings
        """
        return self._arrays_to_json_strings(data)

    def _arrays_to_json_strings(self, data: Dict) -> Dict:
        """Internal array to JSON string conversion."""
        result = {}

        for key, value in data.items():
            if isinstance(value, (list, dict)):
                result[key] = json.dumps(value)
            else:
                result[key] = value

        return result

    def json_strings_to_arrays(self, data: Dict) -> Dict:
        """
        Parse JSON strings back to arrays.

        Args:
            data: Dictionary with potential JSON strings

        Returns:
            Dictionary with parsed arrays
        """
        return self._json_strings_to_arrays(data)

    def _json_strings_to_arrays(self, data: Dict) -> Dict:
        """Internal JSON string to array conversion."""
        result = {}

        for key, value in data.items():
            if isinstance(value, str) and value.strip().startswith(('[', '{')):
                try:
                    result[key] = json.loads(value)
                except json.JSONDecodeError:
                    result[key] = value
            else:
                result[key] = value

        return result

    # ==================== Format Detection and Validation ====================

    def detect_format(self, data: Union[str, bytes]) -> str:
        """
        Detect data format.

        Args:
            data: Data to analyze

        Returns:
            Format name (json, csv, xml, etc.)
        """
        if isinstance(data, bytes):
            # Check for compression signatures
            if data.startswith(b'\x1f\x8b'):
                return 'gzip'
            elif data.startswith(b'BZ'):
                return 'bz2'

            # Try to decode as text
            try:
                data = data.decode('utf-8')
            except UnicodeDecodeError:
                return 'binary'

        data_stripped = data.strip()

        # Check for JSON
        if data_stripped.startswith(('{', '[')):
            if self.is_valid_json(data):
                return 'json'

        # Check for CSV (simple heuristic)
        if ',' in data or '\t' in data:
            if self.is_valid_csv(data):
                return 'csv'

        # Check for XML
        if data_stripped.startswith('<'):
            return 'xml'

        return 'text'

    def is_valid_json(self, data: str) -> bool:
        """
        Validate JSON syntax.

        Args:
            data: String to validate

        Returns:
            True if valid JSON
        """
        try:
            json.loads(data)
            return True
        except (json.JSONDecodeError, TypeError):
            return False

    def is_valid_csv(self, data: str, delimiter: str = ',') -> bool:
        """
        Validate CSV structure.

        Args:
            data: String to validate
            delimiter: Expected delimiter

        Returns:
            True if valid CSV
        """
        try:
            lines = data.strip().split('\n')
            if not lines:
                return False

            # Parse first few lines
            sample = '\n'.join(lines[:10])
            reader = csv.reader(io.StringIO(sample), delimiter=delimiter)
            rows = list(reader)

            if not rows:
                return False

            # Check consistent column count
            first_row_len = len(rows[0])
            return all(len(row) == first_row_len for row in rows)

        except csv.Error:
            return False

    def validate_conversion(
        self,
        original: Any,
        converted: Any,
        back_converted: Any
    ) -> bool:
        """
        Verify lossless conversion through round-trip testing.

        Args:
            original: Original data
            converted: Converted data
            back_converted: Data converted back to original format

        Returns:
            True if conversion is lossless
        """
        # For dictionaries and lists, do deep comparison
        if isinstance(original, (dict, list)):
            return original == back_converted

        # For other types, direct comparison
        return original == back_converted

    # ==================== Batch Conversion ====================

    def convert_directory(
        self,
        input_dir: Union[str, Path],
        output_dir: Union[str, Path],
        from_format: str,
        to_format: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Batch convert files in directory.

        Args:
            input_dir: Input directory path
            output_dir: Output directory path
            from_format: Source format
            to_format: Target format
            **kwargs: Additional conversion options

        Returns:
            Conversion results summary
        """
        input_path = Path(input_dir)
        output_path = Path(output_dir)

        if not input_path.exists():
            raise FileNotFoundError(f"Input directory not found: {input_dir}")

        output_path.mkdir(parents=True, exist_ok=True)

        results = {
            'total': 0,
            'success': 0,
            'failed': 0,
            'errors': []
        }

        # Get conversion function
        converter = self._get_converter(from_format, to_format)
        if not converter:
            raise ValueError(f"No converter available for {from_format} → {to_format}")

        # Process files
        pattern = f"*.{from_format}"
        for input_file in input_path.glob(pattern):
            results['total'] += 1

            try:
                # Read input
                with open(input_file, 'r', encoding='utf-8') as f:
                    data = f.read()

                # Convert
                converted = converter(data, **kwargs)

                # Write output
                output_file = output_path / f"{input_file.stem}.{to_format}"
                with open(output_file, 'w', encoding='utf-8') as f:
                    if isinstance(converted, list):
                        f.write(json.dumps(converted, indent=2))
                    else:
                        f.write(converted)

                results['success'] += 1

            except Exception as e:
                results['failed'] += 1
                results['errors'].append({
                    'file': str(input_file),
                    'error': str(e)
                })
                logger.error(f"Failed to convert {input_file}: {e}")

        return results

    def _get_converter(self, from_format: str, to_format: str):
        """Get appropriate converter function."""
        if from_format == 'json' and to_format == 'csv':
            return self.json_to_csv
        elif from_format == 'csv' and to_format == 'json':
            return self.csv_to_json
        else:
            return None

    # ==================== Helper Methods ====================

    def _get_all_keys(self, records: List[Dict]) -> List[str]:
        """Get all unique keys from list of dictionaries."""
        keys = set()
        for record in records:
            keys.update(record.keys())
        return sorted(keys)


# Convenience functions for quick access
_converter = FormatConverter()

json_to_csv = _converter.json_to_csv
csv_to_json = _converter.csv_to_json
prettify_json = _converter.prettify_json
minify_json = _converter.minify_json
normalize_csv = _converter.normalize_csv
convert_csv_delimiter = _converter.convert_csv_delimiter
compress_data = _converter.compress_data
decompress_data = _converter.decompress_data
encode_base64 = _converter.encode_base64
decode_base64 = _converter.decode_base64
flatten_dict = _converter.flatten_dict
unflatten_dict = _converter.unflatten_dict
detect_format = _converter.detect_format
is_valid_json = _converter.is_valid_json
is_valid_csv = _converter.is_valid_csv
