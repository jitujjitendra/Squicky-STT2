// ===== CONTENT STUDIO JS =====
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
  const tabs = document.querySelectorAll('.cs-tab');
  const directInput = document.getElementById('directInput');

  let currentTranscript = '';
  let currentType = 'blog';

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
          // Extract plain text from HTML content
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
      inputPreview.innerHTML = '<p class="cs-placeholder">No transcript found for this source. Try recording or uploading audio first.</p>';
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
      case 'blog':
        output = generateBlog(currentTranscript);
        break;
      case 'summary':
        output = generateSummary(currentTranscript);
        break;
      case 'faq':
        output = generateFAQ(currentTranscript);
        break;
      case 'notes':
        output = generateNotes(currentTranscript);
        break;
      case 'article':
        output = generateArticle(currentTranscript);
        break;
      case 'social':
        output = generateSocial(currentTranscript);
        break;
    }

    outputBox.innerHTML = output;
    showToast('Content generated!');
  }

  generateBtn.addEventListener('click', generateContent);

  // === Clear output ===
  clearOutputBtn.addEventListener('click', () => {
    outputBox.innerHTML = '';
    showToast('Output cleared');
  });

  // === Generate Blog ===
  function generateBlog(text) {
    const paragraphs = splitIntoParagraphs(text);
    const title = generateTitle(text);
    const headings = generateHeadings(paragraphs);

    let html = '<h1 style="margin-bottom:12px;font-size:22px;">' + escHtml(title) + '</h1>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-bottom:18px;">Generated from transcript | ' + new Date().toLocaleDateString() + '</p>\n';

    paragraphs.forEach((para, i) => {
      if (headings[i]) {
        html += '<h2 style="margin:18px 0 8px;font-size:16px;color:var(--accent2);">' + escHtml(headings[i]) + '</h2>\n';
      }
      html += '<p style="margin-bottom:12px;line-height:1.7;">' + escHtml(para) + '</p>\n';
    });

    return html;
  }

  // === Generate Summary ===
  function generateSummary(text) {
    const sentences = splitIntoSentences(text);
    // Take first 20% of sentences or at least 3
    const count = Math.max(3, Math.ceil(sentences.length * 0.2));
    const summarySentences = sentences.slice(0, count);

    let html = '<h2 style="margin-bottom:12px;font-size:18px;color:var(--accent2);">Summary</h2>\n';
    html += '<p style="line-height:1.8;margin-bottom:12px;">' + escHtml(summarySentences.join(' ')) + '</p>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-top:14px;">Original: ' + sentences.length + ' sentences | Summary: ' + summarySentences.length + ' sentences (' + Math.round((summarySentences.length / sentences.length) * 100) + '% reduction)</p>';

    return html;
  }

  // === Generate FAQ ===
  function generateFAQ(text) {
    const sentences = splitIntoSentences(text);
    const questions = sentences.filter(s => s.trim().endsWith('?'));
    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">Frequently Asked Questions</h2>\n';

    if (questions.length > 0) {
      // Use existing questions from text
      questions.forEach((q, i) => {
        const answerIndex = sentences.indexOf(q) + 1;
        const answer = answerIndex < sentences.length ? sentences[answerIndex] : 'See transcript for details.';
        html += '<div style="margin-bottom:16px;">';
        html += '<p style="font-weight:800;margin-bottom:4px;">Q' + (i + 1) + ': ' + escHtml(q) + '</p>';
        html += '<p style="color:var(--muted);line-height:1.6;">A: ' + escHtml(answer) + '</p>';
        html += '</div>\n';
      });
    } else {
      // Generate FAQ-style Q&A from paragraphs
      const paragraphs = splitIntoParagraphs(text);
      const faqCount = Math.min(6, paragraphs.length);
      for (let i = 0; i < faqCount; i++) {
        const para = paragraphs[i];
        const firstSentence = splitIntoSentences(para)[0] || para;
        const question = generateQuestionFromText(firstSentence, i);
        html += '<div style="margin-bottom:16px;">';
        html += '<p style="font-weight:800;margin-bottom:4px;">Q' + (i + 1) + ': ' + escHtml(question) + '</p>';
        html += '<p style="color:var(--muted);line-height:1.6;">A: ' + escHtml(para) + '</p>';
        html += '</div>\n';
      }
    }

    return html;
  }

  // === Generate Notes ===
  function generateNotes(text) {
    const sentences = splitIntoSentences(text);
    // Pick key sentences (every 2nd or 3rd sentence for conciseness)
    const step = Math.max(1, Math.floor(sentences.length / 15));
    const keyPoints = [];
    for (let i = 0; i < sentences.length && keyPoints.length < 20; i += step) {
      if (sentences[i].trim().length > 10) {
        keyPoints.push(sentences[i].trim());
      }
    }

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">Key Notes</h2>\n';
    html += '<ul style="list-style:none;padding:0;">\n';
    keyPoints.forEach(point => {
      html += '<li style="margin-bottom:8px;padding-left:18px;position:relative;line-height:1.6;"><span style="position:absolute;left:0;color:var(--accent);">&#8226;</span>' + escHtml(point) + '</li>\n';
    });
    html += '</ul>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-top:14px;">' + keyPoints.length + ' key points extracted</p>';

    return html;
  }

  // === Generate Article ===
  function generateArticle(text) {
    const paragraphs = splitIntoParagraphs(text);
    const title = generateTitle(text);
    const totalParas = paragraphs.length;

    // Split into intro (first 20%), body (middle 60%), conclusion (last 20%)
    const introEnd = Math.max(1, Math.ceil(totalParas * 0.2));
    const conclusionStart = Math.max(introEnd + 1, totalParas - Math.ceil(totalParas * 0.2));

    const intro = paragraphs.slice(0, introEnd);
    const body = paragraphs.slice(introEnd, conclusionStart);
    const conclusion = paragraphs.slice(conclusionStart);

    let html = '<h1 style="margin-bottom:8px;font-size:22px;">' + escHtml(title) + '</h1>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-bottom:20px;">By Content Studio | ' + new Date().toLocaleDateString() + '</p>\n';

    html += '<h2 style="margin:16px 0 10px;font-size:16px;color:var(--accent2);">Introduction</h2>\n';
    intro.forEach(p => {
      html += '<p style="margin-bottom:10px;line-height:1.7;">' + escHtml(p) + '</p>\n';
    });

    html += '<h2 style="margin:16px 0 10px;font-size:16px;color:var(--accent2);">Main Content</h2>\n';
    if (body.length > 0) {
      body.forEach(p => {
        html += '<p style="margin-bottom:10px;line-height:1.7;">' + escHtml(p) + '</p>\n';
      });
    } else {
      html += '<p style="margin-bottom:10px;line-height:1.7;">' + escHtml(paragraphs.length > 1 ? paragraphs[1] : paragraphs[0]) + '</p>\n';
    }

    html += '<h2 style="margin:16px 0 10px;font-size:16px;color:var(--accent2);">Conclusion</h2>\n';
    if (conclusion.length > 0) {
      conclusion.forEach(p => {
        html += '<p style="margin-bottom:10px;line-height:1.7;">' + escHtml(p) + '</p>\n';
      });
    } else {
      html += '<p style="margin-bottom:10px;line-height:1.7;">' + escHtml(paragraphs[paragraphs.length - 1]) + '</p>\n';
    }

    return html;
  }

  // === Generate Social Media Posts ===
  function generateSocial(text) {
    const sentences = splitIntoSentences(text);
    const posts = [];

    // Extract short, impactful sentences that fit in 280 chars
    sentences.forEach(s => {
      const trimmed = s.trim();
      if (trimmed.length >= 20 && trimmed.length <= 280) {
        posts.push(trimmed);
      } else if (trimmed.length > 280) {
        // Truncate to 277 chars + '...'
        posts.push(trimmed.substring(0, 277) + '...');
      }
    });

    // Limit to 8 posts
    const selected = posts.slice(0, 8);

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">Social Media Posts</h2>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-bottom:16px;">Each post is optimized for 280 characters or less</p>\n';

    selected.forEach((post, i) => {
      const charCount = post.length;
      html += '<div style="border:1px solid var(--line);border-radius:9px;padding:14px 16px;margin-bottom:12px;background:var(--card);">';
      html += '<p style="line-height:1.6;margin-bottom:8px;">' + escHtml(post) + '</p>';
      html += '<span style="font-size:11px;color:var(--muted);">' + charCount + '/280 characters</span>';
      html += '</div>\n';
    });

    if (selected.length === 0) {
      html += '<p style="color:var(--muted);">No suitable content found for social media posts. Try a longer transcript.</p>';
    }

    return html;
  }

  // === Helper Functions ===
  function splitIntoParagraphs(text) {
    // Split by double newlines or after ~3-4 sentences
    let paras = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    if (paras.length <= 1) {
      // If no paragraph breaks, split by sentences into groups
      const sentences = splitIntoSentences(text);
      paras = [];
      const groupSize = Math.max(2, Math.ceil(sentences.length / 5));
      for (let i = 0; i < sentences.length; i += groupSize) {
        paras.push(sentences.slice(i, i + groupSize).join(' '));
      }
    }
    return paras.filter(p => p.trim().length > 0);
  }

  function splitIntoSentences(text) {
    return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  }

  function generateTitle(text) {
    const words = text.split(/\s+/).slice(0, 8);
    let title = words.join(' ');
    if (title.length > 60) title = title.substring(0, 57) + '...';
    // Capitalize first letter
    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  function generateHeadings(paragraphs) {
    const headings = [];
    paragraphs.forEach((para, i) => {
      if (i === 0) {
        headings.push('');
        return;
      }
      // Generate heading from first few words of the paragraph
      if (i % 2 === 0 || paragraphs.length <= 4) {
        const words = para.split(/\s+/).slice(0, 5);
        let heading = words.join(' ');
        if (heading.length > 40) heading = heading.substring(0, 37) + '...';
        headings.push(heading.charAt(0).toUpperCase() + heading.slice(1));
      } else {
        headings.push('');
      }
    });
    return headings;
  }

  function generateQuestionFromText(sentence, index) {
    const starters = [
      'What is discussed about',
      'Can you explain',
      'What are the key points regarding',
      'How does this relate to',
      'What should we know about',
      'Why is this important regarding'
    ];
    const words = sentence.split(/\s+/).slice(0, 6).join(' ').replace(/[.!?,;:]+$/, '');
    return starters[index % starters.length] + ' ' + words.toLowerCase() + '?';
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
      // Fallback
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
    const filename = 'squicky-' + currentType + '-' + Date.now() + '.txt';
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

  // === Auto-load on page open (try to load the best available transcript) ===
  function autoLoad() {
    // Try studio first, then live, then upload
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
