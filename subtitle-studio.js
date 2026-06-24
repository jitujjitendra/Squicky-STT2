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

  // ===== INIT =====
  renderSubtitles();

})();
