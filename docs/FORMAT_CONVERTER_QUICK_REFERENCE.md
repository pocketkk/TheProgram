# Format Converter Quick Reference

**Quick guide for using the format converter in The Program**

---

## Basic Usage

### Import

```python
from app.services.format_converter import FormatConverter

converter = FormatConverter()
```

Or use convenience functions:

```python
from app.services.format_converter import (
    json_to_csv,
    csv_to_json,
    prettify_json,
    minify_json,
)
```

---

## Common Operations

### 1. JSON to CSV

```python
# Simple conversion
birth_charts = [
    {"name": "John", "date": "1990-05-15", "lat": 40.7128},
    {"name": "Jane", "date": "1985-08-22", "lat": 34.0522}
]

csv_data = converter.json_to_csv(birth_charts)
```

### 2. CSV to JSON

```python
csv_string = """name,date,lat
John,1990-05-15,40.7128
Jane,1985-08-22,34.0522"""

charts = converter.csv_to_json(csv_string)
# Result: List of dicts with auto-detected types
```

### 3. Nested Structures

```python
# Flatten for CSV export
nested = {
    "user": {
        "profile": {"name": "Alice"},
        "charts": [...]
    }
}

flat = converter.flatten_dict(nested)
csv_data = converter.json_to_csv([flat])

# Unflatten after CSV import
json_data = converter.csv_to_json(csv_data)
restored = converter.unflatten_dict(json_data[0])
```

### 4. Compression

```python
# Compress for storage
data = json.dumps(large_dataset).encode('utf-8')
compressed = converter.compress_data(data, algorithm='zlib', level=6)

# Save
with open('export.json.zlib', 'wb') as f:
    f.write(compressed)

# Decompress
with open('export.json.zlib', 'rb') as f:
    decompressed = converter.decompress_data(f.read(), algorithm='zlib')
```

### 5. Pretty Print JSON

```python
# Make JSON readable
data = {"compact": True, "nested": {"value": 123}}
pretty = converter.prettify_json(data, indent=2, sort_keys=True)
```

---

## Best Practices

### For Export

1. **Use CSV for spreadsheet compatibility:**
   ```python
   csv_data = converter.json_to_csv(charts, include_header=True)
   ```

2. **Compress large exports:**
   ```python
   compressed = converter.compress_data(
       csv_data.encode('utf-8'),
       algorithm='zlib',
       level=6
   )
   ```

3. **Flatten nested data for CSV:**
   ```python
   csv_data = converter.json_to_csv(
       charts,
       flatten_nested=True,
       flatten_separator='.'
   )
   ```

### For Import

1. **Detect format automatically:**
   ```python
   format_type = converter.detect_format(import_data)
   ```

2. **Use schema for type safety:**
   ```python
   schema = {
       "id": "int",
       "latitude": "float",
       "active": "bool"
   }
   charts = converter.csv_to_json(csv_data, schema=schema)
   ```

3. **Validate before processing:**
   ```python
   if not converter.is_valid_json(data):
       raise ValueError("Invalid JSON")
   ```

---

## Performance Tips

### Optimal Settings

- **Compression:** Use `zlib` level `6` for best balance
- **Large datasets:** Process in batches of 1,000-5,000 records
- **CSV delimiter:** Use comma `,` for maximum compatibility

### Benchmarks

| Operation | Records | Time |
|-----------|---------|------|
| JSON → CSV | 1,000 | 11ms |
| CSV → JSON | 1,000 | 22ms |
| Round-trip | 1,000 | 34ms |
| Compression (zlib) | 26KB | 0.1ms |

---

## Error Handling

```python
from app.services.format_converter import (
    FormatConverter,
    InvalidFormatError,
    ConversionError
)

try:
    data = converter.csv_to_json(csv_string)
except InvalidFormatError as e:
    # Invalid input format
    handle_invalid_input(e)
except ConversionError as e:
    # Conversion failed
    handle_conversion_error(e)
```

---

## Common Patterns

### Export Pipeline

```python
def export_charts(user_id, format='csv', compress=False):
    # 1. Get data
    charts = get_user_charts(user_id)

    # 2. Convert format
    if format == 'csv':
        data = converter.json_to_csv(charts)
    else:
        data = converter.prettify_json(charts)

    # 3. Compress if requested
    if compress:
        data = converter.compress_data(
            data.encode('utf-8'),
            algorithm='gzip'
        )

    return data
```

### Import Pipeline

```python
def import_charts(file_data):
    # 1. Detect and decompress
    format_type = converter.detect_format(file_data)
    if format_type == 'gzip':
        file_data = converter.decompress_data(file_data)
        format_type = converter.detect_format(file_data)

    # 2. Convert to JSON
    if format_type == 'csv':
        charts = converter.csv_to_json(file_data.decode('utf-8'))
    else:
        charts = json.loads(file_data.decode('utf-8'))

    # 3. Validate and save
    validate_charts(charts)
    save_charts(charts)
```

---

## API Reference

### Core Methods

| Method | Purpose | Returns |
|--------|---------|---------|
| `json_to_csv(data)` | Convert JSON to CSV | CSV string |
| `csv_to_json(csv)` | Convert CSV to JSON | List of dicts |
| `flatten_dict(dict)` | Flatten nested dict | Flat dict |
| `unflatten_dict(flat)` | Restore nesting | Nested dict |
| `compress_data(bytes)` | Compress data | Compressed bytes |
| `decompress_data(bytes)` | Decompress data | Original bytes |
| `prettify_json(data)` | Format JSON | Pretty string |
| `minify_json(data)` | Compact JSON | Minified string |
| `detect_format(data)` | Detect format | Format name |

### Parameters

**json_to_csv:**
- `delimiter` - Field separator (default: ',')
- `include_header` - Include headers (default: True)
- `flatten_nested` - Flatten dicts (default: True)

**csv_to_json:**
- `schema` - Type schema dict (optional)
- `delimiter` - Field separator (default: ',')
- `unflatten` - Restore nesting (default: True)

**compress_data:**
- `algorithm` - 'gzip', 'zlib', or 'bz2' (default: 'gzip')
- `level` - Compression level 1-9 (default: 6)

---

## Data Utils Reference

### Common Helpers

```python
from app.utils.data_utils import (
    calculate_data_hash,
    validate_email,
    deep_get,
    deep_set,
    parse_size_string,
    format_size,
)

# Hash for integrity
hash_val = calculate_data_hash(data)

# Nested access
name = deep_get(user, "profile.info.name", default="Unknown")
deep_set(user, "profile.info.age", 30)

# Size utilities
bytes_count = parse_size_string("10MB")  # → 10485760
readable = format_size(10485760)  # → "10.00 MB"
```

---

## Testing

```bash
# Run tests
cd /home/sylvia/ClaudeWork/TheProgram/backend
python3 test_runner.py

# Run benchmarks
python3 benchmark_format_converter.py
```

---

## File Locations

- **Core Service:** `/backend/app/services/format_converter.py`
- **Utilities:** `/backend/app/utils/data_utils.py`
- **Tests:** `/backend/tests/services/test_format_converter.py`
- **Full Guide:** `/TASK-206-FORMAT-CONVERTERS-COMPLETE.md`

---

**Last Updated:** 2025-11-16
