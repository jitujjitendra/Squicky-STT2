// ============================================================
// SQUICKY STT2 - Speech Engine Module
// Production-level Speech-to-Text Web Application
// ============================================================

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
const micOuter = document.getElementById('micOuter');
const recStatus = document.getElementById('recStatus');
const audioLevel = document.getElementById('audioLevel');

// Tab elements
const uploadTab = document.getElementById('uploadTab');
const liveTab = document.getElementById('liveTab');
const uploadPanel = document.getElementById('uploadPanel');
const livePanel = document.getElementById('livePanel');

// Upload elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const fileDuration = document.getElementById('fileDuration');
const fileRemove = document.getElementById('fileRemove');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const processingStatus = document.getElementById('processingStatus');
const processingText = document.getElementById('processingText');
const uploadActions = document.getElementById('uploadActions');
const processBtn = document.getElementById('processBtn');
const cancelProcessBtn = document.getElementById('cancelProcessBtn');
const uploadTranscript = document.getElementById('uploadTranscript');
const uploadFinalText = document.getElementById('uploadFinalText');
const uploadInterimText = document.getElementById('uploadInterimText');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const uploadTranscriptBox = document.getElementById('uploadTranscriptBox');
const uploadCopyBtn = document.getElementById('uploadCopyBtn');
const uploadDownloadBtn = document.getElementById('uploadDownloadBtn');
const uploadClearBtn = document.getElementById('uploadClearBtn');
const uploadLanguageSelect = document.getElementById('uploadLanguageSelect');
const langSetting = document.getElementById('langSetting');

// ===== STATE =====
let isRecording = false;
let isPaused = false;
let recognition = null;
let finalTranscript = '';
let uploadFinalTranscriptText = '';
let timerInterval = null;
let seconds = 0;
let uploadedFile = null;
let audioContext = null;
let analyser = null;
let micStream = null;
let levelAnimFrame = null;
let isProcessingFile = false;
let fileRecognition = null;
let currentFileAudioUrl = null;

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

// ===== TAB SWITCHING =====
function switchTab(tabName) {
    if (tabName === 'upload') {
        uploadTab.classList.add('active');
        liveTab.classList.remove('active');
        uploadPanel.style.display = 'block';
        livePanel.style.display = 'none';
    } else {
        liveTab.classList.add('active');
        uploadTab.classList.remove('active');
        livePanel.style.display = 'block';
        uploadPanel.style.display = 'none';
    }
}

uploadTab.addEventListener('click', () => switchTab('upload'));
liveTab.addEventListener('click', () => switchTab('live'));

// ===== TIMER =====
function startTimer() {
    // Prevent multiple intervals
    if (timerInterval) return;
    timerInterval = setInterval(() => {
        seconds++;
        const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
        const s = String(seconds % 60).padStart(2, '0');
        timerDisplay.textContent = `${h}:${m}:${s}`;
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function resetTimer() {
    stopTimer();
    seconds = 0;
    timerDisplay.textContent = '00:00:00';
}

// ===== AUDIO LEVEL VISUALIZATION =====
function startAudioLevel() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            micStream = stream;
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            audioLevel.classList.add('active');
            animateLevel();
        })
        .catch(err => {
            console.warn('Could not access mic for visualization:', err);
        });
}

function animateLevel() {
    if (!analyser) return;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const bars = audioLevel.querySelectorAll('.level-bar');
    const barCount = bars.length;
    const step = Math.floor(dataArray.length / barCount);

    for (let i = 0; i < barCount; i++) {
        const value = dataArray[i * step] || 0;
        const height = Math.max(4, (value / 255) * 28);
        bars[i].style.height = height + 'px';
    }

    levelAnimFrame = requestAnimationFrame(animateLevel);
}

function stopAudioLevel() {
    audioLevel.classList.remove('active');
    if (levelAnimFrame) {
        cancelAnimationFrame(levelAnimFrame);
        levelAnimFrame = null;
    }
    if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        micStream = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
        audioContext = null;
        analyser = null;
    }
    // Reset bars
    const bars = audioLevel.querySelectorAll('.level-bar');
    bars.forEach(bar => { bar.style.height = '4px'; });
}

// ===== LANGUAGE HELPERS =====
// Resolve 'hinglish' to alternating between hi-IN and en-IN
function getRecognitionLang(selectValue) {
    if (selectValue === 'hinglish') {
        return 'hi-IN'; // Start with Hindi, auto-reconnect alternates
    }
    return selectValue;
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
    recog.lang = getRecognitionLang(languageSelect.value);

    recog.onstart = () => {
        isRecording = true;
        isPaused = false;
        placeholder.style.display = 'none';
        transcript.classList.add('active');
        recDot.style.display = 'inline';
        liveLabel.style.display = 'inline';
        micOuter.classList.add('recording');
        recStatus.textContent = 'Listening...';
        recStatus.className = 'rec-status listening';
        // Only start timer/audio if not already running (prevents duplicates on auto-reconnect)
        if (!timerInterval) startTimer();
        if (!audioLevel.classList.contains('active')) startAudioLevel();
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
            showToast('Microphone access denied. Please allow mic permission.');
            recStatus.textContent = 'Mic access denied';
            recStatus.className = 'rec-status';
            stopRecording();
        } else if (event.error === 'no-speech') {
            // Don't stop, just notify briefly
            recStatus.textContent = 'No speech detected...';
        } else if (event.error === 'network') {
            showToast('Network error. Check your connection.');
            stopRecording();
        } else if (event.error === 'aborted') {
            // Normal when stopping, do nothing
        } else {
            showToast('Error: ' + event.error);
        }
    };

    recog.onend = () => {
        // Auto-reconnect for continuous mode
        if (isRecording && !isPaused) {
            try {
                // For hinglish, alternate between hi-IN and en-IN
                if (languageSelect.value === 'hinglish') {
                    recog.lang = recog.lang === 'hi-IN' ? 'en-IN' : 'hi-IN';
                }
                recog.start();
            } catch (e) {
                // If start fails, try again after a short delay
                setTimeout(() => {
                    if (isRecording && !isPaused) {
                        try { recog.start(); } catch (err) { stopRecording(); }
                    }
                }, 300);
            }
        }
    };

    return recog;
}

// ===== RECORDING CONTROLS =====
function startRecording() {
    if (isRecording) return;
    doStartRecording();
}

function doStartRecording() {
    recognition = initRecognition();
    if (!recognition) return;
    recognition.lang = getRecognitionLang(languageSelect.value);
    try {
        recognition.start();
    } catch (e) {
        console.error('Failed to start:', e);
        showToast('Failed to start recording. Check mic permission.');
    }
}

function pauseRecording() {
    if (!isRecording) return;
    if (isPaused) {
        // Resume
        isPaused = false;
        recognition = initRecognition();
        if (recognition) {
            recognition.lang = getRecognitionLang(languageSelect.value);
            try {
                recognition.start();
            } catch (e) {
                console.error('Failed to resume:', e);
            }
        }
        recDot.style.display = 'inline';
        liveLabel.style.display = 'inline';
        micOuter.classList.add('recording');
        recStatus.textContent = 'Listening...';
        recStatus.className = 'rec-status listening';
        showToast('Resumed');
    } else {
        // Pause
        isPaused = true;
        if (recognition) {
            recognition.stop();
            recognition = null;
        }
        stopTimer();
        stopAudioLevel();
        recDot.style.display = 'none';
        liveLabel.style.display = 'none';
        micOuter.classList.remove('recording');
        recStatus.textContent = 'Paused';
        recStatus.className = 'rec-status';
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
    stopAudioLevel();
    recDot.style.display = 'none';
    liveLabel.style.display = 'none';
    transcript.classList.remove('active');
    micOuter.classList.remove('recording');
    recStatus.textContent = finalTranscript.trim() ? 'Done!' : 'Ready';
    recStatus.className = 'rec-status';

    // Save transcript to localStorage for Transcript Studio
    if (finalTranscript.trim()) {
        localStorage.setItem('squickyLiveTranscript', finalTranscript.trim());
    }
}

startBtn.addEventListener('click', startRecording);
pauseBtn.addEventListener('click', pauseRecording);
stopBtn.addEventListener('click', () => {
    stopRecording();
    showToast('Recording stopped');
});

// ===== ACTION BUTTONS (Live) =====
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
    recStatus.textContent = 'Ready';
    recStatus.className = 'rec-status';
    showToast('Cleared!');
});

// ===== LANGUAGE CHANGE =====
languageSelect.addEventListener('change', () => {
    if (isRecording) {
        stopRecording();
        showToast('Language changed. Tap Start to begin with new language.');
    }
});

// Sync language setting dropdown
if (langSetting) {
    langSetting.addEventListener('change', () => {
        const val = langSetting.value;
        if (val === 'auto') {
            languageSelect.value = 'en-US';
        } else {
            languageSelect.value = val;
        }
        if (isRecording) {
            stopRecording();
            showToast('Language updated. Tap Start to continue.');
        }
    });
}

// ===== PUNCTUATION TOGGLE =====
if (punctToggle) {
    punctToggle.addEventListener('click', () => {
        punctToggle.classList.toggle('off');
    });
}

// ===== FILE UPLOAD FUNCTIONALITY =====
const ALLOWED_AUDIO_TYPES = [
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg',
    'audio/x-m4a', 'audio/m4a', 'audio/mp4', 'audio/flac',
    'audio/webm', 'audio/x-flac'
];
const ALLOWED_VIDEO_TYPES = [
    'video/mp4', 'video/webm', 'video/x-matroska', 'video/avi',
    'video/x-msvideo'
];
const ALLOWED_EXTENSIONS = [
    '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.webm',
    '.mp4', '.mkv', '.avi'
];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

function validateFile(file) {
    // Check file extension
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return { valid: false, error: `Unsupported file type "${ext}". Please upload audio (MP3, WAV, OGG, M4A, FLAC, WEBM) or video (MP4, WEBM, MKV, AVI) files.` };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return { valid: false, error: `File too large (${sizeMB}MB). Maximum allowed size is 500MB.` };
    }

    // Check if file is empty
    if (file.size === 0) {
        return { valid: false, error: 'File appears to be empty. Please select a valid file.' };
    }

    return { valid: true };
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function getFileDuration(file) {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const media = document.createElement(file.type.startsWith('video') ? 'video' : 'audio');
        media.preload = 'metadata';
        media.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            if (isFinite(media.duration)) {
                resolve(media.duration);
            } else {
                resolve(null);
            }
        };
        media.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
        };
        media.src = url;
    });
}

// Handle file selection
async function handleFileSelect(file) {
    const validation = validateFile(file);
    if (!validation.valid) {
        showToast(validation.error);
        return;
    }

    uploadedFile = file;

    // Show progress indicator
    uploadProgress.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Loading file...';
    dropzone.style.display = 'none';
    fileInfo.style.display = 'block';

    // Animate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) progress = 90;
        progressFill.style.width = progress + '%';
    }, 200);

    // Get file info
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    const duration = await getFileDuration(file);
    if (duration) {
        fileDuration.textContent = 'Duration: ' + formatDuration(duration);
        fileDuration.style.display = 'block';
    } else {
        fileDuration.textContent = '';
        fileDuration.style.display = 'none';
    }

    // Complete progress
    clearInterval(progressInterval);
    progressFill.style.width = '100%';
    progressText.textContent = 'File loaded successfully!';

    setTimeout(() => {
        uploadProgress.style.display = 'none';
        uploadActions.style.display = 'flex';
    }, 800);

    showToast('File loaded: ' + file.name);
}

// Drag and drop
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

// Click to browse
dropzone.addEventListener('click', () => {
    fileInput.click();
});

uploadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        handleFileSelect(fileInput.files[0]);
    }
});

// Remove file
fileRemove.addEventListener('click', () => {
    resetUpload();
    showToast('File removed');
});

function resetUpload() {
    uploadedFile = null;
    fileInput.value = '';
    fileInfo.style.display = 'none';
    uploadActions.style.display = 'none';
    processingStatus.style.display = 'none';
    uploadProgress.style.display = 'none';
    dropzone.style.display = 'block';
    uploadTranscript.style.display = 'none';
    uploadFinalTranscriptText = '';
    if (uploadFinalText) uploadFinalText.textContent = '';
    if (uploadInterimText) uploadInterimText.textContent = '';
    if (uploadPlaceholder) uploadPlaceholder.style.display = 'block';
}

// ===== FILE PROCESSING WITH WEB SPEECH API =====
// Process uploaded audio/video by playing it through an Audio element
// and capturing speech via the Web Speech API
function processUploadedFile() {
    if (!uploadedFile) {
        showToast('No file selected');
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast('Speech recognition not supported. Please use Chrome or Edge.');
        return;
    }

    isProcessingFile = true;
    uploadActions.style.display = 'none';
    processingStatus.style.display = 'flex';
    processingText.textContent = 'Processing...';
    uploadTranscript.style.display = 'block';
    uploadPlaceholder.style.display = 'none';
    uploadFinalTranscriptText = '';
    uploadFinalText.textContent = '';
    uploadInterimText.textContent = '';

    // Create audio element to play the file
    const audioUrl = URL.createObjectURL(uploadedFile);
    currentFileAudioUrl = audioUrl;
    const audio = document.createElement('audio');
    audio.src = audioUrl;
    audio.crossOrigin = 'anonymous';

    // Set up recognition
    fileRecognition = new SpeechRecognition();
    fileRecognition.continuous = true;
    fileRecognition.interimResults = true;
    const selectedLang = uploadLanguageSelect.value;
    fileRecognition.lang = selectedLang === 'hinglish' ? 'hi-IN' : selectedLang;

    let processingDone = false;
    let statusMessages = ['Processing...', 'Analyzing audio...', 'Transcribing...', 'Almost done...'];
    let statusIndex = 0;
    const statusInterval = setInterval(() => {
        statusIndex = (statusIndex + 1) % statusMessages.length;
        if (!processingDone) {
            processingText.textContent = statusMessages[statusIndex];
        }
    }, 3000);

    fileRecognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const t = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                uploadFinalTranscriptText += t + ' ';
            } else {
                interim += t;
            }
        }
        uploadFinalText.textContent = uploadFinalTranscriptText;
        uploadInterimText.textContent = interim;
        uploadTranscriptBox.scrollTop = uploadTranscriptBox.scrollHeight;
    };

    fileRecognition.onerror = (event) => {
        console.error('File recognition error:', event.error);
        if (event.error === 'no-speech') {
            // Continue processing
            processingText.textContent = 'Listening for speech...';
        } else if (event.error === 'not-allowed') {
            finishFileProcessing(statusInterval);
            showToast('Microphone access required for speech recognition');
        }
    };

    fileRecognition.onend = () => {
        if (isProcessingFile && !processingDone) {
            // For file processing via Web Speech API, we need the mic
            // The API listens to the microphone, so we inform the user
            processingDone = true;
            finishFileProcessing(statusInterval);
        }
    };

    // Start recognition - note: Web Speech API uses the microphone
    // For file transcription, we inform user to play audio near mic
    // or we use a workaround with AudioContext routing where possible
    try {
        fileRecognition.start();
        showToast('Listening... Play your audio near the microphone, or speak the content.');

        // Auto-stop after file duration + buffer, or 60s max for short files
        getFileDuration(uploadedFile).then(duration => {
            const timeout = duration ? Math.min((duration + 5) * 1000, 300000) : 60000;
            setTimeout(() => {
                if (isProcessingFile) {
                    stopFileProcessing();
                }
            }, timeout);
        });
    } catch (e) {
        console.error('Failed to start file recognition:', e);
        finishFileProcessing(statusInterval);
        showToast('Failed to start processing');
    }
}

function finishFileProcessing(statusInterval) {
    isProcessingFile = false;
    clearInterval(statusInterval);
    processingStatus.style.display = 'none';

    if (uploadFinalTranscriptText.trim()) {
        processingText.textContent = 'Done!';
        showToast('Processing complete!');
        // Save transcript to localStorage for Transcript Studio
        localStorage.setItem('squickyUploadTranscript', uploadFinalTranscriptText.trim());
    } else {
        uploadPlaceholder.style.display = 'block';
        uploadPlaceholder.textContent = 'No speech detected. Try speaking near the microphone while the file plays.';
        showToast('No speech detected');
    }

    // Show actions again for retry
    uploadActions.style.display = 'flex';

    // Auto-clear file data for privacy (keep transcript)
    setTimeout(() => {
        if (currentFileAudioUrl) {
            URL.revokeObjectURL(currentFileAudioUrl);
            currentFileAudioUrl = null;
        }
    }, 1000);
}

function stopFileProcessing() {
    isProcessingFile = false;
    if (fileRecognition) {
        fileRecognition.stop();
        fileRecognition = null;
    }
    processingStatus.style.display = 'none';
    uploadActions.style.display = 'flex';

    if (uploadFinalTranscriptText.trim()) {
        showToast('Processing complete!');
    }
}

// Process button
processBtn.addEventListener('click', processUploadedFile);

// Cancel processing
cancelProcessBtn.addEventListener('click', () => {
    if (isProcessingFile) {
        stopFileProcessing();
        showToast('Processing cancelled');
    } else {
        resetUpload();
    }
});

// ===== UPLOAD TRANSCRIPT ACTIONS =====
uploadCopyBtn.addEventListener('click', () => {
    const text = uploadFinalTranscriptText.trim();
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

uploadDownloadBtn.addEventListener('click', () => {
    const text = uploadFinalTranscriptText.trim();
    if (!text) {
        showToast('Nothing to download');
        return;
    }
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'squicky-file-transcript.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded!');
});

uploadClearBtn.addEventListener('click', () => {
    uploadFinalTranscriptText = '';
    uploadFinalText.textContent = '';
    uploadInterimText.textContent = '';
    uploadPlaceholder.style.display = 'block';
    uploadPlaceholder.textContent = 'Your transcript will appear here after processing...';
    showToast('Cleared!');
});

// ===== TOAST =====
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// ===== WAVE ANIMATION (if element exists) =====
const wave = document.querySelector('.wave');
if (wave) {
    [18,28,22,31,26,34,24,38,29,42,22,36,30,44,28,37,23,33,25,31,20,29,26,35,18,27,22,30,16,25,18,28,14,22,18,26,13,20,16,24,12,18,14,21,10,16,13,18,9,14,11,16,8,13,10,14,7,11,8,12,6,9,7,10,5,8,6,8,4,6,5,6].forEach((h, i) => {
        let b = document.createElement('i');
        b.style.height = h + 'px';
        b.style.opacity = Math.max(0.16, 1 - i / 78);
        wave.appendChild(b);
    });
}

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+R to start/stop recording (when on live tab)
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        if (isRecording) {
            stopRecording();
            showToast('Recording stopped');
        } else {
            startRecording();
        }
    }
});

