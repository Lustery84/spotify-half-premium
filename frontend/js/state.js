// Quản lý trạng thái toàn cục (State Management)
export const state = {
    // Tải nhạc
    activeQueueCount: 0,
    lastActiveSection: 'playlists-section',
    downloadedTracks: new Set(),
    
    // Phát nhạc cục bộ
    currentPlaylist: [],
    currentIndex: -1,
    isMuted: false,
    savedVolume: 0.8,
    currentTracks: [],
    
    // Trạng thái Widget Mini (PiP)
    widgetLeft: null,
    widgetTop: null,
    isWidgetDragging: false,
    isFabDragging: false,
    pipWindow: null,
    pipInterval: null
};

// Hàm hỗ trợ lấy element của widget mini bất kể nó đang ở document chính hay PiP document
export function getMiniEl(id) {
    if (state.pipWindow) {
        const el = state.pipWindow.document.getElementById(id);
        if (el) return el;
    }
    return document.getElementById(id);
}
