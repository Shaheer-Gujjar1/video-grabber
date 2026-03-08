import yt_dlp
import os

class VideoDownloader:
    def __init__(self, progress_callback=None):
        self.progress_callback = progress_callback
        self.current_id = None

    def progress_hook(self, d):
        if d['status'] == 'downloading':
            p = d.get('_percent_str', '0%').replace('%', '')
            try:
                percent = float(p)
                speed_bytes = d.get('speed')
                if speed_bytes is None: speed_bytes = 0
                speed_mb = speed_bytes / (1024 * 1024)
                speed_str = f"{speed_mb:.2f} MB/s"
                eta = d.get('eta')
                if eta is None: eta = 0
                if self.progress_callback:
                    # Pass the unique ID back with statistics
                    self.progress_callback(self.current_id, percent, speed_str, eta)
            except ValueError:
                pass
        elif d['status'] == 'finished':
            if self.progress_callback:
                self.progress_callback(self.current_id, 100, "0 MB/s", 0)

    def fetch_info(self, url):
        ydl_opts = {
            'quiet': True,
            'no_warnings': True,
            'noplaylist': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(url, download=False)
                return {
                    'id': info.get('id'),
                    'title': info.get('title'),
                    'channel': info.get('uploader'),
                    'duration': info.get('duration_string'),
                    'thumbnail': info.get('thumbnail')
                }
            except Exception as e:
                raise Exception(f"Failed to fetch info: {str(e)}")

    def download(self, url, download_path, mode='video', quality='1080', download_id=None):
        self.current_id = download_id
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

        ydl_opts.update({
            'outtmpl': os.path.join(download_path, '%(title)s.%(ext)s'),
            'progress_hooks': [self.progress_hook],
            'no_warnings': True,
            'noplaylist': True,
        })
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

if __name__ == "__main__":
    pass
