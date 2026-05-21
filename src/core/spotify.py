import os
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv

# Load các biến môi trường từ file .env trong thư mục config
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'config', '.env')
load_dotenv(dotenv_path=env_path)

class SpotifyClient:
    def __init__(self):
        self.scope = "playlist-read-private user-library-read"
        
        self.sp_oauth = SpotifyOAuth(
            client_id=os.getenv("SPOTIPY_CLIENT_ID"),
            client_secret=os.getenv("SPOTIPY_CLIENT_SECRET"),
            redirect_uri=os.getenv("SPOTIPY_REDIRECT_URI"),
            scope=self.scope,
            cache_path=".cache"
        )

    def get_auth_url(self):
        return self.sp_oauth.get_authorize_url()

    def get_token(self, code):
        return self.sp_oauth.get_access_token(code)

    def get_user_playlists(self, token):
        sp = spotipy.Spotify(auth=token)
        results = sp.current_user_playlists()
        
        playlists = []
        if results and 'items' in results:
            for item in results['items']:
                if not item:
                    continue
                
                # Lấy ảnh bìa an toàn
                images = item.get('images')
                image_url = None
                if images and len(images) > 0:
                    image_url = images[0].get('url')

                # Lấy số lượng bài hát an toàn
                tracks_info = item.get('tracks')
                total_tracks = 0
                if tracks_info and isinstance(tracks_info, dict):
                    total_tracks = tracks_info.get('total', 0)

                # Lấy tên chủ sở hữu an toàn
                owner_info = item.get('owner')
                owner_name = "Unknown"
                if owner_info and isinstance(owner_info, dict):
                    owner_name = owner_info.get('display_name') or owner_info.get('id') or "Unknown"

                playlists.append({
                    "name": item.get('name') or "Untitled Playlist",
                    "id": item.get('id'),
                    "owner": owner_name,
                    "image": image_url,
                    "total_tracks": total_tracks
                })
            
        return playlists

    def get_playlist_tracks(self, playlist_id, token):
        sp = spotipy.Spotify(auth=token)
        results = sp.playlist_items(playlist_id)
        
        tracks = []
        while results and 'items' in results:
            for item in results['items']:
                if not item:
                    continue
                # Support both 'track' and 'item' keys depending on response wrapper
                track = item.get('track') or item.get('item')
                if not track:
                    continue
                
                # Tên nghệ sĩ an toàn
                artists_list = track.get('artists') or []
                artists = ", ".join([artist.get('name') for artist in artists_list if artist and artist.get('name')])
                
                # Album & Cover art an toàn
                album_info = track.get('album') or {}
                album_name = album_info.get('name') or "Unknown Album"
                images = album_info.get('images') or []
                cover_url = images[0].get('url') if images and len(images) > 0 else None
                
                tracks.append({
                    "id": track.get('id') or f"local-{track.get('name')}",
                    "name": track.get('name') or "Unknown Track",
                    "artists": artists or "Unknown Artist",
                    "album": album_name,
                    "image": cover_url,
                    "duration_ms": track.get('duration_ms') or 0
                })
            if results.get('next'):
                results = sp.next(results)
            else:
                results = None
        return tracks

