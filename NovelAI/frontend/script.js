// --- Configuration ---
const API_URL = 'http://127.0.0.1:5000/analyze';

// --- DOM Elements ---
const fileUpload = document.getElementById('fileUpload');
const fileInfo = document.getElementById('fileInfo');
const fileNameText = document.getElementById('fileNameText');

const btnConsistency = document.getElementById('btnConsistency');
const btnStructure = document.getElementById('btnStructure');
const btnSend = document.getElementById('btnSend');

const chatWindow = document.getElementById('chatWindow');
const userInput = document.getElementById('userInput');
const chatLoader = document.getElementById('chatLoader');

const analysisPanelContainer = document.getElementById('analysisPanelContainer');
const analysisTitle = document.getElementById('analysisTitle');
const analysisResult = document.getElementById('analysisResult');
const analysisLoader = document.getElementById('analysisLoader');

let uploadedManuscript = ""; 

// --- File Upload Logic ---
fileUpload.addEventListener('change', function() {
    if (this.files && this.files[0]) {
        const file = this.files[0];
        if (file.type !== "text/plain") {
            alert(".txt 파일만 업로드할 수 있습니다.");
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedManuscript = e.target.result;
            
            // UI Update
            fileNameText.textContent = file.name;
            fileInfo.classList.add('active');
            
            // Enable Buttons
            btnConsistency.disabled = false;
            btnStructure.disabled = false;
            btnSend.disabled = false;
            
            // Add System Message
            appendMessage('system', `'${file.name}' 파일이 성공적으로 로드되었습니다.`);
        };
        reader.onerror = function() {
            fileNameText.textContent = "오류 발생";
            uploadedManuscript = "";
        };
        
        reader.readAsText(file, 'UTF-8'); 
    }
});

// --- API Interaction ---
async function fetchAIResponse(analysisType, manuscript, userQuestion = '') {
    const body = {
        analysis_type: analysisType,
        manuscript: manuscript,
        user_question: userQuestion
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        return data.error ? `[오류]: ${data.error}` : data.analysis_result;

    } catch (error) {
        console.error('Error:', error);
        return `[서버 오류]: Python 서버가 실행 중인지 확인해주세요.\n${error.message}`;
    }
}

// --- Analysis Requests (Side Panel) ---
async function requestAnalysis(type) {
    if (uploadedManuscript === '') { alert('원고를 먼저 업로드해주세요.'); return; }

    // Open Right Panel & Show Loader
    analysisPanelContainer.classList.add('open');
    analysisResult.innerHTML = '';
    analysisLoader.style.display = 'flex';
    
    if (type === 'consistency') {
        analysisTitle.innerHTML = '<i class="ph ph-users-three"></i> 설정 오류 분석';
    } else if (type === 'structure') {
        analysisTitle.innerHTML = '<i class="ph ph-kanban"></i> 챕터 구조 분석';
    }

    const resultText = await fetchAIResponse(type, uploadedManuscript);
    
    analysisLoader.style.display = 'none';
    analysisResult.innerHTML = marked.parse(resultText);
}

function closeAnalysisPanel() {
    analysisPanelContainer.classList.remove('open');
}

// --- Chat Interaction ---
async function sendMessage() {
    const question = userInput.value.trim();
    if (question === '') return;
    if (uploadedManuscript === '') { alert('원고를 먼저 업로드해주세요.'); return; }

    appendMessage('user', question);
    userInput.value = '';
    
    chatLoader.style.display = 'flex'; // Show spinner below chat

    const aiResponse = await fetchAIResponse('question', uploadedManuscript, question);
    
    chatLoader.style.display = 'none';
    appendMessage('ai', aiResponse);
}

function appendMessage(sender, text) {
    let messageHtml = '';
    
    if (sender === 'user') {
        messageHtml = `
            <div class="chat-message user-message">
                <div class="message-content">${text}</div>
                <div class="avatar user-avatar"><i class="ph-bold ph-user"></i></div>
            </div>`;
    } else if (sender === 'system') {
         messageHtml = `
            <div style="text-align:center; color:var(--text-sub); font-size:13px; margin: 10px 0;">
                <i class="ph-fill ph-info"></i> ${text}
            </div>`;
    } else {
        // AI Message
        const convertedHtml = marked.parse(text);
        messageHtml = `
            <div class="chat-message ai-message">
                <div class="avatar ai-avatar"><i class="ph-fill ph-sparkle"></i></div>
                <div class="message-content">${convertedHtml}</div>
            </div>`;
    }

    chatWindow.insertAdjacentHTML('beforeend', messageHtml);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function handleKeydown(event) {
    if (event.key === 'Enter') sendMessage();
}