// Port of guitarsounds/analysis.py — Signal class
// Phase 1: FFT methods
// Phase 2: onset detection, trim, envelope, log_envelope

import { linspace, nextPow2 } from './utils.js';
import { sosfilt, FILTER_COEFFS } from './filters.js';

// ── Cooley-Tukey iterative FFT (in-place, power-of-2 size) ──────────────────
function fftInPlace(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wBaseRe = Math.cos(ang), wBaseIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1, wIm = 0;
      for (let j = 0; j < len >> 1; j++) {
        const uRe = re[i + j], uIm = im[i + j];
        const half = i + j + (len >> 1);
        const vRe = re[half] * wRe - im[half] * wIm;
        const vIm = re[half] * wIm + im[half] * wRe;
        re[i + j] = uRe + vRe; im[i + j] = uIm + vIm;
        re[half]  = uRe - vRe; im[half]  = uIm - vIm;
        const nwRe = wRe * wBaseRe - wIm * wBaseIm;
        wIm = wRe * wBaseIm + wIm * wBaseRe; wRe = nwRe;
      }
    }
  }
}

// ── Savitzky-Golay filter, degree 1 (= moving average), mirror padding ───────
function savgolFilter(x, W) {
  const half = (W - 1) >> 1;
  const n = x.length;
  const p = new Float64Array(n + 2 * half);
  for (let i = 0; i < half; i++) p[i] = x[half - i];
  for (let i = 0; i < n; i++) p[half + i] = x[i];
  for (let i = 0; i < half; i++) p[half + n + i] = x[n - 2 - i];
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < W; j++) s += p[i + j];
    out[i] = s / W;
  }
  return out;
}

// ── Local-maximum peak finder — port of scipy.signal.find_peaks ───────────────
// height may be a scalar or a same-length array (height threshold per bin).
// distance enforces a minimum sample gap between retained peaks.
function findPeaks(x, { height = null, distance = 1 } = {}) {
  const n = x.length;
  const candidates = [];
  for (let i = 1; i < n - 1; i++) {
    if (x[i] > x[i - 1] && x[i] >= x[i + 1]) {
      if (height !== null) {
        const minH = (ArrayBuffer.isView(height) || Array.isArray(height)) ? height[i] : height;
        if (x[i] < minH) continue;
      }
      candidates.push(i);
    }
  }
  if (distance <= 1 || candidates.length === 0) return candidates;
  const keep = new Uint8Array(candidates.length).fill(1);
  for (let i = 0; i < candidates.length; i++) {
    if (!keep[i]) continue;
    for (let j = i + 1; j < candidates.length && candidates[j] - candidates[i] < distance; j++) {
      if (x[candidates[i]] >= x[candidates[j]]) keep[j] = 0;
      else { keep[i] = 0; break; }
    }
  }
  return candidates.filter((_, i) => keep[i]);
}

// ── Tukey window (periodic, alpha=0.25) — matches scipy spectrogram default ──
function tukeyWindow(N, alpha = 0.25) {
  const Nsym  = N + 1;
  const width = Math.floor(alpha * (Nsym - 1) / 2);
  const w = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    if (i < width) {
      w[i] = 0.5 * (1 - Math.cos(Math.PI * i / width));
    } else if (i <= Nsym - 1 - width) {
      w[i] = 1.0;
    } else {
      w[i] = 0.5 * (1 - Math.cos(Math.PI * (Nsym - 1 - i) / width));
    }
  }
  return w;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function absMax(arr, start = 0, end = arr.length) {
  let m = 0, mi = start;
  for (let i = start; i < end; i++) { const a = Math.abs(arr[i]); if (a > m) { m = a; mi = i; } }
  return { val: m, idx: mi };
}

// ── Signal class ─────────────────────────────────────────────────────────────
export class Signal {
  constructor(signal, sr, params) {
    this.signal = signal instanceof Float64Array ? signal : new Float64Array(signal);
    this.sr     = sr;
    this.SP     = params;
    this._fftCache = null;
    this._paddedN  = null;
    this.onset     = null;   // set by trim_onset()
  }

  // ── Time vector ─────────────────────────────────────────────────────────
  time() {
    return linspace(0, this.signal.length / this.sr, this.signal.length);
  }

  // ── FFT (Phase 1) ────────────────────────────────────────────────────────
  fft() {
    if (this._fftCache) return this._fftCache;
    const N = nextPow2(this.signal.length);
    this._paddedN = N;
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < this.signal.length; i++) re[i] = this.signal[i];
    fftInPlace(re, im);
    const halfN = N >> 1;
    const amp = new Float64Array(halfN);
    for (let i = 0; i < halfN; i++) amp[i] = Math.sqrt(re[i]*re[i] + im[i]*im[i]);
    let maxAmp = 0;
    for (let i = 0; i < halfN; i++) if (amp[i] > maxAmp) maxAmp = amp[i];
    if (maxAmp > 0) for (let i = 0; i < halfN; i++) amp[i] /= maxAmp;
    this._fftCache = amp;
    return amp;
  }

  fft_frequencies() {
    const amp = this.fft();
    const N = this._paddedN;
    const freqs = new Float64Array(amp.length);
    for (let i = 0; i < amp.length; i++) freqs[i] = (i * this.sr) / N;
    return freqs;
  }

  fft_bins() {
    const amp = this.fft(), freqs = this.fft_frequencies();
    const result = [];
    for (let i = 0; i < amp.length; i++) {
      const count = Math.round(amp[i] * 100);
      for (let j = 0; j < count; j++) result.push(freqs[i]);
    }
    return result;
  }

  fundamental() {
    const amp = this.fft(), freqs = this.fft_frequencies();
    const minF = this.SP.fundamental.min_freq, maxF = this.SP.fundamental.max_freq;
    let best = 0, bestF = 0;
    for (let i = 0; i < freqs.length; i++) {
      if (freqs[i] >= minF && freqs[i] <= maxF && amp[i] > best) { best = amp[i]; bestF = freqs[i]; }
    }
    return bestF;
  }

  normalize() {
    let maxAbs = 0;
    for (const v of this.signal) if (Math.abs(v) > maxAbs) maxAbs = Math.abs(v);
    const norm = new Float64Array(this.signal.length);
    if (maxAbs > 0) for (let i = 0; i < norm.length; i++) norm[i] = this.signal[i] / maxAbs;
    const s = new Signal(norm, this.sr, this.SP);
    s.norm_factor = maxAbs > 0 ? 1 / maxAbs : 1;
    return s;
  }

  // ── Phase 2: onset & trim ─────────────────────────────────────────────────

  // Port of Signal.find_onset()
  // Returns sample index of the note onset.
  find_onset() {
    const windowIdx = Math.ceil(this.SP.onset.onset_time * this.sr);
    const norm      = this.normalize();
    const sig       = norm.signal;
    const overlap   = Math.max(1, windowIdx >> 1);
    let increase = 0, i = 0;

    while (increase <= 0.5) {
      const end = Math.min(i + windowIdx, sig.length);
      let mn = Infinity, mx = 0;
      for (let k = i; k < end; k++) { const a = Math.abs(sig[k]); if (a < mn) mn = a; if (a > mx) mx = a; }
      if (mx > 0.5 && mn !== 0) {
        increase = mx / mn;
      } else {
        increase = 0;
      }
      i += overlap;
      if (i + windowIdx > this.signal.length) {
        return absMax(this.signal).idx;   // fallback: signal peak
      }
    }
    i -= overlap;
    return absMax(this.signal, i, i + windowIdx).idx;
  }

  // Port of Signal.trim_onset()
  // Returns a new Signal starting onset_delay ms before the onset, with a fade-in.
  trim_onset() {
    const delaySamples = Math.floor((this.SP.onset.onset_delay / 1000) * this.sr);
    const onset        = this.find_onset();
    let newSig;

    if (onset > delaySamples) {
      newSig = this.signal.slice(onset - delaySamples);
    } else {
      const fill = new Float64Array(delaySamples - onset);
      newSig = new Float64Array(fill.length + this.signal.length);
      newSig.set(fill, 0);
      newSig.set(this.signal, fill.length);
    }

    // Linear fade-in over first half of delay window
    const fadeLen = Math.floor(delaySamples / 2);
    for (let i = 0; i < fadeLen && i < newSig.length; i++) {
      newSig[i] *= i / fadeLen;
    }

    const trimmed = new Signal(newSig, this.sr, this.SP);
    trimmed.onset = trimmed.find_onset();
    return trimmed;
  }

  // Port of Signal.trim_time()
  // Returns a new Signal of at most `seconds` duration with a 50-sample fade at the end.
  trim_time(seconds) {
    const maxIdx = Math.min(Math.floor(seconds * this.sr), this.signal.length);
    const newSig = this.signal.slice(0, maxIdx);
    const fadeStart = Math.max(0, maxIdx - 50);
    for (let i = fadeStart; i < maxIdx; i++) {
      newSig[i] *= (maxIdx - i) / (maxIdx - fadeStart);
    }
    const result = new Signal(newSig, this.sr, this.SP);
    if (this.onset != null) result.onset = Math.min(this.onset, maxIdx - 1);
    return result;
  }

  // ── Phase 2: envelope ────────────────────────────────────────────────────

  // Port of Signal.envelope()
  // Returns { values: Float64Array, times: Float64Array }
  envelope() {
    const sig     = this.signal;
    const n       = sig.length;
    const timeArr = this.time();

    // Absolute value
    const absSig = new Float64Array(n);
    for (let i = 0; i < n; i++) absSig[i] = Math.abs(sig[i]);

    const globalMax = absMax(absSig).val;

    // Use the stored onset when available (set by trim_onset); otherwise fall back
    // to noise-level heuristic.  The heuristic fails when pre-onset audio is loud
    // (e.g. ambient room noise recorded before the pluck), which sets guess_thresh
    // above the signal max and forces idxOnset=0, making the onset appear at t=0.
    let idxOnset;
    if (this.onset != null) {
      idxOnset = this.onset;
    } else {
      const idx05s    = Math.max(0, Math.floor(0.05 * this.sr));
      const sigAtIdx  = absSig[idx05s] || 0;
      const guessThresh = sigAtIdx * 10 * globalMax;
      idxOnset = 0;
      for (let i = 0; i < n; i++) { if (absSig[i] > guessThresh) { idxOnset = i; break; } }
    }

    const endIdx = absMax(absSig).idx;   // index of signal peak

    // ── Phase 1: small-window onset ramp (window=20, step=11) ───────────
    const smallWin = 20, smallStep = 11;
    const onsetPts  = [0.0];
    const onsetIdxs = [idxOnset];
    let cur = idxOnset;
    while (cur <= endIdx) {
      const end = Math.min(cur + smallWin, n);
      const { val, idx } = absMax(absSig, cur, end);
      onsetPts.push(val);
      onsetIdxs.push(idx);
      cur += smallStep;
    }
    {
      const start2 = Math.max(0, cur - smallStep);
      const { val, idx } = absMax(absSig, start2, Math.min(endIdx + 1, n));
      onsetPts.push(val);
      onsetIdxs.push(idx);
    }

    // Filter strictly increasing (>1% of global max)
    const thresh = 0.01 * globalMax;
    const incPts  = [onsetPts[0]];
    const incIdxs = [onsetIdxs[0]];
    for (let i = 1; i < onsetPts.length; i++) {
      if (onsetPts[i] - incPts[incPts.length - 1] > thresh) {
        incPts.push(onsetPts[i]);
        incIdxs.push(onsetIdxs[i]);
      }
    }

    // ── Phase 2: fundamental-period window decay ─────────────────────────
    // Use this.fundamental() as estimate (peaks() not available until Phase 5)
    const fund = this.fundamental() || 185.3;   // fallback: mean of open guitar strings
    const period = 1 / fund;
    let window = Math.max(Math.round(period * this.sr) * 2, Math.round(0.01 * this.sr));
    let step   = window - 1;

    const envPts  = incPts.slice();
    const envIdxs = incIdxs.slice();
    cur = endIdx + 1;

    while (cur < n) {
      const end = Math.min(cur + window, n);
      const { val, idx: idxAtMax } = absMax(absSig, cur, end);
      if (Math.abs(idxAtMax - envIdxs[envIdxs.length - 1]) > 10) {
        envPts.push(val);
        envIdxs.push(idxAtMax);
      }
      cur += step;
    }

    // Remove duplicates (keep first occurrence per idx)
    const seen = new Set();
    const uPts = [], uIdxs = [];
    for (let i = 0; i < envIdxs.length; i++) {
      if (!seen.has(envIdxs[i])) { seen.add(envIdxs[i]); uPts.push(envPts[i]); uIdxs.push(envIdxs[i]); }
    }

    // Convex smoothing: replace local dips with mean of neighbours
    const convex = [uPts[0], uPts[1] ?? uPts[0]];
    for (let i = 2; i < uPts.length - 1; i++) {
      if (uPts[i] < uPts[i - 1] && uPts[i] < uPts[i + 1]) {
        const minNeighbour  = Math.min(uPts[i - 1], uPts[i + 1]);
        const meanNeighbour = (uPts[i - 1] + uPts[i + 1]) / 2;
        convex.push((minNeighbour + meanNeighbour) / 2);
      } else {
        convex.push(uPts[i]);
      }
    }
    if (uPts.length > 1) convex.push(uPts[uPts.length - 1]);

    // Prepend t=0 baseline so the pre-onset buffer appears as a flat line
    // (only when the onset is not already at sample 0)
    const rawTimes = uIdxs.map(i => timeArr[Math.min(i, n - 1)]);
    if (idxOnset > 0) { rawTimes.unshift(0); convex.unshift(0); }

    const values = new Float64Array(convex);
    const times  = new Float64Array(rawTimes);
    return { values, times };
  }

  // Port of Signal.log_envelope() — with legacy=False (default) this is
  // identical to envelope(). The "log" refers only to the x-axis display scale.
  log_envelope() {
    return this.envelope();
  }

  // ── Phase 4: spectrogram ────────────────────────────────────────────────

  // Port of scipy.signal.spectrogram with Tukey window (alpha=0.25).
  // noverlap defaults to 75% overlap (step=N/4) for higher visual time-resolution.
  // Returns { freqs: Float64Array, times: Float64Array, spec: Float64Array[] }
  // where spec[k][t] = power at freq freqs[k], time times[t].
  spectrogram(nperseg = 1024, noverlap = null) {
    const N        = nperseg;
    const actualNoverlap = noverlap ?? (N - (N >> 2));  // 75% overlap → step = N/4 = 256
    const step    = N - actualNoverlap;
    const win     = tukeyWindow(N);

    const sig     = this.signal;
    const n       = sig.length;
    const nFrames = n >= N ? Math.floor((n - N) / step) + 1 : 0;
    const nFreqs  = (N >> 1) + 1;     // 513

    const freqs = new Float64Array(nFreqs);
    for (let k = 0; k < nFreqs; k++) freqs[k] = k * this.sr / N;

    const times = new Float64Array(nFrames);
    const spec  = Array.from({ length: nFreqs }, () => new Float64Array(nFrames));

    const re = new Float64Array(N);
    const im = new Float64Array(N);

    for (let t = 0; t < nFrames; t++) {
      const start = t * step;
      times[t] = (start + N / 2) / this.sr;

      // Detrend: subtract segment mean
      let mean = 0;
      for (let i = 0; i < N; i++) mean += sig[start + i];
      mean /= N;

      // Apply window
      re.fill(0); im.fill(0);
      for (let i = 0; i < N; i++) re[i] = (sig[start + i] - mean) * win[i];

      fftInPlace(re, im);

      for (let k = 0; k < nFreqs; k++) {
        spec[k][t] = re[k] * re[k] + im[k] * im[k];
      }
    }

    return { freqs, times, spec };
  }

  // ── Phase 5: peak detection ──────────────────────────────────────────────

  // Port of Signal.peaks(). Returns array of FFT bin indices for harmonic peaks.
  peaks(maxFreq = null) {
    const fftRange = maxFreq ?? this.SP.general.fft_range;
    const fft      = this.fft();
    const freqs    = this.fft_frequencies();

    // max_index: first bin at or beyond fft_range
    let maxIndex = freqs.length;
    for (let i = 0; i < freqs.length; i++) { if (freqs[i] >= fftRange) { maxIndex = i; break; } }

    // peak_distance ≈ half the index of the FFT maximum
    let peakDist = Math.floor(fft.slice(0, maxIndex).indexOf(Math.max(...fft.slice(0, maxIndex))) / 2);
    const maxFundIdx = freqs.findIndex(f => f > 50) || 1;
    if (peakDist < maxFundIdx) peakDist = maxFundIdx;

    // Exponentially decaying height threshold (first pass)
    const maxStart = Math.max(...fft.slice(0, peakDist));
    const maxEnd   = Math.max(...fft.slice(maxIndex - peakDist, maxIndex));
    const expStart0 = Math.log10(maxStart);
    const expEnd    = Math.log10(Math.max(maxEnd, 1e-16));
    const exponents0 = Array.from({ length: maxIndex }, (_, i) =>
      expStart0 + (expEnd - expStart0) * i / (maxIndex - 1));
    const intersect   = 10 ** exponents0[peakDist];
    const offsetStart = maxStart + (maxStart - intersect);
    const expStart1   = Math.log10(Math.max(offsetStart, 1e-16));
    const minHeight   = Array.from({ length: maxIndex }, (_, i) =>
      10 ** (expStart1 + (expEnd - expStart1) * i / (maxIndex - 1)));

    const firstPeaks = findPeaks(fft.slice(0, maxIndex), { height: minHeight, distance: peakDist });

    // Savitzky-Golay smoothing (degree 1 = moving average) for height threshold
    const nPeaks  = firstPeaks.length || 1;
    let avgLen = Math.floor(maxIndex / nPeaks) * 3;
    if (avgLen % 2 === 0) avgLen += 1;
    if (avgLen < 3) avgLen = 3;

    const avgFft = savgolFilter(fft.slice(0, maxIndex), avgLen);
    for (let i = 0; i < avgFft.length; i++) avgFft[i] *= 1.9;

    const minFreqIdx = freqs.findIndex(f => f >= 70) || 1;
    for (let i = 0; i < minFreqIdx; i++) avgFft[i] = 1;

    let peaks = findPeaks(fft.slice(0, maxIndex), { height: avgFft, distance: minFreqIdx });
    if (peaks.length === 0) return peaks;

    while (peaks.length > 1 && fft[peaks[0]] < 5e-2)   peaks = peaks.slice(1);
    while (peaks.length > 1 && fft[peaks[peaks.length - 1]] < 1e-4) peaks = peaks.slice(0, -1);
    return peaks;
  }

  // Port of Signal.peak_damping(). Half-power bandwidth method.
  // Returns array of damping ratios (zeta) for each detected peak.
  peak_damping() {
    const freqs = this.fft_frequencies();
    const fft   = this.fft();
    return this.peaks().map(pk => {
      const peakFreq  = freqs[pk];
      const rootH     = fft[pk] / Math.SQRT2;
      const crossings = [];
      for (let i = 0; i < fft.length - 1; i++) {
        const d0 = fft[i] - rootH, d1 = fft[i + 1] - rootH;
        if (d0 * d1 <= 0 && d0 !== d1) {
          const t = d0 / (d0 - d1);
          crossings.push(freqs[i] + t * (freqs[i + 1] - freqs[i]));
        }
      }
      if (crossings.length < 2) return null;
      crossings.sort((a, b) => Math.abs(a - peakFreq) - Math.abs(b - peakFreq));
      const [w1, w2] = [crossings[0], crossings[1]].sort((a, b) => a - b);
      return (w2 - w1) / (2 * peakFreq);
    }).filter(z => z !== null);
  }

  // ── Phase 3: frequency bins ──────────────────────────────────────────────

  // Port of Signal.make_freq_bins().
  // Returns a dict of Signal instances, one per frequency band.
  make_freq_bins() {
    const bins = {};
    for (const [name, { freqRange, sos }] of Object.entries(FILTER_COEFFS)) {
      const filtered = sosfilt(sos, this.signal);
      const s = new Signal(filtered, this.sr, this.SP);
      s.freqRange = freqRange;
      bins[name] = s;
    }
    return bins;
  }
}
