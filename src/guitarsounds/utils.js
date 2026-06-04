// Port of guitarsounds/utils.py (math utilities only; audio I/O is handled by Web Audio API)

export function linspace(start, stop, num) {
  if (num === 1) return [start];
  const step = (stop - start) / (num - 1);
  const out = new Float64Array(num);
  for (let i = 0; i < num; i++) out[i] = start + i * step;
  return out;
}

export function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// Port of utils.octave_values
export function octaveValues(fraction, minFreq = 10, maxFreq = 20200) {
  const f = 1000.0;
  const multiple = 2 ** (1 / fraction);
  const bins = [f];
  let fUp = f, fDown = f;
  while (fUp < maxFreq || fDown > minFreq) {
    fUp   *= multiple;
    fDown /= multiple;
    if (fDown > minFreq) bins.unshift(fDown);
    if (fUp   < maxFreq) bins.push(fUp);
  }
  return bins;
}

// Port of utils.octave_histogram — returns bin edges for a histogram
export function octaveHistogram(fraction, minFreq = 10, maxFreq = 20200) {
  const bins = octaveValues(fraction, minFreq, maxFreq);
  const edges = bins.map(f => f / 2 ** (1 / (2 * fraction)));
  edges.push(bins[bins.length - 1] * 2 ** (1 / (2 * fraction)));
  return edges;
}

// Trapezoidal integration — port of scipy.integrate.trapezoid
export function trapezoid(y, x) {
  let sum = 0;
  for (let i = 0; i < y.length - 1; i++) {
    sum += 0.5 * (y[i] + y[i + 1]) * (x[i + 1] - x[i]);
  }
  return sum;
}

// Cumulative trapezoidal integration (returns array, length = y.length)
export function cumulativeTrapezoid(y, x) {
  const out = new Float64Array(y.length);
  out[0] = 0;
  for (let i = 1; i < y.length; i++) {
    out[i] = out[i - 1] + 0.5 * (y[i - 1] + y[i]) * (x[i] - x[i - 1]);
  }
  return out;
}

// Linear interpolation — port of scipy.interpolate.interp1d (extrapolation = clamp)
export function interp1d(xs, ys) {
  return function (x) {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
    let lo = 0, hi = xs.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid; else hi = mid;
    }
    const t = (x - xs[lo]) / (xs[hi] - xs[lo]);
    return ys[lo] + t * (ys[hi] - ys[lo]);
  };
}

// Guitar string frequency → trim time interpolator (port of utils.freq2trim)
const FREQ_DICT = { E2: 82.41, A2: 110.0, D3: 146.83, G3: 196.0, B3: 246.94, E4: 329.63 };
const TRIM_DICT = { E2: 4.0,   A2: 3.5,   D3: 3.5,    G3: 3.0,   B3: 3.0,   E4: 2.5   };
const _freqs = Object.values(FREQ_DICT);
const _trims = Object.values(TRIM_DICT);
export const freq2trim = interp1d(_freqs, _trims);

// nth-order polynomial fit — port of utils.nth_order_polynomial_fit
// Returns a function f(x) based on least-squares polynomial coefficients.
// Uses simple normal equations (sufficient for the low-order polynomials used here).
export function nthOrderPolynomialFit(n, xs, ys) {
  n = Math.min(n + 1, xs.length);
  // Build Vandermonde matrix A and solve A^T A c = A^T y via Gaussian elimination
  const A = Array.from({ length: xs.length }, (_, i) =>
    Array.from({ length: n }, (_, j) => xs[i] ** j)
  );
  // Normal equations: (A^T A) c = A^T y
  const ATA = Array.from({ length: n }, () => new Float64Array(n));
  const ATy = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      for (let k = 0; k < xs.length; k++) ATA[i][j] += A[k][i] * A[k][j];
    }
    for (let k = 0; k < xs.length; k++) ATy[i] += A[k][i] * ys[k];
  }
  const coeffs = gaussianElimination(ATA, ATy);
  return (x) => coeffs.reduce((sum, c, j) => sum + c * x ** j, 0);
}

function gaussianElimination(M, b) {
  const n = b.length;
  // Augmented matrix
  const aug = M.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    // Pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    for (let row = col + 1; row < n; row++) {
      const f = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) aug[row][j] -= f * aug[col][j];
    }
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
    x[i] /= aug[i][i];
  }
  return x;
}
