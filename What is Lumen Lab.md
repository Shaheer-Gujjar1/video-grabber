# Lumen Lab: Internal Manifesto & Technical Architecture (Classified)

## I. Identity & Mission
Lumen Lab is a private technical sanctuary. We do not build for the masses; we build for the **Sovereign Digital Individual**. Our mission is the pursuit of **Digital Excellence** through the fusion of high-performance backend engines and high-fidelity frontend aesthetics. We specialize in "Grabbing" — the strategic acquisition of digital media in its purest form, unencumbered by platform restrictions.

## II. The Core Engine (Video Grabber)
The Video Grabber is our flagship media acquisition tool. It serves as a sophisticated orchestration layer over the `yt-dlp` extraction core.

### Technical Stack Architecture:
- **Language Fusion**: Python 3.12 (Backend Logic) + React 18/Vite (Frontend Interface).
- **Window Management**: `pywebview` for a native-feel desktop wrapper with Chrome/WebKit rendering.
- **Concurrency Model**: 
    - **UI Thread**: React handling interactions and animations.
    - **Bridge**: `pywebview` interop (JS-to-Python).
    - **Worker Threads**: Python `threading` for yt-dlp processes, ensuring the UI never locks during heavy I/O.
- **Communication Bridge**: We utilize `evaluate_js` for bidirectional real-time progress hooks.
- **Persistence Layer**: Custom JSON-based flat-file storage in `~/.video_grabber_history.json`. Zero external database requirements ensure 100% portability.
- **Asset Pipeline**: High-resolution PNGs with alpha-channel transparency, optimized for CSS backdrop-filters (glassmorphism).

## III. Production & Packaging Standards
Every Lumen Lab release must be a "Single-Binary" experience where possible.

### V. Cross-Platform Packaging Details (Deep Dive)

#### Linux (.deb) Strategy
Our Debian distribution targets stability and dependency resolution:
1.  **Frontend Bundling**: `npm run build` optimizes all assets into a minified `dist/` folder.
2.  **Binary Encapsulation**: `PyInstaller` freezes the Python environment, including the `YoutubeDL` library and all internal modules.
3.  **Debian Control**: The `.deb` package includes a strict `control` file mapping system libraries:
    - `ffmpeg`: Essential for muxing streams.
    - `libgtk-3-0`: GUI library.
    - `libwebkit2gtk-4.0`: Browser engine.

#### Windows (.exe) Strategy
The Windows "Pre-Ship" focus is on eliminating user-end configuration:
1.  **Static FFmpeg Bundle**: We include `ffmpeg.exe` and `ffprobe.exe` within the application's internal file structure.
2.  **Adaptive Pathing**: On launch, the app detects if system-wide FFmpeg is missing. If so, it dynamically prepends the internal `bin/` directory to the `OS.PATH` environment variable.
3.  **App Manifesting**: Custom XML manifests ensure sub-pixel rendering and high-DPI scaling across varying Windows monitor resolutions.

## VI. Security & Privacy Specs
- **Zero Telemetry**: No pings, no trackers, no analytics. Lumen Lab respects the sanctity of the user's data.
- **Media CDN Directivity**: Outgoing requests are strictly limited to the necessary Media CDNs (Google/YouTube/Twitter/etc.) for file acquisition.
- **Sandboxed Execution**: PyWebView's `debug=False` ensures restricted browsing capabilities, preventing external scripts from escaping the webview sandbox.

---
*Lumen Lab Engineering — Precision in every byte.*
*FOR INTERNAL USE ONLY. DO NOT DISTRIBUTE.*
