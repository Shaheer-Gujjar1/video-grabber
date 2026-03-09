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
RECENT_SEARCHES_FILE = os.path.expanduser("~/.video_grabber_recent.json")
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
        print(f"[DEBUG] open_file_location received path: {repr(path)}")
        import platform
        import subprocess
        system = platform.system()
        try:
            if not path:
                print("[DEBUG] path is empty, aborting")
                return
            
            folder = path if os.path.isdir(path) else os.path.dirname(path)
            # Fallback to Downloads if path doesn't exist
            if not folder or not os.path.exists(folder):
                folder = os.path.expanduser("~/Downloads")
                print(f"[DEBUG] path not found, falling back to: {folder}")

            if system == 'Windows':
                if os.path.exists(path) and not os.path.isdir(path):
                    subprocess.run(['explorer', '/select,', os.path.abspath(path)])
                else:
                    subprocess.run(['explorer', folder])
            elif system == 'Darwin':
                subprocess.run(['open', folder])
            else: # Linux
                print(f"[DEBUG] Opening folder: {folder}")
                subprocess.Popen(['xdg-open', folder], start_new_session=True)
        except Exception as e:
            print(f"[ERROR] open_file_location: {e}")

    def update_progress(self, download_id, percent, speed_str, eta, filepath=None):
        if self._window:
            js_filepath = json.dumps(filepath) if filepath else "null"
            self._window.evaluate_js(f"if(window.onDownloadProgress) window.onDownloadProgress('{download_id}', {percent}, '{speed_str}', {eta}, {js_filepath})")

    def fetch_video_info(self, url):
        try:
            info = self.downloader.fetch_info(url)
            if 'error' not in info:
                self.add_recent_search(info, url)
            return info
        except Exception as e:
            return {'error': str(e)}

    def get_recent_searches(self):
        if os.path.exists(RECENT_SEARCHES_FILE):
            try:
                with open(RECENT_SEARCHES_FILE, 'r') as f:
                    return json.load(f)
            except:
                pass
        return []

    def add_recent_search(self, info, url):
        recent = self.get_recent_searches()
        # Remove if already exists (to move to top)
        recent = [r for r in recent if r.get('url') != url]
        
        # Add new search to top
        new_entry = {
            'title': info.get('title'),
            'thumbnail': info.get('thumbnail'),
            'url': url,
            'duration': info.get('duration'),
            'timestamp': datetime.now().isoformat()
        }
        recent.insert(0, new_entry)
        
        # Limit to 5
        recent = recent[:5]
        
        try:
            with open(RECENT_SEARCHES_FILE, 'w') as f:
                json.dump(recent, f)
        except:
            pass

    def pause_download(self, download_id):
        try:
            self.downloader.cancel_download(download_id)
            return {'success': True}
        except Exception as e:
            return {'error': str(e)}
            
    def delete_file(self, path):
        print(f"[DEBUG] delete_file received path: {repr(path)}")
        try:
            if path and os.path.exists(path):
                os.remove(path)
                print(f"[DEBUG] Successfully deleted: {path}")
                return {'success': True}
            else:
                print(f"[DEBUG] File not found or path empty: {path}")
                return {'error': f'File not found: {path}'}
        except Exception as e:
            print(f"[ERROR] delete_file: {e}")
            return {'error': str(e)}

    def get_file_thumbnail(self, path):
        """Extract a thumbnail from a local file path."""
        try:
            if not path or not os.path.exists(path):
                return None
            return self.downloader.extract_thumbnail_from_file(path)
        except Exception as e:
            print(f"Error getting file thumbnail: {e}")
            return None

    def check_file_exists(self, filename):
        """Check if a file already exists in the default download directory."""
        folder = self.settings.get('default_path')
        if not folder or not os.path.exists(folder):
            return {'exists': False}
        
        # Comprehensive check: sanitize name like yt-dlp does
        import re
        def sanitize(s):
            return re.sub(r'[^\w\s.-]', '', s).strip()
            
        sanitized = sanitize(filename)
        search_patterns = [
            sanitized,
            sanitized.replace(' ', '_'),
            sanitized.replace(' ', '.'),
            filename
        ]
        
        files_in_folder = os.listdir(folder)
        for f in files_in_folder:
            name_without_ext = os.path.splitext(f)[0]
            if any(p.lower() == name_without_ext.lower() for p in search_patterns):
                return {'exists': True, 'path': os.path.join(folder, f)}
                
        return {'exists': False}

    def download_video(self, url, mode, quality, include_audio, download_id=None, allow_duplicate=False):
        try:
            if not self._window:
                return {'error': 'Window not initialized'}
            
            if not download_id:
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
                args=(url, path, mode, quality, download_id, allow_duplicate),
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
