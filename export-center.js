// ============================================================
// SQUICKY STT2 - Export Center Module
// Export transcripts in TXT, PDF, SRT, VTT, JSON, CSV, DOCX
// ============================================================

// ===== DOM ELEMENTS =====
const themeBtn = document.getElementById('themeBtn');
const themeLabel = document.getElementById('themeLabel');
const themeMenu = document.getElementById('themeMenu');
const toast = document.getElementById('toast');

// Summary
const summaryWords = document.getElementById('summaryWords');
const summaryChars = document.getElementById('summaryChars');
const summaryDuration = document.getElementById('summaryDuration');
const summarySpeakers = document.getElementById('summarySpeakers');
const summarySource = document.getElementById('summarySource');

// Panels
const ecSummary = document.getElementById('ecSummary');
const ecNoTranscript = document.getElementById('ecNoTranscript');
const ecOptions = document.getElementById('ecOptions');
const ecFormats = document.getElementById('ecFormats');
const ecPreview = document.getElementById('ecPreview');

// Options
const optTimestamps = document.getElementById('optTimestamps');
const optSpeakers = document.getElementById('optSpeakers');
const optTitle = document.getElementById('optTitle');
const optMetadata = document.getElementById('optMetadata');
const exportTitle = document.getElementById('exportTitle');

// Preview
const previewBox = document.getElementById('previewBox');
const previewContent = document.getElementById('previewContent');

// Buttons
const exportAllBtn = document.getElementById('exportAllBtn');
const usePastedTextBtn = document.getElementById('usePastedTextBtn');
const pasteTranscriptInput = document.getElementById('pasteTranscriptInput');

// ===== STATE =====
let transcriptSegments = []; // Array of { speaker, timestamp, text }
let transcriptSource = '';
let transcriptSpeakers = [];
let activePreviewFormat = 'txt';

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

// ===== LOAD TRANSCRIPT DATA =====
function loadTranscriptData() {
    transcriptSegments = [];
    transcriptSpeakers = [];
    transcriptSource = '';

    // Priority 1: Transcript Studio (richest data)
    const savedStudio = localStorage.getItem('squickyTranscriptStudio');
    if (savedStudio) {
        try {
            const data = JSON.parse(savedStudio);
            if (data.html && data.html.trim()) {
                parseStudioHtml(data.html);
                if (data.speakers && data.speakers.length > 0) {
                    transcriptSpeakers = data.speakers;
                }
                transcriptSource = 'Transcript Studio';
                return true;
            }
        } catch (e) {
            // Fall through
        }
    }

    // Priority 2: Live transcript
    const liveTranscript = localStorage.getItem('squickyLiveTranscript');
    if (liveTranscript && liveTranscript.trim()) {
        parsePlainText(liveTranscript.trim());
        transcriptSource = 'Live Recording';
        return true;
    }

    // Priority 3: Upload transcript
    const uploadTranscript = localStorage.getItem('squickyUploadTranscript');
    if (uploadTranscript && uploadTranscript.trim()) {
        parsePlainText(uploadTranscript.trim());
        transcriptSource = 'File Upload';
        return true;
    }

    return false;
}

function parseStudioHtml(html) {
    const container = document.createElement('div');
    container.innerHTML = html;

    const paragraphs = container.querySelectorAll('p, div');
    const elements = paragraphs.length > 0 ? paragraphs : [container];

    elements.forEach(el => {
        const speakerBadge = el.querySelector('.ts-speaker-badge');
        const timestampEl = el.querySelector('.ts-timestamp');

        let speaker = '';
        let timestamp = '';
        let text = '';

        if (speakerBadge) {
            speaker = speakerBadge.getAttribute('data-speaker') || speakerBadge.textContent.trim();
        }

        if (timestampEl) {
            timestamp = timestampEl.textContent.replace(/[\[\]]/g, '').trim();
        }

        // Get text content excluding speaker badge and timestamp
        const clone = el.cloneNode(true);
        const badges = clone.querySelectorAll('.ts-speaker-badge');
        const timestamps = clone.querySelectorAll('.ts-timestamp');
        badges.forEach(b => b.remove());
        timestamps.forEach(t => t.remove());
        text = clone.textContent.trim();

        if (text) {
            transcriptSegments.push({ speaker, timestamp, text });
            if (speaker && !transcriptSpeakers.includes(speaker)) {
                transcriptSpeakers.push(speaker);
            }
        }
    });
}

function parsePlainText(text) {
    const lines = text.split(/\n+/);
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed) {
            transcriptSegments.push({ speaker: '', timestamp: '', text: trimmed });
        }
    });
}

// ===== UPDATE SUMMARY =====
function updateSummary() {
    const allText = transcriptSegments.map(s => s.text).join(' ');
    const wordCount = allText.trim() ? allText.trim().split(/\s+/).length : 0;
    const charCount = allText.length;
    // Estimated duration: average speaking rate ~150 words per minute
    const minutes = Math.round(wordCount / 150);
    const estDuration = minutes < 1 ? '< 1 min' : minutes + ' min';

    summaryWords.textContent = wordCount.toLocaleString();
    summaryChars.textContent = charCount.toLocaleString();
    summaryDuration.textContent = estDuration;
    summarySpeakers.textContent = transcriptSpeakers.length || 'None';
    summarySource.textContent = transcriptSource;
}

// ===== FORMAT TIME HELPERS =====
function formatTimeSRT(totalSeconds) {
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(Math.floor(totalSeconds % 60)).padStart(2, '0');
    const ms = String(Math.round((totalSeconds % 1) * 1000)).padStart(3, '0');
    return h + ':' + m + ':' + s + ',' + ms;
}

function formatTimeVTT(totalSeconds) {
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(Math.floor(totalSeconds % 60)).padStart(2, '0');
    const ms = String(Math.round((totalSeconds % 1) * 1000)).padStart(3, '0');
    return h + ':' + m + ':' + s + '.' + ms;
}

function parseTimestamp(ts) {
    if (!ts) return null;
    const parts = ts.split(':');
    if (parts.length === 3) {
        return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    if (parts.length === 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return null;
}

// ===== SUBTITLE SEGMENT BUILDER =====
// Splits transcript into subtitle-sized chunks (~40 words each) with timing
function buildSubtitleSegments() {
    const subtitles = [];
    const allText = transcriptSegments.map(s => s.text).join(' ');
    const totalWords = allText.trim().split(/\s+/);
    const totalWordCount = totalWords.length;

    // Check if we have real timestamps
    const hasTimestamps = transcriptSegments.some(s => s.timestamp);

    if (hasTimestamps) {
        // Use existing timestamps to define segments
        transcriptSegments.forEach((seg, i) => {
            const startTime = parseTimestamp(seg.timestamp) || 0;
            const nextSeg = transcriptSegments[i + 1];
            let endTime;
            if (nextSeg && nextSeg.timestamp) {
                endTime = parseTimestamp(nextSeg.timestamp);
            } else {
                // Estimate based on word count (~150 wpm = 2.5 words per second)
                const wordCount = seg.text.split(/\s+/).length;
                endTime = startTime + Math.max(2, wordCount / 2.5);
            }

            // Split long segments into ~40 word chunks
            const words = seg.text.split(/\s+/);
            const chunkSize = 40;
            const chunks = [];
            for (let j = 0; j < words.length; j += chunkSize) {
                chunks.push(words.slice(j, j + chunkSize).join(' '));
            }

            const chunkDuration = (endTime - startTime) / chunks.length;
            chunks.forEach((chunk, ci) => {
                subtitles.push({
                    start: startTime + (ci * chunkDuration),
                    end: startTime + ((ci + 1) * chunkDuration),
                    text: chunk
                });
            });
        });
    } else {
        // Auto-calculate timing based on text length
        // Estimate total duration: ~150 words per minute
        const totalDuration = (totalWordCount / 150) * 60;
        const chunkSize = 40;
        let wordIndex = 0;

        while (wordIndex < totalWordCount) {
            const chunkWords = totalWords.slice(wordIndex, wordIndex + chunkSize);
            const chunk = chunkWords.join(' ');
            const startTime = (wordIndex / totalWordCount) * totalDuration;
            const endWordIndex = Math.min(wordIndex + chunkSize, totalWordCount);
            const endTime = (endWordIndex / totalWordCount) * totalDuration;

            subtitles.push({
                start: startTime,
                end: endTime,
                text: chunk
            });

            wordIndex += chunkSize;
        }
    }

    return subtitles;
}

// ===== EXPORT: TXT =====
function generateTXT() {
    const includeSpeakers = optSpeakers.checked;
    const includeTimestamps = optTimestamps.checked;
    const includeTitle = optTitle.checked;

    let output = '';

    if (includeTitle) {
        output += exportTitle.value || 'Transcript';
        output += '\n';
        output += '='.repeat((exportTitle.value || 'Transcript').length);
        output += '\n';
        output += 'Date: ' + new Date().toLocaleDateString();
        output += '\n\n';
    }

    transcriptSegments.forEach(seg => {
        let line = '';
        if (includeTimestamps && seg.timestamp) {
            line += '[' + seg.timestamp + '] ';
        }
        if (includeSpeakers && seg.speaker) {
            line += seg.speaker + ': ';
        }
        line += seg.text;
        output += line + '\n\n';
    });

    return output.trim();
}

function exportTXT() {
    const content = generateTXT();
    downloadFile(content, 'transcript.txt', 'text/plain');
    showToast('TXT exported successfully!');
}

// ===== EXPORT: PDF =====
function exportPDF() {
    const includeSpeakers = optSpeakers.checked;
    const includeTimestamps = optTimestamps.checked;
    const includeTitle = optTitle.checked;

    // Build HTML content for print-to-PDF
    let html = '<!DOCTYPE html><html><head><meta charset="UTF-8">';
    html += '<title>' + escapeHtml(exportTitle.value || 'Transcript') + '</title>';
    html += '<style>';
    html += 'body{font-family:Inter,Arial,sans-serif;padding:40px;color:#1a1a1a;line-height:1.7;max-width:700px;margin:0 auto}';
    html += 'h1{font-size:24px;margin-bottom:4px}';
    html += '.meta{color:#666;font-size:13px;margin-bottom:24px;border-bottom:1px solid #ddd;padding-bottom:12px}';
    html += '.segment{margin-bottom:16px}';
    html += '.speaker{font-weight:700;color:#1a1a1a;margin-right:8px}';
    html += '.timestamp{color:#888;font-size:12px;font-family:monospace;margin-right:8px}';
    html += '.text{color:#333}';
    html += '@media print{body{padding:20px}}';
    html += '</style></head><body>';

    if (includeTitle) {
        html += '<h1>' + escapeHtml(exportTitle.value || 'Transcript') + '</h1>';
        html += '<div class="meta">';
        html += 'Date: ' + new Date().toLocaleDateString() + ' | ';
        html += 'Words: ' + summaryWords.textContent + ' | ';
        html += 'Duration: ' + summaryDuration.textContent;
        if (transcriptSpeakers.length > 0) {
            html += ' | Speakers: ' + transcriptSpeakers.join(', ');
        }
        html += '</div>';
    }

    transcriptSegments.forEach(seg => {
        html += '<div class="segment">';
        if (includeTimestamps && seg.timestamp) {
            html += '<span class="timestamp">[' + escapeHtml(seg.timestamp) + ']</span>';
        }
        if (includeSpeakers && seg.speaker) {
            html += '<span class="speaker">' + escapeHtml(seg.speaker) + ':</span>';
        }
        html += '<span class="text">' + escapeHtml(seg.text) + '</span>';
        html += '</div>';
    });

    html += '</body></html>';

    // Open in new window for print/save as PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 500);
        showToast('PDF ready - use Print dialog to save as PDF');
    } else {
        showToast('Please allow popups to export PDF');
    }
}

// ===== EXPORT: SRT =====
function generateSRT() {
    const subtitles = buildSubtitleSegments();
    let output = '';

    subtitles.forEach((sub, i) => {
        output += (i + 1) + '\n';
        output += formatTimeSRT(sub.start) + ' --> ' + formatTimeSRT(sub.end) + '\n';
        output += sub.text + '\n';
        output += '\n';
    });

    return output.trim();
}

function exportSRT() {
    const content = generateSRT();
    downloadFile(content, 'transcript.srt', 'text/plain');
    showToast('SRT exported successfully!');
}

// ===== EXPORT: VTT =====
function generateVTT() {
    const subtitles = buildSubtitleSegments();
    let output = 'WEBVTT\n\n';

    subtitles.forEach((sub, i) => {
        output += (i + 1) + '\n';
        output += formatTimeVTT(sub.start) + ' --> ' + formatTimeVTT(sub.end) + '\n';
        output += sub.text + '\n';
        output += '\n';
    });

    return output.trim();
}

function exportVTT() {
    const content = generateVTT();
    downloadFile(content, 'transcript.vtt', 'text/vtt');
    showToast('VTT exported successfully!');
}

// ===== EXPORT: JSON =====
function generateJSON() {
    const includeSpeakers = optSpeakers.checked;
    const includeTimestamps = optTimestamps.checked;
    const includeMetadata = optMetadata.checked;

    const segments = transcriptSegments.map(seg => {
        const obj = {};
        if (includeSpeakers) obj.speaker = seg.speaker || '';
        if (includeTimestamps) obj.timestamp = seg.timestamp || '';
        obj.text = seg.text;
        return obj;
    });

    const result = {};

    if (includeMetadata) {
        result.metadata = {
            title: exportTitle.value || 'Transcript',
            language: 'auto',
            duration: summaryDuration.textContent,
            wordCount: parseInt(summaryWords.textContent.replace(/,/g, '')) || 0,
            speakers: transcriptSpeakers,
            exportedAt: new Date().toISOString(),
            source: transcriptSource
        };
    }

    result.segments = segments;

    return JSON.stringify(result, null, 2);
}

function exportJSON() {
    const content = generateJSON();
    downloadFile(content, 'transcript.json', 'application/json');
    showToast('JSON exported successfully!');
}

// ===== EXPORT: CSV =====
function generateCSV() {
    // UTF-8 BOM for Excel compatibility
    let output = '\uFEFF';
    output += 'Timestamp,Speaker,Text\n';

    transcriptSegments.forEach(seg => {
        const timestamp = csvEscape(seg.timestamp || '');
        const speaker = csvEscape(seg.speaker || '');
        const text = csvEscape(seg.text);
        output += timestamp + ',' + speaker + ',' + text + '\n';
    });

    return output;
}

function csvEscape(value) {
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
}

function exportCSV() {
    const content = generateCSV();
    downloadFile(content, 'transcript.csv', 'text/csv;charset=utf-8');
    showToast('CSV exported successfully!');
}

// ===== EXPORT: DOCX (HTML-based .doc) =====
function exportDOCX() {
    const includeSpeakers = optSpeakers.checked;
    const includeTimestamps = optTimestamps.checked;
    const includeTitle = optTitle.checked;

    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ';
    html += 'xmlns:w="urn:schemas-microsoft-com:office:word" ';
    html += 'xmlns="http://www.w3.org/TR/REC-html40">';
    html += '<head><meta charset="UTF-8">';
    html += '<style>';
    html += 'body{font-family:Calibri,Arial,sans-serif;font-size:12pt;line-height:1.6;color:#1a1a1a}';
    html += 'h1{font-size:18pt;color:#1a1a1a;margin-bottom:6pt}';
    html += '.meta{color:#666;font-size:10pt;margin-bottom:18pt;border-bottom:1pt solid #ccc;padding-bottom:8pt}';
    html += '.segment{margin-bottom:12pt}';
    html += '.speaker{font-weight:bold;color:#1a1a1a}';
    html += '.timestamp{color:#888;font-size:10pt;font-family:Consolas,monospace}';
    html += '</style></head><body>';

    if (includeTitle) {
        html += '<h1>' + escapeHtml(exportTitle.value || 'Transcript') + '</h1>';
        html += '<div class="meta">';
        html += 'Date: ' + new Date().toLocaleDateString() + ' | ';
        html += 'Words: ' + summaryWords.textContent + ' | ';
        html += 'Duration: ' + summaryDuration.textContent;
        html += '</div>';
    }

    transcriptSegments.forEach(seg => {
        html += '<p class="segment">';
        if (includeTimestamps && seg.timestamp) {
            html += '<span class="timestamp">[' + escapeHtml(seg.timestamp) + '] </span>';
        }
        if (includeSpeakers && seg.speaker) {
            html += '<span class="speaker">' + escapeHtml(seg.speaker) + ': </span>';
        }
        html += escapeHtml(seg.text);
        html += '</p>';
    });

    html += '</body></html>';

    const blob = new Blob(['\uFEFF' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transcript.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('DOCX exported successfully!');
}

// ===== EXPORT ALL =====
function exportAll() {
    exportTXT();
    setTimeout(() => exportSRT(), 200);
    setTimeout(() => exportVTT(), 400);
    setTimeout(() => exportJSON(), 600);
    setTimeout(() => exportCSV(), 800);
    setTimeout(() => exportDOCX(), 1000);
    setTimeout(() => exportPDF(), 1200);
    showToast('Exporting all formats...');
}

// ===== DOWNLOAD HELPER =====
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

// ===== HTML ESCAPE =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== PREVIEW =====
function updatePreview(format) {
    activePreviewFormat = format;
    let content = '';

    switch (format) {
        case 'txt':
            content = generateTXT();
            break;
        case 'srt':
            content = generateSRT();
            break;
        case 'vtt':
            content = generateVTT();
            break;
        case 'json':
            content = generateJSON();
            break;
        case 'csv':
            content = generateCSV().replace('\uFEFF', ''); // Remove BOM for display
            break;
        default:
            content = generateTXT();
    }

    previewContent.textContent = content || 'No content to preview.';

    // Update active tab
    document.querySelectorAll('.ec-preview-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.preview === format);
    });
}

// ===== EVENT LISTENERS =====

// Export buttons
document.querySelectorAll('.ec-export-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const format = btn.dataset.format;
        switch (format) {
            case 'txt': exportTXT(); break;
            case 'pdf': exportPDF(); break;
            case 'srt': exportSRT(); break;
            case 'vtt': exportVTT(); break;
            case 'json': exportJSON(); break;
            case 'csv': exportCSV(); break;
            case 'docx': exportDOCX(); break;
        }
    });
});

// Format card click also triggers export
document.querySelectorAll('.ec-format-card').forEach(card => {
    card.addEventListener('click', () => {
        const format = card.dataset.format;
        // Update preview when card is clicked
        if (['txt', 'srt', 'vtt', 'json', 'csv'].includes(format)) {
            updatePreview(format);
        }
    });
});

// Export All
exportAllBtn.addEventListener('click', exportAll);

// Use Pasted Text
usePastedTextBtn.addEventListener('click', () => {
    const text = pasteTranscriptInput.value.trim();
    if (!text) {
        showToast('Please paste some text first');
        return;
    }
    transcriptSegments = [];
    transcriptSpeakers = [];
    parsePlainText(text);
    transcriptSource = 'Pasted Text';

    ecNoTranscript.style.display = 'none';
    ecSummary.style.display = 'flex';
    ecOptions.style.display = 'block';
    ecFormats.style.display = 'block';
    ecPreview.style.display = 'block';
    updateSummary();
    updatePreview('txt');
    showToast('Pasted text loaded successfully!');
});

// Preview tabs
document.querySelectorAll('.ec-preview-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        updatePreview(tab.dataset.preview);
    });
});

// Options change - update preview
[optTimestamps, optSpeakers, optTitle, optMetadata].forEach(opt => {
    opt.addEventListener('change', () => {
        updatePreview(activePreviewFormat);
    });
});

exportTitle.addEventListener('input', () => {
    updatePreview(activePreviewFormat);
});

// ===== INITIALIZATION =====
function init() {
    const hasTranscript = loadTranscriptData();

    if (hasTranscript && transcriptSegments.length > 0) {
        ecNoTranscript.style.display = 'none';
        ecSummary.style.display = 'flex';
        ecOptions.style.display = 'block';
        ecFormats.style.display = 'block';
        ecPreview.style.display = 'block';
        updateSummary();
        updatePreview('txt');
    } else {
        ecNoTranscript.style.display = 'block';
        ecSummary.style.display = 'none';
        ecOptions.style.display = 'none';
        ecFormats.style.display = 'none';
        ecPreview.style.display = 'none';
    }
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
