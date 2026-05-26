import { state, getMiniEl } from './state.js';
import { formatTime, truncateText, createIcons } from './utils.js';

function getIpc() {
    if (typeof window !== 'undefined') {
        if (window.ipcRenderer) return window.ipcRenderer;
        if (window.require) {
            try {
                return window.require('electron').ipcRenderer;
            } catch (e) {}
        }
    }
    return null;
}

export function setupMediaSession(track, coverSrc, audioPlayerObj) {
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
                audioPlayerObj.syncMiniWidget();
            });
        }
    });
    navigator.mediaSession.setActionHandler('pause', () => {
        const audio = document.getElementById('main-audio');
        if (audio) {
            audio.pause();
            navigator.mediaSession.playbackState = 'paused';
            audioPlayerObj.syncMiniWidget();
        }
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => audioPlayerObj.nextTrack());
    navigator.mediaSession.setActionHandler('previoustrack', () => audioPlayerObj.prevTrack());
}

export const audioPlayer = {
    playTrack: function(track, queueList = []) {
        const audio = document.getElementById('main-audio');
        const playerBar = document.getElementById('player-bar');
        const playerCover = document.getElementById('player-cover');
        const playerTitle = document.getElementById('player-title');
        const playerArtist = document.getElementById('player-artist');
        const playBtn = document.getElementById('player-btn-play');
        
        if (!audio || !playerBar) return;
        
        state.currentPlaylist = queueList.length > 0 ? queueList : [track];
        state.currentIndex = state.currentPlaylist.findIndex(t => t.id === track.id);
        if (state.currentIndex === -1) {
            state.currentPlaylist.push(track);
            state.currentIndex = state.currentPlaylist.length - 1;
        }
        
        playerBar.style.display = 'flex';
        
        const coverSrc = track.image || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop';
        playerCover.src = coverSrc;
        playerTitle.textContent = track.title || track.name || 'Unknown Track';
        playerArtist.textContent = track.artists || 'Unknown Artist';
        
        audio.src = track.url;
        audio.volume = state.isMuted ? 0 : state.savedVolume;
        
        document.getElementById('player-progress-fill').style.width = '0%';
        document.getElementById('player-time-current').textContent = '0:00';
        document.getElementById('player-time-total').textContent = '0:00';
        
        audio.play().then(() => {
            playBtn.innerHTML = '<i data-lucide="pause"></i>';
            playerCover.classList.add('playing');
            import('./ui.js').then(ui => ui.updateActiveTrackHighlight());
            createIcons();
            
            this.showMiniWidget(track, coverSrc);
            setupMediaSession(track, coverSrc, this);
            this.autoOpenFloatingWidget();
        }).catch(err => {
            if (err.name === 'AbortError') {
                console.log("Play interrupted by new request, ignoring.");
                return;
            }
            console.error("Không thể phát nhạc:", err, "URL:", track.url);
            import('./main.js').then(m => m.showToast("Không thể phát: " + (track.title || "File lỗi"), true));
        });
    },

    togglePlayPause: function() {
        const audio = document.getElementById('main-audio');
        const playBtn = document.getElementById('player-btn-play');
        const playerCover = document.getElementById('player-cover');
        
        if (!audio || !playBtn) return;
        
        if (audio.paused) {
            audio.play().then(() => {
                playBtn.innerHTML = '<i data-lucide="pause"></i>';
                playerCover.classList.add('playing');
                import('./ui.js').then(ui => ui.updateActiveTrackHighlight());
                if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
                this.syncMiniWidget();
                createIcons();
                this.autoOpenFloatingWidget();
            }).catch(err => {
                console.error("Không thể tiếp tục phát:", err);
            });
        } else {
            audio.pause();
            playBtn.innerHTML = '<i data-lucide="play"></i>';
            playerCover.classList.remove('playing');
            import('./ui.js').then(ui => ui.updateActiveTrackHighlight());
            if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
            this.syncMiniWidget();
            createIcons();
        }
    },

    nextTrack: function() {
        if (state.currentPlaylist.length <= 1) {
            import('./main.js').then(m => m.showToast("Playlist chỉ có 1 bài hát, không thể chuyển.", true));
            return;
        }
        state.currentIndex = (state.currentIndex + 1) % state.currentPlaylist.length;
        const track = state.currentPlaylist[state.currentIndex];
        import('./main.js').then(m => m.showToast(`Chuyển đến: ${track.title || 'Unknown Track'}`));
        this.playTrack(track, state.currentPlaylist);
    },

    prevTrack: function() {
        if (state.currentPlaylist.length <= 1) return;
        state.currentIndex = (state.currentIndex - 1 + state.currentPlaylist.length) % state.currentPlaylist.length;
        const track = state.currentPlaylist[state.currentIndex];
        import('./main.js').then(m => m.showToast(`Chuyển đến: ${track.title || 'Unknown Track'}`));
        this.playTrack(track, state.currentPlaylist);
    },

    closePlayer: function() {
        const audio = document.getElementById('main-audio');
        const playerBar = document.getElementById('player-bar');
        
        if (audio) {
            audio.pause();
            audio.src = '';
        }
        
        if (playerBar) playerBar.style.display = 'none';
        
        if (state.pipWindow) {
            state.pipWindow.close();
        }
        
        this.hideMiniWidget();
        state.currentIndex = -1;
        import('./ui.js').then(ui => ui.updateActiveTrackHighlight());
    },

    showMiniWidget: function(track, coverSrc) {
        const widget = getMiniEl('mini-widget-player');
        if (!widget) return;
        
        getMiniEl('mini-cover').src = coverSrc;
        getMiniEl('mini-title').textContent = track.title || track.name || 'Unknown Track';
        getMiniEl('mini-artist').textContent = track.artists || 'Unknown Artist';
        getMiniEl('mini-play').innerHTML = '<i data-lucide="pause"></i>';
        
        widget.classList.remove('mini-hiding');
        widget.style.display = 'flex';
        
        if (state.pipWindow && state.pipWindow.lucide) {
            state.pipWindow.lucide.createIcons();
        } else {
            createIcons();
        }
    },

    hideMiniWidget: function() {
        try {
            const ipc = getIpc();
            if (ipc) ipc.send('toggle-mini', false);
        } catch (e) {}

        const widget = getMiniEl('mini-widget-player');
        if (!widget) return;
        widget.classList.add('mini-hiding');
        setTimeout(() => {
            widget.style.display = 'none';
            widget.classList.remove('mini-hiding');
        }, 260);
    },

    syncMiniWidget: function() {
        const audio = document.getElementById('main-audio');
        const miniPlay = getMiniEl('mini-play');
        if (!miniPlay || !audio) return;
        
        miniPlay.innerHTML = audio.paused
            ? '<i data-lucide="play"></i>'
            : '<i data-lucide="pause"></i>';
            
        if (state.pipWindow && state.pipWindow.lucide) {
            state.pipWindow.lucide.createIcons();
        } else {
            createIcons();
        }
        
        // Cập nhật giao diện Mini qua IPC
        try {
            const ipc = getIpc();
            const track = state.currentPlaylist[state.currentIndex];
            if (ipc && track) {
                ipc.send('sync-mini-data', {
                    title: track.title || track.name || 'Unknown',
                    artist: track.artists || 'Unknown',
                    cover: document.getElementById('player-cover').src,
                    isPlaying: !audio.paused
                });
            }
        } catch (e) {
            // Im lặng bỏ qua nếu không có IPC
        }
    },

    autoOpenFloatingWidget: function() {
        if (!state.pipWindow) {
            const hasUserGesture = !navigator.userActivation || navigator.userActivation.isActive;
            if (hasUserGesture) {
                this.toggleFloatingWidget().catch(err => {
                    console.log("Tự động mở PiP bị chặn hoặc lỗi:", err);
                });
            }
        }
    },

    toggleFloatingWidget: async function() {
        try {
            const ipc = getIpc();
            if (ipc) {
                ipc.send('toggle-mini', true);
                this.syncMiniWidget();
            } else {
                import('./main.js').then(m => m.showToast("Tính năng Floating Widget chỉ hỗ trợ trên App (Electron).", true));
            }
        } catch (e) {
            console.error(e);
            import('./main.js').then(m => m.showToast("Lỗi Floating Widget: " + e.message, true));
        }
    },

    enterDocumentPiP: async function() {
        try {
            const pipWindow = await window.documentPictureInPicture.requestWindow({
                width: 360,
                height: 120
            });
            
            state.pipWindow = pipWindow;
            
            document.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => {
                pipWindow.document.head.appendChild(el.cloneNode(true));
            });
            
            pipWindow.document.body.style.background = '#050505';
            pipWindow.document.body.style.margin = '0';
            pipWindow.document.body.style.display = 'flex';
            pipWindow.document.body.style.alignItems = 'center';
            pipWindow.document.body.style.justifyContent = 'center';
            pipWindow.document.body.style.height = '100vh';
            pipWindow.document.body.style.overflow = 'hidden';
            
            const widget = document.getElementById('mini-widget-player');
            
            const oldPosition = widget.style.position;
            const oldBottom = widget.style.bottom;
            const oldRight = widget.style.right;
            const oldLeft = widget.style.left;
            const oldTop = widget.style.top;
            
            widget.style.position = 'static';
            widget.style.margin = '0 auto';
            widget.style.flexShrink = '0';
            widget.style.display = 'flex';
            
            widget.classList.remove('mini-hiding');
            
            const fab = document.getElementById('mini-fab');
            if (fab) fab.style.display = 'none';
            
            pipWindow.addEventListener('pagehide', () => {
                state.pipWindow = null;
                document.body.appendChild(widget);
                
                widget.style.position = oldPosition || 'fixed';
                widget.style.bottom = oldBottom || '24px';
                widget.style.right = oldRight || '24px';
                widget.style.left = oldLeft || 'auto';
                widget.style.top = oldTop || 'auto';
                widget.style.margin = '0';
                
                const audio = document.getElementById('main-audio');
                if (audio && !audio.paused) {
                    widget.style.display = 'flex';
                } else {
                    widget.style.display = 'none';
                }
            });
            
            pipWindow.document.body.appendChild(widget);
            
        } catch (e) {
            console.error("Lỗi khi mở Document Picture-in-Picture:", e);
            this.enterCanvasPiP();
        }
    },

    enterCanvasPiP: async function() {
        const canvas = document.getElementById('pip-canvas');
        const video = document.getElementById('pip-video');
        if (!canvas || !video) return;
        
        const ctx = canvas.getContext('2d');
        this.drawPiPCanvas(ctx, canvas);
        
        state.pipInterval = setInterval(() => {
            this.drawPiPCanvas(ctx, canvas);
        }, 100);
        
        try {
            const stream = canvas.captureStream(10);
            video.srcObject = stream;
            video.muted = true;
            await video.play();
            
            await video.requestPictureInPicture();
            
            video.addEventListener('leavepictureinpicture', () => {
                if (state.pipInterval) {
                    clearInterval(state.pipInterval);
                    state.pipInterval = null;
                }
                video.srcObject = null;
            });
            
        } catch (err) {
            console.error("Canvas Picture-in-Picture thất bại:", err);
        }
    },

    drawPiPCanvas: function(ctx, canvas) {
        ctx.fillStyle = '#0c0c14';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.5, '#00ff88');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, 2);
        
        const miniCover = document.getElementById('mini-cover');
        if (miniCover && miniCover.complete && miniCover.naturalWidth !== 0) {
            ctx.drawImage(miniCover, 16, 16, 56, 56);
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(16, 16, 56, 56);
        }
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Inter, system-ui, sans-serif';
        const titleText = document.getElementById('mini-title').textContent || 'Unknown Track';
        ctx.fillText(truncateText(titleText, 25), 88, 38);
        
        ctx.fillStyle = '#a1a1aa';
        ctx.font = '500 11px Inter, system-ui, sans-serif';
        const artistText = document.getElementById('mini-artist').textContent || 'Unknown Artist';
        ctx.fillText(truncateText(artistText, 28), 88, 56);
        
        const audio = document.getElementById('main-audio');
        const isPlaying = audio && !audio.paused;
        ctx.fillStyle = isPlaying ? '#00ff88' : '#a1a1aa';
        ctx.font = 'bold 9px Inter, system-ui, sans-serif';
        ctx.fillText(isPlaying ? 'PLAYING NOW' : 'PAUSED', 88, 72);
    }
};
