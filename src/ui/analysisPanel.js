// Analysis panel: dynamic layout based on sound count + Plotly chart area.

import { sounds, onSoundsChanged, encodeWav } from './soundManager.js';
import { section1Analyses, dualAnalyses, multiOnlyAnalyses } from '../analyses/registry.js';
import { addToReport, removeFromReport, isInReport } from './reportManager.js';
import { getGenericMode, onSettingsChanged } from './settings.js';

// Ordered array of selected sound IDs (upload order = Son 1 / Son 2 for dual).
let _selectedIds = [];
// Tracks all IDs ever seen so newly added sounds can be auto-selected.
const _knownIds  = new Set();

let _activeKey   = null;
let _activeEntry = null;
let _helpVisible = false;
let _helpKey     = null;

// Normalize sounds before comparative (≥2 sounds) analyses. Persisted here so it
// survives sidebar rebuilds. Only affects multi-sound analyses (legacy behaviour).
let _normalize       = false;
let _normHelpVisible = false;

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
  // Crossing the mobile breakpoint (resize / orientation) swaps between the
  // interactive chart and the flat PNG, so re-render the active analysis.
  MOBILE_MQ.addEventListener('change', () => _rerunIfActive());
  onSettingsChanged(() => {
    // If the active analysis just got disabled by generic mode, clear the chart.
    if (_activeEntry && getGenericMode() && _activeEntry.harmonic) {
      _activeKey = null;
      _activeEntry = null;
      _clearChartArea().innerHTML = '<p class="placeholder-text">Sélectionnez une analyse.</p>';
    }
    _rebuildSidebar();
  });
}

// True when the analysis is selectable given the current sound count and settings.
function _isEnabled(entry, selCount) {
  return isAvailable(entry.kind, selCount) && !(getGenericMode() && entry.harmonic);
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
  for (const [id, sound] of sounds) {
    const btn = document.createElement('button');
    const selected = _selectedIds.includes(id);
    btn.className = 'sound-pick-btn' + (selected ? ' active' : '');
    btn.textContent = String(n);
    btn.dataset.id = id;
    btn.title = sound.name;
    // Colour the selector by the sound's colour so it matches its plot trace.
    btn.style.borderColor = sound.color;
    btn.style.color = selected ? '#fff' : sound.color;
    btn.style.backgroundColor = selected ? sound.color : '';
    btn.addEventListener('click', () => _toggleSound(id));
    pickerRow.appendChild(btn);
    n++;
  }
  sidebar.appendChild(pickerRow);

  const hint = document.createElement('p');
  hint.className = 'picker-hint';
  hint.textContent = selCount === 1 ? '1 son sélectionné' : `${selCount} sons sélectionnés`;
  sidebar.appendChild(hint);

  // Normalize control — only meaningful when comparing several sounds.
  if (selCount >= 2) sidebar.appendChild(_makeNormalizeControl());

  // ── Section 1: 1 son ─────────────────────────────────────────────────────
  sidebar.appendChild(_sectionLabel('Analyses simples'));
  const group1 = document.createElement('div');
  group1.className = 'btn-group';
  for (const [key, entry] of section1Analyses()) {
    group1.appendChild(_makeAnalysisBtn(key, entry, _isEnabled(entry, selCount)));
  }
  sidebar.appendChild(group1);

  // ── Section 2: 2 sons ────────────────────────────────────────────────────
  sidebar.appendChild(_sectionLabel('Analyses comparatives (2 sons)'));
  const group2 = document.createElement('div');
  group2.className = 'btn-group';
  for (const [key, entry] of dualAnalyses()) {
    group2.appendChild(_makeAnalysisBtn(key, entry, _isEnabled(entry, selCount)));
  }
  sidebar.appendChild(group2);

  // ── Section N: multi sons ────────────────────────────────────────────────
  sidebar.appendChild(_sectionLabel('Analyses comparatives (sons multiples)'));
  const groupN = document.createElement('div');
  groupN.className = 'btn-group';
  for (const [key, entry] of multiOnlyAnalyses()) {
    groupN.appendChild(_makeAnalysisBtn(key, entry, _isEnabled(entry, selCount)));
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

// ── Normalize control ─────────────────────────────────────────────────────────
function _makeNormalizeControl() {
  const wrap = document.createElement('div');
  wrap.className = 'normalize-control';

  const row = document.createElement('div');
  row.className = 'normalize-row';

  const label = document.createElement('label');
  label.className = 'normalize-label';
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = _normalize;
  cb.addEventListener('change', () => { _normalize = cb.checked; _rerunIfActive(); });
  label.appendChild(cb);
  label.appendChild(document.createTextNode(' Normaliser les sons'));

  const helpBtn = document.createElement('button');
  helpBtn.className = 'help-toggle-btn' + (_normHelpVisible ? ' active' : '');
  helpBtn.title = 'Aide';
  helpBtn.textContent = '?';

  const help = document.createElement('p');
  help.className = 'normalize-help-text';
  help.style.display = _normHelpVisible ? 'block' : 'none';
  help.textContent = "Normaliser ramène l'amplitude maximale de chaque son à 1, " +
    "ce qui permet de comparer des sons enregistrés à des amplitudes différentes " +
    "(p. ex. pour mieux visualiser leur amortissement respectif).";

  helpBtn.addEventListener('click', () => {
    _normHelpVisible = !_normHelpVisible;
    help.style.display = _normHelpVisible ? 'block' : 'none';
    helpBtn.classList.toggle('active', _normHelpVisible);
  });

  row.appendChild(label);
  row.appendChild(helpBtn);
  wrap.appendChild(row);
  wrap.appendChild(help);
  return wrap;
}

// Shallow clone of a Sound whose signal is normalized to peak 1. Preserves the
// prototype (analysis methods), name, colour and bins (bin analyses normalize
// per-bin internally, matching legacy SoundPack(normalize=True)).
function _normalizedClone(sound) {
  const clone = Object.create(Object.getPrototypeOf(sound));
  Object.assign(clone, sound);
  clone.signal = sound.signal.normalize();
  return clone;
}

// ── Run analysis ──────────────────────────────────────────────────────────────
function _runAnalysis(key, entry) {
  let selSounds = _selectedIds.map(id => sounds.get(id)).filter(Boolean);
  if (selSounds.length === 0) return;

  // Normalization applies only to comparative (≥2 sounds) analyses.
  if (_normalize && selSounds.length >= 2) selSounds = selSounds.map(_normalizedClone);

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
      // Report identity includes the selected sound IDs, so the same analysis
      // run on a different sound selection is a distinct report entry (e.g. the
      // signal curve of three different sounds → three entries). The label gets
      // the sound names so those entries are distinguishable in the report.
      const normalized  = _normalize && selSounds.length >= 2;
      const reportKey   = `${key}|${_selectedIds.join(',')}${normalized ? '|norm' : ''}`;
      const reportLabel = `${entry.label} — ${selSounds.map(s => s.name).join(', ')}`
                        + (normalized ? ' (normalisé)' : '');
      _renderPlot(result, reportKey, reportLabel);
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

// Below this width, interactive Plotly hijacks touch scrolling, so we render a
// flat PNG instead. The snapshot is taken at 900px and scaled down via CSS so the
// layout stays readable rather than cramped to the phone width.
const MOBILE_MQ      = window.matchMedia('(max-width: 768px)');
const SNAPSHOT_WIDTH = 900;

// Plot text / line scaling (TODO_2 #5). Fonts, line widths and marker sizes are
// scaled centrally so every analysis benefits without per-function edits.
// Mobile is large because the snapshot is rendered at SNAPSHOT_WIDTH (900px) and
// then shrunk to the phone width, so everything must be oversized to stay legible.
// These are deliberately tunable — adjust after viewing on a real device.
const DESKTOP_PLOT_SCALE = 1.2;
const MOBILE_PLOT_SCALE  = 2.2;

// Incremented on every render so an in-flight async (mobile) snapshot can detect
// that a newer render has superseded it and skip appending stale content.
let _renderGen = 0;

function _clearChartArea() {
  // Bump the render generation: any chart replacement (plot, audio bins, generic
  // clear) supersedes an in-flight async snapshot so it won't append stale content.
  _renderGen++;
  const area = document.getElementById('chart-area');
  if (area._pendingBlobUrls) {
    area._pendingBlobUrls.forEach(u => URL.revokeObjectURL(u));
    area._pendingBlobUrls = null;
  }
  area.innerHTML = '';
  return area;
}

// Scale a layout's font, margins and annotation fonts so larger text stays legible
// and doesn't get clipped (annotations are the subplot titles in the bin plots).
function _scaledLayout(layout, factor) {
  const font = layout.font   ?? PLOTLY_LAYOUT_BASE.font;
  const m    = layout.margin ?? PLOTLY_LAYOUT_BASE.margin;
  const out = {
    ...layout,
    font:   { ...font, size: Math.round((font.size ?? 13) * factor) },
    margin: { t: Math.round(m.t * factor), l: Math.round(m.l * factor),
              r: Math.round(m.r * factor), b: Math.round(m.b * factor) },
  };
  if (Array.isArray(layout.annotations)) {
    out.annotations = layout.annotations.map(a => ({
      ...a,
      font: { ...(a.font ?? {}), size: Math.round((a.font?.size ?? 13) * factor) },
    }));
  }
  return out;
}

// Scale per-trace line widths and marker sizes.
function _scaleData(data, factor) {
  return data.map(tr => {
    const t = { ...tr };
    if (t.line && t.line.width != null) t.line = { ...t.line, width: t.line.width * factor };
    if (t.marker && t.marker.size != null) {
      const s = t.marker.size;
      t.marker = { ...t.marker, size: Array.isArray(s) ? s.map(v => v * factor) : s * factor };
    }
    return t;
  });
}

function _renderPlot(spec, reportKey, reportLabel) {
  const area = _clearChartArea();
  const gen = _renderGen;
  const h = spec.layout?.height ?? 420;
  const factor = MOBILE_MQ.matches ? MOBILE_PLOT_SCALE : DESKTOP_PLOT_SCALE;
  const layout = _scaledLayout({ ...PLOTLY_LAYOUT_BASE, ...spec.layout }, factor);
  const data   = _scaleData(spec.data, factor);

  if (MOBILE_MQ.matches) {
    _renderPlotImage(area, data, layout, h, reportKey, reportLabel, gen);
    return;
  }

  const div = document.createElement('div');
  div.style.cssText = `width:100%;height:${h}px;`;
  area.appendChild(div);
  Plotly.newPlot(div, data, layout, PLOTLY_CONFIG);

  if (reportKey) _attachReportBtn(div, reportKey, reportLabel, h);
}

// Mobile path: render off-screen, snapshot to a flat PNG, then discard the live
// Plotly instance so the page can scroll normally over the chart.
async function _renderPlotImage(area, data, layout, h, reportKey, reportLabel, gen) {
  const tmp = document.createElement('div');
  tmp.style.cssText = `position:absolute;left:-99999px;top:0;width:${SNAPSHOT_WIDTH}px;height:${h}px;`;
  document.body.appendChild(tmp);
  try {
    await Plotly.newPlot(tmp, data, layout, { ...PLOTLY_CONFIG, staticPlot: true });
    const dataUrl = await Plotly.toImage(tmp, { format: 'png', width: SNAPSHOT_WIDTH, height: h });
    if (gen !== _renderGen) return;  // superseded by a newer render
    const img = document.createElement('img');
    img.className = 'plot-image';
    img.src = dataUrl;
    img.alt = reportLabel || 'Analyse';
    area.appendChild(img);
    if (reportKey) _attachReportBtn(null, reportKey, reportLabel, h, dataUrl);
  } catch (e) {
    _showError(`Erreur d'affichage : ${e.message}`);
    console.error(e);
  } finally {
    Plotly.purge(tmp);
    tmp.remove();
  }
}

function _attachReportBtn(plotDiv, key, label, plotHeight, presetDataUrl = null) {
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
        // On mobile the live Plotly instance is already discarded, so reuse the
        // PNG captured at render time; on desktop, capture from the live chart.
        const dataUrl = presetDataUrl
          ?? await Plotly.toImage(plotDiv, { format: 'png', width: SNAPSHOT_WIDTH, height: plotHeight });
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
