# Video Grabber (Desktop App)

A standalone desktop application to download YouTube videos. This app perfectly preserves the original web-based React frontend while leveraging the power of Python (`yt-dlp`) on the backend, seamlessly bridged together using `pywebview`.

## Prerequisites

- Node.js & npm (for building the frontend UI)
- Python 3.8+
- [ffmpeg](https://ffmpeg.org/) (Recommended for best quality and merging audio/video)

## Installation

1. **Install Frontend Dependencies & Build:**
   ```bash
   npm install
   npm run build
   ```

2. **Install Backend Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   *(Note: On newer Linux distros, you may need to use `--break-system-packages` or create a virtual environment depending on your system configuration. Also ensure `python3-tk` is installed).*

## How to Run

Launch the native desktop window with:
```bash
python3 app.py
```

## Features

- **Pixel-Perfect UI**: The exact React frontend you designed, running natively as a desktop app.
- **High Performance Backend**: Powered by `yt-dlp` for extracting audio and downloading high-resolution videos.
- **Native File Dialogs**: Uses system dialogs to choose where to save files.
