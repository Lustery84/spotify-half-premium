import os
import chromadb
from dotenv import load_dotenv

# Load env variables
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'config', '.env')
load_dotenv(dotenv_path=env_path)

VECTOR_DB_DIR = os.getenv("VECTOR_DB_DIR", "./data/vector_db")

class MusicVectorDB:
    def __init__(self, db_dir=None):
        self.db_dir = db_dir or VECTOR_DB_DIR
        # Đảm bảo đường dẫn tuyệt đối
        if not os.path.isabs(self.db_dir):
            self.db_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), self.db_dir))
        
        os.makedirs(self.db_dir, exist_ok=True)
        
        # Khởi tạo PersistentClient của ChromaDB để ghi dữ liệu xuống đĩa cứng
        self.client = chromadb.PersistentClient(path=self.db_dir)
        
        # Lấy hoặc khởi tạo Collection lưu trữ nhạc sử dụng khoảng cách Cosine
        self.collection = self.client.get_or_create_collection(
            name="local_music_collection",
            metadata={"hnsw:space": "cosine"}
        )
        
    def add_track(self, track_id, title, artists, album, filepath, image_url=None):
        """Mã hóa bài hát thành vector và thêm vào Vector Database"""
        from ai.embedding import MusicEmbedder
        embedder = MusicEmbedder()
        
        # Văn bản đặc tả để AI vector hóa ngữ nghĩa
        document_text = f"{title} {artists} {album}"
        vector = embedder.get_embedding(document_text)
        
        # Metadata lưu trữ đính kèm bài hát
        metadata = {
            "title": title,
            "artists": artists,
            "album": album,
            "filepath": filepath,
            "image": image_url or ""
        }
        
        # Lưu vào cơ sở dữ liệu (sử dụng ID duy nhất từ Spotify hoặc tự sinh)
        self.collection.upsert(
            ids=[track_id],
            embeddings=[vector],
            documents=[document_text],
            metadatas=[metadata]
        )
        
    def search_tracks(self, query_text, limit=6):
        """Tìm kiếm ngữ nghĩa bài hát dựa trên truy vấn tự nhiên của người dùng"""
        from ai.embedding import MusicEmbedder
        embedder = MusicEmbedder()
        
        query_vector = embedder.get_embedding(query_text)
        
        # Truy vấn K-Nearest Neighbors dựa trên khoảng cách Cosine
        results = self.collection.query(
            query_embeddings=[query_vector],
            n_results=limit
        )
        
        formatted_results = []
        if results and 'ids' in results and len(results['ids']) > 0 and len(results['ids'][0]) > 0:
            for i in range(len(results['ids'][0])):
                # Khoảng cách Cosine (càng nhỏ càng khớp ngữ nghĩa)
                distance = results['distances'][0][i] if 'distances' in results else 1.0
                score = round((1.0 - distance) * 100, 1) # Chuyển đổi thành phần trăm khớp %
                
                formatted_results.append({
                    "id": results['ids'][0][i],
                    "score": score,
                    "title": results['metadatas'][0][i].get("title", ""),
                    "artists": results['metadatas'][0][i].get("artists", ""),
                    "album": results['metadatas'][0][i].get("album", ""),
                    "filepath": results['metadatas'][0][i].get("filepath", ""),
                    "image": results['metadatas'][0][i].get("image", ""),
                    "url": f"/downloads/{os.path.basename(results['metadatas'][0][i].get('filepath', ''))}"
                })
                
        return formatted_results

    def get_all_tracks(self):
        """Lấy toàn bộ bài hát đã tải lưu trong ChromaDB"""
        try:
            results = self.collection.get()
            formatted_results = []
            if results and 'ids' in results and len(results['ids']) > 0:
                for i in range(len(results['ids'])):
                    metadata = results['metadatas'][i] if 'metadatas' in results else {}
                    filepath = metadata.get("filepath", "")
                    filename = os.path.basename(filepath) if filepath else ""
                    formatted_results.append({
                        "id": results['ids'][i],
                        "title": metadata.get("title", ""),
                        "artists": metadata.get("artists", ""),
                        "album": metadata.get("album", ""),
                        "filepath": filepath,
                        "image": metadata.get("image", ""),
                        "url": f"/downloads/{filename}" if filename else ""
                    })
            return formatted_results
        except Exception as e:
            print(f"[VectorDB ERROR] Không thể truy vấn thư viện: {e}")
            return []
    
    def delete_track(self, track_id):
        """Xóa bài hát khỏi Vector Database"""
        try:
            self.collection.delete(ids=[track_id])
            return True
        except Exception as e:
            print(f"[VectorDB ERROR] Lỗi xóa track {track_id}: {e}")
            return False
    