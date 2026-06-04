// Direct port of guitarsounds/parameters.py

export function soundParameters() {
  return {
    general:      { octave_fraction: 3,     fft_range: 2000 },
    onset:        { onset_delay: 100,        onset_time: 0.005 },
    envelope:     { frame_size: 301,         hop_length: 200 },
    log_envelope: { start_time: 0.01,        min_window: null, max_window: 2048 },
    fundamental:  { min_freq: 60,            max_freq: 2000,   frame_length: 1024 },
    bins:         { bass: 100, mid: 700,     highmid: 2000,    uppermid: 4000, presence: 6000 },
    damping:      { lower_threshold: 0.05 },
    trim:         { E2: 4.0, A2: 3.5,       D3: 3.5,          G3: 3.0, B3: 3.0, E4: 2.5 },
  };
}
