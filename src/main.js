import { initSoundManager } from './ui/soundManager.js';
import { initAnalysisPanel } from './ui/analysisPanel.js';
import { initReportPanel } from './ui/reportPanel.js';

// ── Top-level mode switching (analysis app ↔ psychoacoustic study) ──────────────
const modeBtns   = document.querySelectorAll('.mode-btn');
const modePanels = document.querySelectorAll('.mode-panel');

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.mode;
    modeBtns.forEach(b => b.classList.remove('active'));
    modePanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`mode-${target}`).classList.add('active');

    // Lazy-load the study iframe the first time the study mode is opened.
    if (target === 'etude') {
      const frame = document.getElementById('study-frame');
      if (frame && !frame.src) frame.src = frame.dataset.src;
    }
  });
});

// ── Tab switching ─────────────────────────────────────────────────────────────
const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${target}`).classList.add('active');
  });
});

// ── Initialise UI modules ─────────────────────────────────────────────────────
initSoundManager(document.getElementById('tab-add'));
initAnalysisPanel(document.getElementById('tab-analyse'));
initReportPanel(document.getElementById('tab-rapport'));

// ── Load markdown docs tabs ───────────────────────────────────────────────────
async function loadMarkdown(elementId, mdPath) {
  try {
    const res = await fetch(mdPath);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const text = await res.text();
    document.getElementById(elementId).innerHTML = marked.parse(text);
  } catch (e) {
    document.getElementById(elementId).textContent = `Erreur de chargement: ${e.message}`;
  }
}

loadMarkdown('aide-content',    'documentation/documentation.md');
loadMarkdown('apropos-content', 'documentation/about.md');

// ── CDN smoke tests ───────────────────────────────────────────────────────────
console.assert(typeof Plotly          !== 'undefined', 'Plotly not loaded');
console.assert(typeof marked          !== 'undefined', 'marked not loaded');
console.assert(typeof marked.parse    === 'function',  'marked.parse missing');
console.assert(typeof docx            !== 'undefined', 'docx not loaded');
console.assert(typeof docx.Document   === 'function',  'docx.Document missing');
console.log('Phase 1: app initialised OK');
