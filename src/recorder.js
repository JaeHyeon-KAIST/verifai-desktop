// src/recorder.js — automatic screen recording for the user test.
//
// Electron (primary): main sets a setDisplayMediaRequestHandler that auto-selects
// the primary screen (no picker). The .webm is STREAMED to disk — each ~1s chunk
// is written immediately via IPC (verifai:recChunk) to verifai-logs/{학번}_{ts}.webm.
// This keeps renderer memory FLAT over long sessions and makes a crash lose ≤1s of
// video (vs. losing the whole recording if buffered in memory until stop).
// Browser fallback: shows the OS screen-picker, buffers in memory, downloads at stop.
//
// FAIL-SAFE: every entry point is guarded; if screen capture is unsupported or the
// macOS Screen-Recording permission is denied, these resolve false/null and the
// test + event logging continue unaffected. A sync throw never blocks the gate.

let mediaRecorder = null;
let stream = null;
let chunks = [];            // browser-fallback in-memory buffer only
let writeChain = Promise.resolve();  // electron: serial chain of chunk disk-writes (preserves order, bounded memory)
let streaming = false;      // true = writing chunks to disk via IPC

function pickMime() {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  if (typeof MediaRecorder === 'undefined') return null;
  for (const m of candidates) {
    try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (_) {}
  }
  return '';
}

const hasIpcRec = () =>
  typeof window !== 'undefined' && window.verifai && window.verifai.recStart && window.verifai.recChunk && window.verifai.recStop;

// Call SYNCHRONOUSLY from the click handler (preserves the user gesture for
// getDisplayMedia). Returns a promise resolving true if recording started.
export function startRecording(participant_id) {
  if (mediaRecorder) return Promise.resolve(false);   // already recording — ignore a double start
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    return Promise.resolve(false);
  }
  const mime = pickMime();
  if (mime === null) return Promise.resolve(false);
  let req;
  try {
    // ~1080p (aspect preserved) — plenty for behavioral review, ~1/4 the size of native Retina.
    req = navigator.mediaDevices.getDisplayMedia({ video: { width: { ideal: 1920, max: 1920 }, height: { ideal: 1080, max: 1080 }, frameRate: { ideal: 10, max: 15 } }, audio: false });
  } catch (e) {
    if (import.meta.env?.DEV) console.warn('[recorder] getDisplayMedia threw', e);
    return Promise.resolve(false);  // never let a sync throw block the gate
  }
  return req
    .then(async (s) => {
      stream = s;
      chunks = [];
      writeChain = Promise.resolve();
      streaming = hasIpcRec();
      if (streaming) {
        try { await window.verifai.recStart({ participant_id }); } catch (e) { streaming = false; }
      }
      mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorder.ondataavailable = (e) => {
        if (!e.data || !e.data.size) return;
        if (streaming) {
          // Serial chain → chunks are written to disk in arrival order (parallel
          // arrayBuffer() could otherwise reorder them and corrupt the webm).
          // Memory stays bounded — no growing array of settled promises.
          writeChain = writeChain.then(() => e.data.arrayBuffer()).then((buf) => window.verifai.recChunk(buf)).catch(() => {});
        } else {
          chunks.push(e.data);
        }
      };
      mediaRecorder.start(1000);   // emit a chunk every 1s
      // If the user stops sharing via the OS UI, clean up.
      stream.getVideoTracks().forEach((t) => { t.onended = () => { try { mediaRecorder && mediaRecorder.state !== 'inactive' && mediaRecorder.stop(); } catch (_) {} }; });
      return true;
    })
    .catch((e) => {
      if (import.meta.env?.DEV) console.warn('[recorder] getDisplayMedia failed', e);
      return false;
    });
}

// Stop, finish the .webm, and return the saved file name (or null).
export async function stopRecording(participant_id) {
  if (!mediaRecorder) return null;
  try {
    await new Promise((res) => {
      mediaRecorder.onstop = res;
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop(); else res();
    });
  } catch (_) {}
  try { stream && stream.getTracks().forEach((t) => t.stop()); } catch (_) {}

  if (streaming) {
    try { await writeChain; } catch (_) {}   // ensure every chunk is on disk, in order
    let name = null;
    try { name = await window.verifai.recStop(); } catch (_) {}
    mediaRecorder = null; stream = null; chunks = []; writeChain = Promise.resolve(); streaming = false;
    return name;
  }

  // Browser fallback: assemble + download
  const blob = new Blob(chunks, { type: 'video/webm' });
  mediaRecorder = null; stream = null; chunks = []; writeChain = Promise.resolve();
  if (!blob.size) return null;
  try {
    const url = URL.createObjectURL(blob);
    const pid = (participant_id ?? 'session').toString().replace(/[^a-zA-Z0-9._-]/g, '_');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const fname = `verifai_${pid}_${stamp}.webm`;
    const a = document.createElement('a');
    a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return fname;
  } catch (e) {
    if (import.meta.env?.DEV) console.warn('[recorder] save failed', e);
    return null;
  }
}

export function isRecording() { return !!mediaRecorder; }
