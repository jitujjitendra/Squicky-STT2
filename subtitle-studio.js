// ===== SUBTITLE STUDIO JS =====

(function() {
  'use strict';

  // ===== STATE =====
  let subtitles = []; // Array of { id, text, startTime, endTime }
  let nextId = 1;
  let previewInterval = null;
  let previewCurrentTime = 0;
  let isPlaying = false;

  // ===== DOM REFS =====
  const importTranscriptBtn = document.getElementById('importTranscriptBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const exportSrtBtn = document.getElementById('exportSrtBtn');
  const exportVttBtn = document.getElementById('exportVttBtn');
  const subtitleCount = document.getElementById('subtitleCount');
  const importPanel = document.getElementById('importPanel');
  const importSourceSelect = document.getElementById('importSourceSelect');
  const importConfirmBtn = document.getElementById('importConfirmBtn');
  const importCloseBtn = document.getElementById('importCloseBtn');
  const noSubtitles = document.getElementById('noSubtitles');
  const subtitleCardsList = document.getElementById('subtitleCardsList');
  const pasteInput = document.getElementById('pasteInput');
  const pasteGenerateBtn = document.getElementById('pasteGenerateBtn');
  const subtitleDisplay = document.getElementById('subtitleDisplay');
  const previewPlayBtn = document.getElementById('previewPlayBtn');
  const previewPauseBtn = document.getElementById('previewPauseBtn');
  const previewStopBtn = document.getElementById('previewStopBtn');
  const previewTime = document.getElementById('previewTime');

  // ===== THEME SYSTEM =====
  const themeBtn = document.getElementById('themeBtn');
  const themeLabel = document.getElementById('themeLabel');
  const themeMenu = document.getElementById('themeMenu');
  const themeOptions = document.querySelectorAll('.theme-option');

  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('squickyTheme', t);
    themeOptions.forEach(o => {
      o.classList.toggle('active', o.dataset.theme === t);
      o.querySelector('span').textContent = o.dataset.theme === t ? '\u2713' : '';
    });
  }

  const saved = localStorage.getItem('squickyTheme');
  if (saved) setTheme(saved);

  themeBtn.addEventListener('click', () => themeMenu.classList.toggle('open'));
  themeLabel.addEventListener('click', () => themeMenu.classList.toggle('open'));
  themeOptions.forEach(o => o.addEventListener('click', () => {
    setTheme(o.dataset.theme);
    themeMenu.classList.remove('open');
  }));
  document.addEventListener('click', e => {
    if (!themeMenu.contains(e.target) && e.target !== themeBtn && e.target !== themeLabel) {
      themeMenu.classList.remove('open');
    }
  });

  // ===== TOAST =====
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  // ===== IMPORT PANEL =====
  importTranscriptBtn.addEventListener('click', () => {
    importPanel.style.display = importPanel.style.display === 'none' ? 'block' : 'none';
  });
  importCloseBtn.addEventListener('click', () => {
    importPanel.style.display = 'none';
  });

  importConfirmBtn.addEventListener('click', () => {
    const source = importSourceSelect.value;
    let text = '';

    if (source === 'live') {
      text = localStorage.getItem('squickyLiveTranscript') || '';
    } else if (source === 'upload') {
      text = localStorage.getItem('squickyUploadTranscript') || '';
    } else if (source === 'studio') {
      const studioData = localStorage.getItem('squickyTranscriptStudio');
      if (studioData) {
        try {
          const parsed = JSON.parse(studioData);
          // Extract plain text from HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = parsed.html || '';
          text = tempDiv.textContent || tempDiv.innerText || '';
        } catch(e) {
          text = '';
        }
      }
    }

    if (!text.trim()) {
      showToast('No transcript found in selected source.');
      return;
    }

    splitTextIntoSubtitles(text.trim());
    importPanel.style.display = 'none';
    showToast('Transcript imported and split into subtitles!');
  });

  // ===== PASTE GENERATE =====
  pasteGenerateBtn.addEventListener('click', () => {
    const text = pasteInput.value.trim();
    if (!text) {
      showToast('Please paste some text first.');
      return;
    }
    splitTextIntoSubtitles(text);
    showToast('Subtitles generated from pasted text!');
  });

  // ===== SPLIT TEXT INTO SUBTITLES (~40 words each) =====
  function splitTextIntoSubtitles(text) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const segmentSize = 40;
    const segments = [];

    for (let i = 0; i < words.length; i += segmentSize) {
      segments.push(words.slice(i, i + segmentSize).join(' '));
    }

    // Calculate timing: assume ~150 words per minute = 2.5 words/sec
    // Each segment duration = segmentWords / 2.5
    subtitles = [];
    let currentTime = 0;

    segments.forEach((seg) => {
      const wordCount = seg.split(/\s+/).length;
      const duration = wordCount / 2.5; // seconds
      const startTime = currentTime;
      const endTime = currentTime + duration;

      subtitles.push({
        id: nextId++,
        text: seg,
        startTime: startTime,
        endTime: endTime
      });

      currentTime = endTime;
    });

    renderSubtitles();
  }

  // ===== RENDER SUBTITLES =====
  function renderSubtitles() {
    if (subtitles.length === 0) {
      noSubtitles.style.display = 'block';
      subtitleCardsList.style.display = 'none';
      subtitleCount.textContent = '0 subtitles';
      return;
    }

    noSubtitles.style.display = 'none';
    subtitleCardsList.style.display = 'block';
    subtitleCount.textContent = subtitles.length + ' subtitle' + (subtitles.length !== 1 ? 's' : '');

    subtitleCardsList.innerHTML = '';

    subtitles.forEach((sub, index) => {
      const card = document.createElement('div');
      card.className = 'ss-card';
      card.dataset.id = sub.id;

      card.innerHTML = `
        <div class="ss-card-header">
          <span class="ss-card-num">#${index + 1}</span>
          <div class="ss-card-times">
            <input type="text" class="ss-time-input" data-field="start" value="${formatTime(sub.startTime)}" title="Start time (HH:MM:SS.mmm)">
            <span class="ss-time-arrow">&#8594;</span>
            <input type="text" class="ss-time-input" data-field="end" value="${formatTime(sub.endTime)}" title="End time (HH:MM:SS.mmm)">
          </div>
          <div class="ss-card-actions">
            <button class="ss-card-btn ss-split-btn" title="Split at cursor">&#9986; Split</button>
            ${index < subtitles.length - 1 ? '<button class="ss-card-btn ss-merge-btn" title="Merge with next">&#8615; Merge</button>' : ''}
            <button class="ss-card-btn ss-delete-btn" title="Delete subtitle">&#128465;</button>
          </div>
        </div>
        <div class="ss-card-body">
          <textarea class="ss-card-text" rows="3">${escapeHtml(sub.text)}</textarea>
        </div>
        <div class="ss-card-footer">
          <span class="ss-card-words">${sub.text.split(/\s+/).length} words</span>
          <span class="ss-card-duration">${(sub.endTime - sub.startTime).toFixed(1)}s</span>
        </div>
      `;

      // Event listeners
      const startInput = card.querySelector('[data-field="start"]');
      const endInput = card.querySelector('[data-field="end"]');
      const textArea = card.querySelector('.ss-card-text');
      const splitBtn = card.querySelector('.ss-split-btn');
      const mergeBtn = card.querySelector('.ss-merge-btn');
      const deleteBtn = card.querySelector('.ss-delete-btn');

      startInput.addEventListener('change', () => {
        sub.startTime = parseTime(startInput.value);
        updateCardFooter(card, sub);
      });

      endInput.addEventListener('change', () => {
        sub.endTime = parseTime(endInput.value);
        updateCardFooter(card, sub);
      });

      textArea.addEventListener('input', () => {
        sub.text = textArea.value;
        updateCardFooter(card, sub);
      });

      splitBtn.addEventListener('click', () => {
        splitSubtitle(index, textArea.selectionStart);
      });

      if (mergeBtn) {
        mergeBtn.addEventListener('click', () => {
          mergeSubtitles(index);
        });
      }

      deleteBtn.addEventListener('click', () => {
        subtitles.splice(index, 1);
        renderSubtitles();
        showToast('Subtitle deleted.');
      });

      subtitleCardsList.appendChild(card);
    });
  }

  function updateCardFooter(card, sub) {
    const wordsEl = card.querySelector('.ss-card-words');
    const durEl = card.querySelector('.ss-card-duration');
    wordsEl.textContent = sub.text.split(/\s+/).length + ' words';
    durEl.textContent = (sub.endTime - sub.startTime).toFixed(1) + 's';
  }

  // ===== SPLIT SUBTITLE =====
  function splitSubtitle(index, cursorPos) {
    const sub = subtitles[index];
    const text = sub.text;

    if (cursorPos <= 0 || cursorPos >= text.length) {
      // Split at midpoint if no cursor position
      cursorPos = Math.floor(text.length / 2);
      // Find nearest space
      let spacePos = text.indexOf(' ', cursorPos);
      if (spacePos === -1) spacePos = text.lastIndexOf(' ', cursorPos);
      if (spacePos !== -1) cursorPos = spacePos;
    }

    const text1 = text.substring(0, cursorPos).trim();
    const text2 = text.substring(cursorPos).trim();

    if (!text1 || !text2) {
      showToast('Cannot split: place cursor between words.');
      return;
    }

    const midTime = sub.startTime + (sub.endTime - sub.startTime) * (text1.length / text.length);

    const sub1 = { id: nextId++, text: text1, startTime: sub.startTime, endTime: midTime };
    const sub2 = { id: nextId++, text: text2, startTime: midTime, endTime: sub.endTime };

    subtitles.splice(index, 1, sub1, sub2);
    renderSubtitles();
    showToast('Subtitle split into two.');
  }

  // ===== MERGE SUBTITLES =====
  function mergeSubtitles(index) {
    if (index >= subtitles.length - 1) return;

    const sub1 = subtitles[index];
    const sub2 = subtitles[index + 1];

    const merged = {
      id: nextId++,
      text: sub1.text + ' ' + sub2.text,
      startTime: sub1.startTime,
      endTime: sub2.endTime
    };

    subtitles.splice(index, 2, merged);
    renderSubtitles();
    showToast('Two subtitles merged.');
  }

  // ===== CLEAR ALL =====
  clearAllBtn.addEventListener('click', () => {
    if (subtitles.length === 0) return;
    if (confirm('Clear all subtitles? This cannot be undone.')) {
      subtitles = [];
      renderSubtitles();
      showToast('All subtitles cleared.');
    }
  });

  // ===== TIME FORMAT HELPERS =====
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    const ss = s.toFixed(3).padStart(6, '0');
    return `${hh}:${mm}:${ss}`;
  }

  function parseTime(str) {
    const parts = str.split(':');
    if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return parseFloat(str) || 0;
  }

  function formatTimeSRT(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
  }

  function formatTimeVTT(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;
  }

  // ===== GENERATE SRT =====
  function generateSRT() {
    let srt = '';
    subtitles.forEach((sub, i) => {
      srt += `${i + 1}\n`;
      srt += `${formatTimeSRT(sub.startTime)} --> ${formatTimeSRT(sub.endTime)}\n`;
      srt += `${sub.text}\n\n`;
    });
    return srt.trim();
  }

  // ===== GENERATE VTT =====
  function generateVTT() {
    let vtt = 'WEBVTT\n\n';
    subtitles.forEach((sub, i) => {
      vtt += `${i + 1}\n`;
      vtt += `${formatTimeVTT(sub.startTime)} --> ${formatTimeVTT(sub.endTime)}\n`;
      vtt += `${sub.text}\n\n`;
    });
    return vtt.trim();
  }

  // ===== EXPORT =====
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  exportSrtBtn.addEventListener('click', () => {
    if (subtitles.length === 0) {
      showToast('No subtitles to export.');
      return;
    }
    const srt = generateSRT();
    downloadFile(srt, 'squicky-subtitles.srt', 'text/plain');
    showToast('SRT file exported!');
  });

  exportVttBtn.addEventListener('click', () => {
    if (subtitles.length === 0) {
      showToast('No subtitles to export.');
      return;
    }
    const vtt = generateVTT();
    downloadFile(vtt, 'squicky-subtitles.vtt', 'text/vtt');
    showToast('VTT file exported!');
  });

  // ===== PREVIEW SIMULATION =====
  previewPlayBtn.addEventListener('click', () => {
    if (subtitles.length === 0) {
      showToast('No subtitles to preview.');
      return;
    }
    startPreview();
  });

  previewPauseBtn.addEventListener('click', () => {
    pausePreview();
  });

  previewStopBtn.addEventListener('click', () => {
    stopPreview();
  });

  function startPreview() {
    if (isPlaying) return;
    isPlaying = true;
    previewPlayBtn.style.display = 'none';
    previewPauseBtn.style.display = 'inline-flex';

    previewInterval = setInterval(() => {
      previewCurrentTime += 0.1;
      updatePreviewDisplay();

      // Stop at end
      const lastSub = subtitles[subtitles.length - 1];
      if (lastSub && previewCurrentTime > lastSub.endTime + 1) {
        stopPreview();
      }
    }, 100);
  }

  function pausePreview() {
    isPlaying = false;
    previewPlayBtn.style.display = 'inline-flex';
    previewPauseBtn.style.display = 'none';
    if (previewInterval) {
      clearInterval(previewInterval);
      previewInterval = null;
    }
  }

  function stopPreview() {
    pausePreview();
    previewCurrentTime = 0;
    previewTime.textContent = '00:00:00';
    subtitleDisplay.textContent = 'Subtitles will appear here...';
    subtitleDisplay.classList.remove('ss-subtitle-active');
  }

  function updatePreviewDisplay() {
    const h = Math.floor(previewCurrentTime / 3600);
    const m = Math.floor((previewCurrentTime % 3600) / 60);
    const s = Math.floor(previewCurrentTime % 60);
    previewTime.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    // Find current subtitle
    const current = subtitles.find(sub => previewCurrentTime >= sub.startTime && previewCurrentTime <= sub.endTime);
    if (current) {
      subtitleDisplay.textContent = current.text;
      subtitleDisplay.classList.add('ss-subtitle-active');
    } else {
      subtitleDisplay.textContent = '';
      subtitleDisplay.classList.remove('ss-subtitle-active');
    }
  }

  // ===== ESCAPE HTML =====
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== AUDIO/VIDEO UPLOAD & GENERATION =====
  const ssDropzone = document.getElementById('ssDropzone');
  const ssFileInput = document.getElementById('ssFileInput');
  const ssUploadBtn = document.getElementById('ssUploadBtn');
  const ssMediaArea = document.getElementById('ssMediaArea');
  const ssMediaPlayer = document.getElementById('ssMediaPlayer');
  const ssMediaFileInfo = document.getElementById('ssMediaFileInfo');
  const ssFileName = document.getElementById('ssFileName');
  const ssFileSize = document.getElementById('ssFileSize');
  const ssFileRemove = document.getElementById('ssFileRemove');
  const ssGenerateBtn = document.getElementById('ssGenerateBtn');
  const ssStopGenerateBtn = document.getElementById('ssStopGenerateBtn');
  const ssGenerateProgress = document.getElementById('ssGenerateProgress');
  const ssProgressFill = document.getElementById('ssProgressFill');
  const ssProgressText = document.getElementById('ssProgressText');

  let mediaElement = null;
  let mediaFileURL = null;
  let isGenerating = false;
  let recognition = null;
  let generationProgressInterval = null;
  let currentSegmentStart = 0;

  const ACCEPTED_TYPES = ['.mp3','.wav','.ogg','.m4a','.flac','.webm','.mp4','.mkv','.avi'];
  const AUDIO_EXTENSIONS = ['.mp3','.wav','.ogg','.m4a','.flac'];
  const VIDEO_EXTENSIONS = ['.webm','.mp4','.mkv','.avi'];

  // Dropzone click
  ssDropzone.addEventListener('click', () => ssFileInput.click());
  ssUploadBtn.addEventListener('click', (e) => { e.stopPropagation(); ssFileInput.click(); });

  // Drag and drop
  ssDropzone.addEventListener('dragover', (e) => { e.preventDefault(); ssDropzone.classList.add('dragover'); });
  ssDropzone.addEventListener('dragleave', () => ssDropzone.classList.remove('dragover'));
  ssDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    ssDropzone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) handleMediaFile(files[0]);
  });

  // File input change
  ssFileInput.addEventListener('change', () => {
    if (ssFileInput.files.length > 0) handleMediaFile(ssFileInput.files[0]);
  });

  function getFileExtension(filename) {
    const ext = '.' + filename.split('.').pop().toLowerCase();
    return ext;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function formatMediaTime(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + String(s).padStart(2, '0');
  }

  function handleMediaFile(file) {
    const ext = getFileExtension(file.name);
    if (!ACCEPTED_TYPES.includes(ext)) {
      showToast('Unsupported file type. Use MP3, WAV, OGG, M4A, FLAC, WEBM, MP4, MKV, or AVI.');
      return;
    }

    // Clean up previous media
    cleanupMedia();

    // Show media area
    ssDropzone.style.display = 'none';
    ssMediaArea.style.display = 'block';

    // File info
    ssFileName.textContent = file.name;
    ssFileSize.textContent = formatFileSize(file.size);

    // Create object URL
    mediaFileURL = URL.createObjectURL(file);

    // Create appropriate player
    const isVideo = VIDEO_EXTENSIONS.includes(ext);
    if (isVideo) {
      mediaElement = document.createElement('video');
      mediaElement.controls = true;
      mediaElement.preload = 'metadata';
    } else {
      mediaElement = document.createElement('audio');
      mediaElement.controls = true;
      mediaElement.preload = 'metadata';
    }
    mediaElement.src = mediaFileURL;
    ssMediaPlayer.innerHTML = '';
    ssMediaPlayer.appendChild(mediaElement);
  }

  // Remove file
  ssFileRemove.addEventListener('click', () => {
    stopGeneration();
    cleanupMedia();
    ssDropzone.style.display = 'block';
    ssMediaArea.style.display = 'none';
    ssFileInput.value = '';
  });

  function cleanupMedia() {
    if (mediaElement) {
      mediaElement.pause();
      mediaElement.src = '';
      mediaElement = null;
    }
    if (mediaFileURL) {
      URL.revokeObjectURL(mediaFileURL);
      mediaFileURL = null;
    }
    ssMediaPlayer.innerHTML = '';
    ssGenerateProgress.style.display = 'none';
    ssGenerateBtn.style.display = 'inline-flex';
    ssStopGenerateBtn.style.display = 'none';
  }

  // Generate subtitles from file
  ssGenerateBtn.addEventListener('click', () => {
    if (!mediaElement) {
      showToast('Please upload a file first.');
      return;
    }
    startGeneration();
  });

  ssStopGenerateBtn.addEventListener('click', () => {
    stopGeneration();
  });

  function startGeneration() {
    // Check for Speech Recognition support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech Recognition is not supported in this browser.');
      return;
    }

    isGenerating = true;
    ssGenerateBtn.style.display = 'none';
    ssStopGenerateBtn.style.display = 'inline-flex';
    ssGenerateProgress.style.display = 'block';

    // Reset subtitles
    subtitles = [];
    renderSubtitles();

    // Setup speech recognition
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    currentSegmentStart = 0;

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text) {
            const endTime = mediaElement ? mediaElement.currentTime : 0;
            subtitles.push({
              id: nextId++,
              text: text,
              startTime: currentSegmentStart,
              endTime: endTime
            });
            currentSegmentStart = endTime;
            renderSubtitles();
          }
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return; // Ignore no-speech errors
      if (event.error === 'aborted') return;
      showToast('Speech recognition error: ' + event.error);
    };

    recognition.onend = () => {
      // Restart recognition if still generating (browser may stop it)
      if (isGenerating && mediaElement && !mediaElement.paused && !mediaElement.ended) {
        try {
          currentSegmentStart = mediaElement.currentTime;
          recognition.start();
        } catch(e) { /* ignore */ }
      }
    };

    // Start playback from beginning
    mediaElement.currentTime = 0;
    mediaElement.play().then(() => {
      // Start recognition after playback starts
      try {
        recognition.start();
      } catch(e) {
        showToast('Could not start speech recognition.');
        stopGeneration();
        return;
      }
    }).catch(() => {
      showToast('Could not play media. Check file format.');
      stopGeneration();
      return;
    });

    // Progress tracking
    generationProgressInterval = setInterval(() => {
      if (mediaElement && mediaElement.duration) {
        const current = mediaElement.currentTime;
        const total = mediaElement.duration;
        const pct = Math.min((current / total) * 100, 100);
        ssProgressFill.style.width = pct + '%';
        ssProgressText.textContent = formatMediaTime(current) + ' / ' + formatMediaTime(total);
      }
    }, 250);

    // Listen for media end
    mediaElement.addEventListener('ended', onMediaEnded);
  }

  function onMediaEnded() {
    stopGeneration();
    showToast('Generation complete! ' + subtitles.length + ' subtitles created.');
  }

  function stopGeneration() {
    isGenerating = false;

    if (recognition) {
      try { recognition.abort(); } catch(e) { /* ignore */ }
      recognition = null;
    }

    if (mediaElement) {
      mediaElement.pause();
      mediaElement.removeEventListener('ended', onMediaEnded);
    }

    if (generationProgressInterval) {
      clearInterval(generationProgressInterval);
      generationProgressInterval = null;
    }

    ssGenerateBtn.style.display = 'inline-flex';
    ssStopGenerateBtn.style.display = 'none';

    renderSubtitles();
  }

  // ===== ONLINE VIDEO URL =====
  const ssVideoUrl = document.getElementById('ssVideoUrl');
  const ssUrlLoadBtn = document.getElementById('ssUrlLoadBtn');
  const ssUrlPlayer = document.getElementById('ssUrlPlayer');
  const ssUrlVideo = document.getElementById('ssUrlVideo');
  const ssUrlGenerateBtn = document.getElementById('ssUrlGenerateBtn');
  const ssUrlStopBtn = document.getElementById('ssUrlStopBtn');
  let urlRecognition = null;
  let urlIsGenerating = false;

  if (ssUrlLoadBtn) {
    ssUrlLoadBtn.addEventListener('click', () => {
      const url = ssVideoUrl.value.trim();
      if (!url) {
        showToast('Please paste a video URL');
        return;
      }
      ssUrlVideo.src = url;
      ssUrlPlayer.style.display = 'block';
      ssUrlVideo.load();
      showToast('Video loaded. Click Generate to start.');
    });
  }

  if (ssUrlGenerateBtn) {
    ssUrlGenerateBtn.addEventListener('click', () => {
      if (!ssUrlVideo.src) {
        showToast('Load a video first');
        return;
      }
      startUrlGeneration();
    });
  }

  if (ssUrlStopBtn) {
    ssUrlStopBtn.addEventListener('click', stopUrlGeneration);
  }

  function startUrlGeneration() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Speech recognition not supported. Use Chrome.');
      return;
    }

    urlIsGenerating = true;
    subtitles = [];
    nextId = 1;
    ssUrlGenerateBtn.style.display = 'none';
    ssUrlStopBtn.style.display = 'inline-flex';

    urlRecognition = new SpeechRecognition();
    urlRecognition.continuous = false;
    urlRecognition.interimResults = false;
    urlRecognition.lang = 'en-US';

    let segStart = 0;

    urlRecognition.onresult = (event) => {
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text) {
            const endTime = ssUrlVideo.currentTime;
            subtitles.push({
              id: nextId++,
              text: text,
              startTime: segStart,
              endTime: endTime
            });
            segStart = endTime;
            renderSubtitles();
          }
        }
      }
    };

    urlRecognition.onend = () => {
      if (urlIsGenerating && !ssUrlVideo.paused && !ssUrlVideo.ended) {
        segStart = ssUrlVideo.currentTime;
        setTimeout(() => {
          if (urlIsGenerating) {
            try { urlRecognition.start(); } catch(e) {}
          }
        }, 100);
      } else if (ssUrlVideo.ended) {
        stopUrlGeneration();
      }
    };

    urlRecognition.onerror = (event) => {
      if (event.error === 'no-speech' && urlIsGenerating) {
        // Restart silently
      } else if (event.error !== 'aborted') {
        showToast('Recognition error: ' + event.error);
      }
    };

    ssUrlVideo.play();
    segStart = 0;
    urlRecognition.start();
    showToast('Generating subtitles... Let video audio play through speakers.');

    ssUrlVideo.addEventListener('ended', stopUrlGeneration, { once: true });
  }

  function stopUrlGeneration() {
    urlIsGenerating = false;
    if (urlRecognition) {
      try { urlRecognition.stop(); } catch(e) {}
      urlRecognition = null;
    }
    ssUrlVideo.pause();
    ssUrlGenerateBtn.style.display = 'inline-flex';
    ssUrlStopBtn.style.display = 'none';
    renderSubtitles();
    if (subtitles.length > 0) {
      showToast(subtitles.length + ' subtitles generated!');
    } else {
      showToast('No speech detected. Try in quiet environment.');
    }
  }

  // ===== INIT =====
  renderSubtitles();

})();
