import yt_dlp
import os
import subprocess
import base64
import tempfile

class AbortDownload(Exception):
    pass

class VideoDownloader:
    def __init__(self, progress_callback=None):
        self.progress_callback = progress_callback
        self.current_id = None
        self.abort_flags = {}

    def progress_hook(self, d):
        if self.current_id and self.abort_flags.get(self.current_id):
            raise AbortDownload("Download paused by user")
            
        if d['status'] == 'downloading':
            p = d.get('_percent_str', '0%').replace('%', '')
            try:
                import re
                p_clean = re.sub(r'\x1b\[[0-9;]*m', '', p).strip()
                percent = float(p_clean)
                speed_bytes = d.get('speed')
                if speed_bytes is None: speed_bytes = 0
                speed_mb = speed_bytes / (1024 * 1024)
                speed_str = f"{speed_mb:.2f} MB/s"
                eta = d.get('eta')
                if eta is None: eta = 0
                if self.progress_callback:
                    # Pass the unique ID back with statistics and exact filename
                    self.progress_callback(self.current_id, percent, speed_str, eta, d.get('filename'))
            except ValueError:
                pass
        elif d['status'] == 'finished':
            if self.progress_callback:
                self.progress_callback(self.current_id, 100, "0 MB/s", 0, d.get('filename'))

    def cancel_download(self, download_id):
        self.abort_flags[download_id] = True

    def extract_thumbnail_from_file(self, file_path):
        """Extract a frame from a local or remote file and return as base64 data URL."""
        if not file_path: return None
        
        try:
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                tmp_path = tmp.name
            
            # ffmpeg command to extract 1 frame at 00:00:01
            cmd = [
                'ffmpeg', '-y', 
                '-ss', '00:00:01', 
                '-i', file_path, 
                '-frames:v', '1', 
                '-q:v', '2', 
                tmp_path
            ]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
            
            if os.path.exists(tmp_path) and os.path.getsize(tmp_path) > 0:
                with open(tmp_path, "rb") as image_file:
                    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
                    # Close and remove temp file before returning
                    os.unlink(tmp_path)
                    return f"data:image/jpeg;base64,{encoded_string}"
            
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        except Exception as te:
            print(f"Thumbnail extraction failed: {te}")
        return None

    def fetch_info(self, url):
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(url, download=False)
                thumbnail = info.get('thumbnail')
                
                # If no thumbnail, try to extract first frame from video stream
                if not thumbnail and info.get('formats'):
                    # Find a low quality video format for faster frame extraction
                    best_format = None
                    for f in info.get('formats', []):
                        if f.get('vcodec') != 'none' and f.get('url'):
                            best_format = f['url']
                            if f.get('height', 1000) <= 360: # Prefer 360p
                                break
                    
                    if best_format:
                        thumbnail = self.extract_thumbnail_from_file(best_format)

                return {
                    'id': info.get('id'),
                    'title': info.get('title'),
                    'channel': info.get('uploader'),
                    'duration': info.get('duration_string') or info.get('duration'),
                    'thumbnail': thumbnail
                }
            except Exception as e:
                raise Exception(f"Failed to fetch info: {str(e)}")

    def download(self, url, download_path, mode='video', quality='1080', download_id=None, allow_duplicate=False):
        self.current_id = download_id
        self.abort_flags[download_id] = False
        # Check for ffmpeg
        import subprocess
        has_ffmpeg = True
        try:
            subprocess.run(['ffmpeg', '-version'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except FileNotFoundError:
            has_ffmpeg = False

        if mode == 'audio':
            if not has_ffmpeg:
                raise Exception("FFmpeg is required for MP3 extraction. Please install it (sudo apt install ffmpeg).")
            
            ydl_opts = {
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': quality if quality in ['320', '256', '192', '128', '64'] else '192',
                }],
            }
        else:
            # Video mode
            if not has_ffmpeg:
                # Fallback to single-file format (usually 720p or lower) if ffmpeg is missing
                print("FFmpeg not found. Falling back to best single-file format.")
                ydl_opts = {
                    'format': 'best[ext=mp4]/best',
                }
            else:
                # quality is 2160, 1080, 720, 480, 360
                ydl_opts = {
                    'format': f'bestvideo[height<={quality}]+bestaudio/best[height<={quality}]',
                    'merge_output_format': 'mp4',
                }

        # Duplicate handling
        if allow_duplicate:
            # Manually find a unique name to avoid yt-dlp skipping
            base_filename = f"%(title)s.%(ext)s"
            # We'll use a temporary template to get the expected title
            with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
                info = ydl.extract_info(url, download=False)
                title = info.get('title', 'video')
                ext = 'mp3' if mode == 'audio' else 'mp4'
                
                counter = 1
                final_name = f"{title}.{ext}"
                while os.path.exists(os.path.join(download_path, final_name)):
                    final_name = f"{title} ({counter}).{ext}"
                    counter += 1
                
                outtmpl = os.path.join(download_path, final_name)
        else:
            outtmpl = os.path.join(download_path, '%(title)s.%(ext)s')

        ydl_opts.update({
            'outtmpl': outtmpl,
            'progress_hooks': [self.progress_hook],
            'no_warnings': True,
            'noplaylist': True,
        })
        
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        except AbortDownload:
            pass # Gracefully handle pause
        except Exception as e:
            if "AbortDownload" in str(e):
                pass
            else:
                raise e

if __name__ == "__main__":
    pass
