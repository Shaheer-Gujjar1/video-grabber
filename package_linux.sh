#!/bin/bash

# Lumen Lab Linux Packaging Script
# Requires: pyinstaller, dpkg-deb

APP_NAME="lumen-grabber"
VERSION="1.0.0"
BUILD_DIR="build/linux"
DEB_DIR="${BUILD_DIR}/deb"

echo "🚀 Starting Linux build process..."

# 1. Clean previous builds
rm -rf build/ dist/

# 2. Build Frontend
echo "📦 Building React frontend..."
npm run build

# 3. Build Python Binary
echo "🐍 Creating Python binary..."
if [ -f "./.venv/bin/pyinstaller" ]; then
    ./.venv/bin/pyinstaller lumen_grabber.spec --noconfirm
elif [ -f "./venv/bin/pyinstaller" ]; then
    ./venv/bin/pyinstaller lumen_grabber.spec --noconfirm
else
    echo "❌ Error: pyinstaller not found in .venv or venv. Please install it."
    exit 1
fi

# 4. Create .deb structure
echo "📂 Preparing Debian package structure..."
mkdir -p "${DEB_DIR}/opt/${APP_NAME}"
mkdir -p "${DEB_DIR}/usr/bin"
mkdir -p "${DEB_DIR}/usr/share/applications"
mkdir -p "${DEB_DIR}/usr/share/pixmaps"
mkdir -p "${DEB_DIR}/DEBIAN"

if [ -d "dist/LumenGrabber" ]; then
    echo "📋 Copying application directory..."
    # Copy the entire directory contents to /opt/lumen-grabber
    cp -a "dist/LumenGrabber/." "${DEB_DIR}/opt/${APP_NAME}/"
    chmod +x "${DEB_DIR}/opt/${APP_NAME}/LumenGrabber"
    # Create symlink in /usr/bin
    rm -f "${DEB_DIR}/usr/bin/${APP_NAME}"
    ln -s "/opt/${APP_NAME}/LumenGrabber" "${DEB_DIR}/usr/bin/${APP_NAME}"
else
    echo "❌ Error: dist/LumenGrabber directory not found! Build failed."
    exit 1
fi

# 4.5 Create .desktop file and icon
cp "public/Lumen-Lab-Favicon-BG-Removed.png" "${DEB_DIR}/usr/share/pixmaps/${APP_NAME}.png"

cat <<EOT > "${DEB_DIR}/usr/share/applications/${APP_NAME}.desktop"
[Desktop Entry]
Name=Lumen Grabber
Comment=High-end premium video downloader by Lumen Lab.
Exec=${APP_NAME}
Icon=${APP_NAME}
Terminal=false
Type=Application
Categories=Utility;AudioVideo;Video;
EOT

# 5. Create control file
cat <<EOT > "${DEB_DIR}/DEBIAN/control"
Package: ${APP_NAME}
Version: ${VERSION}
Section: utils
Priority: optional
Architecture: amd64
Maintainer: Lumen Lab
Depends: ffmpeg, libgtk-3-0, libwebkit2gtk-4.0-37 | libwebkit2gtk-4.1-0, libcanberra-gtk-module, libcanberra-gtk3-module, gir1.2-webkit2-4.1 | gir1.2-webkit2-4.0, python3-gi, gir1.2-gtk-3.0
Description: High-end premium video downloader by Lumen Lab.
EOT

# 6. Build the package
echo "🛠️ Finalizing .deb package..."
dpkg-deb --build "${DEB_DIR}" "${APP_NAME}_${VERSION}_amd64.deb"

# 7. Move to releases
mkdir -p releases
mv "${APP_NAME}_${VERSION}_amd64.deb" releases/

echo "✅ Build complete! Release: releases/${APP_NAME}_${VERSION}_amd64.deb"
