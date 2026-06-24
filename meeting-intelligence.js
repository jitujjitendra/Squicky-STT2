// ===== MEETING INTELLIGENCE JS =====
(function() {
  'use strict';

  // === Theme switching (shared pattern) ===
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

  // === Toast ===
  function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }

  // === DOM References ===
  const sourceSelect = document.getElementById('sourceSelect');
  const loadSourceBtn = document.getElementById('loadSourceBtn');
  const inputPreview = document.getElementById('inputPreview');
  const inputPlaceholder = document.getElementById('inputPlaceholder');
  const inputWordCount = document.getElementById('inputWordCount');
  const inputCharCount = document.getElementById('inputCharCount');
  const generateBtn = document.getElementById('generateBtn');
  const clearOutputBtn = document.getElementById('clearOutputBtn');
  const outputBox = document.getElementById('outputBox');
  const copyOutputBtn = document.getElementById('copyOutputBtn');
  const downloadOutputBtn = document.getElementById('downloadOutputBtn');
  const tabs = document.querySelectorAll('.mi-tab');
  const directInput = document.getElementById('directInput');

  let currentTranscript = '';
  let currentType = 'summary';

  // === Load transcript from localStorage ===
  function loadTranscript() {
    const source = sourceSelect.value;
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
          if (parsed.html) {
            const temp = document.createElement('div');
            temp.innerHTML = parsed.html;
            text = temp.textContent || temp.innerText || '';
          }
        } catch(e) {
          text = '';
        }
      }
    }

    text = text.trim();
    currentTranscript = text;

    if (text) {
      inputPlaceholder.style.display = 'none';
      inputPreview.textContent = text.length > 2000 ? text.substring(0, 2000) + '...' : text;
      const words = text.split(/\s+/).filter(w => w.length > 0);
      inputWordCount.textContent = words.length + ' words';
      inputCharCount.textContent = text.length + ' characters';
      showToast('Transcript loaded successfully!');
    } else {
      inputPlaceholder.style.display = '';
      inputPreview.innerHTML = '<p class="mi-placeholder">No transcript found for this source. Try recording or uploading audio first.</p>';
      inputWordCount.textContent = '0 words';
      inputCharCount.textContent = '0 characters';
      showToast('No transcript found for this source');
    }
  }

  loadSourceBtn.addEventListener('click', loadTranscript);

  // === Tab switching ===
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentType = tab.dataset.type;
    });
  });

  // === Content Generation ===
  function generateContent() {
    const directText = directInput.value.trim();
    if (directText) {
      currentTranscript = directText;
    }

    if (!currentTranscript) {
      showToast('Please load a transcript or paste text directly');
      return;
    }

    let output = '';
    switch(currentType) {
      case 'summary':
        output = generateSummary(currentTranscript);
        break;
      case 'actions':
        output = generateActionItems(currentTranscript);
        break;
      case 'decisions':
        output = generateDecisions(currentTranscript);
        break;
      case 'deadlines':
        output = generateDeadlines(currentTranscript);
        break;
      case 'responsibilities':
        output = generateResponsibilities(currentTranscript);
        break;
    }

    outputBox.innerHTML = output;
    showToast('Meeting intelligence generated!');
  }

  generateBtn.addEventListener('click', generateContent);

  // === Clear output ===
  clearOutputBtn.addEventListener('click', () => {
    outputBox.innerHTML = '';
    showToast('Output cleared');
  });

  // === Generate Meeting Summary ===
  function generateSummary(text) {
    const sentences = splitIntoSentences(text);
    const keyPoints = [];

    // Extract key discussion points - sentences that are longer and more meaningful
    sentences.forEach(s => {
      const trimmed = s.trim();
      if (trimmed.length > 20 && keyPoints.length < 15) {
        keyPoints.push(trimmed);
      }
    });

    // Take top 30% as key discussion points
    const count = Math.max(3, Math.ceil(keyPoints.length * 0.3));
    const selected = keyPoints.slice(0, count);

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">Meeting Summary</h2>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-bottom:16px;">Generated on ' + new Date().toLocaleDateString() + ' | ' + sentences.length + ' sentences analyzed</p>\n';

    html += '<h3 style="margin:14px 0 10px;font-size:15px;">Key Discussion Points</h3>\n';
    html += '<ul style="list-style:none;padding:0;">\n';
    selected.forEach(point => {
      html += '<li style="margin-bottom:10px;padding-left:18px;position:relative;line-height:1.7;"><span style="position:absolute;left:0;color:var(--accent);">&#8226;</span>' + escHtml(point) + '</li>\n';
    });
    html += '</ul>\n';

    html += '<p style="color:var(--muted);font-size:12px;margin-top:16px;">' + selected.length + ' key points extracted from ' + sentences.length + ' total sentences</p>';

    return html;
  }

  // === Generate Action Items ===
  function generateActionItems(text) {
    const sentences = splitIntoSentences(text);
    const actionVerbs = /\b(need to|should|must|will|assign|complete|deliver|schedule|action|todo|task|follow up|make sure|ensure|implement|create|build|prepare|send|review|update|fix|resolve)\b/i;
    const actionItems = [];

    sentences.forEach(s => {
      if (actionVerbs.test(s)) {
        actionItems.push(s.trim());
      }
    });

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">Action Items</h2>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-bottom:16px;">' + actionItems.length + ' action items found</p>\n';

    if (actionItems.length > 0) {
      html += '<div style="display:flex;flex-direction:column;gap:10px;">\n';
      actionItems.forEach((item, i) => {
        html += '<div style="border:1px solid var(--line);border-radius:9px;padding:12px 16px;background:var(--card);display:flex;align-items:flex-start;gap:10px;">';
        html += '<span style="color:var(--accent);font-weight:800;min-width:24px;">' + (i + 1) + '.</span>';
        html += '<p style="line-height:1.6;flex:1;">' + escHtml(item) + '</p>';
        html += '</div>\n';
      });
      html += '</div>\n';
    } else {
      html += '<p style="color:var(--muted);font-style:italic;">No action items detected. Action items typically contain words like "need to", "should", "must", "will", "assign", "complete", "deliver", or "schedule".</p>';
    }

    return html;
  }

  // === Generate Decisions ===
  function generateDecisions(text) {
    const sentences = splitIntoSentences(text);
    const decisionKeywords = /\b(decided|agreed|approved|confirmed|finalized|conclusion|resolved|determined|settled|verdict|unanimous|consensus|voted|accepted)\b/i;
    const decisions = [];

    sentences.forEach(s => {
      if (decisionKeywords.test(s)) {
        decisions.push(s.trim());
      }
    });

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">Decisions Made</h2>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-bottom:16px;">' + decisions.length + ' decisions identified</p>\n';

    if (decisions.length > 0) {
      html += '<div style="display:flex;flex-direction:column;gap:10px;">\n';
      decisions.forEach((item, i) => {
        html += '<div style="border:1px solid var(--line);border-radius:9px;padding:12px 16px;background:var(--card);display:flex;align-items:flex-start;gap:10px;">';
        html += '<span style="color:#27ae60;font-size:16px;">&#9989;</span>';
        html += '<p style="line-height:1.6;flex:1;">' + escHtml(item) + '</p>';
        html += '</div>\n';
      });
      html += '</div>\n';
    } else {
      html += '<p style="color:var(--muted);font-style:italic;">No decisions detected. Decisions typically contain words like "decided", "agreed", "approved", "confirmed", or "finalized".</p>';
    }

    return html;
  }

  // === Generate Deadlines ===
  function generateDeadlines(text) {
    const sentences = splitIntoSentences(text);
    const deadlineKeywords = /\b(by monday|by tuesday|by wednesday|by thursday|by friday|by saturday|by sunday|before monday|before tuesday|before wednesday|before thursday|before friday|before saturday|before sunday|deadline|due date|by end of|by the end|due by|due on|by next week|by tomorrow|by tonight|next monday|next tuesday|next wednesday|next thursday|next friday|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}\/\d{1,2}|\d{1,2}-\d{1,2}|end of day|end of week|end of month|by close|within \d+ days|in \d+ days|in \d+ weeks)\b/i;
    const deadlines = [];

    sentences.forEach(s => {
      if (deadlineKeywords.test(s)) {
        deadlines.push(s.trim());
      }
    });

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">Deadlines &amp; Time References</h2>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-bottom:16px;">' + deadlines.length + ' time-sensitive items found</p>\n';

    if (deadlines.length > 0) {
      html += '<div style="display:flex;flex-direction:column;gap:10px;">\n';
      deadlines.forEach((item, i) => {
        html += '<div style="border:1px solid var(--line);border-radius:9px;padding:12px 16px;background:var(--card);display:flex;align-items:flex-start;gap:10px;">';
        html += '<span style="color:var(--accent);font-size:16px;">&#128197;</span>';
        html += '<p style="line-height:1.6;flex:1;">' + escHtml(item) + '</p>';
        html += '</div>\n';
      });
      html += '</div>\n';
    } else {
      html += '<p style="color:var(--muted);font-style:italic;">No deadlines detected. Deadlines typically contain references like "by Monday", "before Friday", "deadline", "due date", or "by end of".</p>';
    }

    return html;
  }

  // === Generate Responsibilities ===
  function generateResponsibilities(text) {
    const sentences = splitIntoSentences(text);
    const responsibilityKeywords = /\b(assigned to|responsible for|will handle|owns|in charge of|take care of|your task|his task|her task|their task|accountable for|delegated to|belongs to|falls on|up to you|up to him|up to her|up to them|lead by|led by|managed by|owned by)\b/i;
    const responsibilities = [];

    sentences.forEach(s => {
      if (responsibilityKeywords.test(s)) {
        responsibilities.push(s.trim());
      }
    });

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">Responsibilities &amp; Assignments</h2>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-bottom:16px;">' + responsibilities.length + ' assignments found</p>\n';

    if (responsibilities.length > 0) {
      html += '<div style="display:flex;flex-direction:column;gap:10px;">\n';
      responsibilities.forEach((item, i) => {
        html += '<div style="border:1px solid var(--line);border-radius:9px;padding:12px 16px;background:var(--card);display:flex;align-items:flex-start;gap:10px;">';
        html += '<span style="color:var(--accent);font-size:16px;">&#128101;</span>';
        html += '<p style="line-height:1.6;flex:1;">' + escHtml(item) + '</p>';
        html += '</div>\n';
      });
      html += '</div>\n';
    } else {
      html += '<p style="color:var(--muted);font-style:italic;">No responsibility assignments detected. Responsibilities typically contain phrases like "assigned to", "responsible for", "will handle", or "owns".</p>';
    }

    return html;
  }

  // === Helper Functions ===
  function splitIntoSentences(text) {
    return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  }

  function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // === Copy Output ===
  copyOutputBtn.addEventListener('click', () => {
    const text = outputBox.innerText || outputBox.textContent;
    if (!text.trim()) {
      showToast('Nothing to copy');
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard!');
    }).catch(() => {
      const range = document.createRange();
      range.selectNodeContents(outputBox);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('copy');
      sel.removeAllRanges();
      showToast('Copied to clipboard!');
    });
  });

  // === Download Output ===
  downloadOutputBtn.addEventListener('click', () => {
    const text = outputBox.innerText || outputBox.textContent;
    if (!text.trim()) {
      showToast('Nothing to download');
      return;
    }
    const filename = 'squicky-meeting-' + currentType + '-' + Date.now() + '.txt';
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded ' + filename);
  });

  // === Auto-load on page open ===
  function autoLoad() {
    const sources = ['studio', 'live', 'upload'];
    for (const src of sources) {
      let text = '';
      if (src === 'live') text = localStorage.getItem('squickyLiveTranscript') || '';
      else if (src === 'upload') text = localStorage.getItem('squickyUploadTranscript') || '';
      else if (src === 'studio') {
        const data = localStorage.getItem('squickyTranscriptStudio');
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.html) {
              const temp = document.createElement('div');
              temp.innerHTML = parsed.html;
              text = temp.textContent || temp.innerText || '';
            }
          } catch(e) { text = ''; }
        }
      }
      if (text.trim()) {
        sourceSelect.value = src;
        loadTranscript();
        return;
      }
    }
  }

  autoLoad();
})();
