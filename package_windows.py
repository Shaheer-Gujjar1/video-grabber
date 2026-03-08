import os
import subprocess
import shutil
import urllib.request
import zipfile

def download_ffmpeg():
    """Download ffmpeg for Windows pre-ship bundling."""
    ffmpeg_url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
    zip_path = "ffmpeg_win.zip"
    extract_path = "ffmpeg_temp"
    bin_target = "bin/windows"

    if not os.path.exists(bin_target):
        os.makedirs(bin_target)

    print("📥 Downloading FFmpeg for Windows bundling...")
    urllib.request.urlretrieve(ffmpeg_url, zip_path)

    print("📦 Extracting binaries...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(extract_path)

    # Find where the bin folder is in the extracted zip
    for root, dirs, files in os.walk(extract_path):
        if 'bin' in dirs:
            bin_source = os.path.join(root, 'bin')
            for item in os.listdir(bin_source):
                if item.endswith('.exe'):
                    shutil.copy2(os.path.join(bin_source, item), bin_target)
            break

    # Cleanup
    shutil.rmtree(extract_path)
    os.remove(zip_path)
    print(f"✅ FFmpeg binaries prepared in {bin_target}")

def build_windows():
    print("🚀 Starting Windows build process...")
    
    # 1. Ensure frontend is built
    print("📦 Building React frontend...")
    subprocess.run("npm run build", shell=True)

    # 2. Download FFmpeg if not present in bin/windows
    if not os.path.exists("bin/windows/ffmpeg.exe"):
        download_ffmpeg()

    # 3. Run PyInstaller
    print("🐍 Executing PyInstaller...")
    # Try to find pyinstaller in venv/bin or .venv/bin relative to script
    pyinst_path = "pyinstaller" # Default to PATH
    for venv_path in [".venv", "venv"]:
        potential_path = os.path.join(venv_path, "bin", "pyinstaller")
        if os.path.exists(potential_path):
            pyinst_path = potential_path
            break
        potential_path_win = os.path.join(venv_path, "Scripts", "pyinstaller.exe")
        if os.path.exists(potential_path_win):
            pyinst_path = potential_path_win
            break

    # Use string for shell=True to ensure arguments are passed correctly
    cmd = f'"{pyinst_path}" lumen_grabber.spec --noconfirm'
    subprocess.run(cmd, shell=True)

    # Check for executable (might be on linux or windows)
    exe_path = "dist/LumenGrabber.exe"
    if not os.path.exists(exe_path):
        if os.path.exists("dist/LumenGrabber"):
            exe_path = "dist/LumenGrabber"
        else:
            print(f"❌ Error: dist/LumenGrabber(.exe) not found. Build failed.")
            return

    # 4. Create Release ZIP in releases/ folder
    os.makedirs("releases", exist_ok=True)
    release_name = os.path.join("releases", "LumenGrabber_Windows_v1.0.0.zip")
    print(f"🗜️ Creating release archive: {release_name}...")
    
    with zipfile.ZipFile(release_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        zipf.write(exe_path, arcname="LumenGrabber.exe")
        if os.path.exists("README.md"):
            zipf.write("README.md", arcname="README.md")

    print(f"✅ Build complete! Release: {release_name}")

if __name__ == "__main__":
    build_windows()
