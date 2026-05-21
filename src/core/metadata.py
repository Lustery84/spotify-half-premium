import requests
from mutagen.id3 import ID3, TIT2, TPE1, TALB, APIC, error

def write_metadata(filepath, title, artists, album, cover_url=None):
    """Ghi ID3 tags và nhúng ảnh bìa vào file MP3"""
    try:
        # Load hoặc khởi tạo thẻ ID3 mới
        try:
            audio = ID3(filepath)
        except error:
            # Tạo thẻ ID3 nếu file chưa có
            audio = ID3()

        # Thiết lập các thẻ cơ bản
        audio['TIT2'] = TIT2(encoding=3, text=title)       # Tiêu đề bài hát
        audio['TPE1'] = TPE1(encoding=3, text=artists)     # Nghệ sĩ
        audio['TALB'] = TALB(encoding=3, text=album)       # Tên Album

        # Tải và nhúng ảnh bìa nếu có
        if cover_url:
            try:
                response = requests.get(cover_url, timeout=10)
                if response.status_code == 200:
                    # Kiểm tra định dạng ảnh (JPEG hoặc PNG)
                    mime_type = 'image/jpeg'
                    if cover_url.lower().endswith('.png'):
                        mime_type = 'image/png'
                    
                    audio['APIC'] = APIC(
                        encoding=3,           # UTF-8
                        mime=mime_type,       # mime type
                        type=3,               # 3 = Cover Front (Ảnh bìa trước)
                        desc=u'Cover',        # Mô tả
                        data=response.content # Dữ liệu nhị phân của ảnh
                    )
            except Exception as e:
                print(f"[Metadata WARNING] Không thể nhúng ảnh bìa từ {cover_url}: {e}")

        # Lưu thay đổi vào file
        audio.save(filepath)
        return True
    except Exception as e:
        print(f"[Metadata ERROR] Lỗi ghi thẻ ID3 cho file {filepath}: {e}")
        return False
