import webview
import os
import json
import threading
import uuid
from downloader import VideoDownloader

# Simple persistence for settings
SETTINGS_FILE = os.path.expanduser("~/.video_grabber_settings.json")
HISTORY_FILE = os.path.expanduser("~/.video_grabber_history.json")

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
            return False
        
        # Use system specific commands to open file explorer
        import platform
        import subprocess

        try:
            if platform.system() == "Windows":
                os.startfile(os.path.dirname(path))
            elif platform.system() == "Darwin": # macOS
                subprocess.Popen(["open", "-R", path])
            else: # Linux
                # On Linux, opening the directory is most reliable
                subprocess.Popen(["xdg-open", os.path.dirname(path)])
            return True
        except:
            return False

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

if __name__ == '__main__':
    api = Api()
    
    current_dir = os.path.dirname(os.path.abspath(__file__))
    dist_path = os.path.join(current_dir, 'dist')
    html_path = os.path.join(dist_path, 'index.html')
    
    if not os.path.exists(html_path):
        print(f"Error: Could not find compiled React app at {html_path}")
        print("Please run 'npm run build' first.")
        os._exit(1)

    window = webview.create_window(
        title='Video Grabber - YouTube Downloader',
        url=f'file:///{html_path}',
        js_api=api,
        width=1000,
        height=850,
        background_color='#12141C'
    )
    api._window = window
    
    webview.start(debug=False)
