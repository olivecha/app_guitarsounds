// Dual and multi-sound analysis functions.
// "multi" functions accept an array of any length ≥ 2.
// "dual"  functions accept exactly [sound1, sound2].

import { octaveHistogram, octaveValues, trapezoid, cumulativeTrapezoid } from '../guitarsounds/utils.js';

const COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b'];

const BIN_LABELS = {
  bass: 'Basses', mid: 'Mids', highmid: 'High-Mids',
  uppermid: 'Upper-Mids', presence: 'Présence', brillance: 'Brillance',
};

// Plotly axis suffix: panel 1 → '', panel 2 → '2', …
function axN(n) { return n === 1 ? '' : String(n); }

// ── Overlay analyses (any number of sounds ≥ 2) ──────────────────────────────

export function dualSignal(sounds) {
  return {
    data: sounds.map((s, i) => ({
      x: Array.from(s.signal.time()), y: Array.from(s.signal.signal),
      type: 'scatter', mode: 'lines',
      line: { width: 1, color: COLORS[i % COLORS.length] }, name: s.name,
    })),
    layout: { xaxis: { title: 'Temps (s)' }, yaxis: { title: 'Amplitude' } },
  };
}

export function dualEnvelope(sounds) {
  return {
    data: sounds.map((s, i) => {
      const { values, times } = s.signal.envelope();
      return { x: Array.from(times), y: Array.from(values),
               type: 'scatter', mode: 'lines',
               line: { width: 2, color: COLORS[i % COLORS.length] }, name: s.name };
    }),
    layout: { xaxis: { title: 'Temps (s)' }, yaxis: { title: 'Amplitude (0 à 1)' } },
  };
}

export function dualLogEnv(sounds) {
  const xMin = 0.05;
  const logTickVals = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
  const logTickText  = ['0.05', '0.1', '0.2', '0.5', '1', '2', '5', '10'];
  let xMax = 0;
  const data = sounds.map((s, i) => {
    const { values, times } = s.signal.log_envelope();
    const x = [], y = [];
    for (let j = 0; j < times.length; j++) {
      if (times[j] >= xMin) { x.push(times[j]); y.push(values[j]); }
    }
    if (times[times.length - 1] > xMax) xMax = times[times.length - 1];
    return { x, y, type: 'scatter', mode: 'lines',
             line: { width: 2, color: COLORS[i % COLORS.length] }, name: s.name };
  });
  return {
    data,
    layout: {
      xaxis: { title: 'Temps (s)', type: 'log',
               range: [Math.log10(xMin), Math.log10(xMax)],
               tickmode: 'array', tickvals: logTickVals, ticktext: logTickText },
      yaxis: { title: 'Amplitude (0 à 1)' },
    },
  };
}

export function dualFft(sounds) {
  return {
    data: sounds.map((s, i) => {
      const amp = Array.from(s.signal.fft());
      const freqs = Array.from(s.signal.fft_frequencies());
      const cut = freqs.findIndex(f => f >= s.SP.general.fft_range);
      return { x: cut === -1 ? freqs : freqs.slice(0, cut),
               y: cut === -1 ? amp   : amp.slice(0, cut),
               type: 'scatter', mode: 'lines',
               line: { width: 1, color: COLORS[i % COLORS.length] }, name: s.name };
    }),
    layout: {
      xaxis: { title: 'Fréquence (Hz)' },
      yaxis: { title: 'Amplitude (normalisée)', type: 'log',
               tickmode: 'array', tickvals: [0.001, 0.01, 0.1, 1],
               ticktext: ['0.001', '0.01', '0.1', '1'] },
    },
  };
}

export function dualFftHist(sounds) {
  const fraction = sounds[0].SP.general.octave_fraction;
  const edges  = octaveHistogram(fraction);
  const xPos   = edges.slice(0, -1);
  const widths = xPos.map((e, i) => edges[i + 1] - e);
  return {
    data: sounds.map((s, i) => {
      const bins = s.signal.fft_bins();
      const c = new Array(edges.length - 1).fill(0);
      for (const f of bins) {
        for (let j = 0; j < edges.length - 1; j++) {
          if (f >= edges[j] && f < edges[j + 1]) { c[j]++; break; }
        }
      }
      return { x: xPos, y: c, width: widths, offset: 0, type: 'bar',
               name: s.name, opacity: 0.6, marker: { color: COLORS[i % COLORS.length] } };
    }),
    layout: {
      barmode: 'overlay', bargap: 0,
      xaxis: { title: 'Fréquence (Hz)', type: 'log', tickmode: 'array',
               tickvals: [20,50,100,200,500,1000,2000,5000,10000,20000],
               ticktext: ['20','50','100','200','500','1k','2k','5k','10k','20k'] },
      yaxis: { title: 'Amplitude', type: 'log', dtick: 1 },
    },
  };
}

// ── Dual-only analyses ────────────────────────────────────────────────────────

export function dualFftMirror([s1, s2]) {
  const fftRange = s1.SP.general.fft_range;
  const f1 = Array.from(s1.signal.fft_frequencies()); const a1 = Array.from(s1.signal.fft());
  const f2 = Array.from(s2.signal.fft_frequencies()); const a2 = Array.from(s2.signal.fft());
  const n1 = (f1.findIndex(f => f >= fftRange) + 1 || f1.length + 1) - 1;
  const n2 = (f2.findIndex(f => f >= fftRange) + 1 || f2.length + 1) - 1;
  const ticks = [-1, -0.6, -0.2, 0, 0.2, 0.6, 1];
  return {
    data: [
      { x: f1.slice(0, n1), y: a1.slice(0, n1), type: 'scatter', mode: 'lines',
        name: s1.name, line: { color: COLORS[0] } },
      { x: f2.slice(0, n2), y: a2.slice(0, n2).map(v => -v), type: 'scatter', mode: 'lines',
        name: s2.name, line: { color: COLORS[1] } },
    ],
    layout: {
      xaxis: { title: 'Fréquence (Hz)' },
      yaxis: { title: 'Amplitude miroir (normalisée)',
               tickmode: 'array', tickvals: ticks, ticktext: ticks.map(String) },
    },
  };
}

export function dualFftDiff([s1, s2]) {
  const fraction = s1.SP.general.octave_fraction;
  const edges  = octaveHistogram(fraction);
  const xVals  = octaveValues(fraction);
  const widths = edges.slice(0, -1).map((e, i) => edges[i + 1] - e);

  function counts(s) {
    const bins = s.signal.fft_bins();
    const c = new Array(edges.length - 1).fill(0);
    for (const f of bins) {
      for (let j = 0; j < edges.length - 1; j++) {
        if (f >= edges[j] && f < edges[j + 1]) { c[j]++; break; }
      }
    }
    return c;
  }

  const c1 = counts(s1), c2 = counts(s2);
  const diff = c1.map((v, i) => v - c2[i]);
  const posX = [], posY = [], posW = [], negX = [], negY = [], negW = [];
  for (let i = 0; i < diff.length; i++) {
    if (diff[i] >= 0) { posX.push(xVals[i]); posY.push(diff[i]); posW.push(widths[i]); }
    else              { negX.push(xVals[i]); negY.push(diff[i]); negW.push(widths[i]); }
  }

  const logTicks = { type: 'log', tickmode: 'array',
    tickvals: [20,50,100,200,500,1000,2000,5000,10000,20000],
    ticktext: ['20','50','100','200','500','1k','2k','5k','10k','20k'] };

  return {
    data: [
      { x: edges.slice(0,-1), y: c1, width: widths, offset: 0, type: 'bar',
        name: s1.name, opacity: 0.6, xaxis: 'x', yaxis: 'y', marker: { color: COLORS[0] } },
      { x: edges.slice(0,-1), y: c2, width: widths, offset: 0, type: 'bar',
        name: s2.name, opacity: 0.6, xaxis: 'x', yaxis: 'y', marker: { color: COLORS[1] } },
      { x: posX, y: posY, width: posW, offset: 0, type: 'bar', showlegend: false,
        xaxis: 'x2', yaxis: 'y2', marker: { color: COLORS[0], opacity: 0.6 } },
      { x: negX, y: negY, width: negW, offset: 0, type: 'bar', showlegend: false,
        xaxis: 'x2', yaxis: 'y2', marker: { color: COLORS[1], opacity: 0.6 } },
    ],
    layout: {
      grid: { rows: 1, columns: 2, pattern: 'independent' },
      barmode: 'overlay', bargap: 0,
      xaxis:  { title: 'Fréquence (Hz)', ...logTicks },
      xaxis2: { title: 'Fréquence (Hz)', ...logTicks },
      yaxis:  { title: 'Amplitude' },
      yaxis2: { title: `← ${s2.name} : ${s1.name} →` },
      annotations: [
        { text: 'Histogramme des spectres', xref: 'x domain', yref: 'y domain',
          x: 0.5, y: 1.06, showarrow: false, xanchor: 'center' },
        { text: 'Différence entre les spectres', xref: 'x2 domain', yref: 'y2 domain',
          x: 0.5, y: 1.06, showarrow: false, xanchor: 'center' },
      ],
    },
  };
}

export function dualSpecDiff([s1, s2]) {
  const { freqs: f1, times: t1, spec: sp1 } = s1.lognormspect();
  const { spec: sp2, times: t2 }            = s2.lognormspect();
  const fLen = Math.min(f1.length, sp2.length);
  const tLen = Math.min(t1.length, t2.length);
  const maxFreq = 1.1 * s1.SP.general.fft_range;
  let cutIdx = fLen;
  for (let i = 0; i < fLen; i++) { if (f1[i] > maxFreq) { cutIdx = i; break; } }

  // Difference matrix
  const diff = sp1.slice(0, cutIdx).map((row, k) => {
    const out = new Float64Array(tLen);
    for (let t = 0; t < tLen; t++) out[t] = (row[t] ?? 0) - (sp2[k]?.[t] ?? 0);
    return out;
  });

  // Shift to [0,1], scale to [-1,1]
  let mn = Infinity, mx = -Infinity;
  for (const row of diff) for (const v of row) { if (v < mn) mn = v; if (v > mx) mx = v; }
  const rng = (mx - mn) || 1;
  for (const row of diff) for (let t = 0; t < row.length; t++) row[t] = ((row[t] - mn) / rng) * 2 - 1;

  // Adjust mean to 0 for symmetric colormap
  let sum = 0, cnt = 0;
  for (const row of diff) for (const v of row) { sum += v; cnt++; }
  const mean = sum / cnt;
  for (const row of diff) for (let t = 0; t < row.length; t++) {
    const v = row[t];
    if (mean > 0 && v > 0) row[t] = (v - mean) / (1 - mean);
    else if (mean <= 0 && v < 0) row[t] = (v - mean) / (1 + mean);
  }

  return {
    data: [{
      x: Array.from(t1.slice(0, tLen)), y: Array.from(f1.slice(0, cutIdx)),
      z: diff.map(row => Array.from(row)),
      type: 'heatmap', colorscale: 'RdBu', zsmooth: 'fast', zmid: 0,
      showscale: true,
      colorbar: { title: { text: `← ${s2.name} : ${s1.name} →`, side: 'right' }, thickness: 15 },
    }],
    layout: {
      xaxis: { title: 'Temps (s)' },
      yaxis: { title: 'Fréquence (Hz)', range: [1, maxFreq] },
    },
  };
}

export function dualPeakComp([s1, s2]) {
  const fftRange = s1.SP.general.fft_range;
  const f1 = Array.from(s1.signal.fft_frequencies()); const a1 = Array.from(s1.signal.fft());
  const f2 = Array.from(s2.signal.fft_frequencies()); const a2 = Array.from(s2.signal.fft());
  const n1 = (f1.findIndex(f => f >= fftRange) + 1 || f1.length + 1) - 1;
  const n2 = (f2.findIndex(f => f >= fftRange) + 1 || f2.length + 1) - 1;

  const pk1 = s1.signal.peaks().filter(p => p < n1 - 1);
  const pk2 = s2.signal.peaks().filter(p => p < n2 - 1);

  const spacings = [];
  for (let i = 1; i < pk1.length; i++) spacings.push(f1[pk1[i]] - f1[pk1[i-1]]);
  for (let i = 1; i < pk2.length; i++) spacings.push(f2[pk2[i]] - f2[pk2[i-1]]);
  const peakDist = spacings.length > 0
    ? Math.abs(spacings.reduce((a, b) => a + b, 0) / spacings.length) / 4 : 50;

  const m1 = [], m2 = [];
  for (const p1 of pk1) {
    for (const p2 of pk2) {
      if (Math.abs(f1[p1] - f2[p2]) < peakDist) { m1.push(p1); m2.push(p2); break; }
    }
  }

  let diffIdx = -1, thresh = 0.5;
  while (diffIdx === -1 && thresh > 0.01) {
    for (let i = 0; i < m1.length; i++) {
      if (Math.abs(a1[m1[i]] - a2[m2[i]]) > thresh) { diffIdx = i; break; }
    }
    thresh -= 0.01;
  }

  const ticks = [-1, -0.6, -0.2, 0, 0.2, 0.6, 1];
  const traces = [
    { x: f1.slice(0, n1), y: a1.slice(0, n1), type: 'scatter', mode: 'lines',
      name: s1.name, line: { color: '#919191', width: 1 } },
    { x: f2.slice(0, n2), y: a2.slice(0, n2).map(v => -v), type: 'scatter', mode: 'lines',
      name: s2.name, line: { color: '#3d3d3d', width: 1 } },
    { x: m1.map(p => f1[p]), y: m1.map(p => a1[p]),
      type: 'scatter', mode: 'markers', marker: { color: 'blue', size: 8 }, name: 'Pics communs' },
    { x: m2.map(p => f2[p]), y: m2.map(p => -a2[p]),
      type: 'scatter', mode: 'markers', marker: { color: 'blue', size: 8 }, showlegend: false },
  ];
  if (diffIdx !== -1) {
    traces.push(
      { x: [f1[m1[diffIdx]]], y: [a1[m1[diffIdx]]], type: 'scatter', mode: 'markers',
        marker: { color: 'green', size: 12 }, name: 'Pics différents' },
      { x: [f2[m2[diffIdx]]], y: [-a2[m2[diffIdx]]], type: 'scatter', mode: 'markers',
        marker: { color: 'green', size: 12 }, showlegend: false },
    );
  }

  return {
    data: traces,
    layout: {
      xaxis: { title: 'Fréquence (Hz)' },
      yaxis: { title: 'Amplitude (miroir)',
               tickmode: 'array', tickvals: ticks, ticktext: ticks.map(String) },
      title: { text: 'Analyse des pics du spectre fréquentiel' },
    },
  };
}

// ── Bin analyses (any number ≥ 2) ────────────────────────────────────────────

export function dualFbinPlot(sounds) {
  const binNames = Object.keys(sounds[0].bins);
  const xMin = 0.05;
  const logTickVals = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
  const logTickText  = ['0.05','0.1','0.2','0.5','1','2','5','10'];
  const data = [], annotations = [];
  const layout = { grid: { rows: 3, columns: 2, pattern: 'independent' }, height: 720 };

  binNames.forEach((bin, bi) => {
    const p = bi + 1;
    const xa = 'x' + axN(p), ya = 'y' + axN(p);
    sounds.forEach((s, si) => {
      const { values, times } = s.bins[bin].normalize().log_envelope();
      const x = [], y = [];
      for (let i = 0; i < times.length; i++) {
        if (times[i] >= xMin) { x.push(times[i]); y.push(values[i]); }
      }
      data.push({ x, y, type: 'scatter', mode: 'lines', name: s.name,
                  line: { width: 1.5, color: COLORS[si % COLORS.length] },
                  xaxis: xa, yaxis: ya,
                  showlegend: bi === 0, legendgroup: s.name });
    });
    const [lo, hi] = sounds[0].bins[bin].freqRange;
    layout['xaxis' + axN(p)] = { type: 'log', tickmode: 'array',
      tickvals: logTickVals, ticktext: logTickText,
      title: bi >= 4 ? 'Temps (s)' : '' };
    layout['yaxis' + axN(p)] = { title: bi % 2 === 0 ? 'Amplitude' : '' };
    annotations.push({ text: `${BIN_LABELS[bin]} (${lo}–${hi} Hz)`,
      xref: xa + ' domain', yref: ya + ' domain',
      x: 0.5, y: 1.1, showarrow: false, xanchor: 'center', font: { size: 11 } });
  });

  layout.annotations = annotations;
  return { data, layout };
}

export function dualBinHist(sounds) {
  const binNames = Object.keys(sounds[0].bins);
  const xLabels  = binNames.map(n => BIN_LABELS[n]);
  const soundIntegrals = sounds.map(s =>
    binNames.map(bin => {
      const { values, times } = s.bins[bin].normalize().log_envelope();
      return trapezoid(Array.from(values), Array.from(times));
    })
  );
  const globalMax = Math.max(...soundIntegrals.flat()) || 1;
  return {
    data: sounds.map((s, i) => ({
      x: xLabels, y: soundIntegrals[i].map(v => v / globalMax),
      type: 'bar', name: s.name, marker: { color: COLORS[i % COLORS.length] },
    })),
    layout: {
      barmode: 'group',
      xaxis: { title: 'Bandes de fréquence' },
      yaxis: { title: 'Puissance normalisée', range: [0, 1.05] },
    },
  };
}

export function dualBinPower(sounds) {
  const binNames = Object.keys(sounds[0].bins);
  const data = [], annotations = [];
  const layout = { grid: { rows: 3, columns: 2, pattern: 'independent' }, height: 720 };

  binNames.forEach((bin, bi) => {
    const p = bi + 1;
    const xa = 'x' + axN(p), ya = 'y' + axN(p);

    const allData = sounds.map(s => {
      const { values, times } = s.bins[bin].normalize().envelope();
      const cumInt = Array.from(cumulativeTrapezoid(Array.from(values), Array.from(times)));
      return { integral: cumInt.slice(2), times: Array.from(times).slice(2) };
    });
    const binMax = Math.max(...allData.map(d => d.integral[d.integral.length - 1] || 0)) || 1;

    sounds.forEach((s, si) => {
      const { integral, times } = allData[si];
      const tMax = times[times.length - 1] || 1;
      data.push({ x: times.map(t => t / tMax), y: integral.map(v => v / binMax),
                  type: 'scatter', mode: 'lines', name: s.name,
                  line: { width: 1.5, color: COLORS[si % COLORS.length] },
                  xaxis: xa, yaxis: ya,
                  showlegend: bi === 0, legendgroup: s.name });
    });

    const [lo, hi] = sounds[0].bins[bin].freqRange;
    layout['xaxis' + axN(p)] = { title: bi >= 4 ? 'Temps (normalisé)' : '' };
    layout['yaxis' + axN(p)] = { title: bi % 2 === 0 ? 'Intégrale cumulée' : '' };
    annotations.push({ text: `${BIN_LABELS[bin]} (${lo}–${hi} Hz)`,
      xref: xa + ' domain', yref: ya + ' domain',
      x: 0.5, y: 1.1, showarrow: false, xanchor: 'center', font: { size: 11 } });
  });

  layout.annotations = annotations;
  return { data, layout };
}
