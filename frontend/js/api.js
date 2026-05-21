import { state } from './state.js';
import { createIcons } from './utils.js';
import { renderPlaylists, renderTracks, renderSearchResults, renderYTResults, renderLibraryTracks } from './ui.js';

// API Fetch functions

export async function loadPlaylists(token) {
    const container = document.getElementById('playlist-container');
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);"><i data-lucide="loader" class="spin"></i> Loading playlists...</div>';
    createIcons();

    try {
        const response = await fetch(`/api/playlists?token=${token}`);
        const result = await response.json();
        
        if (result.status === 'Success') {
            renderPlaylists(result.data);
        } else {
            console.error("Lỗi lấy playlist:", result.message);
            container.innerHTML = `
                <div style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 3rem; background: rgba(255, 75, 75, 0.05); border: 1px solid rgba(255, 75, 75, 0.15); border-radius: 16px; color: #ff5555; max-width: 600px; margin: 2rem auto; gap: 1rem;">
                    <i data-lucide="alert-triangle" style="width: 48px; height: 48px; color: #ff5555;"></i>
                    <h3 style="margin: 0; color: #fff;">Lỗi đồng bộ Spotify (Hạn chế tài khoản Free)</h3>
                    <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">
                        Tài khoản tạo khóa API Spotify này thuộc diện "Free User". Kể từ cuối năm 2024, Spotify bắt buộc các ứng dụng nhà phát triển (Developer Apps) phải do tài khoản <b>Premium</b> sở hữu thì mới có thể sử dụng Web API lấy danh sách nhạc.
                    </p>
                    <div style="display: flex; gap: 12px; margin-top: 0.5rem; flex-wrap: wrap; justify-content: center;">
                        <button id="btn-err-ytsearch" style="padding: 0.6rem 1.2rem; border-radius: 8px; background: var(--accent-color); color: #000; border: none; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: inherit;">
                            <i data-lucide="youtube" style="width: 16px; height: 16px;"></i> Sử dụng YT Search (Tải trực tiếp miễn phí)
                        </button>
                        <button id="btn-err-logout" style="padding: 0.6rem 1.2rem; border-radius: 8px; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.1); font-weight: 600; cursor: pointer; font-family: inherit;">
                            Đăng xuất Spotify
                        </button>
                    </div>
                </div>
            `;
            createIcons();
            
            // Require importing from ui/main but we can dynamically import or attach events
            import('./ui.js').then(ui => {
                document.getElementById('btn-err-ytsearch')?.addEventListener('click', ui.switchToYTSearch);
            });
            import('./main.js').then(m => {
                document.getElementById('btn-err-logout')?.addEventListener('click', m.logout);
            });
        }
    } catch (err) {
        console.error("Lỗi mạng:", err);
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: red;">Network error loading playlists. Please retry.</div>';
    }
}

export async function fetchPlaylistTracks(playlist) {
    const container = document.getElementById('tracks-container');
    const token = localStorage.getItem('spotify_token');
    
    try {
        const response = await fetch(`/api/playlists/${playlist.id}/tracks?token=${token}`);
        const result = await response.json();
        
        if (result.status === 'Success') {
            state.currentTracks = result.data;
            document.getElementById('playlist-detail-meta').textContent = `${state.currentTracks.length} Tracks • By ${playlist.owner}`;
            renderTracks(state.currentTracks);
        } else {
            container.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Error: ${result.message}</td></tr>`;
        }
    } catch (err) {
        console.error("Lỗi:", err);
        container.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Failed to fetch tracks.</td></tr>';
    }
}

export async function performAISearch(query) {
    const container = document.getElementById('search-results-container');
    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const result = await response.json();
        
        if (result.status === 'Success') {
            renderSearchResults(result.data);
        } else {
            container.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Error: ${result.message}</td></tr>`;
        }
    } catch (err) {
        console.error("Lỗi tìm kiếm AI:", err);
        container.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Network error when performing AI search.</td></tr>';
    }
}

export async function performYTSearchApi(query) {
    const container = document.getElementById('yt-search-results-container');
    try {
        const response = await fetch(`/api/yt-search?query=${encodeURIComponent(query)}`);
        const result = await response.json();
        
        if (result.status === 'Success') {
            renderYTResults(result.data);
        } else {
            container.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--accent-color); padding: 3rem;">Lỗi tìm kiếm: ${result.message}</td></tr>`;
        }
    } catch (err) {
        console.error("Lỗi:", err);
        container.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red; padding: 3rem;">Lỗi mạng khi kết nối đến YouTube Search.</td></tr>`;
    }
}

export async function loadLibrary() {
    const container = document.getElementById('library-container');
    try {
        const response = await fetch('/api/library');
        const result = await response.json();
        
        if (result.status === 'Success') {
            const tracks = result.data;
            document.getElementById('library-detail-meta').textContent = `${tracks.length} Bài hát • Ngoại tuyến (Offline)`;
            renderLibraryTracks(tracks);
        } else {
            container.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Error: ${result.message}</td></tr>`;
        }
    } catch (err) {
        console.error("Lỗi lấy thư viện:", err);
        container.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Lỗi khi kết nối lấy dữ liệu thư viện.</td></tr>';
    }
}
