@echo off
echo 🚀 Lumen Lab Video Grabber - Windows Setup
echo ------------------------------------------

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH. Please install Python 3.9+.
    pause
    exit /b
)

:: Create Virtual Environment
echo 📦 Creating virtual environment...
python -m venv venv
if %errorlevel% neq 0 (
    echo ❌ Failed to create virtual environment.
    pause
    exit /b
)

:: Activate and install dependencies
echo 🐍 Installing dependencies...
call venv\Scripts\activate
pip install --upgrade pip
if exist requirements.txt (
    pip install -r requirements.txt
) else (
    echo ⚠️ requirements.txt not found. Installing core dependencies manually...
    pip install pywebview yt-dlp pyinstaller
)

:: Success
echo ------------------------------------------
echo ✅ Setup complete!
echo 🚀 You can now run: python app.py
echo 📦 To package: python package_windows.py
echo ------------------------------------------
pause
