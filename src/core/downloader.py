import os
import yt_dlp
from dotenv import load_dotenv

# Load env variables
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'config', '.env')
load_dotenv(dotenv_path=env_path)

DOWNLOAD_DIR = os.getenv("DOWNLOAD_DIR", "./data/downloads")

def clean_filename(name):
    """Xóa bỏ các ký tự không hợp lệ trong tên file của Windows"""
    for char in ['\\', '/', ':', '*', '?', '"', '<', '>', '|']:
        name = name.replace(char, '')
    return name.strip()

class YoutubeDownloader:
    def __init__(self, download_dir=None):
        self.download_dir = download_dir or DOWNLOAD_DIR
        # Đảm bảo đường dẫn tuyệt đối
        if not os.path.isabs(self.download_dir):
            self.download_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), self.download_dir))
        os.makedirs(self.download_dir, exist_ok=True)
        
    def download_track(self, track_name, artists, progress_callback=None):
        """Tìm kiếm trên YouTube và tải bài hát dưới dạng MP3 320kbps"""
        query = f"{track_name} - {artists} (Official Audio)"
        
        def ytdl_hook(d):
            if d['status'] == 'downloading':
                total_bytes = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
                downloaded_bytes = d.get('downloaded_bytes', 0)
                if total_bytes > 0:
                    percent = (downloaded_bytes / total_bytes) * 100
                else:
                    percent = 0
                if progress_callback:
                    progress_callback(percent, "Downloading...")
            elif d['status'] == 'finished':
                if progress_callback:
                    progress_callback(100, "Converting to MP3...")

        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(self.download_dir, '%(title)s.%(ext)s'),
            'default_search': 'ytsearch1',
            'progress_hooks': [ytdl_hook],
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '320',
            }],
            'quiet': True,
            'no_warnings': True
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Tìm và tải
            info = ydl.extract_info(query, download=True)
            if 'entries' in info:
                video_info = info['entries'][0]
            else:
                video_info = info
            
            # Lấy tên file gốc do yt-dlp tạo ra
            temp_filename = ydl.prepare_filename(video_info)
            temp_filepath, _ = os.path.splitext(temp_filename)
            original_mp3_path = temp_filepath + ".mp3"
            
            # Đổi tên file về định dạng sạch sẽ: "Artist - Title.mp3"
            clean_name = f"{clean_filename(artists)} - {clean_filename(track_name)}.mp3"
            final_mp3_path = os.path.join(self.download_dir, clean_name)
            
            # Thực hiện đổi tên nếu file tồn tại
            if os.path.exists(original_mp3_path):
                if os.path.exists(final_mp3_path):
                    os.remove(final_mp3_path) # Ghi đè nếu đã tồn tại
                os.rename(original_mp3_path, final_mp3_path)
                return final_mp3_path
            
            # Trường hợp file gốc được lưu bằng tên khác
            # Duyệt thư mục để tìm file .mp3 được tạo gần nhất
            files = [os.path.join(self.download_dir, f) for f in os.listdir(self.download_dir) if f.endswith('.mp3')]
            if files:
                newest_file = max(files, key=os.path.getctime)
                # Chỉ đổi tên nếu nó được tạo trong vòng 30 giây qua
                import time
                if time.time() - os.path.getctime(newest_file) < 30:
                    if os.path.exists(final_mp3_path):
                        os.remove(final_mp3_path)
                    os.rename(newest_file, final_mp3_path)
                    return final_mp3_path
            
            raise FileNotFoundError("Không tìm thấy file MP3 sau khi chuyển đổi bằng FFmpeg.")

    def search_youtube(self, query, limit=5):
        """Tìm kiếm các bài hát trên YouTube theo từ khóa và trả về thông tin chi tiết"""
        ydl_opts = {
            'format': 'bestaudio/best',
            'default_search': f'ytsearch{limit}',
            'quiet': True,
            'no_warnings': True,
            'extract_flat': True,  # Tránh tải xuống hoặc giải nén sâu, chỉ lấy thông tin sơ bộ cực nhanh
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(query, download=False)
            results = []
            if 'entries' in info:
                for entry in info['entries']:
                    if not entry:
                        continue
                    
                    # Convert duration to MM:SS format safely
                    duration_sec = entry.get("duration")
                    duration_str = "0:00"
                    if duration_sec:
                        mins = int(duration_sec // 60)
                        secs = int(duration_sec % 60)
                        duration_str = f"{mins}:{secs:02d}"

                    results.append({
                        "id": entry.get("id"),
                        "title": entry.get("title") or "Unknown Video",
                        "url": f"https://www.youtube.com/watch?v={entry.get('id')}",
                        "duration": duration_str,
                        "channel": entry.get("uploader") or entry.get("channel") or "Unknown Creator",
                        "thumbnail": f"https://img.youtube.com/vi/{entry.get('id')}/mqdefault.jpg" if entry.get('id') else "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop"
                    })
            return results
