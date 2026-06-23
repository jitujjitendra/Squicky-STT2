// ===== DOM ELEMENTS =====
const micBtn = document.getElementById('micBtn');
const statusText = document.getElementById('statusText');
const finalText = document.getElementById('finalText');
const interimText = document.getElementById('interimText');
const placeholder = document.getElementById('placeholder');
const transcriptBox = document.getElementById('transcriptBox');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const languageSelect = document.getElementById('languageSelect');
const themeBtns = document.querySelectorAll('.theme-btn');
const toast = document.getElementById('toast');

// ===== STATE =====
let isRecording = false;
let recognition = null;
let finalTranscript = '';

// ===== SPEECH RECOGNITION SETUP =====
function initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        statusText.textContent = 'Not supported — use Chrome or Edge';
        micBtn.style.opacity = '0.5';
        micBtn.style.cursor = 'not-allowed';
        return null;
    }

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = languageSelect.value;

    recog.onstart = () => {
        isRecording = true;
        micBtn.classList.add('recording');
        statusText.textContent = 'Listening...';
        transcriptBox.classList.add('active');
        placeholder.style.display = 'none';
    };

    recog.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interim += transcript;
            }
        }
        finalText.textContent = finalTranscript;
        interimText.textContent = interim;

        // Auto-scroll to bottom
        transcriptBox.scrollTop = transcriptBox.scrollHeight;
    };

    recog.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
            statusText.textContent = 'Mic access denied';
        } else if (event.error === 'no-speech') {
            statusText.textContent = 'No speech detected — try again';
        } else {
            statusText.textContent = 'Error: ' + event.error;
        }
        stopRecording();
    };

    recog.onend = () => {
        // If still recording, restart (continuous mode workaround)
        if (isRecording) {
            try {
                recog.start();
            } catch (e) {
                stopRecording();
            }
        }
    };

    return recog;
}

// ===== START / STOP RECORDING =====
function startRecording() {
    recognition = initRecognition();
    if (!recognition) return;

    recognition.lang = languageSelect.value;

    try {
        recognition.start();
    } catch (e) {
        console.error('Failed to start recognition:', e);
    }
}

function stopRecording() {
    isRecording = false;
    micBtn.classList.remove('recording');
    transcriptBox.classList.remove('active');
    statusText.textContent = 'Tap to record';
    interimText.textContent = '';

    if (recognition) {
        recognition.stop();
        recognition = null;
    }
}

// ===== MIC BUTTON CLICK =====
micBtn.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

// ===== ACTION BUTTONS =====

// Copy
copyBtn.addEventListener('click', () => {
    const text = finalTranscript.trim();
    if (!text) {
        showToast('Nothing to copy');
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!');
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copied to clipboard!');
    });
});

// Download
downloadBtn.addEventListener('click', () => {
    const text = finalTranscript.trim();
    if (!text) {
        showToast('Nothing to download');
        return;
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'squicky-transcript.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded!');
});

// Clear
clearBtn.addEventListener('click', () => {
    finalTranscript = '';
    finalText.textContent = '';
    interimText.textContent = '';
    placeholder.style.display = 'block';
    showToast('Cleared!');
});

// ===== THEME SWITCHING =====
themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        document.documentElement.setAttribute('data-theme', theme);

        // Update active button
        themeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Save to localStorage
        localStorage.setItem('squicky-theme', theme);
    });
});

// Load saved theme
function loadSavedTheme() {
    const saved = localStorage.getItem('squicky-theme');
    if (saved) {
        document.documentElement.setAttribute('data-theme', saved);
        themeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === saved);
        });
    }
}
loadSavedTheme();

// ===== TOAST NOTIFICATION =====
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2200);
}

// ===== LANGUAGE CHANGE =====
languageSelect.addEventListener('change', () => {
    if (isRecording) {
        stopRecording();
        showToast('Language changed — tap mic again');
    }
});
