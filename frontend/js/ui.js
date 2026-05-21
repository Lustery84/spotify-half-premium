import { state, getMiniEl } from './state.js';
import { createIcons } from './utils.js';
import { audioPlayer } from './player.js';
import { fetchPlaylistTracks } from './api.js';

export function renderPlaylists(playlists) {
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
    createIcons();
}

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
        state.lastActiveSection = 'playlists-section';
        viewPlaylistTracks(playlist);
    });
    
    return card;
}

export function viewPlaylistTracks(playlist) {
    document.getElementById('playlists-section').style.display = 'none';
    document.getElementById('search-section').style.display = 'none';
    const tracksSection = document.getElementById('tracks-section');
    tracksSection.style.display = 'block';
    
    document.getElementById('playlist-detail-cover').src = playlist.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=400&fit=crop';
    document.getElementById('playlist-detail-title').textContent = playlist.name;
    document.getElementById('playlist-detail-meta').textContent = `${playlist.total_tracks} Tracks • By ${playlist.owner}`;
    
    const container = document.getElementById('tracks-container');
    container.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-secondary);">Loading tracks...</td></tr>';
    
    const btnDownloadAll = document.getElementById('btn-download-all');
    btnDownloadAll.onclick = () => {
        downloadAllTracks();
    };

    fetchPlaylistTracks(playlist);
}

export function renderTracks(tracks) {
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
        const trackKey = `${track.name}__${track.artists}`.toLowerCase();
        const isDownloaded = state.downloadedTracks.has(trackKey);
        
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
    createIcons();
}

export function renderSearchResults(results) {
    const container = document.getElementById('search-results-container');
    container.innerHTML = '';
    
    if (!results || results.length === 0) {
        container.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 3rem; color: var(--text-secondary);"><i data-lucide="info" style="margin-bottom: 0.5rem;"></i> Không tìm thấy bài hát đã tải nào khớp với mô tả. Bạn cần tải nhạc về trước khi AI có thể tìm kiếm!</td></tr>';
        createIcons();
        return;
    }
    
    results.forEach((track) => {
        const row = document.createElement('tr');
        row.className = 'track-row';
        row.dataset.trackId = track.id;
        
        if (state.currentIndex !== -1 && state.currentPlaylist[state.currentIndex] && state.currentPlaylist[state.currentIndex].id === track.id) {
            row.classList.add('playing');
        }
        
        const coverUrl = track.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop';
        
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
        
        if (state.currentIndex !== -1 && state.currentPlaylist[state.currentIndex] && state.currentPlaylist[state.currentIndex].id === track.id) {
            const btn = row.querySelector('.play-row-btn');
            const audio = document.getElementById('main-audio');
            if (btn) {
                btn.innerHTML = audio && !audio.paused ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
            }
        }
        
        const handlePlay = (e) => {
            e.stopPropagation();
            if (state.currentIndex !== -1 && state.currentPlaylist[state.currentIndex] && state.currentPlaylist[state.currentIndex].id === track.id) {
                audioPlayer.togglePlayPause();
            } else {
                audioPlayer.playTrack(track, results);
            }
        };
        
        row.addEventListener('click', handlePlay);
        row.querySelector('.play-row-btn').addEventListener('click', handlePlay);
        
        container.appendChild(row);
    });
    createIcons();
}

export function triggerSingleDownload(track) {
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
                
                const trackKey = `${track.name}__${track.artists}`.toLowerCase();
                state.downloadedTracks.add(trackKey);
                
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
                                createIcons();
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

export function downloadAllTracks() {
    if (state.currentTracks.length === 0) return;
    const confirmDownload = confirm(`Bạn có muốn tải toàn bộ ${state.currentTracks.length} bài hát trong playlist này không? Chúng sẽ được xếp vào danh sách hàng đợi.`);
    if (!confirmDownload) return;
    
    state.currentTracks.forEach(track => {
        triggerSingleDownload(track);
    });
}

export function updateActiveQueueCount(change) {
    state.activeQueueCount += change;
    if (state.activeQueueCount < 0) state.activeQueueCount = 0;
    
    const badge = document.getElementById('queue-badge');
    if (state.activeQueueCount > 0) {
        badge.style.display = 'block';
        badge.textContent = state.activeQueueCount;
    } else {
        badge.style.display = 'none';
    }
}

export function toggleDownloadPanel(show) {
    const panel = document.getElementById('download-panel');
    if (show === true) {
        panel.classList.add('open');
    } else if (show === false) {
        panel.classList.remove('open');
    } else {
        panel.classList.toggle('open');
    }
}

export function switchToYTSearch() {
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('playlists-section').style.display = 'none';
    document.getElementById('tracks-section').style.display = 'none';
    document.getElementById('search-section').style.display = 'none';
    document.getElementById('direct-search-section').style.display = 'block';
    
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.getElementById('nav-direct').classList.add('active');
}

export function renderYTResults(results) {
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
            
            if (title.includes(" - ")) {
                const parts = title.split(" - ");
                artist = parts[0].trim();
                title = parts.slice(1).join(" - ").trim();
            }
            
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
    createIcons();
}

export function renderLibraryTracks(tracks) {
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
        createIcons();
        return;
    }
    
    tracks.forEach((track, index) => {
        const row = document.createElement('tr');
        row.className = 'track-row';
        row.dataset.trackId = track.id;
        
        if (state.currentIndex !== -1 && state.currentPlaylist[state.currentIndex] && state.currentPlaylist[state.currentIndex].id === track.id) {
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
        
        if (state.currentIndex !== -1 && state.currentPlaylist[state.currentIndex] && state.currentPlaylist[state.currentIndex].id === track.id) {
            const btn = row.querySelector('.play-row-btn');
            const audio = document.getElementById('main-audio');
            if (btn) {
                btn.innerHTML = audio && !audio.paused ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
            }
        }
        
        const handlePlay = (e) => {
            e.stopPropagation();
            if (state.currentIndex !== -1 && state.currentPlaylist[state.currentIndex] && state.currentPlaylist[state.currentIndex].id === track.id) {
                audioPlayer.togglePlayPause();
            } else {
                audioPlayer.playTrack(track, tracks);
            }
        };
        
        row.addEventListener('click', handlePlay);
        row.querySelector('.play-row-btn').addEventListener('click', handlePlay);
        
        container.appendChild(row);
    });
    createIcons();
}

export function updateActiveTrackHighlight() {
    document.querySelectorAll('.track-row').forEach(row => {
        row.classList.remove('playing');
        const btn = row.querySelector('.play-row-btn');
        if (btn) {
            btn.innerHTML = '<i data-lucide="play"></i>';
        }
    });
    
    if (state.currentIndex === -1 || !state.currentPlaylist[state.currentIndex]) return;
    const activeTrack = state.currentPlaylist[state.currentIndex];
    
    const activeRows = document.querySelectorAll(`.track-row[data-track-id="${activeTrack.id}"]`);
    activeRows.forEach(row => {
        row.classList.add('playing');
        const btn = row.querySelector('.play-row-btn');
        const audio = document.getElementById('main-audio');
        if (btn && audio) {
            btn.innerHTML = audio.paused ? '<i data-lucide="play"></i>' : '<i data-lucide="pause"></i>';
        }
    });
    createIcons();
}

export function updateVolumeIcon(volume) {
    const icon = document.getElementById('volume-icon');
    if (!icon) return;
    
    let iconName = 'volume-2';
    if (volume === 0 || state.isMuted) {
        iconName = 'volume-x';
    } else if (volume < 0.3) {
        iconName = 'volume';
    } else if (volume < 0.7) {
        iconName = 'volume-1';
    }
    
    icon.setAttribute('data-lucide', iconName);
    createIcons();
}
