const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        titleBarStyle: 'hiddenInset',
        title: '圖片文件編輯',
    });

    // 載入打包後的 HTML 檔案
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

    // 開發時可取消註解以查看錯誤訊息
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
