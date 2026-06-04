// Central analysis registry.
//
// To add a new analysis:
//   1. Write the function in single.js / dual.js / multi.js
//   2. Import it here and add one entry below — nothing else changes.

import { analysisSignal, analysisEnvelope, analysisLogEnv,
         analysisFft, analysisFftHist,
         analysisPlotBand, analysisHistBand, analysisListenBand,
         analysisSpecgram, analysisPeaks, analysisTimeDamp } from './single.js';

import { dualSignal, dualEnvelope, dualLogEnv, dualFft, dualFftHist,
         dualFftMirror, dualFftDiff, dualSpecDiff, dualPeakComp,
         dualFbinPlot, dualBinHist, dualBinPower } from './dual.js';

// Wraps a single-sound fn and a multi-sound fn into one adaptive entry.
// When called with an array of 1 sound, dispatches to singleFn(sounds[0]);
// otherwise dispatches to multiFn(sounds).
function adaptive(singleFn, multiFn) {
  return (sounds) => sounds.length === 1 ? singleFn(sounds[0]) : multiFn(sounds);
}

export const analyses = {
  // ── Adaptive (1 sound → single behaviour; 2+ → overlay) ─────────────────
  signal: {
    label:  'Courbe du son',
    kind:   'adaptive',
    fn:     adaptive(analysisSignal, dualSignal),
    help:   'documentation/signal.md',
    figure: 'documentation/figures/signal.png',
  },
  envelope: {
    label:  'Enveloppe du signal',
    kind:   'adaptive',
    fn:     adaptive(analysisEnvelope, dualEnvelope),
    help:   'documentation/envelope.md',
    figure: 'documentation/figures/envelope.png',
  },
  logenv: {
    label:  'Enveloppe logarithmique',
    kind:   'adaptive',
    fn:     adaptive(analysisLogEnv, dualLogEnv),
    help:   'documentation/logenvelope.md',
    figure: 'documentation/figures/logenv.png',
  },
  fft: {
    label:  'Spectre fréquentiel (FFT)',
    kind:   'adaptive',
    fn:     adaptive(analysisFft, dualFft),
    help:   'documentation/fft.md',
    figure: 'documentation/figures/fft.png',
  },
  ffthist: {
    label:  'Histogramme spectral (FFT)',
    kind:   'adaptive',
    fn:     adaptive(analysisFftHist, dualFftHist),
    help:   'documentation/binfft.md',
    figure: 'documentation/figures/ffthist.png',
  },
  histband: {
    label:  'Histogramme des bandes',
    kind:   'adaptive',
    fn:     adaptive(analysisHistBand, dualBinHist),
    help:   'documentation/histband.md',
    figure: 'documentation/figures/histband.png',
  },
  // ── Single-sound only ────────────────────────────────────────────────────
  plotband: {
    label:  'Bandes de fréquence',
    kind:   'single',
    fn:     analysisPlotBand,
    help:   'documentation/plotband.md',
    figure: 'documentation/figures/plotband.png',
  },
  listenband: {
    label:  'Écoute par bandes',
    kind:   'single',
    type:   'audio',
    fn:     analysisListenBand,
    help:   'documentation/listenband.md',
    figure: 'documentation/figures/listenband.png',
  },
  peaks: {
    label:  'Pics spectraux (FFT)',
    kind:   'single',
    fn:     analysisPeaks,
    help:   'documentation/peaks.md',
    figure: 'documentation/figures/peaks.png',
  },
  timedamp: {
    label:  'Amortissement temporel',
    kind:   'single',
    fn:     analysisTimeDamp,
    help:   'documentation/timedamp.md',
    figure: 'documentation/figures/timedamp.png',
  },
  specgram: {
    label:  'Spectrogramme',
    kind:   'single',
    fn:     analysisSpecgram,
    help:   'documentation/specgram.md',
    figure: 'documentation/figures/specgram.png',
  },
  // ── Multi-only (≥2 sounds, uses all selected) ────────────────────────────
  fbinplot: {
    label:  'Bandes de fréquence',
    kind:   'multi',
    fn:     dualFbinPlot,
    help:   'documentation/fbinplot.md',
  },
  binpower: {
    label:  'Puissance des bandes',
    kind:   'multi',
    fn:     dualBinPower,
    help:   'documentation/binpower.md',
  },
  // ── Dual-only (exactly 2 selected sounds) ────────────────────────────────
  fftmirror: {
    label:  'Spectres en miroir',
    kind:   'dual',
    fn:     dualFftMirror,
    help:   'documentation/fftmirror.md',
  },
  fftdiff: {
    label:  'Différence spectrale (FFT)',
    kind:   'dual',
    fn:     dualFftDiff,
    help:   'documentation/fftdiff.md',
  },
  specdiff: {
    label:  'Différence des spectrogrammes',
    kind:   'dual',
    fn:     dualSpecDiff,
    help:   'documentation/specdiff.md',
  },
  peakcomp: {
    label:  'Comparaison des pics (FFT)',
    kind:   'dual',
    fn:     dualPeakComp,
    help:   'documentation/peakcomp.md',
  },
};

// Section 1 (1 son): adaptive + single
export const section1Analyses = () =>
  Object.entries(analyses).filter(([, v]) => v.kind === 'adaptive' || v.kind === 'single');

// Section 2 (2 sons): dual only
export const dualAnalyses = () =>
  Object.entries(analyses).filter(([, v]) => v.kind === 'dual');

// Section N (N sons): multi only (adaptive already in section 1)
export const multiOnlyAnalyses = () =>
  Object.entries(analyses).filter(([, v]) => v.kind === 'multi');
