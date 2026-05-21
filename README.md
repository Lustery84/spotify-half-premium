# 🎵 SonicRAG - Spotify to MP3 with Local AI Brain

SonicRAG là một dự án ứng dụng Web kết hợp AI chuyên nghiệp giúp bạn tải nhạc từ Spotify/YouTube với đầy đủ Metadata và ảnh bìa, cùng với "bộ não" AI chạy cục bộ để tìm kiếm và gợi ý nhạc dựa trên ngữ nghĩa (Semantic Search).

---

## 🏗️ Cấu trúc thư mục (Professional Fullstack Standard)

Dự án được cấu trúc theo chuẩn dành cho ứng dụng Fullstack (FastAPI + Vanilla JS):

```text
sonic-rag/
├── src/                # Backend API & Logic lõi (Python)
│   ├── main.py         # Entry point: Khởi chạy FastAPI Server
│   ├── core/           # Logic xử lý (Spotify API, YouTube Downloader, Metadata)
│   ├── ai/             # Logic AI (Local VectorDB ChromaDB, Embeddings)
│   └── utils/          # Các tiện ích bổ sung
├── frontend/           # Frontend Web Giao diện người dùng (HTML, CSS, JS)
│   ├── index.html      # Giao diện chính
│   ├── style.css       # Styling
│   └── app.js          # Logic phía Client
├── data/               # Dữ liệu local (Đã cấu hình .gitignore an toàn)
│   ├── downloads/      # Thư mục chứa các file .mp3 tải về
│   └── ...             # Vector DB Database
├── config/             # Chứa file cấu hình
│   ├── .env            # Biến môi trường (Không push lên Git)
│   └── .env.example    # Mẫu biến môi trường (Push lên Git)
├── tests/              # (Tùy chọn) Thư mục chứa Unit Tests
├── requirements.txt    # Danh sách thư viện Python cần thiết
├── package.json        # Thông tin dự án
├── .gitignore          # File cấu hình Git Ignore bảo vệ dữ liệu nhạy cảm
└── README.md           # Hướng dẫn này
```

---

## ⚙️ Yêu cầu hệ thống

- **Python**: 3.8 trở lên.
- **FFmpeg**: Cần thiết để `yt-dlp` chuyển đổi và xử lý âm thanh. Bạn cần tải FFmpeg, giải nén và thêm vào biến môi trường (`PATH`) của Windows.
- **Spotify Developer**: Cần có `Client ID` và `Client Secret` từ [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).

---

## 🚀 Hướng dẫn cài đặt

### 1. Clone dự án và cài đặt thư viện
Mở Terminal hoặc PowerShell tại thư mục bạn muốn lưu dự án:

```bash
# Clone dự án về máy
git clone https://github.com/your-username/sonic-rag.git
cd sonic-rag

# Tạo môi trường ảo (Khuyến nghị)
python -m venv venv

# Kích hoạt môi trường ảo (Trên Windows)
.\venv\Scripts\activate
# (Trên macOS/Linux)
# source venv/bin/activate

# Cài đặt các thư viện phụ thuộc
pip install -r requirements.txt
```

### 2. Cấu hình biến môi trường
1. Vào thư mục `config`.
2. Đổi tên file `.env.example` thành `.env` (hoặc copy ra file mới tên `.env`).
3. Mở file `.env` và điền thông tin Spotify của bạn:
```ini
SPOTIPY_CLIENT_ID="your_spotify_client_id"
SPOTIPY_CLIENT_SECRET="your_spotify_client_secret"
SPOTIPY_REDIRECT_URI="http://127.0.0.1:8000/"
```

---

## 🏃 Hướng dẫn chạy dự án

Dự án này sử dụng FastAPI để phục vụ cho cả API backend và giao diện tĩnh (Frontend). Đảm bảo bạn đã kích hoạt môi trường ảo Python (có chữ `(venv)` ở đầu dòng lệnh) trước khi chạy các lệnh sau:

### Lệnh chạy chuẩn (Dành cho sử dụng bình thường)
Tại thư mục gốc của dự án, chạy lệnh:
```bash
python src/main.py
```
*Lệnh này sẽ khởi chạy server ở chế độ cơ bản thông qua Uvicorn được tích hợp sẵn trong file `main.py`.*

### Lệnh chạy chế độ Phát triển (Dành cho Developer)
Nếu bạn muốn sửa code và server tự động khởi động lại (auto-reload):
```bash
uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
```

### Các lệnh hữu ích khác
Xóa bộ nhớ đệm (Cache) của Python nếu gặp lỗi không cập nhật code mới:
```bash
# Xóa thư mục __pycache__ trên Windows
rmdir /s /q src\__pycache__
```

### 🌐 Truy cập ứng dụng
Sau khi Server khởi động thành công, hãy mở trình duyệt và truy cập vào địa chỉ:
👉 **[http://127.0.0.1:8000/app](http://127.0.0.1:8000/app)**

---

## 🛠️ Các tính năng cốt lõi
- **Tích hợp Spotify**: Đăng nhập qua OAuth, lấy danh sách Playlist và bài hát.
- **Trình tải nhạc mạnh mẽ**: Tìm kiếm bài hát trên YouTube và tải xuống, chuyển đổi sang MP3 chất lượng cao bằng `yt-dlp` và `FFmpeg`.
- **Gắn Tag Metadata Chuẩn**: Tự động nhúng thông tin Tiêu đề, Nghệ sĩ, Album và **Ảnh bìa** vào file MP3 sử dụng thư viện `mutagen`.
- **AI Vector Search (RAG)**: Sử dụng mô hình Machine Learning `sentence-transformers` và cơ sở dữ liệu `ChromaDB` để tìm kiếm nhạc bằng trí tuệ nhân tạo.
- **Real-time UX**: Backend đẩy trực tiếp tiến trình tải nhạc (Server-Sent Events) lên giao diện Frontend.
