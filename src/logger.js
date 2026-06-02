// src/logger.js — local, no-server behavioral event logger (module singleton).
//
// Sinks (the renderer code path is identical; only the destination differs):
//   • Electron  → window.verifai.logAppend() → main process appends JSONL to
//                 app.getPath('userData')/verifai-logs/{학번}_{ts}.jsonl + fsync.
//   • Browser   → IndexedDB ('verifai-logs' / 'events'), one record per row,
//                 retrieved later via downloadLog() (Blob .jsonl download).
//
// Semantic events (clicks, exclude, calibrate…) are written IMMEDIATELY.
// High-frequency events (mouse_move, scroll) go through logSampled() → buffered
// and flushed in batches, so we never do one disk write / IDB txn per pointer move.
//
// Nothing is logged until initSession() runs (the StartGate is the logging gate).
// All writes are wrapped so a sink failure never crashes the prototype.

const SCHEMA_VERSION = 1;
const FLUSH_MS = 400;      // batch flush cadence for sampled events (short → small crash-loss window)
const FLUSH_MAX = 80;      // …or flush sooner once the buffer hits this many

let sessionId = null;
let meta = {};             // { participant_id, condition, ... }
let t0 = null;             // performance.now() origin (set once at session start)
let seq = 0;
let started = false;
let runMode = 'browser';   // 'electron' | 'browser'

let buffer = [];           // pending sampled records
let flushTimer = null;
let listenersBound = false;

const isElectron = () =>
  typeof window !== 'undefined' && !!(window.verifai && window.verifai.logAppend);

const nowMs = () => (t0 == null ? 0 : Math.round(performance.now() - t0));

/* ---------------- IndexedDB sink (browser) ---------------- */
let _idb = null;
function idb() {
  if (_idb) return _idb;
  _idb = new Promise((resolve, reject) => {
    const req = indexedDB.open('verifai-logs', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'k', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _idb;
}

async function idbPut(records) {
  try {
    const db = await idb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      for (const r of records) store.put({ rec: r });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    if (import.meta.env?.DEV) console.warn('[logger] idbPut failed', e);
  }
}

/* ---------------- write paths ---------------- */
function writeBatch(records) {
  if (!records.length) return;
  try {
    if (isElectron()) {
      const text = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
      // Immediate + batched writes share this one IPC channel, so Electron
      // serializes them and on-disk order matches seq order. invoke() returns a
      // Promise — a sync try/catch won't see a rejection, so attach .catch.
      const p = window.verifai.logAppend(text);
      if (p && p.catch) p.catch((e) => { if (import.meta.env?.DEV) console.warn('[logger] logAppend rejected', e); });
    } else {
      idbPut(records);
    }
  } catch (e) {
    if (import.meta.env?.DEV) console.warn('[logger] write failed', e);
  }
}

function buildRecord(event_type, payload, target_id, target_kind) {
  return {
    schema_version: SCHEMA_VERSION,
    session_id: sessionId,
    participant_id: meta.participant_id ?? null,
    condition: meta.condition ?? null,
    run_mode: runMode,
    origin: typeof location !== 'undefined' ? location.origin : null,
    seq: seq++,
    t_ms: nowMs(),
    wall_clock_iso: new Date().toISOString(),
    event_type,
    target_id: target_id ?? null,
    target_kind: target_kind ?? 'ui',
    payload: payload ?? {},
  };
}

function scheduleFlush() {
  if (buffer.length >= FLUSH_MAX) { flush(); return; }
  if (flushTimer == null) flushTimer = setTimeout(flush, FLUSH_MS);
}

/* ---------------- public API ---------------- */

// Begin a session. Must be awaited (Electron opens the per-participant file here).
export async function initSession(metaObj = {}) {
  // Idempotent: a second call (React StrictMode, gate re-mount) must NOT reset
  // seq/t0 mid-session. Call this from a user action (button), not an effect.
  if (started) {
    if (import.meta.env?.DEV) console.warn('[logger] initSession called again — ignored');
    return { sessionId, runMode };
  }
  meta = metaObj;
  sessionId = `${Date.now()}-${Math.round(performance.now())}`;
  t0 = performance.now();
  seq = 0;
  started = true;
  runMode = isElectron() ? 'electron' : 'browser';

  if (runMode === 'electron') {
    try { await window.verifai.logStart(metaObj); } catch (e) { /* falls back to default file in main */ }
  } else {
    try { await navigator.storage?.persist?.(); } catch { /* best effort */ }
  }

  if (!listenersBound && typeof window !== 'undefined') {
    listenersBound = true;
    // Persist buffered events when the page is hidden/closing (do NOT rely on
    // beforeunload — Safari skips it and Chrome is deprecating it).
    const backstop = () => flush();
    window.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') backstop(); });
    window.addEventListener('pagehide', backstop);
  }
  return { sessionId, runMode };
}

// Immediate semantic event.
export function log(event_type, payload = {}, opts = {}) {
  if (!started) return null;
  const rec = buildRecord(event_type, payload, opts.target_id, opts.target_kind);
  if (import.meta.env?.DEV) console.debug('[log]', rec.event_type, rec.target_id ?? '', rec.payload);
  writeBatch([rec]);
  return rec;
}

// High-frequency / sampled event → buffered, flushed in batches.
export function logSampled(event_type, payload = {}, opts = {}) {
  if (!started) return null;
  const rec = buildRecord(event_type, payload, opts.target_id, opts.target_kind);
  buffer.push(rec);
  scheduleFlush();
  return rec;
}

export function flush() {
  if (flushTimer != null) { clearTimeout(flushTimer); flushTimer = null; }
  if (!buffer.length) return;
  const batch = buffer;
  buffer = [];
  writeBatch(batch);
}

// Snapshot the end of a session and flush everything.
export function endSession(payload = {}) {
  if (!started) return;
  log('session_end', payload, { target_kind: 'ui' });
  flush();
}

// End the current session's logging state so the NEXT participant's initSession
// starts fresh (new session_id, seq 0, and in Electron a new per-participant file).
// Call after endSession()+downloadLog() when returning to the StartGate.
export function resetSession() {
  flush();
  if (flushTimer != null) { clearTimeout(flushTimer); flushTimer = null; }
  started = false;
  sessionId = null;
  t0 = null;
  seq = 0;
  buffer = [];
  meta = {};
}

export function isStarted() { return started; }
export function sessionInfo() { return { sessionId, runMode, participant_id: meta.participant_id ?? null }; }

// Retrieve the log for the facilitator.
//   Electron → open the logs folder (file already on disk).
//   Browser  → read all IndexedDB rows → download a .jsonl Blob.
export async function downloadLog() {
  const sid = sessionId;   // snapshot — resetSession() may null this before the async read finishes
  flush();
  if (isElectron()) {
    try { await window.verifai.openLogs(); } catch (e) { if (import.meta.env?.DEV) console.warn(e); }
    return;
  }
  try {
    const db = await idb();
    const rows = await new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readonly');
      const req = tx.objectStore('events').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    // Only THIS session's events (the IDB store accumulates across sessions on a
    // shared browser profile — filter so each participant's export is clean).
    const mine = rows.filter((row) => row.rec && row.rec.session_id === sid);
    if (!mine.length) { if (import.meta.env?.DEV) console.warn('[logger] no events for this session to export'); return; }
    const lines = mine.map((row) => JSON.stringify(row.rec)).join('\n') + '\n';
    const blob = new Blob([lines], { type: 'application/x-ndjson' });
    const url = URL.createObjectURL(blob);
    const pid = (meta.participant_id ?? 'session').toString().replace(/[^a-zA-Z0-9._-]/g, '_');
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const a = document.createElement('a');
    a.href = url;
    a.download = `verifai_${pid}_${stamp}.jsonl`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    if (import.meta.env?.DEV) console.warn('[logger] downloadLog failed', e);
  }
}
