// Report panel: lists queued analyses and triggers .docx generation.

import { getReportEntries, removeFromReport, generateDocx, onReportChanged } from './reportManager.js';

export function initReportPanel(tabEl) {
  tabEl.innerHTML = `
    <div class="report-panel">
      <div class="report-header">
        <h2 class="report-title">Rapport d'analyse</h2>
        <button id="btn-generate-docx" class="btn-primary" disabled>
          Générer le rapport (.docx)
        </button>
      </div>
      <p id="report-empty-hint" class="report-hint">
        Ajoutez des analyses au rapport depuis l'onglet <em>Analyser / Comparer</em>.
      </p>
      <div id="report-list" class="report-list"></div>
    </div>
  `;

  document.getElementById('btn-generate-docx').addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Génération…';
    try {
      await generateDocx();
    } finally {
      e.target.disabled = getReportEntries().length === 0;
      e.target.textContent = 'Générer le rapport (.docx)';
    }
  });

  onReportChanged(() => _renderList());
}

function _renderList() {
  const listEl  = document.getElementById('report-list');
  const genBtn  = document.getElementById('btn-generate-docx');
  const hintEl  = document.getElementById('report-empty-hint');
  if (!listEl) return;

  const entries = getReportEntries();
  if (genBtn) genBtn.disabled = entries.length === 0;
  if (hintEl) hintEl.style.display = entries.length === 0 ? 'block' : 'none';

  // Update tab badge
  const badge = document.getElementById('report-tab-badge');
  if (badge) {
    badge.textContent = entries.length > 0 ? String(entries.length) : '';
    badge.style.display = entries.length > 0 ? 'inline-block' : 'none';
  }

  listEl.innerHTML = '';
  entries.forEach(({ key, label, dataUrl }) => {
    const row = document.createElement('div');
    row.className = 'report-entry';
    row.innerHTML = `
      <img src="${dataUrl}" class="report-thumb" alt="${_esc(label)}" />
      <span class="report-entry-label">${_esc(label)}</span>
      <button class="btn-icon btn-danger report-remove-btn" title="Retirer du rapport">✕</button>
    `;
    row.querySelector('.report-remove-btn').addEventListener('click', () => removeFromReport(key));
    listEl.appendChild(row);
  });
}

function _esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
