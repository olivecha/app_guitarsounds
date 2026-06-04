// Sound store + audio loading UI
// Handles file upload, microphone recording, and the "Ajouter des sons" tab.

import { Sound } from '../guitarsounds/sound.js';
import { soundParameters } from '../guitarsounds/parameters.js';

// ── Global sound store ───────────────────────────────────────────────────────
// Map<id, Sound>  —  id is a stable string key (never reused after delete)
export const sounds = new Map();
let _nextId = 1;

const _listeners = [];
export function onSoundsChanged(fn) { _listeners.push(fn); }
function _notify() { _listeners.forEach(fn => fn(sounds)); }

// ── Audio decode + resample to 22050 Hz mono ─────────────────────────────────
const TARGET_SR = 22050;

async function decodeAudio(arrayBuffer) {
  const ctx = new AudioContext();
  let audioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    await ctx.close();
  }

  // Mix to mono
  const nCh = audioBuffer.numberOfChannels;
  const nFrames = audioBuffer.length;
  const mono = new Float32Array(nFrames);
  for (let ch = 0; ch < nCh; ch++) {
    const chData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < nFrames; i++) mono[i] += chData[i];
  }
  if (nCh > 1) for (let i = 0; i < nFrames; i++) mono[i] /= nCh;

  // Resample to 22050 Hz if needed
  if (audioBuffer.sampleRate === TARGET_SR) {
    return { signal: new Float64Array(mono), sr: TARGET_SR };
  }
  const targetLength = Math.round(nFrames * TARGET_SR / audioBuffer.sampleRate);
  const offCtx = new OfflineAudioContext(1, targetLength, TARGET_SR);
  const tmpCtx = new AudioContext();
  const monoBuf = tmpCtx.createBuffer(1, nFrames, audioBuffer.sampleRate);
  monoBuf.getChannelData(0).set(mono);
  await tmpCtx.close();
  const src = offCtx.createBufferSource();
  src.buffer = monoBuf;
  src.connect(offCtx.destination);
  src.start(0);
  const rendered = await offCtx.startRendering();
  return { signal: new Float64Array(rendered.getChannelData(0)), sr: TARGET_SR };
}

// ── WAV encoder (RIFF, 16-bit PCM) ───────────────────────────────────────────
export function encodeWav(float64, sr) {
  const n = float64.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const s = (off, str) => { for (let i = 0; i < str.length; i++) v.setUint8(off + i, str.charCodeAt(i)); };
  s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true);
  s(8, 'WAVE'); s(12, 'fmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  s(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const x = Math.max(-1, Math.min(1, float64[i]));
    v.setInt16(44 + i * 2, x < 0 ? x * 32768 : x * 32767, true);
  }
  return buf;
}

export function soundToBlob(sound) {
  return new Blob([encodeWav(sound.signal.signal, sound.sr)], { type: 'audio/wav' });
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function addSoundFromFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  let decoded;
  try {
    decoded = await decodeAudio(arrayBuffer);
  } catch (e) {
    throw new Error(`Impossible de décoder "${file.name}": ${e.message}`);
  }
  const name  = file.name.replace(/\.[^.]+$/, '');
  const id    = String(_nextId++);
  sounds.set(id, new Sound(decoded.signal, decoded.sr, name, soundParameters()));
  _notify();
  return id;
}

export async function addSoundFromBlob(blob, name) {
  const arrayBuffer = await blob.arrayBuffer();
  let decoded;
  try {
    decoded = await decodeAudio(arrayBuffer);
  } catch (e) {
    throw new Error(`Impossible de décoder l'enregistrement : ${e.message}`);
  }
  const id = String(_nextId++);
  sounds.set(id, new Sound(decoded.signal, decoded.sr, name, soundParameters()));
  _notify();
  return id;
}

export function renameSound(id, newName) {
  const s = sounds.get(id);
  if (s) { s.name = newName; _notify(); }
}

export function deleteSound(id) {
  sounds.delete(id);
  _notify();
}

export function downloadSoundAsWav(id) {
  const sound = sounds.get(id);
  if (!sound) return;
  const url = URL.createObjectURL(soundToBlob(sound));
  Object.assign(document.createElement('a'), { href: url, download: `${sound.name}.wav` }).click();
  URL.revokeObjectURL(url);
}

// ── Recording state ───────────────────────────────────────────────────────────
let _mediaRecorder = null;
let _recChunks     = [];
let _recStartTime  = null;
let _recTimerID    = null;
let _recCount      = 0;   // for naming recordings

// ── "Ajouter des sons" tab UI ─────────────────────────────────────────────────
export function initSoundManager(tabEl) {
  tabEl.innerHTML = `
    <div class="sound-manager">
      <div class="upload-area">
        <div class="upload-left">
          <label class="btn-primary" for="file-input">＋ Ajouter un fichier audio</label>
          <input type="file" id="file-input" accept="audio/*" multiple style="display:none" />
          <span class="upload-hint">WAV · MP3 · OGG · FLAC · AAC · M4A…</span>
        </div>
        <div class="upload-right">
          <button id="btn-record" class="btn-secondary">🎙 Enregistrer</button>
          <button id="btn-stop-record" class="btn-stop-record" style="display:none">⏹ Arrêter</button>
          <span id="rec-timer" class="rec-timer" style="display:none" aria-live="polite">00:00</span>
        </div>
      </div>
      <div id="upload-error" class="error-msg" style="display:none"></div>
      <div id="sound-list" class="sound-list"></div>
    </div>
  `;

  document.getElementById('file-input').addEventListener('change', async (e) => {
    const errEl = document.getElementById('upload-error');
    errEl.style.display = 'none';
    for (const file of e.target.files) {
      try {
        await addSoundFromFile(file);
      } catch (err) {
        errEl.textContent = err.message;
        errEl.style.display = 'block';
      }
    }
    e.target.value = '';
  });

  _initRecordingUI();

  onSoundsChanged(() => _renderSoundList());
}

// ── Recording UI ──────────────────────────────────────────────────────────────
function _initRecordingUI() {
  const btnRecord = document.getElementById('btn-record');
  const btnStop   = document.getElementById('btn-stop-record');
  const timerEl   = document.getElementById('rec-timer');
  const errEl     = document.getElementById('upload-error');

  btnRecord.addEventListener('click', async () => {
    errEl.style.display = 'none';
    if (!navigator.mediaDevices) {
      errEl.textContent = 'Enregistrement non disponible : l\'application doit être servie en HTTPS ou sur localhost.';
      errEl.style.display = 'block';
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      errEl.textContent = `Microphone inaccessible : ${e.message}`;
      errEl.style.display = 'block';
      return;
    }

    _recChunks = [];
    _mediaRecorder = new MediaRecorder(stream);

    _mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) _recChunks.push(e.data);
    };

    _mediaRecorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      clearInterval(_recTimerID);
      _recTimerID = null;

      btnRecord.disabled = true;
      btnRecord.textContent = 'Traitement…';

      try {
        const blob = new Blob(_recChunks, { type: _mediaRecorder.mimeType });
        _recCount++;
        await addSoundFromBlob(blob, `Enregistrement ${_recCount}`);
      } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
      }

      btnStop.style.display   = 'none';
      timerEl.style.display   = 'none';
      btnRecord.style.display = '';
      btnRecord.disabled      = false;
      btnRecord.textContent   = '🎙 Enregistrer';
    };

    _mediaRecorder.start(100); // emit chunks every 100ms
    _recStartTime = Date.now();

    btnRecord.style.display = 'none';
    btnStop.style.display   = '';
    timerEl.style.display   = '';
    timerEl.textContent     = '00:00';

    _recTimerID = setInterval(() => {
      const s = Math.floor((Date.now() - _recStartTime) / 1000);
      timerEl.textContent =
        String(Math.floor(s / 60)).padStart(2, '0') + ':' +
        String(s % 60).padStart(2, '0');
    }, 500);
  });

  btnStop.addEventListener('click', () => {
    if (_mediaRecorder && _mediaRecorder.state !== 'inactive') {
      _mediaRecorder.stop();
    }
  });
}

// Blob URL cache: id → { url, revoke() }  — revoked when sound is deleted
const _blobUrls = new Map();

function _getBlobUrl(id, sound) {
  if (!_blobUrls.has(id)) {
    const url = URL.createObjectURL(soundToBlob(sound));
    _blobUrls.set(id, url);
  }
  return _blobUrls.get(id);
}

function _renderSoundList() {
  const listEl = document.getElementById('sound-list');
  if (!listEl) return;

  // Revoke blob URLs for deleted sounds
  for (const id of _blobUrls.keys()) {
    if (!sounds.has(id)) { URL.revokeObjectURL(_blobUrls.get(id)); _blobUrls.delete(id); }
  }

  if (sounds.size === 0) {
    listEl.innerHTML = '<p class="no-sounds">Aucun son chargé.</p>';
    return;
  }

  listEl.innerHTML = '';
  let displayNum = 1;
  for (const [id, sound] of sounds) {
    const duration = (sound.signal.signal.length / sound.sr).toFixed(2);
    const blobUrl  = _getBlobUrl(id, sound);

    const row = document.createElement('div');
    row.className = 'sound-row';
    row.dataset.id = id;
    row.innerHTML = `
      <span class="sound-number">${displayNum}</span>
      <input class="sound-name-input" type="text" value="${_esc(sound.name)}" />
      <span class="sound-duration">${duration} s</span>
      <audio class="sound-audio" src="${blobUrl}" controls preload="none"></audio>
      <button class="btn-icon" title="Télécharger WAV" data-action="download">⬇</button>
      <button class="btn-icon btn-danger" title="Supprimer" data-action="delete">✕</button>
    `;

    row.querySelector('.sound-name-input').addEventListener('change', (e) => renameSound(id, e.target.value));
    row.querySelector('[data-action="download"]').addEventListener('click', () => downloadSoundAsWav(id));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteSound(id));
    listEl.appendChild(row);
    displayNum++;
  }
}

function _esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
