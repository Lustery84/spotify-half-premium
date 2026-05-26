const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Disable hardware acceleration to resolve solid background bugs in transparent windows on Windows
app.disableHardwareAcceleration();

// Vô hiệu hóa cache trong quá trình dev
app.commandLine.appendSwitch('disable-http-cache');

let mainWindow;
let miniWindow;
let isQuitting = false;

function createWindow() {
    // 1. Khởi tạo Cửa sổ ứng dụng chính (Main App Window)
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: 'SonicRAG - AI Music',
        autoHideMenuBar: true, // Ẩn thanh menu mặc định đi cho đẹp
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    // Load URL của server FastAPI chạy ở local
    mainWindow.loadURL('http://127.0.0.1:8000/app');

    miniWindow = new BrowserWindow({
        width: 320,
        height: 80,
        minWidth: 10,
        minHeight: 10,
        frame: false,        // Tắt hoàn toàn viền và thanh tiêu đề của Windows
        transparent: true,   // Cho phép nền trong suốt xuyên thấu (Kính mờ)
        backgroundColor: '#00000000', // Sửa lỗi hiển thị nền đen/trắng trên Windows
        alwaysOnTop: true,   // Luôn luôn lơ lửng trên cùng các ứng dụng khác
        show: false,         // Ẩn đi lúc mới mở app, khi nào bấm nút PiP mới hiện
        resizable: false,    // Cố định kích thước widget
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    // Trỏ cùng vào app nhưng truyền thêm tham số ?mini=true để giao diện HTML nhận diện và chuyển thành Widget
    miniWindow.loadURL('http://127.0.0.1:8000/app?mini=true');

    // Ngăn chặn việc hủy cửa sổ khi người dùng bấm nút Close trên widget, chỉ ẩn đi
    miniWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            miniWindow.hide();
        }
    });

    // Lắng nghe lệnh Bật/Tắt hiển thị cửa sổ Mini từ cửa sổ chính
    ipcMain.on('toggle-mini', (event, show) => {
        if (show) {
            if (miniWindow && !miniWindow.isDestroyed()) {
                miniWindow.show();
            }
        } else {
            if (miniWindow && !miniWindow.isDestroyed()) {
                miniWindow.hide();
            }
        }
    });

    // Lắng nghe thay đổi kích thước của miniWindow và neo vào góc dưới bên phải
    ipcMain.on('resize-mini', (event, minimize) => {
        if (miniWindow && !miniWindow.isDestroyed()) {
            const bounds = miniWindow.getBounds();
            const wNew = minimize ? 52 : 320;
            const hNew = minimize ? 52 : 80;

            const xNew = bounds.x + bounds.width - wNew;
            const yNew = bounds.y + bounds.height - hNew;

            miniWindow.setBounds({
                x: Math.round(xNew),
                y: Math.round(yNew),
                width: wNew,
                height: hNew
            });

            // Force a full DWM texture rebuild to fix ghost/invisible transparent window on Windows.
            // hide() + show() is the only reliable way to force Windows to re-compose the layered window.
            // The 30ms delay lets setBounds() settle before the repaint is triggered.
            miniWindow.hide();
            setTimeout(() => {
                if (miniWindow && !miniWindow.isDestroyed()) {
                    miniWindow.show();
                    if (miniWindow.webContents) {
                        miniWindow.webContents.invalidate();
                    }
                }
            }, 30);
        }
    });

    // Lắng nghe di chuyển cửa sổ thủ công (dành cho chế độ hình tròn)
    ipcMain.on('window-drag', (event, delta) => {
        if (miniWindow && !miniWindow.isDestroyed()) {
            const bounds = miniWindow.getBounds();
            miniWindow.setBounds({
                x: Math.round(bounds.x + delta.dx),
                y: Math.round(bounds.y + delta.dy),
                width: bounds.width,
                height: bounds.height
            });
        }
    });

    // Đồng bộ thông tin bài hát (Tên, ca sĩ, ảnh bìa, trạng thái Phát/Dừng) từ Cửa sổ chính sang Cửa sổ Mini
    ipcMain.on('sync-mini-data', (event, data) => {
        if (miniWindow && !miniWindow.isDestroyed()) {
            miniWindow.webContents.send('update-mini-ui', data);
        }
    });

    // Nhận lệnh điều khiển đa phương tiện từ Cửa sổ Mini gửi về, chuyển tiếp qua Cửa sổ chính xử lý phát nhạc
    ipcMain.on('mini-action', (event, action) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('trigger-main-action', action);
        }
    });

    // Khi người dùng tắt cửa sổ chính, tự động tắt toàn bộ ứng dụng và các luồng ngầm
    mainWindow.on('closed', () => {
        app.quit();
    });
}
             
// Khi Electron đã sẵn sàng môi trường, tiến hành tạo cửa sổ
app.whenReady().then(createWindow);

app.on('before-quit', () => {
    isQuitting = true;
});

// Xử lý đóng ứng dụng chuẩn cho hệ điều hành Mac/Windows
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});