// Shared UI settings that cross module boundaries.
// Currently: "generic sounds" mode, set on the "Ajouter des sons" tab
// (soundManager) and read by the analysis pane (analysisPanel) to disable
// analyses that assume a harmonic signal.

let _genericMode = false;

const _listeners = [];
export function onSettingsChanged(fn) { _listeners.push(fn); }
function _notify() { _listeners.forEach(fn => fn()); }

export function getGenericMode() { return _genericMode; }

export function setGenericMode(value) {
  const v = !!value;
  if (v === _genericMode) return;
  _genericMode = v;
  _notify();
}
