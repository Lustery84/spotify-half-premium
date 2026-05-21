// Quản lý hàng đợi tải nhạc
let activeQueueCount = 0;
let lastActiveSection = 'playlists-section';

// Trạng thái phát nhạc cục bộ (Music Player State)
let currentPlaylist = [];
let currentIndex = -1;
let isMuted = false;
let savedVolume = 0.8;

// Set lưu ID bài hát đã tải thành công
const downloadedTracks = new Set();


// Trích xuất Token từ URL và lưu trữ trong localStorage
function handleTokenAuthentication() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        localStorage.setItem('spotify_token', token);
        // Xóa token khỏi thanh URL để giữ giao diện sạch đẹp
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Kiểm tra trạng thái đăng nhập
function checkLoginState() {
    const token = localStorage.getItem('spotify_token');
    const loginContainer = document.getElementById('login-container');
    const playlistsSection = document.getElementById('playlists-section');
    const tracksSection = document.getElementById('tracks-section');
    const searchSection = document.getElementById('search-section');
    const directSearchSection = document.getElementById('direct-search-section');
    const userInfoSidebar = document.getElementById('user-info-sidebar');
    const btnLogout = document.getElementById('btn-logout');
    const headerUserStatus = document.getElementById('header-user-status');
    const headerAvatar = document.getElementById('header-avatar');
    
    if (token) {
        // Đã đăng nhập
        loginContainer.style.display = 'none';
        playlistsSection.style.display = 'block';
        tracksSection.style.display = 'none';
        searchSection.style.display = 'none';
        directSearchSection.style.display = 'none';
        userInfoSidebar.style.display = 'flex';
        btnLogout.style.display = 'flex';
        headerUserStatus.textContent = 'Premium Connected';
        headerAvatar.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Spotify';
        
        loadPlaylists(token);
    } else {
        // Chưa đăng nhập
        loginContainer.style.display = 'flex';
        playlistsSection.style.display = 'none';
        tracksSection.style.display = 'none';
        searchSection.style.display = 'none';
        directSearchSection.style.display = 'none';
        userInfoSidebar.style.display = 'none';
        btnLogout.style.display = 'none';
        headerUserStatus.textContent = 'Guest';
        headerAvatar.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest';
    }
}

// Tải danh sách Playlists từ API Backend
async function loadPlaylists(token) {
    const container = document.getElementById('playlist-container');
    container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);"><i data-lucide="loader" class="spin"></i> Loading playlists...</div>';
    if (window.lucide) window.lucide.createIcons();

    try {
        const response = await fetch(`/api/playlists?token=${token}`);
        const result = await response.json();
        
        if (result.status === 'Success') {
            renderPlaylists(result.data);
        } else {
            console.error("Lỗi lấy playlist:", result.message);
            // Hiển thị thông báo hướng dẫn cực kỳ thân thiện thay vì tự động logout
            container.innerHTML = `
                <div style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 3rem; background: rgba(255, 75, 75, 0.05); border: 1px solid rgba(255, 75, 75, 0.15); border-radius: 16px; color: #ff5555; max-width: 600px; margin: 2rem auto; gap: 1rem;">
                    <i data-lucide="alert-triangle" style="width: 48px; height: 48px; color: #ff5555;"></i>
                    <h3 style="margin: 0; color: #fff;">Lỗi đồng bộ Spotify (Hạn chế tài khoản Free)</h3>
                    <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin: 0;">
                        Tài khoản tạo khóa API Spotify này thuộc diện "Free User". Kể từ cuối năm 2024, Spotify bắt buộc các ứng dụng nhà phát triển (Developer Apps) phải do tài khoản <b>Premium</b> sở hữu thì mới có thể sử dụng Web API lấy danh sách nhạc.
                    </p>
                    <div style="display: flex; gap: 12px; margin-top: 0.5rem; flex-wrap: wrap; justify-content: center;">
                        <button onclick="switchToYTSearch()" style="padding: 0.6rem 1.2rem; border-radius: 8px; background: var(--accent-color); color: #000; border: none; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 6px; font-family: inherit;">
                            <i data-lucide="youtube" style="width: 16px; height: 16px;"></i> Sử dụng YT Search (Tải trực tiếp miễn phí)
                        </button>
                        <button onclick="logout()" style="padding: 0.6rem 1.2rem; border-radius: 8px; background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.1); font-weight: 600; cursor: pointer; font-family: inherit;">
                            Đăng xuất Spotify
                        </button>
                    </div>
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
        }
    } catch (err) {
        console.error("Lỗi mạng:", err);
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: red;">Network error loading playlists. Please retry.</div>';
    }
}

// Render danh sách Playlist ra giao diện
function renderPlaylists(playlists) {
    const container = document.getElementById('playlist-container');
    container.innerHTML = '';
    
    if (!playlists || playlists.length === 0) {
        container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-secondary);">No playlists found in your account.</div>';
        return;
    }
    
    playlists.forEach((playlist, index) => {
        const card = createPlaylistCard(playlist, index);
        container.appendChild(card);
    });
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Tạo card Playlist
function createPlaylistCard(playlist, index) {
    const card = document.createElement('div');
    card.className = 'playlist-card';
    card.style.animationDelay = `${index * 0.05}s`;
    
    const coverUrl = playlist.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop';
    
    card.innerHTML = `
        <div class="card-img-wrapper">
            <img src="${coverUrl}" alt="${playlist.name}" class="card-img">
            <button class="play-btn">
                <i data-lucide="download"></i>
            </button>
        </div>
        <div class="card-info">
            <h3>${playlist.name}</h3>
            <p>${playlist.total_tracks} Tracks • By ${playlist.owner}</p>
        </div>
    `;
    
    card.addEventListener('click', () => {
        lastActiveSection = 'playlists-section';
        viewPlaylistTracks(playlist);
    });
    
    return card;
}

// Xem chi tiết danh sách bài hát trong Playlist
let currentTracks = [];
async function viewPlaylistTracks(playlist) {
    document.getElementById('playlists-section').style.display = 'none';
    document.getElementById('search-section').style.display = 'none';
    const tracksSection = document.getElementById('tracks-section');
    tracksSection.style.display = 'block';
    
    // Gán dữ liệu header chi tiết playlist
    document.getElementById('playlist-detail-cover').src = playlist.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop';
    document.getElementById('playlist-detail-title').textContent = playlist.name;
    document.getElementById('playlist-detail-meta').textContent = `${playlist.total_tracks} Tracks • By ${playlist.owner}`;
    
    const container = document.getElementById('tracks-container');
    container.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Loading tracks...</td></tr>';
    
    const btnDownloadAll = document.getElementById('btn-download-all');
    btnDownloadAll.onclick = () => {
        downloadAllTracks();
    };

    const token = localStorage.getItem('spotify_token');
    try {
        const response = await fetch(`/api/playlists/${playlist.id}/tracks?token=${token}`);
        const result = await response.json();
        
        if (result.status === 'Success') {
            currentTracks = result.data;
            document.getElementById('playlist-detail-meta').textContent = `${currentTracks.length} Tracks • By ${playlist.owner}`;
            renderTracks(currentTracks);
        } else {
            container.innerHTML = `<tr><td colspan="4" style="text-align: center; color: red;">Error: ${result.message}</td></tr>`;
        }
    } catch (err) {
        console.error("Lỗi:", err);
        container.innerHTML = '<tr><td colspan="4" style="text-align: center; color: red;">Failed to fetch tracks.</td></tr>';
    }
}

// Render các hàng bài hát
function renderTracks(tracks) {
    const container = document.getElementById('tracks-container');
    container.innerHTML = '';
    
    if (!tracks || tracks.length === 0) {
        container.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">No tracks found in this playlist.</td></tr>';
        return;
    }
    
    tracks.forEach((track, index) => {
        const row = document.createElement('tr');
        row.className = 'track-row';
        
        const coverUrl = track.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop';
        
        // Check if this track was already downloaded in this session
        const trackKey = `${track.name}__${track.artists}`.toLowerCase();
        const isDownloaded = downloadedTracks.has(trackKey);
        
        const actionCell = isDownloaded
            ? `<span class="already-downloaded-badge"><i data-lucide="check-circle" style="width:14px;height:14px;"></i> Đã tải</span>`
            : `<button class="track-action-btn" title="Download MP3 for Free">
                    <i data-lucide="download"></i>
               </button>`;
        
        row.innerHTML = `
            <td style="text-align: center; color: var(--text-secondary); font-weight: 500;">${index + 1}</td>
            <td>
                <div class="track-title-cell">
                    <img src="${coverUrl}" alt="${track.name}" class="track-thumbnail">
                    <div class="track-name-info">
                        <h4>${track.name}</h4>
                        <p>${track.artists}</p>
                    </div>
                </div>
            </td>
            <td class="track-album-cell">${track.album}</td>
            <td style="text-align: center;">${actionCell}</td>
        `;
        
        const actionBtn = row.querySelector('.track-action-btn');
        if (actionBtn) {
            actionBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                triggerSingleDownload(track);
            });
        }
        
        container.appendChild(row);
    });
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}


// TÌM KIẾM NGỮ NGHĨA BẰNG AI (RAG Semantic Search)
async function performAISearch(query) {
    if (!query.trim()) return;
    
    // Lưu lại view hiện tại để nhấn nút Back có thể quay lại
    const playlistsSection = document.getElementById('playlists-section');
    const tracksSection = document.getElementById('tracks-section');
    const searchSection = document.getElementById('search-section');
    const librarySection = document.getElementById('library-section');
    
    if (playlistsSection.style.display !== 'none') {
        lastActiveSection = 'playlists-section';
    } else if (tracksSection.style.display !== 'none') {
        lastActiveSection = 'tracks-section';
    } else if (librarySection && librarySection.style.display !== 'none') {
        lastActiveSection = 'library-section';
    }
    
    // Ẩn tất cả và hiển thị search section
    playlistsSection.style.display = 'none';
    tracksSection.style.display = 'none';
    if (librarySection) librarySection.style.display = 'none';
    searchSection.style.display = 'block';
    
    const container = document.getElementById('search-results-container');
    container.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 3rem; color: var(--text-secondary);"><i data-lucide="loader" class="spin"></i> AI is thinking and searching...</td></tr>';
    if (window.lucide) window.lucide.createIcons();
    
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

// Render kết quả tìm kiếm của AI
function renderSearchResults(results) {
    const container = document.getElementById('search-results-container');
    container.innerHTML = '';
    
    if (!results || results.length === 0) {
        container.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 3rem; color: var(--text-secondary);"><i data-lucide="info" style="margin-bottom: 0.5rem;"></i> Không tìm thấy bài hát đã tải nào khớp với mô tả. Bạn cần tải nhạc về trước khi AI có thể tìm kiếm!</td></tr>';
        if (window.lucide) window.lucide.createIcons();
        return;
    }
    
    results.forEach((track) => {
        const row = document.createElement('tr');
        row.className = 'track-row';
        row.dataset.trackId = track.id;
        
        // Highlight nếu bài hát này đang được phát
        if (currentIndex !== -1 && currentPlaylist[currentIndex] && currentPlaylist[currentIndex].id === track.id) {
            row.classList.add('playing');
        }
        
        const coverUrl = track.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop';
        
        // Match Score Badge Color based on score
        let scoreColor = 'var(--text-secondary)';
        if (track.score >= 80) scoreColor = 'var(--accent-color)';
        else if (track.score >= 50) scoreColor = '#0088ff';
        
        row.innerHTML = `
            <td style="text-align: center; font-weight: 700; color: ${scoreColor}; font-size: 1rem;">
                ${track.score}%
            </td>
            <td>
                <div class="track-title-cell">
                    <img src="${coverUrl}" alt="${track.title}" class="track-thumbnail">
                    <div class="track-name-info">
                        <h4>${track.title}</h4>
                        <p>${track.artists}</p>
                    </div>
                </div>
            </td>
            <td class="track-album-cell">${track.album}</td>
            <td style="text-align: center;">
                <button class="play-row-btn" title="Play Track">
                    <i data-lucide="play"></i>
                </button>
            </td>
        `;
        
        // Cập nhật biểu tượng Play/Pause trên hàng
        if (currentIndex !== -1 && currentPlaylist[currentIndex] && currentPlaylist[currentIndex].id === track.id) {
            const btn = row.querySelector('.play-row-btn');
            const audio = document.getElementById('main-audio');
            if (btn) {
                btn.innerHTML = audio && !audio.paused ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
            }
        }
        
        const handlePlay = (e) => {
            e.stopPropagation();
            if (currentIndex !== -1 && currentPlaylist[currentIndex] && currentPlaylist[currentIndex].id === track.id) {
                togglePlayPause();
            } else {
                playTrack(track, results);
            }
        };
        
        row.addEventListener('click', handlePlay);
        row.querySelector('.play-row-btn').addEventListener('click', handlePlay);
        
        container.appendChild(row);
    });
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Xử lý kích hoạt tải 1 bài hát đơn lẻ
function triggerSingleDownload(track) {
    const queueId = `dl-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    toggleDownloadPanel(true);
    
    const queueList = document.getElementById('queue-list');
    const emptyQueueMsg = document.getElementById('empty-queue-msg');
    if (emptyQueueMsg) emptyQueueMsg.style.display = 'none';
    
    const item = document.createElement('div');
    item.className = 'queue-item';
    item.id = queueId;
    
    const coverUrl = track.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop';
    
    item.innerHTML = `
        <div class="queue-item-info">
            <img src="${coverUrl}" class="queue-item-img" alt="Cover">
            <div class="queue-item-text">
                <h5>${track.name}</h5>
                <p>${track.artists}</p>
            </div>
            <span class="status-badge pending" id="badge-${queueId}">Pending</span>
        </div>
        <div class="progress-bar-container">
            <div class="progress-bar-fill" id="bar-${queueId}"></div>
        </div>
        <div style="font-size: 0.75rem; color: var(--text-secondary); text-align: right;" id="status-${queueId}">
            Searching on YouTube...
        </div>
    `;
    
    queueList.appendChild(item);
    
    updateActiveQueueCount(1);
    
    const downloadUrl = `/api/download?track_name=${encodeURIComponent(track.name)}&artists=${encodeURIComponent(track.artists)}&album=${encodeURIComponent(track.album)}&image=${encodeURIComponent(track.image || '')}`;
    
    const eventSource = new EventSource(downloadUrl);
    
    eventSource.onmessage = function(event) {
        const data = JSON.parse(event.data);
        const badge = document.getElementById(`badge-${queueId}`);
        const barFill = document.getElementById(`bar-${queueId}`);
        const statusText = document.getElementById(`status-${queueId}`);
        
        if (!badge || !barFill || !statusText) return;
        
        if (data.status) {
            statusText.textContent = data.status;
            
            if (data.status.includes("Downloading")) {
                badge.className = "status-badge downloading";
                badge.textContent = "Downloading";
            }
        }
        
        if (data.percent !== undefined) {
            barFill.style.width = `${data.percent}%`;
        }
        
        if (data.done) {
            eventSource.close();
            updateActiveQueueCount(-1);
            
            if (data.status.includes("Completed")) {
                badge.className = "status-badge completed";
                badge.textContent = "Done";
                barFill.style.width = "100%";
                statusText.innerHTML = `<span style="color: var(--accent-color); font-weight: 500;">✓ Saved!</span>: ${data.filename}`;
                
                // Mark this track as downloaded so we can hide the download button
                const trackKey = `${track.name}__${track.artists}`.toLowerCase();
                downloadedTracks.add(trackKey);
                
                // Update all matching download buttons in the playlist view
                const allRows = document.querySelectorAll('#tracks-container tr.track-row');
                allRows.forEach(row => {
                    const h4 = row.querySelector('h4');
                    const p = row.querySelector('.track-name-info p');
                    if (h4 && p) {
                        const rowKey = `${h4.textContent}__${p.textContent}`.toLowerCase();
                        if (rowKey === trackKey) {
                            const btn = row.querySelector('.track-action-btn');
                            if (btn) {
                                btn.outerHTML = `<span class="already-downloaded-badge"><i data-lucide="check-circle" style="width:14px;height:14px;"></i> Đã tải</span>`;
                                if (window.lucide) window.lucide.createIcons();
                            }
                        }
                    }
                });
            } else {
                badge.className = "status-badge error";
                badge.textContent = "Error";
                statusText.textContent = data.status || "Download failed.";
            }
        }
    };
    
    eventSource.onerror = function(err) {
        console.error("SSE Connection error:", err);
        eventSource.close();
        updateActiveQueueCount(-1);
        
        const badge = document.getElementById(`badge-${queueId}`);
        const statusText = document.getElementById(`status-${queueId}`);
        if (badge) {
            badge.className = "status-badge error";
            badge.textContent = "Error";
        }
        if (statusText) {
            statusText.textContent = "Network disconnection.";
        }
    };
}

// Tải toàn bộ playlist hiện tại
function downloadAllTracks() {
    if (currentTracks.length === 0) return;
    
    const confirmDownload = confirm(`Bạn có muốn tải toàn bộ ${currentTracks.length} bài hát trong playlist này không? Chúng sẽ được xếp vào danh sách hàng đợi.`);
    if (!confirmDownload) return;
    
    currentTracks.forEach(track => {
        triggerSingleDownload(track);
    });
}

// Cập nhật badge hàng đợi tải
function updateActiveQueueCount(change) {
    activeQueueCount += change;
    if (activeQueueCount < 0) activeQueueCount = 0;
    
    const badge = document.getElementById('queue-badge');
    if (activeQueueCount > 0) {
        badge.style.display = 'block';
        badge.textContent = activeQueueCount;
    } else {
        badge.style.display = 'none';
    }
}

// Toggle mở/đóng Download Queue Panel
function toggleDownloadPanel(show) {
    const panel = document.getElementById('download-panel');
    if (show === true) {
        panel.classList.add('open');
    } else if (show === false) {
        panel.classList.remove('open');
    } else {
        panel.classList.toggle('open');
    }
}

// Đăng xuất / Ngắt kết nối Spotify
function logout() {
    localStorage.removeItem('spotify_token');
    checkLoginState();
}

// Chuyển hướng view sang Tìm kiếm YouTube Trực tiếp
function switchToYTSearch() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('playlists-section').style.display = 'none';
    document.getElementById('tracks-section').style.display = 'none';
    document.getElementById('search-section').style.display = 'none';
    document.getElementById('direct-search-section').style.display = 'block';
    
    // Cập nhật class active trên menu
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.getElementById('nav-direct').classList.add('active');
}

// Thực hiện tìm kiếm video trực tiếp trên YouTube
async function performYTSearch() {
    const input = document.getElementById('yt-search-input');
    const query = input.value.trim();
    if (!query) return;
    
    const container = document.getElementById('yt-search-results-container');
    container.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i data-lucide="loader" class="spin" style="width: 32px; height: 32px; margin-bottom: 0.5rem; display: inline-block;"></i>
                <p>Đang quét các bản nhạc chất lượng trên YouTube...</p>
            </td>
        </tr>
    `;
    if (window.lucide) window.lucide.createIcons();
    
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

// Render kết quả YouTube nhận được ra bảng
function renderYTResults(results) {
    const container = document.getElementById('yt-search-results-container');
    container.innerHTML = '';
    
    if (!results || results.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 3rem; color: var(--text-secondary);">Không tìm thấy video nào phù hợp trên YouTube.</td></tr>';
        return;
    }
    
    results.forEach((item) => {
        const row = document.createElement('tr');
        row.className = 'track-row';
        
        row.innerHTML = `
            <td style="text-align: center; padding: 12px 6px;">
                <img src="${item.thumbnail}" alt="Thumbnail" style="width: 100px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
            </td>
            <td style="padding: 12px 6px;">
                <div style="font-weight: 600; color: var(--text-primary); max-width: 450px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${item.title}
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">
                    <a href="${item.url}" target="_blank" style="color: var(--accent-color); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                        Xem trên YouTube <i data-lucide="external-link" style="width: 12px; height: 12px;"></i>
                    </a>
                </div>
            </td>
            <td style="color: var(--text-secondary); font-size: 0.9rem; padding: 12px 6px;">${item.channel}</td>
            <td style="text-align: center; color: var(--text-secondary); font-weight: 500; padding: 12px 6px;">${item.duration}</td>
            <td style="text-align: center; padding: 12px 6px;">
                <button class="dl-btn-yt" style="background: var(--accent-color); color: #000; border-radius: 20px; padding: 0.4rem 1.1rem; border: none; font-weight: 700; font-size: 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-family: inherit; transition: transform 0.2s ease;">
                    <i data-lucide="download" style="width: 14px; height: 14px;"></i> MP3 320k
                </button>
            </td>
        `;
        
        row.querySelector('.dl-btn-yt').addEventListener('click', (e) => {
            e.stopPropagation();
            
            let title = item.title;
            let artist = item.channel;
            
            // Tách tên ca sĩ nếu có gạch ngang
            if (title.includes(" - ")) {
                const parts = title.split(" - ");
                artist = parts[0].trim();
                title = parts.slice(1).join(" - ").trim();
            }
            
            // Xóa bớt hậu tố linh tinh trong video title
            const cleanSuffixes = ["(Official Audio)", "(Official Music Video)", "Official Video", "Official Audio", "Lyrics Video", "MV", "Lyrics", "LRC", "Live", "Official MV", "(MV)", "[MV]", "Official Music Video"];
            cleanSuffixes.forEach(s => {
                title = title.replace(new RegExp('\\s*' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
            });
            
            const track = {
                name: title,
                artists: artist,
                album: "YouTube Single",
                image: item.thumbnail
            };
            
            triggerSingleDownload(track);
        });
        
        container.appendChild(row);
    });
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// ==========================================================================
// THƯ VIỆN & TRÌNH PHÁT NHẠC CỤ BỘ (Spotify Style Audio Player & Library)
// ==========================================================================

// Helper để format thời gian (giây -> mm:ss)
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Tải danh sách bài hát trong Thư viện cá nhân
async function loadLibrary() {
    const container = document.getElementById('library-container');
    container.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);"><i data-lucide="loader" class="spin"></i> Đang tải thư viện nhạc cục bộ...</td></tr>';
    if (window.lucide) window.lucide.createIcons();

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

// Render danh sách bài hát cục bộ
function renderLibraryTracks(tracks) {
    const container = document.getElementById('library-container');
    container.innerHTML = '';
    
    if (!tracks || tracks.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i data-lucide="folder-open" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.5; display: inline-block;"></i>
                    <p>Thư viện cá nhân của bạn hiện chưa có bài hát nào đã tải.</p>
                    <p style="font-size: 0.85rem; margin-top: 8px; color: var(--accent-color);">Hãy chuyển sang mục <b>Discover</b> hoặc <b>YT Search</b> để tải nhạc về nhé!</p>
                </td>
            </tr>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
    }
    
    tracks.forEach((track, index) => {
        const row = document.createElement('tr');
        row.className = 'track-row';
        row.dataset.trackId = track.id;
        
        // Highlight nếu bài hát này đang được phát
        if (currentIndex !== -1 && currentPlaylist[currentIndex] && currentPlaylist[currentIndex].id === track.id) {
            row.classList.add('playing');
        }
        
        const coverUrl = track.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop';
        
        row.innerHTML = `
            <td style="text-align: center; color: var(--text-secondary); font-weight: 500;">${index + 1}</td>
            <td>
                <div class="track-title-cell">
                    <img src="${coverUrl}" alt="${track.title}" class="track-thumbnail">
                    <div class="track-name-info">
                        <h4>${track.title}</h4>
                        <p>${track.artists}</p>
                    </div>
                </div>
            </td>
            <td class="track-album-cell">${track.album}</td>
            <td style="text-align: center;">
                <button class="play-row-btn" title="Phát bài hát">
                    <i data-lucide="play"></i>
                </button>
            </td>
        `;
        
        // Cập nhật biểu tượng Play/Pause trên hàng
        if (currentIndex !== -1 && currentPlaylist[currentIndex] && currentPlaylist[currentIndex].id === track.id) {
            const btn = row.querySelector('.play-row-btn');
            const audio = document.getElementById('main-audio');
            if (btn) {
                btn.innerHTML = audio && !audio.paused ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
            }
        }
        
        // Sự kiện phát nhạc
        const handlePlay = (e) => {
            e.stopPropagation();
            if (currentIndex !== -1 && currentPlaylist[currentIndex] && currentPlaylist[currentIndex].id === track.id) {
                togglePlayPause();
            } else {
                playTrack(track, tracks);
            }
        };
        
        row.addEventListener('click', handlePlay);
        row.querySelector('.play-row-btn').addEventListener('click', handlePlay);
        
        container.appendChild(row);
    });
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Phát một bài hát cục bộ
function playTrack(track, queueList = []) {
    const audio = document.getElementById('main-audio');
    const playerBar = document.getElementById('player-bar');
    const playerCover = document.getElementById('player-cover');
    const playerTitle = document.getElementById('player-title');
    const playerArtist = document.getElementById('player-artist');
    const playBtn = document.getElementById('player-btn-play');
    
    if (!audio || !playerBar) return;
    
    // Gán hàng đợi và vị trí bài hát
    currentPlaylist = queueList.length > 0 ? queueList : [track];
    currentIndex = currentPlaylist.findIndex(t => t.id === track.id);
    if (currentIndex === -1) {
        currentPlaylist.push(track);
        currentIndex = currentPlaylist.length - 1;
    }
    
    // Hiển thị thanh phát nhạc
    playerBar.style.display = 'flex';
    
    // Cập nhật thông tin bài hát đang phát
    const coverSrc = track.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop';
    playerCover.src = coverSrc;
    playerTitle.textContent = track.title || track.name || 'Unknown Track';
    playerArtist.textContent = track.artists || 'Unknown Artist';
    
    // Nạp đường dẫn và phát nhạc
    audio.src = track.url;
    audio.volume = isMuted ? 0 : savedVolume;
    
    // Reset thanh tiến trình
    document.getElementById('player-progress-fill').style.width = '0%';
    document.getElementById('player-time-current').textContent = '0:00';
    document.getElementById('player-time-total').textContent = '0:00';
    
    audio.play().then(() => {
        playBtn.innerHTML = '<i data-lucide="pause"></i>';
        playerCover.classList.add('playing');
        updateActiveTrackHighlight();
        if (window.lucide) window.lucide.createIcons();
        
        // Hiển thị mini widget
        showMiniWidget(track, coverSrc);
        
        // Media Session API
        setupMediaSession(track, coverSrc);

        // Tự động mở cửa sổ nổi (PiP) nếu có tương tác người dùng
        autoOpenFloatingWidget();
    }).catch(err => {
        console.error("Không thể phát nhạc:", err);
        alert("Lỗi: Không thể phát tệp âm thanh này. Định dạng file có thể bị hỏng hoặc chưa hoàn thành tải.");
    });
}

// Coordinates & state of mini widget and FAB (shared for seamless transition)
let widgetLeft = null;
let widgetTop = null;
let isWidgetDragging = false;
let isFabDragging = false;
let pipWindow = null;
let pipInterval = null;

// Hàm hỗ trợ lấy element của widget mini bất kể nó đang ở document chính hay PiP document
function getMiniEl(id) {
    if (window.pipWindow) {
        const el = window.pipWindow.document.getElementById(id);
        if (el) return el;
    }
    return document.getElementById(id);
}

// Hiển thị mini widget với thông tin bài hát
function showMiniWidget(track, coverSrc) {
    const widget = getMiniEl('mini-widget-player');
    if (!widget) return;
    
    getMiniEl('mini-cover').src = coverSrc;
    getMiniEl('mini-title').textContent = track.title || track.name || 'Unknown Track';
    getMiniEl('mini-artist').textContent = track.artists || 'Unknown Artist';
    getMiniEl('mini-play').innerHTML = '<i data-lucide="pause"></i>';
    
    // Remove hiding class and show
    widget.classList.remove('mini-hiding');
    
    // Nếu PiP window đang mở, widget gốc đang ở trong PiP window nên không bị trùng lặp
    widget.style.display = 'flex';
    
    if (window.pipWindow && window.pipWindow.lucide) {
        window.pipWindow.lucide.createIcons();
    } else if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Ẩn mini widget với animation
function hideMiniWidget() {
    const widget = getMiniEl('mini-widget-player');
    if (!widget) return;
    widget.classList.add('mini-hiding');
    setTimeout(() => {
        widget.style.display = 'none';
        widget.classList.remove('mini-hiding');
    }, 260);
}

// Cập nhật trạng thái play/pause của mini widget
function syncMiniWidget() {
    const audio = document.getElementById('main-audio');
    const miniPlay = getMiniEl('mini-play');
    if (!miniPlay || !audio) return;
    miniPlay.innerHTML = audio.paused
        ? '<i data-lucide="play"></i>'
        : '<i data-lucide="pause"></i>';
        
    if (window.pipWindow && window.pipWindow.lucide) {
        window.pipWindow.lucide.createIcons();
    } else if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Thiết lập chức năng kéo thả và thu nhỏ của widget mini
function setupMiniWidgetInteractivity() {
    const widget = document.getElementById('mini-widget-player');
    const fab = document.getElementById('mini-fab');
    const fabCover = document.getElementById('mini-fab-cover');
    const miniHideBtn = document.getElementById('mini-hide');
    const miniPipBtn = document.getElementById('mini-pip');

    // Drag-and-Drop cho Mini Widget
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartLeft = 0;
    let dragStartTop = 0;

    widget.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Chỉ chuột trái
        if (window.pipWindow) return; // Không kéo thả khi đang trong PiP
        // Không bắt đầu kéo nếu người dùng nhấp vào các nút điều khiển
        if (e.target.closest('.mini-controls') || e.target.closest('.mini-btn')) return;
        
        isWidgetDragging = true;
        widget.classList.add('dragging');
        
        const rect = widget.getBoundingClientRect();
        dragStartLeft = rect.left;
        dragStartTop = rect.top;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        
        // Ghi đè định dạng right/bottom để chuyển sang absolute left/top
        widget.style.right = 'auto';
        widget.style.bottom = 'auto';
        widget.style.left = dragStartLeft + 'px';
        widget.style.top = dragStartTop + 'px';
        
        e.preventDefault();
    });

    // Drag-and-Drop cho FAB
    let fabStartX = 0;
    let fabStartY = 0;
    let fabStartLeft = 0;
    let fabStartTop = 0;

    fab.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isFabDragging = false;
        
        fabStartX = e.clientX;
        fabStartY = e.clientY;
        
        const rect = fab.getBoundingClientRect();
        fabStartLeft = rect.left;
        fabStartTop = rect.top;
        
        const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - fabStartX;
            const dy = moveEvent.clientY - fabStartY;
            
            // Chỉ xem là kéo thả nếu di chuyển chuột trên 5px (phân biệt click vs drag)
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                isFabDragging = true;
                fab.classList.add('dragging');
                fab.style.right = 'auto';
                fab.style.bottom = 'auto';
                
                let newLeft = fabStartLeft + dx;
                let newTop = fabStartTop + dy;
                
                // Giới hạn trong khung hình viewport
                newLeft = Math.max(0, Math.min(window.innerWidth - 52, newLeft));
                newTop = Math.max(0, Math.min(window.innerHeight - 52, newTop));
                
                fab.style.left = newLeft + 'px';
                fab.style.top = newTop + 'px';
                
                // Đồng bộ tọa độ tương ứng của widget chính để khi mở lại sẽ ở đúng vị trí
                widgetLeft = newLeft - (320 / 2 - 52 / 2);
                widgetTop = newTop - (80 / 2 - 52 / 2);
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            fab.classList.remove('dragging');
            
            // Nếu không phải là kéo thả thì xem như là click để phóng to widget
            if (!isFabDragging) {
                expandFab();
            }
            setTimeout(() => { isFabDragging = false; }, 50);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    });

    // Lắng nghe di chuyển chuột trên document để drag widget mini mượt mà
    document.addEventListener('mousemove', (e) => {
        if (isWidgetDragging) {
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            
            let newLeft = dragStartLeft + dx;
            let newTop = dragStartTop + dy;
            
            // Giới hạn trong viewport
            newLeft = Math.max(0, Math.min(window.innerWidth - 320, newLeft));
            newTop = Math.max(0, Math.min(window.innerHeight - 80, newTop));
            
            widget.style.left = newLeft + 'px';
            widget.style.top = newTop + 'px';
            
            widgetLeft = newLeft;
            widgetTop = newTop;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isWidgetDragging) {
            isWidgetDragging = false;
            widget.classList.remove('dragging');
        }
    });

    // Thu nhỏ widget mini thành FAB
    miniHideBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.pipWindow) window.pipWindow.close();
        minimizeWidget();
    });

    // Bật cửa sổ nổi luôn trên cùng (Always-on-top PiP)
    miniPipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFloatingWidget();
    });

    function expandFab() {
        fab.style.display = 'none';
        
        if (widgetLeft !== null && widgetTop !== null) {
            widget.style.right = 'auto';
            widget.style.bottom = 'auto';
            widget.style.left = widgetLeft + 'px';
            widget.style.top = widgetTop + 'px';
        }
        
        widget.classList.remove('mini-hiding');
        widget.style.display = 'flex';
        syncMiniWidget();
    }

    function minimizeWidget() {
        const widget = getMiniEl('mini-widget-player');
        widget.classList.add('mini-hiding');
        setTimeout(() => {
            widget.style.display = 'none';
            widget.classList.remove('mini-hiding');
            
            const coverSrc = getMiniEl('mini-cover').src;
            fabCover.src = coverSrc || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop';
            
            // Đặt vị trí FAB ở chính tâm của vị trí widget mini trước đó
            if (widgetLeft !== null && widgetTop !== null) {
                fab.style.right = 'auto';
                fab.style.bottom = 'auto';
                const fabLeft = widgetLeft + (320 / 2 - 52 / 2);
                const fabTop = widgetTop + (80 / 2 - 52 / 2);
                fab.style.left = fabLeft + 'px';
                fab.style.top = fabTop + 'px';
            } else {
                fab.style.left = 'auto';
                fab.style.top = 'auto';
                fab.style.right = '24px';
                fab.style.bottom = '24px';
            }
            
            fab.style.display = 'flex';
        }, 260);
    }
}

// Tự động mở cửa sổ nổi PiP khi phát nhạc (nếu có user gesture)
function autoOpenFloatingWidget() {
    if (!window.pipWindow) {
        const hasUserGesture = !navigator.userActivation || navigator.userActivation.isActive;
        if (hasUserGesture) {
            toggleFloatingWidget().catch(err => {
                console.log("Tự động mở PiP bị chặn hoặc lỗi:", err);
            });
        }
    }
}

// Bật/Tắt cửa sổ nổi của widget ngoài màn hình desktop (Always-on-top OS level)
async function toggleFloatingWidget() {
    if (window.pipWindow) {
        window.pipWindow.close();
        return;
    }
    
    // Nếu trình duyệt hỗ trợ Document PiP API (Chrome/Edge 116+), ta dùng giải pháp tốt nhất này
    if (window.documentPictureInPicture) {
        await enterDocumentPiP();
    } else {
        // Fallback: Sử dụng Canvas PiP truyền phát luồng vẽ thành video PiP (Firefox, Safari)
        await enterCanvasPiP();
    }
}

// Giải pháp Document PiP (Phát triển cửa sổ HTML độc lập nổi trên cùng màn hình)
async function enterDocumentPiP() {
    try {
        const pipWindow = await window.documentPictureInPicture.requestWindow({
            width: 360,
            height: 120
        });
        
        window.pipWindow = pipWindow;
        
        // Sao chép toàn bộ stylesheets, fonts và icons
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
            pipWindow.document.head.appendChild(el.cloneNode(true));
        });
        
        // Cấu hình nền và căn lề cho body của PiP
        pipWindow.document.body.style.background = '#050505';
        pipWindow.document.body.style.margin = '0';
        pipWindow.document.body.style.display = 'flex';
        pipWindow.document.body.style.alignItems = 'center';
        pipWindow.document.body.style.justifyContent = 'center';
        pipWindow.document.body.style.height = '100vh';
        pipWindow.document.body.style.overflow = 'hidden';
        
        // Di chuyển toàn bộ DOM của widget sang cửa sổ PiP
        const widget = document.getElementById('mini-widget-player');
        
        // Lưu lại vị trí cũ để khôi phục
        const oldPosition = widget.style.position;
        const oldBottom = widget.style.bottom;
        const oldRight = widget.style.right;
        const oldLeft = widget.style.left;
        const oldTop = widget.style.top;
        
        // Định dạng lại widget khi ở trong PiP
        widget.style.position = 'static';
        widget.style.margin = '0 auto';
        widget.style.flexShrink = '0';
        widget.style.display = 'flex';
        
        // Bỏ class hiding nếu có
        widget.classList.remove('mini-hiding');
        
        // Ẩn FAB nếu đang hiện
        const fab = document.getElementById('mini-fab');
        if (fab) fab.style.display = 'none';
        
        // Bắt sự kiện khi PiP bị đóng
        pipWindow.addEventListener('pagehide', () => {
            window.pipWindow = null;
            
            // Trả widget về document chính
            document.body.appendChild(widget);
            
            // Khôi phục styles ban đầu
            widget.style.position = oldPosition || 'fixed';
            widget.style.bottom = oldBottom || '24px';
            widget.style.right = oldRight || '24px';
            widget.style.left = oldLeft || 'auto';
            widget.style.top = oldTop || 'auto';
            widget.style.margin = '0';
            
            // Hiện lại widget trên tab chính nếu nhạc vẫn đang phát
            const audio = document.getElementById('main-audio');
            if (audio && !audio.paused) {
                widget.style.display = 'flex';
            } else {
                widget.style.display = 'none';
            }
        });
        
        // Chèn vào document PiP
        pipWindow.document.body.appendChild(widget);
        
    } catch (e) {
        console.error("Lỗi khi mở Document Picture-in-Picture:", e);
        // Chuyển sang Canvas Fallback
        enterCanvasPiP();
    }
}

// Hàm render Lucide offline cho Document PiP bằng cách ánh xạ SVG từ cửa sổ cha
function renderLucideIconsInDocument(doc) {
    if (!window.lucide || !window.lucide.icons) return;
    doc.querySelectorAll('[data-lucide]').forEach(iconEl => {
        const iconName = iconEl.getAttribute('data-lucide');
        const iconDef = window.lucide.icons[iconName];
        if (iconDef) {
            const classes = Array.from(iconEl.classList).join(' ');
            const svgString = iconDef.toSvg({
                class: classes
            });
            iconEl.outerHTML = svgString;
        }
    });
}

// Giải pháp Canvas PiP: Vẽ widget mini lên canvas rồi stream thành video PiP (Cho Firefox/Safari)
async function enterCanvasPiP() {
    const canvas = document.getElementById('pip-canvas');
    const video = document.getElementById('pip-video');
    if (!canvas || !video) return;
    
    const ctx = canvas.getContext('2d');
    
    // Vẽ frame đầu tiên
    drawPiPCanvas(ctx, canvas);
    
    // Đăng ký vòng lặp vẽ ở tốc độ 10 khung hình/giây
    pipInterval = setInterval(() => {
        drawPiPCanvas(ctx, canvas);
    }, 100);
    
    try {
        const stream = canvas.captureStream(10);
        video.srcObject = stream;
        video.muted = true;
        await video.play();
        
        await video.requestPictureInPicture();
        
        video.addEventListener('leavepictureinpicture', () => {
            if (pipInterval) {
                clearInterval(pipInterval);
                pipInterval = null;
            }
            video.srcObject = null;
        });
        
    } catch (err) {
        console.error("Canvas Picture-in-Picture thất bại:", err);
    }
}

function drawPiPCanvas(ctx, canvas) {
    // Vẽ nền
    ctx.fillStyle = '#0c0c14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Vẽ đường viền neon phát sáng ở cạnh trên
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.5, '#00ff88');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, 2);
    
    // Vẽ ảnh bìa bài hát
    const miniCover = document.getElementById('mini-cover');
    if (miniCover && miniCover.complete && miniCover.naturalWidth !== 0) {
        ctx.drawImage(miniCover, 16, 16, 56, 56);
    } else {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(16, 16, 56, 56);
    }
    
    // Vẽ tiêu đề bài hát (rút gọn nếu quá dài)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Inter, system-ui, sans-serif';
    const titleText = document.getElementById('mini-title').textContent || 'Unknown Track';
    ctx.fillText(truncateText(titleText, 25), 88, 38);
    
    // Vẽ nghệ sĩ
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    const artistText = document.getElementById('mini-artist').textContent || 'Unknown Artist';
    ctx.fillText(truncateText(artistText, 28), 88, 56);
    
    // Trạng thái phát nhạc
    const audio = document.getElementById('main-audio');
    const isPlaying = audio && !audio.paused;
    ctx.fillStyle = isPlaying ? '#00ff88' : '#a1a1aa';
    ctx.font = 'bold 9px Inter, system-ui, sans-serif';
    ctx.fillText(isPlaying ? 'PLAYING NOW' : 'PAUSED', 88, 72);
}

function truncateText(str, maxLength) {
    return str.length > maxLength ? str.slice(0, maxLength - 3) + '...' : str;
}

// Thiết lập Media Session API (điều khiển nhạc từ OS/trình duyệt)
function setupMediaSession(track, coverSrc) {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || track.name || 'Unknown Track',
        artist: track.artists || 'Unknown Artist',
        album: track.album || '',
        artwork: [
            { src: coverSrc, sizes: '96x96',  type: 'image/jpeg' },
            { src: coverSrc, sizes: '512x512', type: 'image/jpeg' }
        ]
    });
    
    navigator.mediaSession.playbackState = 'playing';
    
    navigator.mediaSession.setActionHandler('play', () => {
        const audio = document.getElementById('main-audio');
        if (audio) {
            audio.play().then(() => {
                navigator.mediaSession.playbackState = 'playing';
                syncMiniWidget();
            });
        }
    });
    navigator.mediaSession.setActionHandler('pause', () => {
        const audio = document.getElementById('main-audio');
        if (audio) {
            audio.pause();
            navigator.mediaSession.playbackState = 'paused';
            syncMiniWidget();
        }
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
    navigator.mediaSession.setActionHandler('previoustrack', () => prevTrack());
}

// Đóng / ẩn player bar và dừng phát nhạc
function closePlayer() {
    const audio = document.getElementById('main-audio');
    const playerBar = document.getElementById('player-bar');
    
    if (audio) {
        audio.pause();
        audio.src = '';
    }
    
    if (playerBar) playerBar.style.display = 'none';
    
    // Đóng cửa sổ nổi PiP nếu đang mở
    if (window.pipWindow) {
        window.pipWindow.close();
    }
    
    // Hiện mini widget khi close player bar (nếu đang có bài)
    // (đã ẩn player, user có thể dùng mini widget)
    // Nếu không muốn mini widget, ẩn luôn:
    hideMiniWidget();
    
    currentIndex = -1;
    updateActiveTrackHighlight();
}

// Bật/Tắt Playback
function togglePlayPause() {
    const audio = document.getElementById('main-audio');
    const playBtn = document.getElementById('player-btn-play');
    const playerCover = document.getElementById('player-cover');
    
    if (!audio || !playBtn) return;
    
    if (audio.paused) {
        audio.play().then(() => {
            playBtn.innerHTML = '<i data-lucide="pause"></i>';
            playerCover.classList.add('playing');
            updateActiveTrackHighlight();
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
            syncMiniWidget();
            if (window.lucide) window.lucide.createIcons();

            // Tự động mở cửa sổ nổi (PiP) nếu có tương tác người dùng
            autoOpenFloatingWidget();
        }).catch(err => {
            console.error("Không thể tiếp tục phát:", err);
        });
    } else {
        audio.pause();
        playBtn.innerHTML = '<i data-lucide="play"></i>';
        playerCover.classList.remove('playing');
        updateActiveTrackHighlight();
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
        syncMiniWidget();
        if (window.lucide) window.lucide.createIcons();
    }
}

// Chuyển bài kế tiếp
function nextTrack() {
    if (currentPlaylist.length === 0) return;
    currentIndex = (currentIndex + 1) % currentPlaylist.length;
    playTrack(currentPlaylist[currentIndex], currentPlaylist);
}

// Quay lại bài trước
function prevTrack() {
    if (currentPlaylist.length === 0) return;
    currentIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    playTrack(currentPlaylist[currentIndex], currentPlaylist);
}

// Đồng bộ làm nổi bật bài hát đang chạy
function updateActiveTrackHighlight() {
    document.querySelectorAll('.track-row').forEach(row => {
        row.classList.remove('playing');
        const btn = row.querySelector('.play-row-btn');
        if (btn) {
            btn.innerHTML = '<i data-lucide="play"></i>';
        }
    });
    
    if (currentIndex === -1 || !currentPlaylist[currentIndex]) return;
    const activeTrack = currentPlaylist[currentIndex];
    
    // Nổi bật toàn bộ các hàng có id khớp ở Library & AI Search
    const activeRows = document.querySelectorAll(`.track-row[data-track-id="${activeTrack.id}"]`);
    activeRows.forEach(row => {
        row.classList.add('playing');
        const btn = row.querySelector('.play-row-btn');
        const audio = document.getElementById('main-audio');
        if (btn && audio) {
            btn.innerHTML = audio.paused ? '<i data-lucide="play"></i>' : '<i data-lucide="pause"></i>';
        }
    });
    
    if (window.lucide) window.lucide.createIcons();
}

// Cập nhật biểu tượng âm lượng
function updateVolumeIcon(volume) {
    const icon = document.getElementById('volume-icon');
    if (!icon) return;
    
    let iconName = 'volume-2';
    if (volume === 0 || isMuted) {
        iconName = 'volume-x';
    } else if (volume < 0.3) {
        iconName = 'volume';
    } else if (volume < 0.7) {
        iconName = 'volume-1';
    }
    
    icon.setAttribute('data-lucide', iconName);
    if (window.lucide) window.lucide.createIcons();
}

// Hàm khởi tạo toàn bộ ứng dụng
function init() {
    // 1. Trích xuất token nếu có từ redirect URL
    handleTokenAuthentication();
    
    // 2. Kiểm tra và nạp giao diện theo trạng thái đăng nhập
    checkLoginState();
    
    // 3. Khởi tạo sự kiện các nút điều khiển trên sidebar/giao diện
    document.getElementById('nav-discover').addEventListener('click', (e) => {
        e.preventDefault();
        const token = localStorage.getItem('spotify_token');
        if (token) {
            document.getElementById('playlists-section').style.display = 'block';
            document.getElementById('tracks-section').style.display = 'none';
            document.getElementById('search-section').style.display = 'none';
            document.getElementById('direct-search-section').style.display = 'none';
            
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.getElementById('nav-discover').classList.add('active');
        } else {
            // Chưa đăng nhập thì hiển thị lại login screen
            document.getElementById('login-container').style.display = 'flex';
            document.getElementById('playlists-section').style.display = 'none';
            document.getElementById('tracks-section').style.display = 'none';
            document.getElementById('search-section').style.display = 'none';
            document.getElementById('direct-search-section').style.display = 'none';
            
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.getElementById('nav-discover').classList.add('active');
        }
    });
    
    document.getElementById('nav-playlists').addEventListener('click', (e) => {
        e.preventDefault();
        const token = localStorage.getItem('spotify_token');
        if (token) {
            document.getElementById('playlists-section').style.display = 'block';
            document.getElementById('tracks-section').style.display = 'none';
            document.getElementById('search-section').style.display = 'none';
            document.getElementById('direct-search-section').style.display = 'none';
            
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.getElementById('nav-playlists').classList.add('active');
        } else {
            // Chưa đăng nhập thì hiển thị lại login screen
            document.getElementById('login-container').style.display = 'flex';
            document.getElementById('playlists-section').style.display = 'none';
            document.getElementById('tracks-section').style.display = 'none';
            document.getElementById('search-section').style.display = 'none';
            document.getElementById('direct-search-section').style.display = 'none';
            
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.getElementById('nav-playlists').classList.add('active');
        }
    });

    // Lắng nghe click menu YT Search
    document.getElementById('nav-direct').addEventListener('click', (e) => {
        e.preventDefault();
        switchToYTSearch();
    });

    // Lắng nghe click menu Library cá nhân
    document.getElementById('nav-library').addEventListener('click', (e) => {
        e.preventDefault();
        
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('playlists-section').style.display = 'none';
        document.getElementById('tracks-section').style.display = 'none';
        document.getElementById('search-section').style.display = 'none';
        document.getElementById('direct-search-section').style.display = 'none';
        
        const librarySection = document.getElementById('library-section');
        if (librarySection) librarySection.style.display = 'block';
        
        // Cập nhật class active trên menu
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.getElementById('nav-library').classList.add('active');
        
        loadLibrary();
    });
    
    document.getElementById('nav-downloads-menu').addEventListener('click', (e) => {
        e.preventDefault();
        toggleDownloadPanel(true);
    });
    
    document.getElementById('btn-close-download-panel').addEventListener('click', () => {
        toggleDownloadPanel(false);
    });
    
    document.getElementById('btn-back-playlists').addEventListener('click', () => {
        document.getElementById('playlists-section').style.display = 'block';
        document.getElementById('tracks-section').style.display = 'none';
        document.getElementById('search-section').style.display = 'none';
        document.getElementById('direct-search-section').style.display = 'none';
    });
    
    document.getElementById('btn-back-from-search').addEventListener('click', () => {
        document.getElementById('search-section').style.display = 'none';
        document.getElementById(lastActiveSection).style.display = 'block';
    });
    
    document.getElementById('btn-logout').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    // Sự kiện thanh tìm kiếm ngữ nghĩa AI
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value;
            if (query.trim()) {
                performAISearch(query);
            }
        }
    });

    // Sự kiện tìm kiếm video YouTube trực tiếp
    document.getElementById('btn-yt-search').addEventListener('click', performYTSearch);
    document.getElementById('yt-search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performYTSearch();
        }
    });

    // ==========================================================================
    // KHỞI TẠO SỰ KIỆN TRÌNH PHÁT NHẠC CỤ BỘ (HTML5 Audio Player Events Setup)
    // ==========================================================================
    const audio = document.getElementById('main-audio');
    if (audio) {
        audio.addEventListener('timeupdate', () => {
            const progressFill = document.getElementById('player-progress-fill');
            const timeCurrent = document.getElementById('player-time-current');
            
            if (audio.duration) {
                const percent = (audio.currentTime / audio.duration) * 100;
                if (progressFill) progressFill.style.width = `${percent}%`;
                if (timeCurrent) timeCurrent.textContent = formatTime(audio.currentTime);
            }
        });
        
        audio.addEventListener('loadedmetadata', () => {
            const timeTotal = document.getElementById('player-time-total');
            if (timeTotal) timeTotal.textContent = formatTime(audio.duration);
        });
        
        audio.addEventListener('ended', () => {
            nextTrack();
        });
    }
    
    // Sự kiện kéo tua nhạc trên Player Bar progress bar
    const progressContainer = document.getElementById('player-progress-container');
    if (progressContainer) {
        progressContainer.addEventListener('click', (e) => {
            const audio = document.getElementById('main-audio');
            if (audio && audio.duration) {
                const rect = progressContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const width = rect.width;
                const percentage = clickX / width;
                audio.currentTime = percentage * audio.duration;
            }
        });
    }
    
    // Các nút bấm điều khiển nhạc
    const playBtn = document.getElementById('player-btn-play');
    if (playBtn) playBtn.addEventListener('click', togglePlayPause);
    
    const prevBtn = document.getElementById('player-btn-prev');
    if (prevBtn) prevBtn.addEventListener('click', prevTrack);
    
    const nextBtn = document.getElementById('player-btn-next');
    if (nextBtn) nextBtn.addEventListener('click', nextTrack);
    
    // Sự kiện Volume Control
    const volumeContainer = document.getElementById('volume-container');
    if (volumeContainer) {
        volumeContainer.addEventListener('click', (e) => {
            const audio = document.getElementById('main-audio');
            const volumeFill = document.getElementById('volume-fill');
            if (audio) {
                const rect = volumeContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const width = rect.width;
                let percentage = clickX / width;
                
                percentage = Math.max(0, Math.min(1, percentage));
                savedVolume = percentage;
                isMuted = false;
                audio.volume = savedVolume;
                
                if (volumeFill) volumeFill.style.width = `${percentage * 100}%`;
                updateVolumeIcon(percentage);
            }
        });
    }
    
    const muteBtn = document.getElementById('player-btn-mute');
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            const audio = document.getElementById('main-audio');
            const volumeFill = document.getElementById('volume-fill');
            if (audio) {
                isMuted = !isMuted;
                audio.volume = isMuted ? 0 : savedVolume;
                if (volumeFill) volumeFill.style.width = isMuted ? '0%' : `${savedVolume * 100}%`;
                updateVolumeIcon(isMuted ? 0 : savedVolume);
            }
        });
    }

    // ── Nút đóng Player Bar ──────────────────────────────────────────────────
    const playerCloseBtn = document.getElementById('player-close-btn');
    if (playerCloseBtn) {
        playerCloseBtn.addEventListener('click', closePlayer);
    }

    // ── Mini Widget buttons ──────────────────────────────────────────────────
    const miniPlay = document.getElementById('mini-play');
    if (miniPlay) {
        miniPlay.addEventListener('click', () => {
            togglePlayPause();
        });
    }

    const miniPrev = document.getElementById('mini-prev');
    if (miniPrev) {
        miniPrev.addEventListener('click', () => prevTrack());
    }

    const miniNext = document.getElementById('mini-next');
    if (miniNext) {
        miniNext.addEventListener('click', () => nextTrack());
    }

    const miniClose = document.getElementById('mini-close');
    if (miniClose) {
        miniClose.addEventListener('click', () => {
            if (window.pipWindow) window.pipWindow.close();
            hideMiniWidget();
            // Re-show the player bar if audio is still playing
            const audio = document.getElementById('main-audio');
            const playerBar = document.getElementById('player-bar');
            if (audio && !audio.paused && playerBar) {
                playerBar.style.display = 'flex';
            }
        });
    }

    // ── Khởi tạo kéo thả và tính năng mở rộng/thu nhỏ của widget mini ───────
    setupMiniWidgetInteractivity();
}


// Khởi chạy an toàn tùy thuộc vào trạng thái tải của DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

