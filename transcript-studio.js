// ============================================================
// SQUICKY STT2 - Transcript Studio Module
// Edit, search, annotate transcripts with speakers & timestamps
// ============================================================

// ===== DOM ELEMENTS =====
const themeBtn = document.getElementById('themeBtn');
const themeLabel = document.getElementById('themeLabel');
const themeMenu = document.getElementById('themeMenu');
const toast = document.getElementById('toast');

// Toolbar
const searchToggleBtn = document.getElementById('searchToggleBtn');
const speakerToggleBtn = document.getElementById('speakerToggleBtn');
const timestampToggleBtn = document.getElementById('timestampToggleBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const copyAllBtn = document.getElementById('copyAllBtn');
const copySelectedBtn = document.getElementById('copySelectedBtn');
const wordCountEl = document.getElementById('wordCount');

// Search
const searchPanel = document.getElementById('searchPanel');
const searchInput = document.getElementById('searchInput');
const matchCount = document.getElementById('matchCount');
const prevMatchBtn = document.getElementById('prevMatchBtn');
const nextMatchBtn = document.getElementById('nextMatchBtn');
const searchCloseBtn = document.getElementById('searchCloseBtn');
const replaceInput = document.getElementById('replaceInput');
const replaceBtn = document.getElementById('replaceBtn');
const replaceAllBtn = document.getElementById('replaceAllBtn');

// Speaker
const speakerPanel = document.getElementById('speakerPanel');
const speakerSelect = document.getElementById('speakerSelect');
const newSpeakerInput = document.getElementById('newSpeakerInput');
const addSpeakerBtn = document.getElementById('addSpeakerBtn');
const assignSpeakerBtn = document.getElementById('assignSpeakerBtn');

// Timestamps
const timestampPanel = document.getElementById('timestampPanel');
const timestampInput = document.getElementById('timestampInput');
const insertTimestampBtn = document.getElementById('insertTimestampBtn');
const durationInput = document.getElementById('durationInput');
const autoTimestampBtn = document.getElementById('autoTimestampBtn');

// Copy options
const includeTimestamps = document.getElementById('includeTimestamps');
const includeSpeakers = document.getElementById('includeSpeakers');

// Editor
const transcriptEditor = document.getElementById('transcriptEditor');
const editorPlaceholder = document.getElementById('editorPlaceholder');
const lineNumbers = document.getElementById('lineNumbers');
const autoSaveStatus = document.getElementById('autoSaveStatus');
const editStatus = document.getElementById('editStatus');

// ===== STATE =====
let undoStack = [];
let redoStack = [];
let currentMatchIndex = -1;
let matchElements = [];
let autoSaveTimer = null;
let lastSavedContent = '';
let speakers = ['Speaker 1', 'Speaker 2', 'Speaker 3', 'Speaker 4'];

// ===== THEME SWITCHING =====
function toggleMenu() {
    themeMenu.classList.toggle('open');
}
themeBtn.onclick = toggleMenu;
themeLabel.onclick = toggleMenu;

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

// ===== TOAST =====
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// ===== PLACEHOLDER MANAGEMENT =====
function checkPlaceholder() {
    const text = transcriptEditor.textContent.trim();
    if (!text || text === editorPlaceholder.textContent) {
        editorPlaceholder.style.display = 'block';
    } else {
        editorPlaceholder.style.display = 'none';
    }
}

// ===== LOAD TRANSCRIPT FROM LOCALSTORAGE =====
function loadTranscript() {
    // Try loading from Transcript Studio save first
    const savedStudio = localStorage.getItem('squickyTranscriptStudio');
    if (savedStudio) {
        try {
            const data = JSON.parse(savedStudio);
            transcriptEditor.innerHTML = data.html || '';
            lastSavedContent = transcriptEditor.innerHTML;
            if (data.speakers && data.speakers.length > 0) {
                speakers = data.speakers;
                rebuildSpeakerSelect();
            }
            checkPlaceholder();
            updateWordCount();
            updateLineNumbers();
            return;
        } catch (e) {
            // Fall through to other sources
        }
    }

    // Try loading from main speech page
    const liveTranscript = localStorage.getItem('squickyLiveTranscript');
    const uploadTranscript = localStorage.getItem('squickyUploadTranscript');
    const transcript = liveTranscript || uploadTranscript;

    if (transcript && transcript.trim()) {
        // Convert plain text to paragraphs
        const paragraphs = transcript.trim().split(/\n+/);
        let html = '';
        paragraphs.forEach(p => {
            if (p.trim()) {
                html += '<p>' + escapeHtml(p.trim()) + '</p>';
            }
        });
        transcriptEditor.innerHTML = html || '<p>' + escapeHtml(transcript.trim()) + '</p>';
        lastSavedContent = transcriptEditor.innerHTML;
        checkPlaceholder();
        updateWordCount();
        updateLineNumbers();
        showToast('Transcript loaded from Speech Engine');
    } else {
        checkPlaceholder();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== AUTO-SAVE =====
function scheduleAutoSave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveStatus.textContent = 'Unsaved changes...';
    autoSaveTimer = setTimeout(() => {
        saveTranscript();
    }, 1500);
}

function saveTranscript() {
    const html = transcriptEditor.innerHTML;
    if (html === lastSavedContent) return;
    lastSavedContent = html;
    const data = {
        html: html,
        speakers: speakers,
        savedAt: new Date().toISOString()
    };
    try {
        localStorage.setItem('squickyTranscriptStudio', JSON.stringify(data));
        autoSaveStatus.textContent = 'Auto-saved';
    } catch (e) {
        autoSaveStatus.textContent = 'Save failed (storage full)';
        console.error('Failed to save transcript:', e);
    }
}

// ===== WORD COUNT =====
function updateWordCount() {
    const text = getPlainText();
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    wordCountEl.textContent = words + ' words | ' + chars + ' chars';
}

function getPlainText() {
    const clone = transcriptEditor.cloneNode(true);
    // Remove highlights for clean text
    clone.querySelectorAll('.ts-highlight').forEach(el => {
        el.replaceWith(el.textContent);
    });
    return clone.textContent || '';
}

// ===== LINE NUMBERS =====
function updateLineNumbers() {
    const paragraphs = transcriptEditor.querySelectorAll('p, div:not(.ts-placeholder)');
    let count = Math.max(paragraphs.length, 1);
    // Fallback: count by newlines in textContent
    if (count <= 1) {
        const text = transcriptEditor.textContent || '';
        count = text.split('\n').length;
    }
    let html = '';
    for (let i = 1; i <= count; i++) {
        html += '<div class="ts-line-num">' + i + '</div>';
    }
    lineNumbers.innerHTML = html;
}

// ===== UNDO/REDO =====
function pushUndo() {
    undoStack.push(transcriptEditor.innerHTML);
    if (undoStack.length > 100) undoStack.shift();
    redoStack = [];
}

function performUndo() {
    if (undoStack.length === 0) {
        showToast('Nothing to undo');
        return;
    }
    redoStack.push(transcriptEditor.innerHTML);
    transcriptEditor.innerHTML = undoStack.pop();
    updateWordCount();
    updateLineNumbers();
    scheduleAutoSave();
    editStatus.textContent = 'Undone';
}

function performRedo() {
    if (redoStack.length === 0) {
        showToast('Nothing to redo');
        return;
    }
    undoStack.push(transcriptEditor.innerHTML);
    transcriptEditor.innerHTML = redoStack.pop();
    updateWordCount();
    updateLineNumbers();
    scheduleAutoSave();
    editStatus.textContent = 'Redone';
}

undoBtn.addEventListener('click', performUndo);
redoBtn.addEventListener('click', performRedo);

// ===== SEARCH & REPLACE =====
function toggleSearchPanel() {
    const isVisible = searchPanel.style.display !== 'none';
    searchPanel.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
        searchInput.focus();
    } else {
        clearHighlights();
    }
}

searchToggleBtn.addEventListener('click', toggleSearchPanel);
searchCloseBtn.addEventListener('click', () => {
    searchPanel.style.display = 'none';
    clearHighlights();
});

function clearHighlights() {
    const highlights = transcriptEditor.querySelectorAll('.ts-highlight');
    highlights.forEach(el => {
        const parent = el.parentNode;
        parent.replaceChild(document.createTextNode(el.textContent), el);
        parent.normalize();
    });
    matchElements = [];
    currentMatchIndex = -1;
    matchCount.textContent = '0 matches';
}

function performSearch() {
    clearHighlights();
    const query = searchInput.value.trim();
    if (!query) {
        matchCount.textContent = '0 matches';
        return;
    }

    // Walk through text nodes and highlight matches
    const treeWalker = document.createTreeWalker(
        transcriptEditor,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                if (node.parentElement.classList.contains('ts-placeholder')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const textNodes = [];
    while (treeWalker.nextNode()) {
        textNodes.push(treeWalker.currentNode);
    }

    const lowerQuery = query.toLowerCase();
    let totalMatches = 0;

    textNodes.forEach(node => {
        const text = node.textContent;
        const lowerText = text.toLowerCase();
        let startIndex = 0;
        const indices = [];

        while (true) {
            const idx = lowerText.indexOf(lowerQuery, startIndex);
            if (idx === -1) break;
            indices.push(idx);
            startIndex = idx + 1;
        }

        if (indices.length === 0) return;

        const fragment = document.createDocumentFragment();
        let lastEnd = 0;

        indices.forEach(idx => {
            // Text before match
            if (idx > lastEnd) {
                fragment.appendChild(document.createTextNode(text.substring(lastEnd, idx)));
            }
            // Highlighted match
            const span = document.createElement('span');
            span.className = 'ts-highlight';
            span.textContent = text.substring(idx, idx + query.length);
            fragment.appendChild(span);
            lastEnd = idx + query.length;
            totalMatches++;
        });

        // Remaining text
        if (lastEnd < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastEnd)));
        }

        node.parentNode.replaceChild(fragment, node);
    });

    matchElements = Array.from(transcriptEditor.querySelectorAll('.ts-highlight'));
    matchCount.textContent = totalMatches + ' matches';

    if (totalMatches > 0) {
        currentMatchIndex = 0;
        highlightCurrent();
    }
}

function highlightCurrent() {
    matchElements.forEach((el, i) => {
        el.classList.remove('ts-highlight-active');
        if (i === currentMatchIndex) {
            el.classList.add('ts-highlight-active');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
    if (matchElements.length > 0) {
        matchCount.textContent = (currentMatchIndex + 1) + ' of ' + matchElements.length + ' matches';
    }
}

function nextMatch() {
    if (matchElements.length === 0) return;
    currentMatchIndex = (currentMatchIndex + 1) % matchElements.length;
    highlightCurrent();
}

function prevMatch() {
    if (matchElements.length === 0) return;
    currentMatchIndex = (currentMatchIndex - 1 + matchElements.length) % matchElements.length;
    highlightCurrent();
}

searchInput.addEventListener('input', performSearch);
nextMatchBtn.addEventListener('click', nextMatch);
prevMatchBtn.addEventListener('click', prevMatch);

// Replace current match
replaceBtn.addEventListener('click', () => {
    if (matchElements.length === 0 || currentMatchIndex < 0) {
        showToast('No match selected');
        return;
    }
    pushUndo();
    const replaceText = replaceInput.value;
    const el = matchElements[currentMatchIndex];
    el.replaceWith(document.createTextNode(replaceText));
    performSearch();
    updateWordCount();
    scheduleAutoSave();
    showToast('Replaced');
});

// Replace all
replaceAllBtn.addEventListener('click', () => {
    if (matchElements.length === 0) {
        showToast('No matches to replace');
        return;
    }
    pushUndo();
    const replaceText = replaceInput.value;
    const count = matchElements.length;
    matchElements.forEach(el => {
        el.replaceWith(document.createTextNode(replaceText));
    });
    matchElements = [];
    currentMatchIndex = -1;
    matchCount.textContent = '0 matches';
    updateWordCount();
    scheduleAutoSave();
    showToast('Replaced ' + count + ' matches');
});

// ===== SPEAKER LABELS =====
function toggleSpeakerPanel() {
    const isVisible = speakerPanel.style.display !== 'none';
    speakerPanel.style.display = isVisible ? 'none' : 'block';
}

speakerToggleBtn.addEventListener('click', toggleSpeakerPanel);

function rebuildSpeakerSelect() {
    speakerSelect.innerHTML = '<option value="">-- Select Speaker --</option>';
    speakers.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s;
        opt.textContent = s;
        speakerSelect.appendChild(opt);
    });
}

addSpeakerBtn.addEventListener('click', () => {
    const name = newSpeakerInput.value.trim();
    if (!name) {
        showToast('Enter a speaker name');
        return;
    }
    if (speakers.includes(name)) {
        showToast('Speaker already exists');
        return;
    }
    speakers.push(name);
    rebuildSpeakerSelect();
    speakerSelect.value = name;
    newSpeakerInput.value = '';
    scheduleAutoSave();
    showToast('Speaker "' + name + '" added');
});

assignSpeakerBtn.addEventListener('click', () => {
    const speaker = speakerSelect.value;
    if (!speaker) {
        showToast('Select a speaker first');
        return;
    }

    // Find the paragraph the cursor is in
    const sel = window.getSelection();
    if (!sel.rangeCount) {
        showToast('Click inside a paragraph first');
        return;
    }

    let node = sel.anchorNode;
    // Walk up to find the paragraph
    while (node && node !== transcriptEditor) {
        if (node.nodeType === 1 && (node.tagName === 'P' || node.tagName === 'DIV') && node.parentNode === transcriptEditor) {
            break;
        }
        node = node.parentNode;
    }

    if (!node || node === transcriptEditor) {
        showToast('Click inside a paragraph to assign speaker');
        return;
    }

    pushUndo();

    // Remove existing speaker badge if present
    const existingBadge = node.querySelector('.ts-speaker-badge');
    if (existingBadge) {
        existingBadge.remove();
    }

    // Add new speaker badge
    const badge = document.createElement('span');
    badge.className = 'ts-speaker-badge';
    badge.setAttribute('data-speaker', speaker);
    badge.textContent = speaker;
    // Assign color based on speaker index
    const colorIndex = speakers.indexOf(speaker) % 6;
    badge.setAttribute('data-color', colorIndex.toString());
    node.insertBefore(badge, node.firstChild);

    updateWordCount();
    scheduleAutoSave();
    showToast('Assigned: ' + speaker);
});

// ===== TIMESTAMPS =====
function toggleTimestampPanel() {
    const isVisible = timestampPanel.style.display !== 'none';
    timestampPanel.style.display = isVisible ? 'none' : 'block';
}

timestampToggleBtn.addEventListener('click', toggleTimestampPanel);

function formatTime(totalSeconds) {
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(Math.floor(totalSeconds % 60)).padStart(2, '0');
    return h + ':' + m + ':' + s;
}

function parseTime(timeStr) {
    const parts = timeStr.split(':');
    if (parts.length !== 3) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseInt(parts[2], 10);
    if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
    return h * 3600 + m * 60 + s;
}

insertTimestampBtn.addEventListener('click', () => {
    let timeStr = timestampInput.value.trim();
    if (!timeStr) {
        showToast('Enter a timestamp (HH:MM:SS)');
        return;
    }

    // Validate format
    if (!/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
        showToast('Invalid format. Use HH:MM:SS');
        return;
    }

    const sel = window.getSelection();
    if (!sel.rangeCount) {
        showToast('Click in the transcript first');
        return;
    }

    let node = sel.anchorNode;
    while (node && node !== transcriptEditor) {
        if (node.nodeType === 1 && (node.tagName === 'P' || node.tagName === 'DIV') && node.parentNode === transcriptEditor) {
            break;
        }
        node = node.parentNode;
    }

    if (!node || node === transcriptEditor) {
        showToast('Click inside a paragraph first');
        return;
    }

    pushUndo();

    // Remove existing timestamp if present
    const existingTs = node.querySelector('.ts-timestamp');
    if (existingTs) {
        existingTs.remove();
    }

    // Insert timestamp element
    const tsEl = document.createElement('span');
    tsEl.className = 'ts-timestamp';
    tsEl.textContent = '[' + timeStr + ']';

    // Insert after speaker badge if exists, else at start
    const badge = node.querySelector('.ts-speaker-badge');
    if (badge) {
        badge.insertAdjacentElement('afterend', tsEl);
    } else {
        node.insertBefore(tsEl, node.firstChild);
    }

    scheduleAutoSave();
    showToast('Timestamp inserted');
});

autoTimestampBtn.addEventListener('click', () => {
    const duration = parseInt(durationInput.value, 10);
    if (!duration || duration <= 0) {
        showToast('Enter a valid duration in seconds');
        return;
    }

    pushUndo();

    const paragraphs = transcriptEditor.querySelectorAll('p, div:not(.ts-placeholder)');
    const count = paragraphs.length;
    if (count === 0) {
        showToast('No paragraphs to timestamp');
        return;
    }

    const interval = duration / count;

    paragraphs.forEach((p, i) => {
        // Remove existing timestamp
        const existingTs = p.querySelector('.ts-timestamp');
        if (existingTs) existingTs.remove();

        const seconds = Math.round(i * interval);
        const tsEl = document.createElement('span');
        tsEl.className = 'ts-timestamp';
        tsEl.textContent = '[' + formatTime(seconds) + ']';

        // Insert after speaker badge if exists
        const badge = p.querySelector('.ts-speaker-badge');
        if (badge) {
            badge.insertAdjacentElement('afterend', tsEl);
        } else {
            p.insertBefore(tsEl, p.firstChild);
        }
    });

    scheduleAutoSave();
    showToast('Timestamps auto-calculated for ' + count + ' paragraphs');
});

// ===== COPY FUNCTIONALITY =====
function getFormattedText(selectedOnly) {
    let sourceEl;
    if (selectedOnly) {
        const sel = window.getSelection();
        if (!sel.rangeCount || sel.isCollapsed) {
            return null;
        }
        const container = document.createElement('div');
        container.appendChild(sel.getRangeAt(0).cloneContents());
        sourceEl = container;
    } else {
        sourceEl = transcriptEditor.cloneNode(true);
    }

    // Remove placeholder
    const ph = sourceEl.querySelector('.ts-placeholder');
    if (ph) ph.remove();

    // Remove highlights
    sourceEl.querySelectorAll('.ts-highlight').forEach(el => {
        el.replaceWith(el.textContent);
    });

    // Process based on toggle settings
    const withTimestamps = includeTimestamps.checked;
    const withSpeakers = includeSpeakers.checked;

    if (!withTimestamps) {
        sourceEl.querySelectorAll('.ts-timestamp').forEach(el => el.remove());
    }
    if (!withSpeakers) {
        sourceEl.querySelectorAll('.ts-speaker-badge').forEach(el => el.remove());
    }

    // Convert to text with line breaks between paragraphs
    const paragraphs = sourceEl.querySelectorAll('p, div');
    if (paragraphs.length > 0) {
        let text = '';
        paragraphs.forEach(p => {
            const line = p.textContent.trim();
            if (line) text += line + '\n';
        });
        return text.trim();
    }

    return sourceEl.textContent.trim();
}

copyAllBtn.addEventListener('click', () => {
    const text = getFormattedText(false);
    if (!text) {
        showToast('Nothing to copy');
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied all to clipboard!');
    }).catch(() => {
        fallbackCopy(text);
    });
});

copySelectedBtn.addEventListener('click', () => {
    const text = getFormattedText(true);
    if (!text) {
        showToast('Select some text first');
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied selection to clipboard!');
    }).catch(() => {
        fallbackCopy(text);
    });
});

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Copied!');
}

// ===== EDITOR EVENTS =====
transcriptEditor.addEventListener('focus', () => {
    if (editorPlaceholder.style.display !== 'none') {
        editorPlaceholder.style.display = 'none';
    }
});

transcriptEditor.addEventListener('blur', () => {
    checkPlaceholder();
});

transcriptEditor.addEventListener('input', () => {
    checkPlaceholder();
    updateWordCount();
    updateLineNumbers();
    scheduleAutoSave();
    editStatus.textContent = 'Editing...';
});

// Custom undo/redo to supplement browser's built-in
let inputTimer = null;
transcriptEditor.addEventListener('keydown', (e) => {
    // Capture state before changes for undo
    if (!e.ctrlKey && !e.metaKey && e.key.length === 1) {
        if (inputTimer) clearTimeout(inputTimer);
        inputTimer = setTimeout(() => {
            pushUndo();
        }, 500);
    }

    // Ctrl+Z / Cmd+Z = Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Let browser handle it naturally
        return;
    }

    // Ctrl+Y / Cmd+Y = Redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        // Let browser handle it naturally
        return;
    }

    // Ctrl+F = Open search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchPanel.style.display = 'block';
        searchInput.focus();
    }

    // Enter key: create new paragraph
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.execCommand('insertParagraph');
        updateLineNumbers();
    }
});

// Handle paste: clean pasted content
transcriptEditor.addEventListener('paste', (e) => {
    e.preventDefault();
    pushUndo();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    // Insert as paragraphs
    const paragraphs = text.split(/\n+/);
    let html = '';
    paragraphs.forEach(p => {
        if (p.trim()) {
            html += '<p>' + escapeHtml(p.trim()) + '</p>';
        }
    });

    if (html) {
        document.execCommand('insertHTML', false, html);
    } else {
        document.execCommand('insertText', false, text);
    }

    checkPlaceholder();
    updateWordCount();
    updateLineNumbers();
    scheduleAutoSave();
});

// Sync scroll between line numbers and editor
transcriptEditor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = transcriptEditor.scrollTop;
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
    // Ctrl+F: Search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchPanel.style.display = 'block';
        searchInput.focus();
    }

    // Escape: close panels
    if (e.key === 'Escape') {
        searchPanel.style.display = 'none';
        speakerPanel.style.display = 'none';
        timestampPanel.style.display = 'none';
        clearHighlights();
    }

    // Ctrl+S: manual save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveTranscript();
        showToast('Saved!');
    }
});

// ===== INITIALIZATION =====
function init() {
    loadTranscript();
    updateLineNumbers();
    updateWordCount();
    rebuildSpeakerSelect();
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
