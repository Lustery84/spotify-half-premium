// Các hàm tiện ích dùng chung (Utilities)

/**
 * Format thời gian từ giây sang định dạng mm:ss
 */
export function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Cắt ngắn chuỗi nếu quá dài
 */
export function truncateText(str, maxLength) {
    if (!str) return '';
    return str.length > maxLength ? str.slice(0, maxLength - 3) + '...' : str;
}

/**
 * Helper render Lucide icons nếu có
 */
export function createIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}
