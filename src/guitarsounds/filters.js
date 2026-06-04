// IIR filter application using Second-Order Sections (SOS).
// Filter coefficients are pre-computed by scripts/precompute_filters.py.

export { FILTER_COEFFS } from './filter_coeffs.js';

// Direct port of scipy.signal.sosfilt.
// sos  — array of [b0,b1,b2, 1,a1,a2] rows (a0 is always 1)
// x    — Float64Array input signal
// Returns a new Float64Array of the same length.
export function sosfilt(sos, x) {
  const n = x.length;
  const out = new Float64Array(n);

  // State for each section: 2 delay elements (zi[s] = [z1, z2])
  const zi = sos.map(() => [0, 0]);

  for (let i = 0; i < n; i++) {
    let sample = x[i];
    for (let s = 0; s < sos.length; s++) {
      const [b0, b1, b2, , a1, a2] = sos[s];
      const [z1, z2] = zi[s];
      const y = b0 * sample + z1;
      zi[s][0] = b1 * sample - a1 * y + z2;
      zi[s][1] = b2 * sample - a2 * y;
      sample = y;
    }
    out[i] = sample;
  }
  return out;
}
