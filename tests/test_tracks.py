import os
import sys

# Thêm thư mục src vào PATH
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from core.spotify import SpotifyClient

def test():
    token = "BQC00fyBgUF44xLcbgU0p3997U1xVv3jIrlJyzCWoE86eDdUcVDe4XTExbhbE4q-McGWSfxBcRuqHhIBbaHw3-WI0E9kZLfBgbfNHvgz5nZwUXSKqlonFSYpoFrsKYOPVDE9_77LVrmRC3RQpy0S-A1xNph43wef-Z80AewdRs7uUJtt8hrFhKXU3DqHe2FSioe9csFNXdYnUL_RYghJ6hqQv3jSXYhV7UjUTWz2wcDnVFH6uOymreQ3WxGGtnG12mjgT9CPz68WOAKJjOSx"
    playlist_id = "4MTTrEbJXSIEureNm7ZpJU"
    
    client = SpotifyClient()
    print("Starting Spotify tracks retrieval debug...")
    try:
        import spotipy
        sp = spotipy.Spotify(auth=token)
        print("Fetching playlist items...")
        results = sp.playlist_items(playlist_id)
        print("Raw results keys:", list(results.keys()) if results else None)
        if results:
            print("Total tracks according to response:", results.get('total'))
            print("Number of items in response:", len(results.get('items', [])))
            if 'items' in results and len(results['items']) > 0:
                # Use ascii() or repr() to avoid UnicodeEncodeError in terminal
                print("First raw item summary:")
                first_item = results['items'][0]
                print("Raw item keys:", list(first_item.keys()) if first_item else None)
                print("Raw item contents:", ascii(first_item))
                if first_item and 'track' in first_item:
                    track = first_item['track']
                    print("  Track Name (ASCII safe):", ascii(track.get('name')))
                    print("  Track ID:", track.get('id'))
        
        tracks = client.get_playlist_tracks(playlist_id, token)
        print(f"SUCCESS! Retrieved {len(tracks)} tracks via client.")
        for idx, t in enumerate(tracks):
            print(f"  Track {idx+1}: {ascii(t.get('name'))} - {ascii(t.get('artists'))}")
    except Exception as e:
        print("ERROR RETRIEVING TRACKS:", str(e))
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()

