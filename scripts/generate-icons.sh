#!/bin/bash
# Generate app icons for all platforms from a source PNG
# Usage: ./scripts/generate-icons.sh [source-image.png]
#
# If no source image is provided, creates a placeholder icon.
# Run this on macOS to generate the .icns file.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/build"

mkdir -p "$BUILD_DIR"

SOURCE_IMAGE="${1:-}"

# Function to create a placeholder icon (simple colored square with "TP" text)
create_placeholder() {
    echo "Creating placeholder icon..."

    # Check for ImageMagick
    if command -v convert &> /dev/null; then
        # Create a 1024x1024 placeholder icon
        convert -size 1024x1024 xc:'#1a1a2e' \
            -fill '#6366f1' -draw "roundrectangle 100,100 924,924 100,100" \
            -fill white -gravity center -pointsize 400 -font Helvetica-Bold \
            -annotate 0 "TP" \
            "$BUILD_DIR/icon.png"
        echo "Created placeholder: $BUILD_DIR/icon.png"
    else
        echo "WARNING: ImageMagick not found. Please install it or provide a source image."
        echo "On macOS: brew install imagemagick"
        echo "On Linux: sudo apt install imagemagick"

        # Create a minimal 1x1 PNG as absolute fallback
        printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > "$BUILD_DIR/icon.png"
        echo "Created minimal fallback icon (you should replace this)"
        return 1
    fi
}

# If no source image, create placeholder
if [ -z "$SOURCE_IMAGE" ]; then
    create_placeholder
    SOURCE_IMAGE="$BUILD_DIR/icon.png"
elif [ ! -f "$SOURCE_IMAGE" ]; then
    echo "Error: Source image not found: $SOURCE_IMAGE"
    exit 1
fi

# Copy/create the main PNG icon
if [ "$SOURCE_IMAGE" != "$BUILD_DIR/icon.png" ]; then
    cp "$SOURCE_IMAGE" "$BUILD_DIR/icon.png"
fi

echo ""
echo "PNG icon created: $BUILD_DIR/icon.png"

# Generate macOS .icns file (only works on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo ""
    echo "Generating macOS .icns file..."

    ICONSET_DIR="$BUILD_DIR/icon.iconset"
    mkdir -p "$ICONSET_DIR"

    # Generate all required sizes for iconset
    for size in 16 32 64 128 256 512; do
        sips -z $size $size "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_${size}x${size}.png" > /dev/null 2>&1
        double=$((size * 2))
        if [ $double -le 1024 ]; then
            sips -z $double $double "$SOURCE_IMAGE" --out "$ICONSET_DIR/icon_${size}x${size}@2x.png" > /dev/null 2>&1
        fi
    done

    # Create .icns from iconset
    iconutil -c icns "$ICONSET_DIR" -o "$BUILD_DIR/icon.icns"
    rm -rf "$ICONSET_DIR"

    echo "macOS icon created: $BUILD_DIR/icon.icns"
else
    echo ""
    echo "NOTE: Run this script on macOS to generate the .icns file."
    echo "The .icns file is required for Mac distribution."
fi

# Generate Windows .ico file (if ImageMagick available)
if command -v convert &> /dev/null; then
    echo ""
    echo "Generating Windows .ico file..."
    convert "$SOURCE_IMAGE" -define icon:auto-resize=256,128,64,48,32,16 "$BUILD_DIR/icon.ico"
    echo "Windows icon created: $BUILD_DIR/icon.ico"
fi

echo ""
echo "Icon generation complete!"
echo "Files in $BUILD_DIR:"
ls -la "$BUILD_DIR"/icon.* 2>/dev/null || echo "  (no icon files found)"
