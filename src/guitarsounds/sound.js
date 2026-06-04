// Port of guitarsounds/analysis.py — Sound class
// Phase 1: constructor
// Phase 2: condition() with onset trimming + auto-trim by fundamental

import { Signal } from './signal.js';
import { soundParameters } from './parameters.js';
import { freq2trim } from './utils.js';

export class Sound {
  constructor(float64Array, sr, name = '', params = null) {
    this.SP          = params ?? soundParameters();
    this.name        = name;
    this.sr          = sr;
    this.raw_signal  = new Signal(float64Array, sr, this.SP);
    this.bins        = null;   // populated in Phase 3

    this.condition();
  }

  // Port of Sound.condition()
  // Resampling is handled upstream (soundManager.js always delivers 22050 Hz).
  condition(autoTrim = true) {
    // Trim onset
    this.trimmed_signal = this.raw_signal.trim_onset();
    this.signal         = this.trimmed_signal;

    // Fundamental from trimmed signal
    this.fundamental = this.signal.fundamental();

    // Auto-trim to standard length for the detected fundamental
    if (autoTrim && this.fundamental > 0) {
      const trimSecs = freq2trim(this.fundamental);
      if (trimSecs < this.signal.signal.length / this.sr) {
        this.signal = this.signal.trim_time(trimSecs);
      }
    }

    // Divide into frequency bins
    this.bins = this.signal.make_freq_bins();
  }

  // Port of Sound.lognormspect() — log-normalized spectrogram
  lognormspect() {
    const { freqs, times, spec } = this.signal.spectrogram();

    // Normalize by global max
    let globalMax = 0;
    for (const row of spec) for (const v of row) if (v > globalMax) globalMax = v;
    if (globalMax > 0) {
      for (const row of spec) for (let t = 0; t < row.length; t++) row[t] /= globalMax;
    }

    // Log transform: threshold low values at thresh, apply log, shift to 0
    const thresh = 1e-4;
    let logMin = Infinity;
    for (const row of spec) {
      for (const v of row) {
        if (v > thresh) { const lv = Math.log(v); if (lv < logMin) logMin = lv; }
      }
    }
    if (!isFinite(logMin)) logMin = Math.log(thresh);

    for (const row of spec) {
      for (let t = 0; t < row.length; t++) {
        row[t] = (row[t] > thresh ? Math.log(row[t]) : logMin) - logMin;
      }
    }

    return { freqs, times, spec };
  }
}
