// ===== BUSINESS STUDIO JS =====
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
  const tabs = document.querySelectorAll('.bs-tab');
  const directInput = document.getElementById('directInput');

  let currentTranscript = '';
  let currentType = 'sales';

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
      inputPreview.innerHTML = '<p class="bs-placeholder">No transcript found for this source. Try recording or uploading audio first.</p>';
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
      case 'sales':
        output = generateSalesSummary(currentTranscript);
        break;
      case 'customer':
        output = generateCustomerNotes(currentTranscript);
        break;
      case 'crm':
        output = generateCRMNotes(currentTranscript);
        break;
      case 'followup':
        output = generateFollowUps(currentTranscript);
        break;
      case 'risks':
        output = generateRisksOpportunities(currentTranscript);
        break;
    }

    outputBox.innerHTML = output;
    showToast('Business intelligence generated!');
  }

  generateBtn.addEventListener('click', generateContent);

  // === Clear output ===
  clearOutputBtn.addEventListener('click', () => {
    outputBox.innerHTML = '';
    showToast('Output cleared');
  });

  // === Generate Sales Call Summary ===
  function generateSalesSummary(text) {
    const sentences = splitIntoSentences(text);
    const keyPoints = [];

    sentences.forEach(s => {
      const trimmed = s.trim();
      if (trimmed.length > 15 && keyPoints.length < 12) {
        keyPoints.push(trimmed);
      }
    });

    const summaryCount = Math.max(3, Math.ceil(keyPoints.length * 0.4));
    const selected = keyPoints.slice(0, summaryCount);

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">Sales Call Summary</h2>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-bottom:16px;">Generated on ' + new Date().toLocaleDateString() + ' | ' + sentences.length + ' sentences analyzed</p>\n';

    // Overview
    html += '<div style="border:1px solid var(--line);border-radius:9px;padding:14px 16px;background:var(--card);margin-bottom:14px;">\n';
    html += '<p style="font-weight:800;margin-bottom:8px;font-size:14px;">Call Overview</p>\n';
    html += '<p style="line-height:1.7;color:var(--muted);">' + escHtml(selected.slice(0, 3).join(' ')) + '</p>\n';
    html += '</div>\n';

    // Key Points
    html += '<p style="font-weight:800;margin-bottom:10px;font-size:14px;">Key Discussion Points</p>\n';
    html += '<ul style="list-style:none;padding:0;">\n';
    selected.forEach(point => {
      html += '<li style="margin-bottom:8px;padding-left:18px;position:relative;line-height:1.7;"><span style="position:absolute;left:0;color:var(--accent);">&#8226;</span>' + escHtml(point) + '</li>\n';
    });
    html += '</ul>\n';

    // Word count / duration estimate
    const wordCount = text.split(/\s+/).length;
    const estMinutes = Math.ceil(wordCount / 150);
    html += '<p style="color:var(--muted);font-size:12px;margin-top:14px;">Estimated call duration: ~' + estMinutes + ' minutes (' + wordCount + ' words)</p>';

    return html;
  }

  // === Generate Customer Notes ===
  function generateCustomerNotes(text) {
    const sentences = splitIntoSentences(text);

    // Find customer mentions - pain points and needs
    const painKeywords = /\b(problem|issue|struggle|difficult|frustrated|pain|challenge|trouble|concern|worry|complaint|annoying|broken|failing|doesn't work|can't|unable|slow|expensive|costly)\b/i;
    const needKeywords = /\b(need|want|looking for|require|wish|hope|expect|prefer|interested in|would like|must have|important to|essential|priority)\b/i;

    const painPoints = [];
    const needs = [];
    const mentions = [];

    sentences.forEach(s => {
      const trimmed = s.trim();
      if (painKeywords.test(trimmed)) {
        painPoints.push(trimmed);
      }
      if (needKeywords.test(trimmed)) {
        needs.push(trimmed);
      }
      // General customer mentions (sentences with customer-related language)
      if (/\b(customer|client|user|buyer|prospect|account)\b/i.test(trimmed)) {
        mentions.push(trimmed);
      }
    });

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">Customer Notes</h2>\n';

    // Pain Points
    html += '<div style="margin-bottom:16px;">\n';
    html += '<p style="font-weight:800;margin-bottom:10px;font-size:14px;color:#e74c3c;">Pain Points (' + painPoints.length + ')</p>\n';
    if (painPoints.length > 0) {
      painPoints.forEach(p => {
        html += '<div style="border-left:3px solid #e74c3c;padding:8px 14px;margin-bottom:8px;background:rgba(231,76,60,.05);border-radius:0 8px 8px 0;">';
        html += '<p style="line-height:1.6;font-size:13px;">' + escHtml(p) + '</p>';
        html += '</div>\n';
      });
    } else {
      html += '<p style="color:var(--muted);font-style:italic;font-size:13px;">No pain points detected.</p>\n';
    }
    html += '</div>\n';

    // Needs
    html += '<div style="margin-bottom:16px;">\n';
    html += '<p style="font-weight:800;margin-bottom:10px;font-size:14px;color:#3498db;">Customer Needs (' + needs.length + ')</p>\n';
    if (needs.length > 0) {
      needs.forEach(n => {
        html += '<div style="border-left:3px solid #3498db;padding:8px 14px;margin-bottom:8px;background:rgba(52,152,219,.05);border-radius:0 8px 8px 0;">';
        html += '<p style="line-height:1.6;font-size:13px;">' + escHtml(n) + '</p>';
        html += '</div>\n';
      });
    } else {
      html += '<p style="color:var(--muted);font-style:italic;font-size:13px;">No explicit needs detected.</p>\n';
    }
    html += '</div>\n';

    // Customer mentions
    if (mentions.length > 0) {
      html += '<div>\n';
      html += '<p style="font-weight:800;margin-bottom:10px;font-size:14px;">Customer Mentions (' + mentions.length + ')</p>\n';
      mentions.slice(0, 8).forEach(m => {
        html += '<p style="margin-bottom:6px;padding-left:18px;position:relative;line-height:1.6;font-size:13px;"><span style="position:absolute;left:0;color:var(--accent);">&#8226;</span>' + escHtml(m) + '</p>\n';
      });
      html += '</div>\n';
    }

    return html;
  }

  // === Generate CRM Notes ===
  function generateCRMNotes(text) {
    const sentences = splitIntoSentences(text);
    const bulletPoints = [];

    // Extract concise CRM-ready bullet points
    sentences.forEach(s => {
      const trimmed = s.trim();
      if (trimmed.length > 10 && trimmed.length < 200) {
        // Shorten long sentences
        let point = trimmed;
        if (point.length > 100) {
          point = point.substring(0, 97) + '...';
        }
        bulletPoints.push(point);
      }
    });

    // Limit to 15 points
    const selected = bulletPoints.slice(0, 15);

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">CRM Notes</h2>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-bottom:16px;">Short bullet-point format ready for CRM entry</p>\n';

    html += '<div style="border:1px solid var(--line);border-radius:9px;padding:16px 18px;background:var(--card);">\n';
    html += '<p style="font-weight:800;margin-bottom:10px;font-size:13px;color:var(--muted);">Date: ' + new Date().toLocaleDateString() + '</p>\n';
    html += '<p style="font-weight:800;margin-bottom:10px;font-size:13px;color:var(--muted);">Type: Call/Meeting Notes</p>\n';
    html += '<hr style="border:none;border-top:1px solid var(--line);margin:12px 0;">\n';

    html += '<ul style="list-style:none;padding:0;">\n';
    selected.forEach(point => {
      html += '<li style="margin-bottom:6px;padding-left:16px;position:relative;line-height:1.6;font-size:13px;"><span style="position:absolute;left:0;">-</span>' + escHtml(point) + '</li>\n';
    });
    html += '</ul>\n';
    html += '</div>\n';

    html += '<p style="color:var(--muted);font-size:12px;margin-top:12px;">' + selected.length + ' bullet points generated. Copy and paste into your CRM.</p>';

    return html;
  }

  // === Generate Follow-up Tasks ===
  function generateFollowUps(text) {
    const sentences = splitIntoSentences(text);
    const followUpKeywords = /\b(follow up|next step|get back|reach out|send|schedule|call back|email|contact|check in|circle back|reconnect|touch base|arrange|set up|book|plan|prepare|draft|share|forward|provide|update|confirm|let .* know)\b/i;
    const actionKeywords = /\b(need to|should|must|will|going to|have to|want to|plan to|intend to|aim to)\b/i;

    const followUps = [];
    const nextSteps = [];

    sentences.forEach(s => {
      const trimmed = s.trim();
      if (followUpKeywords.test(trimmed)) {
        followUps.push(trimmed);
      } else if (actionKeywords.test(trimmed) && trimmed.length > 15) {
        nextSteps.push(trimmed);
      }
    });

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">Follow-up Tasks</h2>\n';

    // Follow-ups
    html += '<div style="margin-bottom:16px;">\n';
    html += '<p style="font-weight:800;margin-bottom:10px;font-size:14px;">Direct Follow-ups (' + followUps.length + ')</p>\n';
    if (followUps.length > 0) {
      html += '<div style="display:flex;flex-direction:column;gap:8px;">\n';
      followUps.forEach((item, i) => {
        html += '<div style="border:1px solid var(--line);border-radius:8px;padding:10px 14px;background:var(--card);display:flex;align-items:flex-start;gap:10px;">';
        html += '<input type="checkbox" style="margin-top:4px;accent-color:var(--accent);width:16px;height:16px;">';
        html += '<p style="line-height:1.6;flex:1;font-size:13px;">' + escHtml(item) + '</p>';
        html += '</div>\n';
      });
      html += '</div>\n';
    } else {
      html += '<p style="color:var(--muted);font-style:italic;font-size:13px;">No direct follow-ups detected.</p>\n';
    }
    html += '</div>\n';

    // Next Steps
    if (nextSteps.length > 0) {
      html += '<div>\n';
      html += '<p style="font-weight:800;margin-bottom:10px;font-size:14px;">Additional Next Steps (' + Math.min(nextSteps.length, 8) + ')</p>\n';
      html += '<div style="display:flex;flex-direction:column;gap:8px;">\n';
      nextSteps.slice(0, 8).forEach(item => {
        html += '<div style="border:1px solid var(--line);border-radius:8px;padding:10px 14px;background:var(--card);display:flex;align-items:flex-start;gap:10px;">';
        html += '<input type="checkbox" style="margin-top:4px;accent-color:var(--accent);width:16px;height:16px;">';
        html += '<p style="line-height:1.6;flex:1;font-size:13px;">' + escHtml(item) + '</p>';
        html += '</div>\n';
      });
      html += '</div>\n';
      html += '</div>\n';
    }

    return html;
  }

  // === Generate Risks/Opportunities ===
  function generateRisksOpportunities(text) {
    const sentences = splitIntoSentences(text);
    const riskKeywords = /\b(concern|issue|problem|risk|worry|threat|challenge|difficult|obstacle|blocker|delay|budget|expensive|costly|losing|decline|decrease|fail|failure|uncertain|doubt|hesitant|competitor|switching)\b/i;
    const opportunityKeywords = /\b(interested|excited|potential|opportunity|growth|expand|increase|improve|upgrade|invest|partner|collaborate|eager|positive|enthusiastic|ready|willing|open to|love|great|amazing|perfect|ideal)\b/i;

    const risks = [];
    const opportunities = [];

    sentences.forEach(s => {
      const trimmed = s.trim();
      if (riskKeywords.test(trimmed)) {
        risks.push(trimmed);
      }
      if (opportunityKeywords.test(trimmed)) {
        opportunities.push(trimmed);
      }
    });

    let html = '<h2 style="margin-bottom:14px;font-size:18px;color:var(--accent2);">Risk &amp; Opportunity Analysis</h2>\n';
    html += '<p style="color:var(--muted);font-size:12px;margin-bottom:16px;">Automated sentiment analysis from call transcript</p>\n';

    // Risks
    html += '<div style="margin-bottom:20px;">\n';
    html += '<p style="font-weight:800;margin-bottom:10px;font-size:14px;color:#e74c3c;">&#9888; Risks &amp; Concerns (' + risks.length + ')</p>\n';
    if (risks.length > 0) {
      risks.forEach(r => {
        html += '<div style="border-left:3px solid #e74c3c;padding:8px 14px;margin-bottom:8px;background:rgba(231,76,60,.05);border-radius:0 8px 8px 0;">';
        html += '<p style="line-height:1.6;font-size:13px;">' + escHtml(r) + '</p>';
        html += '</div>\n';
      });
    } else {
      html += '<p style="color:var(--muted);font-style:italic;font-size:13px;">No risks or concerns detected in this transcript.</p>\n';
    }
    html += '</div>\n';

    // Opportunities
    html += '<div>\n';
    html += '<p style="font-weight:800;margin-bottom:10px;font-size:14px;color:#27ae60;">&#9889; Opportunities (' + opportunities.length + ')</p>\n';
    if (opportunities.length > 0) {
      opportunities.forEach(o => {
        html += '<div style="border-left:3px solid #27ae60;padding:8px 14px;margin-bottom:8px;background:rgba(39,174,96,.05);border-radius:0 8px 8px 0;">';
        html += '<p style="line-height:1.6;font-size:13px;">' + escHtml(o) + '</p>';
        html += '</div>\n';
      });
    } else {
      html += '<p style="color:var(--muted);font-style:italic;font-size:13px;">No clear opportunities detected in this transcript.</p>\n';
    }
    html += '</div>\n';

    // Summary score
    const total = risks.length + opportunities.length;
    const oppPercent = total > 0 ? Math.round((opportunities.length / total) * 100) : 0;
    html += '<div style="margin-top:16px;border:1px solid var(--line);border-radius:9px;padding:12px 16px;background:var(--card);text-align:center;">';
    html += '<p style="font-size:12px;color:var(--muted);">Sentiment Score: <span style="font-weight:800;color:' + (oppPercent >= 50 ? '#27ae60' : '#e74c3c') + ';">' + oppPercent + '% positive</span></p>';
    html += '</div>\n';

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
    const filename = 'squicky-business-' + currentType + '-' + Date.now() + '.txt';
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
