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

    miniHideBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (state.pipWindow) state.pipWindow.close();
        minimizeWidget();
    });

    miniPipBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        audioPlayer.toggleFloatingWidget();
    });

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
