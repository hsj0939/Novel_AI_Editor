const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonServer;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true
    });

    mainWindow.loadFile(path.join(__dirname, 'frontend', 'index.html'));

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// --- ★ Python 서버 실행 함수 (수정됨) ★ ---
function startPythonServer() {
    // 1. 실행할 파일 경로 (backend/app.exe)
    const serverPath = path.join(__dirname, 'backend', 'app.exe');
    
    // 2. 작업 폴더 경로 (backend 폴더)
    // ★ 중요: 이 설정이 있어야 app.exe가 바로 옆의 .env 파일을 찾을 수 있습니다.
    const workDir = path.join(__dirname, 'backend');

    console.log("Python 서버 시작 중...", serverPath);

    // 3. 서버 실행 (cwd 옵션 추가)
    pythonServer = spawn(serverPath, [], { cwd: workDir });

    pythonServer.stdout.on('data', (data) => {
        console.log(`Python 응답: ${data}`);
    });

    pythonServer.stderr.on('data', (data) => {
        console.error(`Python 오류: ${data}`);
    });
}

// 서버 종료 함수
function killPythonServer() {
    if (pythonServer) {
        pythonServer.kill();
        pythonServer = null;
        console.log("Python 서버가 종료되었습니다.");
    }
}

app.whenReady().then(() => {
    startPythonServer(); // 앱 켜지면 서버 자동 실행
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 앱 꺼지면 서버도 같이 종료
app.on('window-all-closed', () => {
    killPythonServer();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    killPythonServer();
});