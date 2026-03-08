import webview
import os
import json
import threading
import uuid
import sys
import logging
from datetime import datetime
from downloader import VideoDownloader

# Simple persistence for settings
SETTINGS_FILE = os.path.expanduser("~/.video_grabber_settings.json")
HISTORY_FILE = os.path.expanduser("~/.video_grabber_history.json")
LOG_FILE = os.path.expanduser("~/.video_grabber.log")

# Setup logging
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")

    return os.path.join(base_path, relative_path)

class Api:
    def __init__(self):
        self._window = None
        self.downloader = VideoDownloader(self.update_progress)
        self.settings = self.load_settings()

    def load_settings(self):
        if os.path.exists(SETTINGS_FILE):
            try:
                with open(SETTINGS_FILE, 'r') as f:
                    return json.load(f)
            except:
                pass
        return {'default_path': os.path.join(os.path.expanduser("~"), "Downloads")}

    def save_settings(self):
        try:
            with open(SETTINGS_FILE, 'w') as f:
                json.dump(self.settings, f)
        except:
            pass

    def get_history(self):
        if os.path.exists(HISTORY_FILE):
            try:
                with open(HISTORY_FILE, 'r') as f:
                    return json.load(f)
            except:
                pass
        return []

    def save_history(self, history):
        try:
            with open(HISTORY_FILE, 'w') as f:
                json.dump(history, f)
            return True
        except:
            return False

    def get_default_path(self):
        return self.settings.get('default_path')

    def set_default_path(self):
        if not self._window: return None
        folder_tuple = self._window.create_file_dialog(webview.FOLDER_DIALOG)
        if folder_tuple and len(folder_tuple) > 0:
            self.settings['default_path'] = folder_tuple[0]
            self.save_settings()
            return folder_tuple[0]
        return None

    def open_file_location(self, path):
        if not path or not os.path.exists(path):
            return
        
        path = os.path.abspath(path)
        import platform
        import subprocess
        system = platform.system()
        
        try:
            if system == 'Windows':
                # Use explorer /select to highlight the file
                subprocess.run(['explorer', '/select,', path])
            elif system == 'Darwin':
                # macOS: open -R highlights the file in Finder
                subprocess.run(['open', '-R', path])
            else:
                # Linux (GTK/GNOME usually supports dbus-send for highlighting, 
                # but xdg-open just opens the folder. We'll fallback to opening the folder)
                folder = os.path.dirname(path)
                subprocess.run(['xdg-open', folder])
        except Exception as e:
            print(f"Error opening folder: {e}")

    def update_progress(self, download_id, percent, speed_str, eta):
        if self._window:
            self._window.evaluate_js(f"if(window.onDownloadProgress) window.onDownloadProgress('{download_id}', {percent}, '{speed_str}', {eta})")

    def download_video(self, url, mode, quality, include_audio):
        try:
            if not self._window:
                return {'error': 'Window not initialized'}
            
            download_id = str(uuid.uuid4())
            path = self.settings.get('default_path')
            
            if not path or not os.path.exists(path):
                folder_tuple = self._window.create_file_dialog(webview.FOLDER_DIALOG)
                if not folder_tuple or len(folder_tuple) == 0:
                    return {'error': 'Download cancelled (no folder selected)'}
                path = folder_tuple[0]
                self.settings['default_path'] = path
                self.save_settings()

            # We need the filename to return the full path to the frontend.
            # However, yt-dlp determines it during download.
            # For "Open Folder" purposes, the 'path' (directory) is actually enough for most users,
            # but we can try to be more precise if we wait for info.
            
            thread = threading.Thread(
                target=self.downloader.download, 
                args=(url, path, mode, quality, download_id),
                daemon=True
            )
            thread.start()
            
            return {'success': True, 'id': download_id, 'path': path}
        except Exception as e:
            return {'error': str(e)}

    def check_dependencies(self):
        """Check for FFmpeg and yt-dlp. Return true if all good."""
        import subprocess
        import platform
        
        dependencies_ok = True
        missing = []
        
        # Check FFmpeg
        try:
            subprocess.run(['ffmpeg', '-version'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except FileNotFoundError:
            dependencies_ok = False
            missing.append('FFmpeg')
            
        if not dependencies_ok:
            system = platform.system()
            if system == 'Windows':
                # On Windows, we could try to auto-download, but for now we'll alert the user.
                # Production pre-ship logic would download a static build.
                message = "FFmpeg is missing. It is required for combining video and audio. Please install FFmpeg and add it to your PATH."
                print(f"CRITICAL: {message}")
            else:
                print(f"WARNING: FFmpeg is missing. Media acquisition may fail for some formats.")
        
        return dependencies_ok

if __name__ == '__main__':
    api = Api()
    logging.info("Starting Lumen Lab Video Grabber")
    
    # Use resource_path for all assets
    html_path = resource_path(os.path.join('dist', 'index.html'))
    
    if not os.path.exists(html_path):
        error_msg = f"Error: Could not find compiled React app at {html_path}"
        print(error_msg)
        logging.error(error_msg)
        os._exit(1)

    # Set app icon (favicon)
    icon_path = resource_path(os.path.join('public', 'Lumen-Lab-Favicon-BG-Removed.png'))
    if not os.path.exists(icon_path):
        # Fallback to general logo
        icon_path = resource_path(os.path.join('public', 'Lumen-Lab-Logo-BG-Removed.png'))

    api.check_dependencies()

    window = webview.create_window(
        title='Lumen Lab Video Grabber',
        url=f'file:///{html_path}',
        js_api=api,
        width=1000,
        height=850,
        background_color='#020205'
    )

    api._window = window
    
    webview.start(debug=False)
