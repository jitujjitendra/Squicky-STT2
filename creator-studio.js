// ===== CREATOR STUDIO JS =====
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
  const tabs = document.querySelectorAll('.cr-tab');

  let currentTranscript = '';
  let currentType = 'titles';

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
      inputPreview.innerHTML = '<p class="cr-placeholder">No transcript found for this source. Try recording or uploading audio first.</p>';
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
    if (!currentTranscript) {
      showToast('Please load a transcript first');
      return;
    }

    let output = '';
    switch(currentType) {
      case 'titles':
        output = generateTitles(currentTranscript);
        break;
      case 'description':
        output = generateDescription(currentTranscript);
        break;
      case 'tags':
        output = generateTags(currentTranscript);
        break;
      case 'chapters':
        output = generateChapters(currentTranscript);
        break;
      case 'shorts':
        output = generateShorts(currentTranscript);
        break;
      case 'podcast':
        output = generatePodcastNotes(currentTranscript);
        break;
    }

    outputBox.innerHTML = output;
    showToast('Creator content generated!');
  }

  generateBtn.addEventListener('click', generateContent);

  // === Clear output ===
  clearOutputBtn.addEventListener('click', () => {
    outputBox.innerHTML = '';
    showToast('Output cleared');
  });

  // === Generate YouTube Titles ===
  function generateTitles(text) {
    const sentences = splitIntoSentences(text);
    const words = text.split(/\s+/).filter(w => w.length > 3);

    // Extract key phrases for title generation
    const keyWords = extractKeywords(text, 5);
    const titles = [];

    // Strategy 1: First impactful sentence shortened
    if (sentences.length > 0) {
      let t = sentences[0].trim();
      if (t.length > 60) t = t.substring(0, 57) + '...';
      titles.push(t);
    }

    // Strategy 2: Question format
    if (keyWords.length >= 2) {
      titles.push('How to ' + keyWords[0] + ' and ' + keyWords[1] + ' - Complete Guide');
    }

    // Strategy 3: Number + keyword
    if (keyWords.length >= 1) {
      titles.push(Math.min(sentences.length, 7) + ' Things You Need to Know About ' + capitalize(keyWords[0]));
    }

    // Strategy 4: Bold claim
    if (keyWords.length >= 1) {
      titles.push('The Ultimate Guide to ' + capitalize(keyWords[0]) + ' | Everything Explained');
    }

    // Strategy 5: Curiosity gap
    if (sentences.length > 2) {
      let hook = sentences[1].trim();
      if (hook.length > 50) hook = hook.substring(0, 47) + '...';
      titles.push(hook + ' (You Won\'t Believe This!)');
    }

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">YouTube Title Options</h2>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-bottom:16px;">Choose the best title for your video</p>\n';
    html += '<div style="display:flex;flex-direction:column;gap:10px;">\n';

    titles.forEach((title, i) => {
      html += '<div style="border:1px solid var(--line);border-radius:9px;padding:14px 16px;background:var(--card);display:flex;align-items:center;gap:12px;">';
      html += '<span style="color:var(--accent);font-weight:800;font-size:16px;">' + (i + 1) + '</span>';
      html += '<p style="flex:1;font-weight:700;line-height:1.5;">' + escHtml(title) + '</p>';
      html += '<span style="font-size:11px;color:var(--muted);white-space:nowrap;">' + title.length + ' chars</span>';
      html += '</div>\n';
    });

    html += '</div>\n';
    return html;
  }

  // === Generate YouTube Description ===
  function generateDescription(text) {
    const sentences = splitIntoSentences(text);
    const keyWords = extractKeywords(text, 10);
    const paragraphs = splitIntoParagraphs(text);

    // Build SEO-friendly description
    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">YouTube Description</h2>\n';
    html += '<div style="border:1px solid var(--line);border-radius:9px;padding:16px 18px;background:var(--card);line-height:1.8;font-size:13px;">\n';

    // Opening hook (first 2 sentences)
    const hook = sentences.slice(0, 2).join(' ');
    html += '<p style="margin-bottom:12px;font-weight:600;">' + escHtml(hook) + '</p>\n';

    // Timestamps section
    html += '<p style="margin-bottom:4px;font-weight:800;color:var(--accent2);">Timestamps:</p>\n';
    const chapterCount = Math.min(6, Math.ceil(paragraphs.length));
    for (let i = 0; i < chapterCount; i++) {
      const minutes = i * Math.ceil(30 / chapterCount);
      const timeStr = String(minutes).padStart(2, '0') + ':00';
      const label = paragraphs[i] ? paragraphs[i].split(/\s+/).slice(0, 5).join(' ') : 'Section ' + (i + 1);
      html += '<p style="margin-bottom:2px;">' + timeStr + ' - ' + escHtml(capitalize(label)) + '</p>\n';
    }

    // Summary paragraph
    html += '<p style="margin-top:12px;margin-bottom:12px;">' + escHtml(sentences.slice(0, Math.min(4, sentences.length)).join(' ')) + '</p>\n';

    // Keywords/tags line
    html += '<p style="margin-top:12px;color:var(--muted);">Tags: ' + escHtml(keyWords.join(', ')) + '</p>\n';

    html += '</div>\n';
    return html;
  }

  // === Generate Tags ===
  function generateTags(text) {
    const keywords = extractKeywords(text, 25);

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">Video Tags</h2>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-bottom:16px;">' + keywords.length + ' tags extracted from transcript</p>\n';

    // Comma separated format
    html += '<div style="border:1px solid var(--line);border-radius:9px;padding:16px 18px;background:var(--card);margin-bottom:14px;">';
    html += '<p style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px;">Copy-ready (comma separated):</p>';
    html += '<p style="line-height:1.8;font-size:13px;">' + escHtml(keywords.join(', ')) + '</p>';
    html += '</div>\n';

    // Visual tag pills
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;">\n';
    keywords.forEach(tag => {
      html += '<span style="display:inline-block;padding:6px 14px;border-radius:20px;border:1px solid var(--line);background:var(--card);font-size:12px;font-weight:700;">#' + escHtml(tag) + '</span>\n';
    });
    html += '</div>\n';

    return html;
  }

  // === Generate YouTube Chapters ===
  function generateChapters(text) {
    const paragraphs = splitIntoParagraphs(text);
    const totalDuration = Math.max(5, paragraphs.length * 3); // Estimate ~3 min per segment

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">YouTube Chapters</h2>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-bottom:16px;">Auto-generated chapter markers for your video</p>\n';

    html += '<div style="border:1px solid var(--line);border-radius:9px;padding:16px 18px;background:var(--card);line-height:2;">\n';

    const chapterCount = Math.min(10, paragraphs.length);
    const interval = Math.ceil(totalDuration / chapterCount);

    for (let i = 0; i < chapterCount; i++) {
      const minutes = i * interval;
      const secs = 0;
      const timeStr = String(minutes).padStart(2, '0') + ':' + String(secs).padStart(2, '0');

      // Generate chapter title from paragraph content
      let title = paragraphs[i] ? paragraphs[i].split(/\s+/).slice(0, 6).join(' ') : 'Section ' + (i + 1);
      if (title.length > 50) title = title.substring(0, 47) + '...';
      title = capitalize(title);

      html += '<p style="margin-bottom:4px;"><span style="font-weight:800;color:var(--accent);font-family:monospace;">' + timeStr + '</span> ' + escHtml(title) + '</p>\n';
    }

    html += '</div>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-top:12px;">Tip: Adjust timestamps to match your actual video timing.</p>';

    return html;
  }

  // === Generate Shorts Ideas ===
  function generateShorts(text) {
    const sentences = splitIntoSentences(text);
    const shortsIdeas = [];

    // Find short, punchy quotes (20-100 chars, impactful)
    sentences.forEach(s => {
      const trimmed = s.trim();
      if (trimmed.length >= 20 && trimmed.length <= 150) {
        shortsIdeas.push(trimmed);
      }
    });

    // Score by engagement potential (questions, exclamations, strong words)
    const scored = shortsIdeas.map(s => {
      let score = 0;
      if (s.endsWith('?')) score += 3;
      if (s.endsWith('!')) score += 2;
      if (/\b(amazing|incredible|important|critical|secret|best|worst|never|always)\b/i.test(s)) score += 2;
      if (s.length < 80) score += 1;
      return { text: s, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const selected = scored.slice(0, 5);

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">YouTube Shorts Ideas</h2>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-bottom:16px;">Short, engaging clips from your content</p>\n';

    if (selected.length > 0) {
      html += '<div style="display:flex;flex-direction:column;gap:12px;">\n';
      selected.forEach((item, i) => {
        html += '<div style="border:1px solid var(--line);border-radius:9px;padding:14px 16px;background:var(--card);">';
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">';
        html += '<span style="color:var(--accent);font-weight:800;">&#9889; Short #' + (i + 1) + '</span>';
        html += '<span style="font-size:11px;color:var(--muted);">' + item.text.length + ' chars</span>';
        html += '</div>';
        html += '<p style="line-height:1.6;font-weight:600;font-size:14px;">"' + escHtml(item.text) + '"</p>';
        html += '</div>\n';
      });
      html += '</div>\n';
    } else {
      html += '<p style="color:var(--muted);font-style:italic;">No suitable shorts content found. Try a longer transcript with punchy statements.</p>';
    }

    return html;
  }

  // === Generate Podcast Notes ===
  function generatePodcastNotes(text) {
    const sentences = splitIntoSentences(text);
    const paragraphs = splitIntoParagraphs(text);
    const keywords = extractKeywords(text, 8);

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">Podcast Show Notes</h2>\n';
    html += '<div style="border:1px solid var(--line);border-radius:9px;padding:18px 20px;background:var(--card);line-height:1.8;">\n';

    // Episode summary
    html += '<p style="font-weight:800;margin-bottom:6px;font-size:15px;">Episode Summary</p>\n';
    const summary = sentences.slice(0, 3).join(' ');
    html += '<p style="margin-bottom:16px;color:var(--muted);">' + escHtml(summary) + '</p>\n';

    // Key Topics
    html += '<p style="font-weight:800;margin-bottom:8px;font-size:15px;">Key Topics Discussed</p>\n';
    html += '<ul style="list-style:none;padding:0;margin-bottom:16px;">\n';
    const topicCount = Math.min(6, paragraphs.length);
    for (let i = 0; i < topicCount; i++) {
      const topic = paragraphs[i].split(/\s+/).slice(0, 8).join(' ');
      const minutes = i * Math.ceil(30 / topicCount);
      html += '<li style="margin-bottom:6px;padding-left:18px;position:relative;"><span style="position:absolute;left:0;color:var(--accent);">&#8226;</span>[' + String(minutes).padStart(2, '0') + ':00] ' + escHtml(capitalize(topic)) + '</li>\n';
    }
    html += '</ul>\n';

    // Keywords
    html += '<p style="font-weight:800;margin-bottom:6px;font-size:15px;">Keywords</p>\n';
    html += '<p style="color:var(--muted);">' + escHtml(keywords.join(' | ')) + '</p>\n';

    html += '</div>\n';
    return html;
  }

  // === Helper Functions ===
  function splitIntoSentences(text) {
    return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  }

  function splitIntoParagraphs(text) {
    let paras = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (paras.length <= 1) {
      const sentences = splitIntoSentences(text);
      paras = [];
      const groupSize = Math.max(2, Math.ceil(sentences.length / 5));
      for (let i = 0; i < sentences.length; i += groupSize) {
        paras.push(sentences.slice(i, i + groupSize).join(' '));
      }
    }
    return paras.filter(p => p.trim().length > 0);
  }

  function extractKeywords(text, count) {
    const stopWords = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','can','this','that','these','those','it','its','i','you','he','she','we','they','me','him','her','us','them','my','your','his','our','their','what','which','who','whom','when','where','why','how','all','each','every','both','few','more','most','other','some','such','no','not','only','same','so','than','too','very','just','because','as','until','while','about','between','through','during','before','after','above','below','up','down','out','off','over','under','again','further','then','once']);
    const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));

    const freq = {};
    words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(e => e[0]);
  }

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
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
    const filename = 'squicky-creator-' + currentType + '-' + Date.now() + '.txt';
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
