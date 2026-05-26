import { state } from './state.js';
import { formatTime } from './utils.js';
import { loadPlaylists, performAISearch, performYTSearchApi, loadLibrary } from './api.js';
import { audioPlayer } from './player.js';
import { toggleDownloadPanel, switchToYTSearch, updateVolumeIcon } from './ui.js';

function handleTokenAuthentication() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
        localStorage.setItem('spotify_token', token);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

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

export function logout() {
    localStorage.removeItem('spotify_token');
    checkLoginState();
}

function setupMiniWidgetInteractivity() {
    const widget = document.getElementById('mini-widget-player');
    const fab = document.getElementById('mini-fab');
    const fabCover = document.getElementById('mini-fab-cover');
    const miniHideBtn = document.getElementById('mini-hide');
    const miniPipBtn = document.getElementById('mini-pip');

    let dragStartX = 0, dragStartY = 0, dragStartLeft = 0, dragStartTop = 0;

    widget.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || state.pipWindow) return;
        if (e.target.closest('.mini-controls') || e.target.closest('.mini-btn')) return;
        
        state.isWidgetDragging = true;
        widget.classList.add('dragging');
        
        const rect = widget.getBoundingClientRect();
        dragStartLeft = rect.left;
        dragStartTop = rect.top;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        
        widget.style.right = 'auto';
        widget.style.bottom = 'auto';
        widget.style.left = dragStartLeft + 'px';
        widget.style.top = dragStartTop + 'px';
        e.preventDefault();
    });

    let fabStartX = 0, fabStartY = 0, fabStartLeft = 0, fabStartTop = 0;

    fab.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        state.isFabDragging = false;
        
        fabStartX = e.clientX;
        fabStartY = e.clientY;
        
        const rect = fab.getBoundingClientRect();
        fabStartLeft = rect.left;
        fabStartTop = rect.top;
        
        const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - fabStartX;
            const dy = moveEvent.clientY - fabStartY;
            
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                state.isFabDragging = true;
                fab.classList.add('dragging');
                fab.style.right = 'auto';
                fab.style.bottom = 'auto';
                
                let newLeft = Math.max(0, Math.min(window.innerWidth - 52, fabStartLeft + dx));
                let newTop = Math.max(0, Math.min(window.innerHeight - 52, fabStartTop + dy));
                
                fab.style.left = newLeft + 'px';
                fab.style.top = newTop + 'px';
                
                state.widgetLeft = newLeft - (320 / 2 - 52 / 2);
                state.widgetTop = newTop - (80 / 2 - 52 / 2);
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            fab.classList.remove('dragging');
            
            if (!state.isMuted) {
                updateVolumeIcon(audioPlayer.audio.volume);
            }
            
            if (!state.isFabDragging) {
                expandFab();
            }
            setTimeout(() => { state.isFabDragging = false; }, 50);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (state.isWidgetDragging) {
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            
            let newLeft = Math.max(0, Math.min(window.innerWidth - 320, dragStartLeft + dx));
            let newTop = Math.max(0, Math.min(window.innerHeight - 80, dragStartTop + dy));
            
            widget.style.left = newLeft + 'px';
            widget.style.top = newTop + 'px';
            
            state.widgetLeft = newLeft;
            state.widgetTop = newTop;
        }
    });

    document.addEventListener('mouseup', () => {
        if (state.isWidgetDragging) {
            state.isWidgetDragging = false;
            widget.classList.remove('dragging');
        }
    });

    if (miniHideBtn) {
        miniHideBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (state.pipWindow) state.pipWindow.close();
            minimizeWidget();
        });
    }

    if (miniPipBtn) {
        miniPipBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            audioPlayer.toggleFloatingWidget();
        });
    }

    function expandFab() {
        fab.style.display = 'none';
        if (state.widgetLeft !== null && state.widgetTop !== null) {
            widget.style.right = 'auto';
            widget.style.bottom = 'auto';
            widget.style.left = state.widgetLeft + 'px';
            widget.style.top = state.widgetTop + 'px';
        }
        widget.classList.remove('mini-hiding');
        widget.style.display = 'flex';
        audioPlayer.syncMiniWidget();
    }

    function minimizeWidget() {
        widget.classList.add('mini-hiding');
        setTimeout(() => {
            widget.style.display = 'none';
            widget.classList.remove('mini-hiding');
            
            const miniCover = document.getElementById('mini-cover');
            fabCover.src = miniCover ? miniCover.src : 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop';
            
            if (state.widgetLeft !== null && state.widgetTop !== null) {
                fab.style.right = 'auto';
                fab.style.bottom = 'auto';
                fab.style.left = (state.widgetLeft + (320 / 2 - 52 / 2)) + 'px';
                fab.style.top = (state.widgetTop + (80 / 2 - 52 / 2)) + 'px';
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

function init() {
    const ytInput = document.getElementById('yt-search-input');
    const suggestBox = document.getElementById('yt-suggest-box');
    let suggestTimeout = null;

// Lắng nghe sự kiện người dùng gõ phím
ytInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    // Nếu xóa hết chữ, ẩn hộp gợi ý
    if (!query) {
        suggestBox.style.display = 'none';
        return;
    }

    // Debounce: Xóa timeout cũ nếu người dùng gõ tiếp
    clearTimeout(suggestTimeout);
    
    // Set timeout mới (đợi 300ms)
    suggestTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`/api/yt-suggest?query=${encodeURIComponent(query)}`);
            const result = await res.json();
            
            if (result.status === 'Success' && result.data.length > 0) {
                suggestBox.innerHTML = ''; // Xóa gợi ý cũ
                
                result.data.forEach(text => {
                    const item = document.createElement('div');
                    item.textContent = text;
                    item.style.cssText = 'padding: 0.75rem 1rem; cursor: pointer; color: var(--text-primary); transition: all 0.2s; border-bottom: 1px solid rgba(255,255,255,0.02);';
                    
                    // Hover effect
                    item.addEventListener('mouseenter', () => item.style.background = 'var(--surface-hover)');
                    item.addEventListener('mouseleave', () => item.style.background = 'transparent');
                    
                    // Click vào gợi ý
                    item.addEventListener('click', () => {
                        ytInput.value = text;
                        suggestBox.style.display = 'none';
                        document.getElementById('btn-yt-search').click(); // Tự động tìm
                    });
                    
                    suggestBox.appendChild(item);
                });
                suggestBox.style.display = 'block';
            } else {
                suggestBox.style.display = 'none';
            }
        } catch (error) {
            console.error("Lỗi lấy gợi ý:", error);
        }
    }, 300); // Đợi 300ms
});

// Ẩn hộp gợi ý khi click ra ngoài ô input
document.addEventListener('click', (e) => {
    if (!ytInput.contains(e.target) && !suggestBox.contains(e.target)) {
        suggestBox.style.display = 'none';
    }
});
    handleTokenAuthentication();
    checkLoginState();
    
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
            document.getElementById('login-container').style.display = 'flex';
            document.getElementById('playlists-section').style.display = 'none';
            document.getElementById('tracks-section').style.display = 'none';
            document.getElementById('search-section').style.display = 'none';
            document.getElementById('direct-search-section').style.display = 'none';
            
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.getElementById('nav-playlists').classList.add('active');
        }
    });

    document.getElementById('nav-direct').addEventListener('click', (e) => {
        e.preventDefault();
        switchToYTSearch();
    });

    document.getElementById('nav-library').addEventListener('click', (e) => {
        e.preventDefault();
        
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('playlists-section').style.display = 'none';
        document.getElementById('tracks-section').style.display = 'none';
        document.getElementById('search-section').style.display = 'none';
        document.getElementById('direct-search-section').style.display = 'none';
        
        const librarySection = document.getElementById('library-section');
        if (librarySection) librarySection.style.display = 'block';
        
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.getElementById('nav-library').classList.add('active');
        
        loadLibrary();
    });
    
    document.getElementById('nav-local-playlists').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('playlists-section').style.display = 'none';
        document.getElementById('tracks-section').style.display = 'none';
        document.getElementById('search-section').style.display = 'none';
        document.getElementById('direct-search-section').style.display = 'none';
        document.getElementById('library-section').style.display = 'none';
        document.getElementById('local-playlist-detail-section').style.display = 'none';
        
        const localSection = document.getElementById('local-playlists-section');
        if (localSection) localSection.style.display = 'block';
        
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.getElementById('nav-local-playlists').classList.add('active');
        
        loadLocalPlaylists();
    });

    const createModal = document.getElementById('create-playlist-modal');
    const createInput = document.getElementById('new-playlist-name-input');
    const createSubmit = document.getElementById('btn-submit-create-playlist');
    const createCloseBtn = document.getElementById('btn-close-create-modal');

    document.getElementById('btn-create-local-playlist').addEventListener('click', () => {
        createInput.value = '';
        createModal.style.display = 'flex';
        createInput.focus();
    });
    
    createCloseBtn.addEventListener('click', () => {
        createModal.style.display = 'none';
    });
    
    const submitCreatePlaylist = async () => {
        const name = createInput.value.trim();
        if (name) {
            import('./api.js').then(async a => {
                const res = await a.createLocalPlaylist(name);
                if (res.status === 'Success') {
                    createModal.style.display = 'none';
                    loadLocalPlaylists();
                    showToast("Tạo Playlist thành công!");
                } else {
                    showToast("Lỗi: " + res.message, true);
                }
            });
        }
    };
    
    createSubmit.addEventListener('click', submitCreatePlaylist);
    createInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitCreatePlaylist();
    });

    document.getElementById('btn-back-local-playlists').addEventListener('click', () => {
        document.getElementById('local-playlist-detail-section').style.display = 'none';
        document.getElementById('local-playlists-section').style.display = 'block';
    });

    document.getElementById('btn-close-modal').addEventListener('click', () => {
        document.getElementById('add-to-playlist-modal').style.display = 'none';
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
        document.getElementById(state.lastActiveSection).style.display = 'block';
    });
    
    document.getElementById('btn-logout').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value;
            if (query.trim()) {
                performAISearch(query);
            }
        }
    });

    document.getElementById('btn-yt-search').addEventListener('click', () => {
        const input = document.getElementById('yt-search-input');
        performYTSearchApi(input.value.trim());
    });
    document.getElementById('yt-search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performYTSearchApi(e.target.value.trim());
        }
    });

    // Player events
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
            audioPlayer.nextTrack();
        });
    }
    
    const progressContainer = document.getElementById('player-progress-container');
    if (progressContainer) {
        progressContainer.addEventListener('click', (e) => {
            if (audio && audio.duration) {
                const rect = progressContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const width = rect.width;
                const percentage = clickX / width;
                audio.currentTime = percentage * audio.duration;
            }
        });
    }
    
    const playBtn = document.getElementById('player-btn-play');
    if (playBtn) playBtn.addEventListener('click', () => audioPlayer.togglePlayPause());
    
    const prevBtn = document.getElementById('player-btn-prev');
    if (prevBtn) prevBtn.addEventListener('click', () => audioPlayer.prevTrack());
    
    const nextBtn = document.getElementById('player-btn-next');
    if (nextBtn) nextBtn.addEventListener('click', () => audioPlayer.nextTrack());
    
    const volumeContainer = document.getElementById('volume-container');
    if (volumeContainer) {
        volumeContainer.addEventListener('click', (e) => {
            const volumeFill = document.getElementById('volume-fill');
            if (audio) {
                const rect = volumeContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const width = rect.width;
                let percentage = clickX / width;
                
                percentage = Math.max(0, Math.min(1, percentage));
                state.savedVolume = percentage;
                state.isMuted = false;
                audio.volume = state.savedVolume;
                
                if (volumeFill) volumeFill.style.width = `${percentage * 100}%`;
                updateVolumeIcon(percentage);
            }
        });
    }
    
    const muteBtn = document.getElementById('player-btn-mute');
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            const volumeFill = document.getElementById('volume-fill');
            if (audio) {
                state.isMuted = !state.isMuted;
                audio.volume = state.isMuted ? 0 : state.savedVolume;
                if (volumeFill) volumeFill.style.width = state.isMuted ? '0%' : `${state.savedVolume * 100}%`;
                updateVolumeIcon(state.isMuted ? 0 : state.savedVolume);
            }
        });
    }

    const playerCloseBtn = document.getElementById('player-close-btn');
    if (playerCloseBtn) {
        playerCloseBtn.addEventListener('click', () => audioPlayer.closePlayer());
    }

    const miniPlay = document.getElementById('mini-play');
    if (miniPlay) {
        miniPlay.addEventListener('click', () => audioPlayer.togglePlayPause());
    }

    const miniPrev = document.getElementById('mini-prev');
    if (miniPrev) {
        miniPrev.addEventListener('click', () => audioPlayer.prevTrack());
    }

    const miniNext = document.getElementById('mini-next');
    if (miniNext) {
        miniNext.addEventListener('click', () => audioPlayer.nextTrack());
    }

    const miniClose = document.getElementById('mini-close');
    if (miniClose) {
        miniClose.addEventListener('click', () => {
            if (state.pipWindow) state.pipWindow.close();
            audioPlayer.hideMiniWidget();
            const playerBar = document.getElementById('player-bar');
            if (audio && !audio.paused && playerBar) {
                playerBar.style.display = 'flex';
            }
        });
    }

    setupMiniWidgetInteractivity();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export async function loadLocalPlaylists() {
    import('./api.js').then(async a => {
        try {
            const res = await a.getLocalPlaylists();
            if (res.status === 'Success') {
                import('./ui.js').then(u => u.renderLocalPlaylists(res.data));
            } else {
                showToast("Lỗi tải playlist: " + res.message, true);
            }
        } catch (err) {
            showToast("Lỗi gọi API: " + err.message, true);
        }
    }).catch(err => showToast("Lỗi import api.js: " + err.message, true));
}

export function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${isError ? '#ff5555' : 'var(--accent-color)'};
        color: ${isError ? '#fff' : '#000'};
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        z-index: 10000;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    });
    
    // Animate out
    setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export async function viewLocalPlaylistDetail(playlistId) {
    document.getElementById('local-playlists-section').style.display = 'none';
    document.getElementById('local-playlist-detail-section').style.display = 'block';
    
    document.getElementById('btn-delete-local-playlist').onclick = async () => {
        if (confirm("Bạn có chắc chắn muốn xóa Playlist này?")) {
            const api = await import('./api.js');
            const res = await api.deleteLocalPlaylist(playlistId);
            if (res.status === 'Success') {
                document.getElementById('btn-back-local-playlists').click();
                loadLocalPlaylists();
            } else {
                alert("Lỗi: " + res.message);
            }
        }
    };
    
    import('./api.js').then(async a => {
        const res = await a.getLocalPlaylistDetails(playlistId);
        if (res.status === 'Success') {
            const pl = res.data;
            document.getElementById('local-playlist-detail-title').textContent = pl.name;
            document.getElementById('local-playlist-detail-meta').textContent = `${pl.tracks.length} Tracks`;
            import('./ui.js').then(u => u.renderLocalPlaylistTracks(pl, pl.track_details));
        }
    });
}

export async function removeTrackFromPlaylistUI(playlistId, trackId) {
    const api = await import('./api.js');
    const res = await api.removeTrackFromPlaylist(playlistId, trackId);
    if (res.status === 'Success') {
        viewLocalPlaylistDetail(playlistId); // reload
        showToast("Đã xóa bài hát khỏi Playlist");
    } else {
        showToast("Lỗi: " + res.message, true);
    }
}

export async function openAddToPlaylistModal(track) {
    const modal = document.getElementById('add-to-playlist-modal');
    const listContainer = document.getElementById('modal-playlist-list');
    listContainer.innerHTML = '<div style="text-align: center; padding: 1rem;"><i data-lucide="loader" class="spin"></i></div>';
    if (window.lucide) window.lucide.createIcons();
    modal.style.display = 'flex';
    
    const api = await import('./api.js');
    const res = await api.getLocalPlaylists();
    listContainer.innerHTML = '';
    
    if (res.status === 'Success') {
        const playlists = res.data;
        if (playlists.length === 0) {
            listContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">Chưa có Playlist nào. Hãy tạo một Playlist mới!</div>';
        } else {
            playlists.forEach(pl => {
                const btn = document.createElement('button');
                btn.style.cssText = 'padding: 0.8rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; cursor: pointer; text-align: left; transition: all 0.2s; margin-bottom: 0.5rem;';
                btn.textContent = pl.name;
                btn.onmouseenter = () => btn.style.background = 'rgba(255,255,255,0.1)';
                btn.onmouseleave = () => btn.style.background = 'rgba(255,255,255,0.05)';
                btn.onclick = async () => {
                    const addRes = await api.addTrackToLocalPlaylist(pl.id, track.id);
                    if (addRes.status === 'Success') {
                        modal.style.display = 'none';
                        showToast(`Đã thêm vào ${pl.name}`);
                    } else {
                        showToast("Lỗi: " + addRes.message, true);
                    }
                };
                listContainer.appendChild(btn);
            });
        }
    }
}

