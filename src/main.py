import os
import json
import queue
import threading
import uuid
import uvicorn
import requests 
import webview
import threading
import time
import ctypes
from fastapi import FastAPI, Query
from fastapi.responses import RedirectResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from core.spotify import SpotifyClient

# Khởi tạo FastAPI và SpotifyClient
app = FastAPI(title="SYR Music AI API")
sp_client = SpotifyClient()

# Đường dẫn đến thư mục frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')

# Serve các file tĩnh của frontend (CSS, JS, các file khác)
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

# Mount thư mục lưu trữ downloads thành đường dẫn URL tĩnh để Frontend phát nhạc
DOWNLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'downloads'))
os.makedirs(DOWNLOAD_DIR, exist_ok=True)
app.mount("/downloads", StaticFiles(directory=DOWNLOAD_DIR), name="downloads")

@app.get("/api/yt-suggest")
def suggest_youtube_keywords(query: str = Query(...)):
    """Lấy danh sách gợi ý từ khóa tìm kiếm từ YouTube"""
    try:
        # Sử dụng API gợi ý công khai của Google (dành cho YouTube)
        url = f"http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={query}"
        response = requests.get(url, timeout=5)
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        # API trả về dạng mảng: ["từ khóa", ["gợi ý 1", "gợi ý 2", ...]]
        if response.status_code == 200:
            data = response.json()
            suggestions = data[1] if len(data) > 1 else []
            return {"status": "Success", "data": suggestions}
        return {"status": "Success", "data": []}
    except Exception as e:
        return {"status": "Error", "message": str(e)}

@app.get("/app", response_class=HTMLResponse)
def serve_frontend():
    """Serve giao diện frontend"""
    index_path = os.path.join(FRONTEND_DIR, 'index.html')
    if os.path.exists(index_path):
        with open(index_path, encoding='utf-8') as f:
            content = f.read()
        return HTMLResponse(
            content=content,
            headers={
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0"
            }
        )
    return HTMLResponse("<h3>Giao diện người dùng đang được xây dựng...</h3>")

@app.get("/")
def callback(code: str = None):
    """Trang chủ kiêm nhận callback từ Spotify để redirect về giao diện kèm theo token"""
    if not code:
        # Mặc định chưa đăng nhập thì chuyển hướng về giao diện chính
        return RedirectResponse("/app")
    
    try:
        # Nếu có code từ Spotify, đổi lấy token
        token_info = sp_client.get_token(code)
        access_token = token_info.get("access_token")
        # Chuyển hướng về giao diện kèm token trên URL để Frontend lưu trữ
        return RedirectResponse(f"/app?token={access_token}")
    except Exception as e:
        return HTMLResponse(f"<h3>Lỗi xác thực Spotify: {str(e)}</h3><br><a href='/app'>Quay lại Trang chủ</a>")

@app.get("/login")
def login():
    """Bước 1: Chuyển hướng đến Spotify để đăng nhập cấp quyền"""
    auth_url = sp_client.get_auth_url()
    return RedirectResponse(auth_url)

@app.get("/api/playlists")
def get_playlists(token: str = Query(...)):
    """Lấy danh sách Playlists của người dùng"""
    try:
        playlists = sp_client.get_user_playlists(token)
        return {"status": "Success", "data": playlists}
    except Exception as e:
        return {"status": "Error", "message": str(e)}

@app.get("/api/playlists/{playlist_id}/tracks")
def get_tracks(playlist_id: str, token: str = Query(...)):
    """Lấy toàn bộ bài hát trong Playlist cụ thể"""
    try:
        tracks = sp_client.get_playlist_tracks(playlist_id, token)
        return {"status": "Success", "data": tracks}
    except Exception as e:
        return {"status": "Error", "message": str(e)}

@app.get("/api/search")
def search_music(query: str = Query(...)):
    """Tìm kiếm bài hát đã tải về bằng Trí tuệ nhân tạo RAG (Semantic Search)"""
    try:
        from ai.database import MusicVectorDB
        db = MusicVectorDB()
        results = db.search_tracks(query, limit=8)
        return {"status": "Success", "data": results}
    except Exception as e:
        return {"status": "Error", "message": str(e)}

@app.get("/api/library")
def get_library():
    """Lấy danh sách toàn bộ bài hát đã tải về trong thư viện"""
    try:
        from ai.database import MusicVectorDB
        db = MusicVectorDB()
        results = db.get_all_tracks()
        return {"status": "Success", "data": results}
    except Exception as e:
        return {"status": "Error", "message": str(e)}

@app.get("/api/yt-search")
def search_youtube(query: str = Query(...)):
    """Tìm kiếm bài hát trực tiếp trên YouTube để tải xuống miễn phí"""
    try:
        from core.downloader import YoutubeDownloader
        downloader = YoutubeDownloader()
        results = downloader.search_youtube(query, limit=6)
        return {"status": "Success", "data": results}
    except Exception as e:
        return {"status": "Error", "message": str(e)}

@app.get("/api/download")
def download_track(track_name: str = Query(...), artists: str = Query(...), album: str = Query(...), image: str = Query(None)):
    """Tải nhạc từ YouTube theo tên bài hát & nghệ sĩ, trả về tiến trình bằng Server-Sent Events (SSE)"""
    def event_generator():
        from core.downloader import YoutubeDownloader
        from core.metadata import write_metadata
        
        q = queue.Queue()
        
        def progress_cb(percent, status):
            q.put({"percent": round(percent, 1), "status": status})
            
        def run_download():
            try:
                downloader = YoutubeDownloader()
                # Tải bài hát
                filepath = downloader.download_track(track_name, artists, progress_callback=progress_cb)
                
                # Ghi đè metadata thẻ tag & ảnh bìa album
                q.put({"percent": 100, "status": "Writing metadata..."})
                success = write_metadata(filepath, track_name, artists, album, image)
                
                # Thêm vector bài hát vào cơ sở dữ liệu ChromaDB AI phục vụ cho việc tìm kiếm ngữ nghĩa
                try:
                    from ai.database import MusicVectorDB
                    db = MusicVectorDB()
                    track_id = f"local-{uuid.uuid4().hex[:12]}"
                    db.add_track(track_id, track_name, artists, album, filepath, image)
                except Exception as ai_err:
                    print(f"[AI Integration WARNING] Không thể lưu vector bài hát: {ai_err}")
                
                if success:
                    q.put({
                        "percent": 100, 
                        "status": "Completed", 
                        "filename": os.path.basename(filepath),
                        "done": True
                    })
                else:
                    q.put({
                        "percent": 100, 
                        "status": "Completed with warning (Metadata error)", 
                        "filename": os.path.basename(filepath),
                        "done": True
                    })
            except Exception as e:
                q.put({
                    "percent": 0, 
                    "status": f"Error: {str(e)}", 
                    "done": True
                })
        
        # Chạy tiến trình tải trong thread riêng biệt để tránh block stream
        thread = threading.Thread(target=run_download)
        thread.start()
        
        while True:
            try:
                # Đọc trạng thái từ hàng đợi và gửi về Client qua luồng SSE
                msg = q.get(timeout=1.0)
                yield f"data: {json.dumps(msg)}\n\n"
                if msg.get("done"):
                    break
            except queue.Empty:
                # Kiểm tra xem Thread đã kết thúc đột ngột hay chưa
                if not thread.is_alive():
                    break
                    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

# Chạy server
if __name__ == "__main__":
    
    # --- PHÉP THUẬT 1: ÉP WINDOWS NHẬN DIỆN ĐÂY LÀ APP ĐỘC LẬP ---
    if os.name == 'nt': # Kiểm tra nếu hệ điều hành là Windows
        myappid = 'lustery.sonicrag.app.1.0' # Tạo một mã định danh độc quyền cho app của bạn
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)
    # -------------------------------------------------------------

    def run_server():
        import uvicorn
        uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")
    
    t = threading.Thread(target=run_server)
    t.daemon = True
    t.start()
    
    time.sleep(1.5)
    
    icon_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'avatarapp.ico'))
    
    # Tạo cửa sổ
    webview.create_window('SonicRAG - AI Music', 'http://127.0.0.1:8000/app', width=1280, height=800)

    if os.path.exists(icon_path):
        webview.start(icon=icon_path)
    else:
        webview.start()