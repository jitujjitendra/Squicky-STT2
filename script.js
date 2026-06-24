// ===== DOM ELEMENTS =====
const themeBtn = document.getElementById('themeBtn');
const themeLabel = document.getElementById('themeLabel');
const themeMenu = document.getElementById('themeMenu');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn = document.getElementById('stopBtn');
const timerDisplay = document.getElementById('timerDisplay');
const recDot = document.getElementById('recDot');
const liveLabel = document.getElementById('liveLabel');
const finalText = document.getElementById('finalText');
const interimText = document.getElementById('interimText');
const placeholder = document.getElementById('placeholder');
const transcript = document.getElementById('transcript');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const languageSelect = document.getElementById('languageSelect');
const toast = document.getElementById('toast');
const punctToggle = document.getElementById('punctToggle');
const micOuter = document.querySelector('.micOuter');

// ===== STATE =====
let isRecording = false;
let isPaused = false;
let recognition = null;
let finalTranscript = '';
let timerInterval = null;
let seconds = 0;

// ===== THEME SWITCHING =====
function toggleMenu() {
    themeMenu.classList.toggle('open');
}
themeBtn.onclick = toggleMenu;
themeLabel.onclick = toggleMenu;

// Close menu on outside click
document.addEventListener('click', (e) => {
    if (!themeBtn.contains(e.target) && !themeLabel.contains(e.target) && !themeMenu.contains(e.target)) {
        themeMenu.classList.remove('open');
    }
});

document.querySelectorAll('.theme-option').forEach(o => {
    o.onclick = () => {
        const t = o.dataset.theme;
        document.documentElement.setAttribute('data-theme', t);
        localStorage.setItem('squickyTheme', t);
        document.querySelectorAll('.theme-option').forEach(x => {
            x.classList.remove('active');
            x.querySelector('span').textContent = '';
        });
        o.classList.add('active');
        o.querySelector('span').textContent = '\u2713';
        themeMenu.classList.remove('open');
    };
});

// Load saved theme
const savedTheme = localStorage.getItem('squickyTheme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
document.querySelectorAll('.theme-option').forEach(o => {
    if (o.dataset.theme === savedTheme) {
        o.classList.add('active');
        o.querySelector('span').textContent = '\u2713';
    } else {
        o.classList.remove('active');
        o.querySelector('span').textContent = '';
    }
});

// ===== TIMER =====
function startTimer() {
    timerInterval = setInterval(() => {
        seconds++;
        const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        timerDisplay.textContent = `${h}:${m}:${s}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

function resetTimer() {
    stopTimer();
    seconds = 0;
    timerDisplay.textContent = '00:00:00';
}

// ===== SPEECH RECOGNITION =====
function initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        showToast('Speech recognition not supported. Use Chrome or Edge.');
        return null;
    }

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = languageSelect.value;

    recog.onstart = () => {
        isRecording = true;
        isPaused = false;
        placeholder.style.display = 'none';
        transcript.classList.add('active');
        recDot.style.display = 'inline';
        liveLabel.style.display = 'inline';
        micOuter.classList.add('recording');
        startTimer();
    };

    recog.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += t + ' ';
            } else {
                interim += t;
            }
        }
        finalText.textContent = finalTranscript;
        interimText.textContent = interim;
        transcript.scrollTop = transcript.scrollHeight;
    };

    recog.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
            showToast('Microphone access denied');
        } else if (event.error === 'no-speech') {
            showToast('No speech detected — try again');
        } else {
            showToast('Error: ' + event.error);
        }
        stopRecording();
    };

    recog.onend = () => {
        if (isRecording && !isPaused) {
            try {
                recog.start();
            } catch (e) {
                stopRecording();
            }
        }
    };

    return recog;
}

// ===== CONTROLS =====
function startRecording() {
    if (isRecording) return;
    recognition = initRecognition();
    if (!recognition) return;
    recognition.lang = languageSelect.value;
    try {
        recognition.start();
    } catch (e) {
        console.error('Failed to start:', e);
    }
}

function pauseRecording() {
    if (!isRecording) return;
    if (isPaused) {
        // Resume
        isPaused = false;
        recognition = initRecognition();
        if (recognition) {
            recognition.lang = languageSelect.value;
            recognition.start();
        }
        startTimer();
        recDot.style.display = 'inline';
        liveLabel.style.display = 'inline';
        micOuter.classList.add('recording');
        showToast('Resumed');
    } else {
        // Pause
        isPaused = true;
        if (recognition) {
            recognition.stop();
            recognition = null;
        }
        stopTimer();
        recDot.style.display = 'none';
        liveLabel.style.display = 'none';
        micOuter.classList.remove('recording');
        showToast('Paused');
    }
}

function stopRecording() {
    isRecording = false;
    isPaused = false;
    if (recognition) {
        recognition.stop();
        recognition = null;
    }
    stopTimer();
    recDot.style.display = 'none';
    liveLabel.style.display = 'none';
    transcript.classList.remove('active');
    micOuter.classList.remove('recording');
}

startBtn.addEventListener('click', startRecording);
pauseBtn.addEventListener('click', pauseRecording);
stopBtn.addEventListener('click', () => {
    stopRecording();
    showToast('Recording stopped');
});

// ===== ACTION BUTTONS =====
copyBtn.addEventListener('click', () => {
    const text = finalTranscript.trim();
    if (!text) {
        showToast('Nothing to copy');
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copied!');
    });
});

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

clearBtn.addEventListener('click', () => {
    finalTranscript = '';
    finalText.textContent = '';
    interimText.textContent = '';
    placeholder.style.display = 'block';
    resetTimer();
    showToast('Cleared!');
});

// ===== LANGUAGE CHANGE =====
languageSelect.addEventListener('change', () => {
    if (isRecording) {
        stopRecording();
        showToast('Language changed — tap Start again');
    }
});

// ===== PUNCTUATION TOGGLE =====
if (punctToggle) {
    punctToggle.addEventListener('click', () => {
        punctToggle.classList.toggle('off');
    });
}

// ===== WAVE ANIMATION =====
const wave = document.querySelector('.wave');
if (wave) {
    [18,28,22,31,26,34,24,38,29,42,22,36,30,44,28,37,23,33,25,31,20,29,26,35,18,27,22,30,16,25,18,28,14,22,18,26,13,20,16,24,12,18,14,21,10,16,13,18,9,14,11,16,8,13,10,14,7,11,8,12,6,9,7,10,5,8,6,8,4,6,5,6].forEach((h, i) => {
        let b = document.createElement('i');
        b.style.height = h + 'px';
        b.style.opacity = Math.max(0.16, 1 - i / 78);
        wave.appendChild(b);
    });
}

// ===== TOAST =====
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}
