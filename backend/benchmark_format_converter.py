#!/usr/bin/env python3
"""
Performance Benchmarks for Format Converter

Measures conversion performance with various data sizes.
"""

import sys
sys.path.insert(0, '/home/sylvia/ClaudeWork/TheProgram/backend')

import time
from app.services.format_converter import FormatConverter
from app.utils.data_utils import format_size

def benchmark(func, *args, iterations=10):
    """Run benchmark and return average time."""
    times = []
    for _ in range(iterations):
        start = time.time()
        result = func(*args)
        end = time.time()
        times.append(end - start)

    avg_time = sum(times) / len(times)
    return avg_time, result

def generate_test_data(num_records, num_fields=10):
    """Generate test data."""
    return [
        {f"field_{i}": f"value_{j}_{i}" for i in range(num_fields)}
        for j in range(num_records)
    ]

def main():
    converter = FormatConverter()

    print("=" * 70)
    print("Format Converter Performance Benchmarks")
    print("=" * 70)
    print()

    # Benchmark JSON to CSV conversion
    print("JSON to CSV Conversion:")
    print("-" * 70)

    sizes = [10, 100, 1000, 5000]
    for size in sizes:
        data = generate_test_data(size)
        avg_time, csv_output = benchmark(converter.json_to_csv, data, iterations=5)

        data_size = len(str(data))
        output_size = len(csv_output)

        print(f"  {size:>5} records: {avg_time*1000:>7.2f} ms  "
              f"(input: {format_size(data_size)}, output: {format_size(output_size)})")

    print()

    # Benchmark CSV to JSON conversion
    print("CSV to JSON Conversion:")
    print("-" * 70)

    for size in sizes:
        data = generate_test_data(size)
        csv_data = converter.json_to_csv(data)
        avg_time, json_output = benchmark(converter.csv_to_json, csv_data, iterations=5)

        data_size = len(csv_data)
        output_size = len(str(json_output))

        print(f"  {size:>5} records: {avg_time*1000:>7.2f} ms  "
              f"(input: {format_size(data_size)}, output: {format_size(output_size)})")

    print()

    # Benchmark round-trip conversion
    print("Round-Trip Conversion (JSON → CSV → JSON):")
    print("-" * 70)

    for size in sizes:
        data = generate_test_data(size)

        def round_trip():
            csv = converter.json_to_csv(data)
            return converter.csv_to_json(csv)

        avg_time, result = benchmark(round_trip, iterations=5)

        # Verify lossless conversion
        is_lossless = result == data

        print(f"  {size:>5} records: {avg_time*1000:>7.2f} ms  "
              f"(lossless: {'✓' if is_lossless else '✗'})")

    print()

    # Benchmark compression
    print("Compression Performance:")
    print("-" * 70)

    test_data = b"Lorem ipsum dolor sit amet " * 1000
    original_size = len(test_data)

    for algorithm in ['gzip', 'zlib', 'bz2']:
        for level in [1, 6, 9]:
            avg_time, compressed = benchmark(
                converter.compress_data,
                test_data,
                algorithm,
                level,
                iterations=10
            )

            ratio = (1 - len(compressed) / original_size) * 100

            print(f"  {algorithm:>5} level {level}: {avg_time*1000:>7.2f} ms  "
                  f"({format_size(original_size)} → {format_size(len(compressed))}, "
                  f"{ratio:.1f}% compression)")

    print()

    # Benchmark nested structure flattening
    print("Nested Structure Operations:")
    print("-" * 70)

    nested_data = {
        f"level1_{i}": {
            f"level2_{j}": {
                f"level3_{k}": f"value_{i}_{j}_{k}"
                for k in range(5)
            }
            for j in range(5)
        }
        for i in range(10)
    }

    avg_time, flattened = benchmark(converter.flatten_dict, nested_data, iterations=100)
    print(f"  Flatten (250 nested keys):  {avg_time*1000:>7.2f} ms")

    avg_time, unflattened = benchmark(converter.unflatten_dict, flattened, iterations=100)
    print(f"  Unflatten (250 flat keys):  {avg_time*1000:>7.2f} ms")

    is_lossless = unflattened == nested_data
    print(f"  Round-trip lossless: {'✓' if is_lossless else '✗'}")

    print()

    # Benchmark JSON formatting
    print("JSON Formatting:")
    print("-" * 70)

    json_data = generate_test_data(100)

    avg_time, _ = benchmark(converter.prettify_json, json_data, iterations=100)
    print(f"  Prettify JSON (100 records): {avg_time*1000:>7.2f} ms")

    avg_time, _ = benchmark(converter.minify_json, json_data, iterations=100)
    print(f"  Minify JSON (100 records):   {avg_time*1000:>7.2f} ms")

    print()

    # Memory efficiency test
    print("Memory Efficiency Test:")
    print("-" * 70)

    large_data = generate_test_data(10000, num_fields=20)

    start = time.time()
    csv_output = converter.json_to_csv(large_data)
    json_output = converter.csv_to_json(csv_output)
    end = time.time()

    total_time = end - start
    is_lossless = json_output == large_data

    print(f"  10,000 records with 20 fields:")
    print(f"    Total time: {total_time:.3f} seconds")
    print(f"    Input size: {format_size(len(str(large_data)))}")
    print(f"    CSV size:   {format_size(len(csv_output))}")
    print(f"    Lossless:   {'✓' if is_lossless else '✗'}")

    print()
    print("=" * 70)
    print("Benchmark Complete")
    print("=" * 70)

if __name__ == "__main__":
    main()
