import os
from sentence_transformers import SentenceTransformer

class MusicEmbedder:
    def __init__(self):
        # Tải mô hình all-MiniLM-L6-v2 cực nhẹ, chạy hoàn toàn offline trên CPU
        # Tải về local cache để tăng tốc độ trong những lần chạy sau
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
    def get_embedding(self, text: str):
        """Chuyển đổi chuỗi văn bản thành một vector 384 chiều"""
        if not text:
            return []
        # Chuyển đổi thành List float để lưu vào ChromaDB
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()
