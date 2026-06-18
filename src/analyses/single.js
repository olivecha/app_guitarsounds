// Single-sound analysis functions.
// Each function takes a Sound instance and returns a Plotly {data, layout} spec,
// or { type: 'audio_bins', bins, sr } for listenband.

import { octaveHistogram, trapezoid } from '../guitarsounds/utils.js';

// ── signal ───────────────────────────────────────────────────────────────────
export function analysisSignal(sound) {
  return {
    data: [{
      x: Array.from(sound.signal.time()),
      y: Array.from(sound.signal.signal),
      type: 'scatter', mode: 'lines',
      line: { width: 1, color: sound.color },
      name: sound.name,
    }],
    layout: {
      xaxis: { title: 'Temps (s)' },
      yaxis: { title: 'Amplitude' },
    },
  };
}

// ── envelope ─────────────────────────────────────────────────────────────────
export function analysisEnvelope(sound) {
  const { values, times } = sound.signal.envelope();
  return {
    data: [{
      x: Array.from(times),
      y: Array.from(values),
      type: 'scatter', mode: 'lines',
      line: { width: 2, color: sound.color },
      name: sound.name,
    }],
    layout: {
      xaxis: { title: 'Temps (s)' },
      yaxis: { title: 'Amplitude (0 à 1)' },
    },
  };
}

// ── log envelope ──────────────────────────────────────────────────────────────
export function analysisLogEnv(sound) {
  const { values, times } = sound.signal.log_envelope();

  // Start x-axis where envelope first exceeds 5% of its peak (hides pre-onset flat region)
  const maxVal = Math.max(...values);
  let onsetIdx = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] / maxVal > 0.05) { onsetIdx = i; break; }
  }
  const xMin = Math.max(times[onsetIdx] * 0.5, 1e-4);
  const xMax = times[times.length - 1];

  // Filter out data points before xMin (t=0 on a log axis causes a spurious baseline)
  const x = [], y = [];
  for (let i = 0; i < times.length; i++) {
    if (times[i] >= xMin) { x.push(times[i]); y.push(values[i]); }
  }

  // Explicit tick marks so labels read "0.2" not "2"
  const logTickVals = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
  const logTickText = ['0.05', '0.1', '0.2', '0.5', '1', '2', '5', '10'];

  return {
    data: [{ x, y, type: 'scatter', mode: 'lines',
             line: { width: 2, color: sound.color }, name: sound.name }],
    layout: {
      xaxis: {
        title: 'Temps (s)', type: 'log',
        range: [Math.log10(xMin), Math.log10(xMax)],
        tickmode: 'array', tickvals: logTickVals, ticktext: logTickText,
      },
      yaxis: { title: 'Amplitude (0 à 1)' },
    },
  };
}

// ── fft ──────────────────────────────────────────────────────────────────────
export function analysisFft(sound) {
  const amp    = Array.from(sound.signal.fft());
  const freqs  = Array.from(sound.signal.fft_frequencies());
  const fftRange = sound.SP.general.fft_range;

  const cutIdx = freqs.findIndex(f => f >= fftRange);
  const x = cutIdx === -1 ? freqs : freqs.slice(0, cutIdx);
  const y = cutIdx === -1 ? amp   : amp.slice(0, cutIdx);

  return {
    data: [{
      x, y,
      type: 'scatter', mode: 'lines',
      line: { width: 1, color: sound.color },
      name: sound.name,
    }],
    layout: {
      xaxis: { title: 'Fréquence (Hz)' },
      yaxis: {
        title: 'Amplitude (normalisée)',
        type: 'log',
        tickmode: 'array',
        tickvals: [0.001, 0.01, 0.1, 1],
        ticktext: ['0.001', '0.01', '0.1', '1'],
      },
    },
  };
}

// ── ffthist ──────────────────────────────────────────────────────────────────
export function analysisFftHist(sound) {
  const fraction = sound.SP.general.octave_fraction;
  const bins     = sound.signal.fft_bins();
  const edges    = octaveHistogram(fraction);

  const counts = new Array(edges.length - 1).fill(0);
  for (const f of bins) {
    for (let i = 0; i < edges.length - 1; i++) {
      if (f >= edges[i] && f < edges[i + 1]) { counts[i]++; break; }
    }
  }

  const xPos   = edges.slice(0, -1);
  const widths = edges.slice(0, -1).map((e, i) => edges[i + 1] - e);

  return {
    data: [{
      x: xPos, y: counts, width: widths, offset: 0,
      type: 'bar', name: sound.name,
      marker: { color: sound.color, opacity: 0.7 },
    }],
    layout: {
      xaxis: {
        title: 'Fréquence (Hz)', type: 'log',
        tickmode: 'array',
        tickvals: [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000],
        ticktext: ['20', '50', '100', '200', '500', '1k', '2k', '5k', '10k', '20k'],
      },
      yaxis: { title: 'Amplitude', type: 'log', dtick: 1, exponentformat: 'none' },
      bargap: 0,
    },
  };
}

// ── plotband ──────────────────────────────────────────────────────────────────
const BIN_LABELS = {
  bass:     'Basses',
  mid:      'Mids',
  highmid:  'High-Mids',
  uppermid: 'Upper-Mids',
  presence: 'Présence',
  brillance:'Brillance',
};
const BIN_COLORS = ['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b'];

export function analysisPlotBand(sound) {
  const logTickVals = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10];
  const logTickText = ['0.05','0.1','0.2','0.5','1','2','5','10'];
  const xMin = 0.05;  // log axis start — matches Python ax.set_xlim(0.05, ...)

  // First pass: compute raw envelopes and find global maximum
  const envelopes = {};
  let globalMax = 0;
  for (const [name, binSig] of Object.entries(sound.bins)) {
    const { values, times } = binSig.log_envelope();
    envelopes[name] = { values, times };
    const localMax = Math.max(...values);
    if (localMax > globalMax) globalMax = localMax;
  }
  if (globalMax === 0) globalMax = 1;

  // Second pass: build traces normalized to global max
  const traces = [];
  let xMaxAll = 0, yMinAll = Infinity;

  Object.entries(sound.bins).forEach(([name, binSig], ci) => {
    const { values, times } = envelopes[name];
    const [lo, hi] = binSig.freqRange;

    const x = [], y = [];
    for (let i = 0; i < times.length; i++) {
      const v = values[i] / globalMax;
      if (times[i] >= xMin && v > 0) { x.push(times[i]); y.push(v); }
    }
    if (times[times.length - 1] > xMaxAll) xMaxAll = times[times.length - 1];
    const rowMin = Math.min(...y.filter(v => v > 0));
    if (rowMin < yMinAll) yMinAll = rowMin;

    traces.push({
      x, y, type: 'scatter', mode: 'lines',
      line: { width: 1.5, color: BIN_COLORS[ci] },
      name: `${BIN_LABELS[name]} (${lo}–${hi} Hz)`,
    });
  });

  return {
    data: traces,
    layout: {
      xaxis: {
        title: 'Temps (s)', type: 'log',
        range: [Math.log10(xMin), Math.log10(xMaxAll)],
        tickmode: 'array', tickvals: logTickVals, ticktext: logTickText,
      },
      yaxis: {
        title: 'Amplitude (normalisée)', type: 'log',
        range: [Math.log10(Math.max(yMinAll * 0.5, 1e-5)), 0],
        tickmode: 'array',
        tickvals: [0.001, 0.01, 0.1, 1],
        ticktext: ['0.001', '0.01', '0.1', '1'],
      },
      legend: { font: { size: 10 } },
    },
  };
}

// ── histband ──────────────────────────────────────────────────────────────────
export function analysisHistBand(sound) {
  const binNames  = Object.keys(sound.bins);
  const integrals = binNames.map(name => {
    const norm = sound.bins[name].normalize();
    const { values, times } = norm.log_envelope();
    return trapezoid(Array.from(values), Array.from(times));
  });
  const maxVal = Math.max(...integrals);
  const normalized = integrals.map(v => v / maxVal);

  return {
    data: [{
      x: binNames.map(n => BIN_LABELS[n]),
      y: normalized,
      type: 'bar',
      marker: { color: BIN_COLORS },
    }],
    layout: {
      xaxis: { title: 'Bandes de fréquence' },
      yaxis: { title: 'Puissance totale (normalisée)', range: [0, 1.05] },
    },
  };
}

// ── listenband ────────────────────────────────────────────────────────────────
export function analysisListenBand(sound) {
  return { type: 'audio_bins', bins: sound.bins, sr: sound.sr };
}

// Matplotlib 'inferno' colorscale (explicit, since Plotly.js may not recognize the name)
const INFERNO_CS = [
  [0.00, '#000004'], [0.13, '#1b0c41'], [0.25, '#4a0c4e'], [0.38, '#781c6d'],
  [0.50, '#a52c60'], [0.63, '#cf4446'], [0.75, '#ed6925'], [0.88, '#fb9b06'],
  [1.00, '#fcffa4'],
];

// ── specgram ──────────────────────────────────────────────────────────────────
export function analysisSpecgram(sound) {
  const { freqs, times, spec } = sound.lognormspect();
  const fftRange = sound.SP.general.fft_range;
  const maxFreq  = 1.1 * fftRange;

  // Slice to fft_range
  let cutIdx = freqs.length;
  for (let i = 0; i < freqs.length; i++) { if (freqs[i] > maxFreq) { cutIdx = i; break; } }

  const yFreqs = Array.from(freqs.slice(0, cutIdx));
  const z = spec.slice(0, cutIdx).map(row => Array.from(row));

  return {
    data: [{
      x: Array.from(times),
      y: yFreqs,
      z,
      type: 'heatmap',
      colorscale: INFERNO_CS,
      zsmooth: 'fast',
      showscale: true,
      colorbar: { title: { text: 'Amplitude (dB)', side: 'right' }, thickness: 15 },
    }],
    layout: {
      xaxis: { title: 'Temps (s)' },
      yaxis: { title: 'Fréquence (Hz)', range: [1, maxFreq] },
    },
  };
}

// ── peaks ─────────────────────────────────────────────────────────────────────
export function analysisPeaks(sound) {
  const amp    = Array.from(sound.signal.fft());
  const freqs  = Array.from(sound.signal.fft_frequencies());
  const fftRange = sound.SP.general.fft_range;

  const cutIdx = freqs.findIndex(f => f >= fftRange);
  const x = cutIdx === -1 ? freqs : freqs.slice(0, cutIdx);
  const y = cutIdx === -1 ? amp   : amp.slice(0, cutIdx);

  const pkIdxs = sound.signal.peaks();
  const pkX = pkIdxs.map(i => freqs[i]);
  const pkY = pkIdxs.map(i => amp[i]);

  return {
    data: [
      { x, y, type: 'scatter', mode: 'lines',
        line: { width: 1, color: sound.color }, name: sound.name },
      { x: pkX, y: pkY, type: 'scatter', mode: 'markers',
        marker: { color: 'red', size: 8 }, name: 'Pics' },
    ],
    layout: {
      xaxis: { title: 'Fréquence (Hz)' },
      yaxis: {
        title: 'Amplitude (normalisée)', type: 'log',
        tickmode: 'array',
        tickvals: [0.001, 0.01, 0.1, 1],
        ticktext: ['0.001', '0.01', '0.1', '1'],
      },
    },
  };
}

// ── timedamp ──────────────────────────────────────────────────────────────────
export function analysisTimeDamp(sound) {
  const norm = sound.signal.normalize();
  const { values: env, times: envT } = norm.envelope();

  // First point: envelope peak
  let firstIdx = 0;
  for (let i = 1; i < env.length; i++) if (env[i] > env[firstIdx]) firstIdx = i;

  // Second point: first index where envelope drops below lower_threshold
  let thresh = sound.SP.damping.lower_threshold;
  let secondIdx = env.length - 1;
  outer: while (thresh <= 1) {
    for (let i = firstIdx; i < env.length; i++) {
      if (env[i] <= thresh) { secondIdx = i; break outer; }
    }
    thresh *= 2;
  }

  // Fit exp(k*t): log-linear regression log(env_i) = k * t_i
  let num = 0, den = 0;
  for (let i = firstIdx; i < secondIdx; i++) {
    if (env[i] <= 0) continue;
    const t = envT[i];
    num += t * Math.log(env[i]);
    den += t * t;
  }
  const k = den > 0 ? num / den : -1;

  // Zeta = -k / (2π * fundamental)
  const wd   = 2 * Math.PI * sound.fundamental;
  const zeta = wd > 0 ? -k / wd : 0;

  // Fitted curve plotted over the fitting range
  const fitX = [], fitY = [];
  for (let i = firstIdx; i < secondIdx; i++) {
    fitX.push(envT[i]);
    fitY.push(Math.exp(k * envT[i]));
  }

  return {
    data: [
      { x: Array.from(envT), y: Array.from(env),
        type: 'scatter', mode: 'lines',
        line: { width: 2, color: sound.color, opacity: 0.6 },
        name: 'Enveloppe du signal' },
      { x: fitX, y: fitY,
        type: 'scatter', mode: 'lines',
        line: { width: 2, color: 'black', dash: 'dash' },
        name: "Courbe d'amortissement" },
      { x: [envT[firstIdx], envT[secondIdx]], y: [env[firstIdx], env[secondIdx]],
        type: 'scatter', mode: 'markers',
        marker: { color: 'red', size: 10 }, showlegend: false },
    ],
    layout: {
      xaxis: { title: 'Temps (s)' },
      yaxis: { title: 'Amplitude (0 à 1)' },
      title: { text: `ζ = ${zeta.toFixed(5)}` },
    },
  };
}
