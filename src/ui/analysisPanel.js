// Analysis panel: dynamic layout based on sound count + Plotly chart area.

import { sounds, onSoundsChanged, encodeWav } from './soundManager.js';
import { section1Analyses, dualAnalyses, multiOnlyAnalyses } from '../analyses/registry.js';
import { addToReport, removeFromReport, isInReport } from './reportManager.js';

// Ordered array of selected sound IDs (upload order = Son 1 / Son 2 for dual).
let _selectedIds = [];
// Tracks all IDs ever seen so newly added sounds can be auto-selected.
const _knownIds  = new Set();

let _activeKey   = null;
let _activeEntry = null;
let _helpVisible = false;
let _helpKey     = null;

export function initAnalysisPanel(tabEl) {
  tabEl.innerHTML = `
    <div class="analysis-panel">
      <div class="analysis-sidebar" id="analysis-sidebar">
        <p class="no-sounds">Chargez un son dans l'onglet "Ajouter des sons".</p>
      </div>
      <div class="analysis-main">
        <div id="chart-area" class="chart-area">
          <p class="placeholder-text">Sélectionnez une analyse.</p>
        </div>
        <div id="help-area" class="help-area" style="display:none">
          <div id="help-content" class="markdown-body"></div>
        </div>
      </div>
    </div>
  `;

  onSoundsChanged(() => _rebuildSidebar());
}

// ── Availability helper ───────────────────────────────────────────────────────
function isAvailable(kind, selCount) {
  if (kind === 'adaptive') return selCount >= 1;
  if (kind === 'single')   return selCount === 1;
  if (kind === 'dual')     return selCount === 2;
  if (kind === 'multi')    return selCount >= 2;
  return false;
}

// ── Sidebar rebuild ───────────────────────────────────────────────────────────
function _rebuildSidebar() {
  const sidebar = document.getElementById('analysis-sidebar');
  if (!sidebar) return;
  sidebar.innerHTML = '';

  if (sounds.size === 0) {
    sidebar.innerHTML = '<p class="no-sounds">Chargez un son dans l\'onglet "Ajouter des sons".</p>';
    _selectedIds = [];
    _knownIds.clear();
    return;
  }

  // Remove IDs no longer in sounds
  _selectedIds = _selectedIds.filter(id => sounds.has(id));
  for (const id of _knownIds) { if (!sounds.has(id)) _knownIds.delete(id); }

  // Auto-select newly added sounds (preserves upload order)
  for (const id of sounds.keys()) {
    if (!_knownIds.has(id)) {
      _selectedIds.push(id);
      _knownIds.add(id);
    }
  }

  const selCount = _selectedIds.length;

  // ── Multi-select sound picker ─────────────────────────────────────────────
  sidebar.appendChild(_sectionLabel('Sons sélectionnés'));
  const pickerRow = document.createElement('div');
  pickerRow.className = 'sound-picker';
  let n = 1;
  for (const [id] of sounds) {
    const btn = document.createElement('button');
    btn.className = 'sound-pick-btn' + (_selectedIds.includes(id) ? ' active' : '');
    btn.textContent = String(n);
    btn.dataset.id = id;
    btn.addEventListener('click', () => _toggleSound(id));
    pickerRow.appendChild(btn);
    n++;
  }
  sidebar.appendChild(pickerRow);

  const hint = document.createElement('p');
  hint.className = 'picker-hint';
  hint.textContent = selCount === 1 ? '1 son sélectionné' : `${selCount} sons sélectionnés`;
  sidebar.appendChild(hint);

  // ── Section 1: 1 son ─────────────────────────────────────────────────────
  sidebar.appendChild(_sectionLabel('Analyses — 1 son'));
  const group1 = document.createElement('div');
  group1.className = 'btn-group';
  for (const [key, entry] of section1Analyses()) {
    group1.appendChild(_makeAnalysisBtn(key, entry, isAvailable(entry.kind, selCount)));
  }
  sidebar.appendChild(group1);

  // ── Section 2: 2 sons ────────────────────────────────────────────────────
  sidebar.appendChild(_sectionLabel('Analyses — 2 sons'));
  const group2 = document.createElement('div');
  group2.className = 'btn-group';
  for (const [key, entry] of dualAnalyses()) {
    group2.appendChild(_makeAnalysisBtn(key, entry, isAvailable(entry.kind, selCount)));
  }
  sidebar.appendChild(group2);

  // ── Section N: multi sons ────────────────────────────────────────────────
  sidebar.appendChild(_sectionLabel('Analyses — multi sons'));
  const groupN = document.createElement('div');
  groupN.className = 'btn-group';
  for (const [key, entry] of multiOnlyAnalyses()) {
    groupN.appendChild(_makeAnalysisBtn(key, entry, isAvailable(entry.kind, selCount)));
  }
  sidebar.appendChild(groupN);
}

function _toggleSound(id) {
  const idx = _selectedIds.indexOf(id);
  if (idx === -1) {
    _selectedIds.push(id);
  } else if (_selectedIds.length > 1) {
    _selectedIds.splice(idx, 1);
  }
  _rebuildSidebar();
  _rerunIfActive();
}

// ── Button factory ────────────────────────────────────────────────────────────
function _makeAnalysisBtn(key, entry, available) {
  const wrap = document.createElement('div');
  wrap.className = 'analysis-btn-row';

  const btn = document.createElement('button');
  btn.className = 'analysis-btn' + (key === _activeKey ? ' active' : '') + (available ? '' : ' disabled');
  btn.dataset.key = key;
  btn.textContent = entry.label;
  if (available) {
    btn.addEventListener('click', () => _runAnalysis(key, entry));
  }

  const helpBtn = document.createElement('button');
  helpBtn.className = 'help-toggle-btn';
  helpBtn.title = 'Aide';
  helpBtn.textContent = '?';
  helpBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    _toggleHelp(key, entry, helpBtn);
  });

  wrap.appendChild(btn);
  wrap.appendChild(helpBtn);
  return wrap;
}

// ── Run analysis ──────────────────────────────────────────────────────────────
function _runAnalysis(key, entry) {
  const selSounds = _selectedIds.map(id => sounds.get(id)).filter(Boolean);
  if (selSounds.length === 0) return;

  document.querySelectorAll('.analysis-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.analysis-btn[data-key="${key}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  _activeKey   = key;
  _activeEntry = entry;

  try {
    let result;
    const kind = entry.kind;

    if (kind === 'adaptive') {
      result = entry.fn(selSounds);
    } else if (kind === 'dual') {
      if (selSounds.length !== 2) { _showError('Sélectionnez exactement deux sons.'); return; }
      result = entry.fn(selSounds);
    } else if (kind === 'multi') {
      if (selSounds.length < 2) { _showError('Sélectionnez au moins deux sons.'); return; }
      result = entry.fn(selSounds);
    } else {
      result = entry.fn(selSounds[0]);
    }

    if (result && result.type === 'audio_bins') {
      _renderAudioBins(result);
    } else {
      _renderPlot(result, key, entry.label);
    }
  } catch (err) {
    _showError(`Erreur d'analyse : ${err.message}`);
    console.error(err);
  }
}

function _rerunIfActive() {
  if (_activeKey && _activeEntry) _runAnalysis(_activeKey, _activeEntry);
}

// ── Help toggle ───────────────────────────────────────────────────────────────
function _toggleHelp(key, entry, btn) {
  const helpArea = document.getElementById('help-area');
  if (_helpVisible && _helpKey === key) {
    helpArea.style.display = 'none';
    _helpVisible = false;
    _helpKey = null;
    btn.classList.remove('active');
    return;
  }
  document.querySelectorAll('.help-toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _helpKey     = key;
  _helpVisible = true;
  helpArea.style.display = 'block';
  _loadHelp(entry);
}

function _loadHelp(entry) {
  const helpContent = document.getElementById('help-content');
  helpContent.innerHTML = 'Chargement…';
  if (!entry.help) { helpContent.innerHTML = ''; return; }
  fetch(entry.help)
    .then(r => r.ok ? r.text() : Promise.reject(r.statusText))
    .then(md => {
      helpContent.innerHTML = marked.parse(md);
      helpContent.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || '';
        if (!src.startsWith('http') && !src.startsWith('data')) {
          img.src = 'documentation/figures/' + src.split('/').pop();
        }
      });
    })
    .catch(() => { helpContent.innerHTML = '<em>Aide non disponible.</em>'; });
}

// ── Plot rendering ────────────────────────────────────────────────────────────
const PLOTLY_CONFIG = {
  responsive:    true,
  displaylogo:   false,
  scrollZoom:    false,
  modeBarButtonsToRemove: ['lasso2d', 'select2d'],
};

const PLOTLY_LAYOUT_BASE = {
  autosize:     true,
  paper_bgcolor: 'white',
  plot_bgcolor:  'white',
  font: { family: 'Source Sans Pro, Helvetica Neue, Arial, sans-serif', size: 13 },
  margin: { t: 30, l: 60, r: 20, b: 50 },
  dragmode: 'zoom',
};

function _clearChartArea() {
  const area = document.getElementById('chart-area');
  if (area._pendingBlobUrls) {
    area._pendingBlobUrls.forEach(u => URL.revokeObjectURL(u));
    area._pendingBlobUrls = null;
  }
  area.innerHTML = '';
  return area;
}

function _renderPlot(spec, reportKey, reportLabel) {
  const area = _clearChartArea();
  const h = spec.layout?.height ?? 420;
  const div = document.createElement('div');
  div.style.cssText = `width:100%;height:${h}px;`;
  area.appendChild(div);
  Plotly.newPlot(div, spec.data, { ...PLOTLY_LAYOUT_BASE, ...spec.layout }, PLOTLY_CONFIG);

  if (reportKey) _attachReportBtn(div, reportKey, reportLabel, h);
}

function _attachReportBtn(plotDiv, key, label, plotHeight) {
  const area = document.getElementById('chart-area');
  const wrap = document.createElement('div');
  wrap.className = 'report-btn-wrap';

  const btn = document.createElement('button');
  const update = () => {
    const active = isInReport(key);
    btn.className = 'btn-report-toggle' + (active ? ' active' : '');
    btn.textContent = active ? '✓ Dans le rapport' : '☑ Ajouter au rapport';
  };
  update();

  btn.addEventListener('click', async () => {
    if (isInReport(key)) {
      removeFromReport(key);
      update();
    } else {
      btn.disabled = true;
      btn.textContent = 'Capture…';
      try {
        const dataUrl = await Plotly.toImage(plotDiv, { format: 'png', width: 900, height: plotHeight });
        addToReport(key, label, dataUrl, plotHeight);
        update();
      } catch (e) {
        update();
        console.error('toImage failed', e);
      }
      btn.disabled = false;
    }
  });

  wrap.appendChild(btn);
  area.appendChild(wrap);
}

function _renderAudioBins({ bins, sr }) {
  _clearChartArea();
  const BIN_LABELS = {
    bass: 'Basses', mid: 'Mids', highmid: 'High-Mids',
    uppermid: 'Upper-Mids', presence: 'Présence', brillance: 'Brillance',
  };
  const area = document.getElementById('chart-area');

  const _blobUrls = [];
  for (const [name, binSig] of Object.entries(bins)) {
    const [lo, hi] = binSig.freqRange;
    const wavBuf = encodeWav(binSig.signal, sr);
    const blob   = new Blob([wavBuf], { type: 'audio/wav' });
    const url    = URL.createObjectURL(blob);
    _blobUrls.push(url);

    const row = document.createElement('div');
    row.className = 'bin-audio-row';
    row.innerHTML = `
      <span class="bin-audio-label">${BIN_LABELS[name]} <span class="bin-audio-range">${lo}–${hi} Hz</span></span>
      <audio controls src="${url}" class="bin-audio-player"></audio>
    `;
    area.appendChild(row);
  }

  area._pendingBlobUrls = _blobUrls;
}

function _showError(msg) {
  document.getElementById('chart-area').innerHTML = `<p class="error-msg">${msg}</p>`;
}

function _sectionLabel(text) {
  const el = document.createElement('div');
  el.className = 'sidebar-label';
  el.textContent = text;
  return el;
}
