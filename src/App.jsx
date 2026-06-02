import React, { useState, useEffect, useLayoutEffect, useRef, Fragment } from 'react';
import { VERIFAI_DATA, sourcesForClaim } from './data.js';
import {
  VerdictPill,
  FlagBanner,
  SourceCard,
  ChatUser,
  ChatAI,
  Composer,
  HistorySidebar,
  CalibrationPanel,
  CoachTip,
  GeneratingBubble,
  FilterChip,
} from './components/Shared.jsx';
import SourceWorkspace from './components/SourceWorkspace.jsx';
import { SliderLab } from './components/SliderLab.jsx';
import { log, logSampled, flush, initSession, endSession, downloadLog, resetSession, sessionInfo } from './logger.js';
import { startRecording, stopRecording } from './recorder.js';

// Source/claim lookups for logging payloads.
const _verdictOf = (id) => VERIFAI_DATA.sources[id]?.verdict;
const _claimOf = (id) => Object.values(VERIFAI_DATA.claims).find((c) => c.sourceIds.includes(id))?.id;

/* =========================================================
   Variation 3 — Marginalia
   Sources float in the right margin, grouped by claim.
   Click a highlight → smooth-scroll to its claim group.
   ========================================================= */
function Marginalia({
  sent, loading, regenerating,
  activeClaim, setActiveClaim,
  selectedClaim, setSelectedClaim,
  activeSrc, setActiveSrc,
  excluded, toggleExclude, onCalibrate,
  setOpenDetail, setState,
  answer, updatedBanner,
  onStartTour,
  composerValue, onComposerChange, onComposerFocus, onSend,
}) {
  const data = VERIFAI_DATA;
  const claimsArr = Object.values(data.claims);

  // Verification-panel UI state (local to the margin)
  const [filter, setFilter] = useState('all');        // all | trusted | mostly | low
  const onFilter = (to) => { if (to !== filter) log('filter_change', { from: filter, to }); setFilter(to); };
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  const answerReady = sent && !loading;

  const allSources = claimsArr.flatMap((c) => sourcesForClaim(c.id));
  const counts = {
    all: allSources.length,
    trusted: allSources.filter((s) => s.verdict === 'trusted').length,
    mostly: allSources.filter((s) => s.verdict === 'mostly').length,
    low: allSources.filter((s) => s.verdict === 'low').length,
  };
  const matchFilter = (s) => filter === 'all' || s.verdict === filter;

  const toggleSelect = (id) => {
    log('source_select', { selected: !selected.has(id), verdict: _verdictOf(id) }, { target_id: id, target_kind: 'source' });
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  // One-click "clean up low-trust" (DW6 efficiency headline) — and the same
  // button restores them once all low-trust are excluded (1-click undo).
  const lowAll = allSources.filter((s) => s.verdict === 'low');
  const lowRemaining = lowAll.filter((s) => !excluded[s.id]);
  const allLowExcluded = lowAll.length > 0 && lowRemaining.length === 0;
  const excludeAllLow = () => { log('exclude_all_low', { ids: lowRemaining.map((s) => s.id), n: lowRemaining.length }); lowRemaining.forEach((s) => toggleExclude(s.id)); };
  const restoreAllLow = () => { const r = lowAll.filter((s) => excluded[s.id]); log('restore_all_low', { ids: r.map((s) => s.id), n: r.length }); r.forEach((s) => toggleExclude(s.id)); };
  const exitSelect = () => { log('select_mode', { on: false }); setSelecting(false); setSelected(new Set()); };
  const applyExclude = () => {
    log('bulk_exclude', { ids: [...selected], verdicts: [...selected].map(_verdictOf) });
    selected.forEach((id) => { if (!excluded[id]) toggleExclude(id); });
    exitSelect();
  };

  return (
    <div className="v-margin" style={{ display: 'flex', width: '100%', height: '100%' }}>
      <div className="chat-col">
        <div className="chat-head">
          <div>
            <div className="chat-head-title">Does drinking milk increase height?</div>
            <div className="chat-head-meta">Click a highlight to jump to its verifying sources · scroll to follow along</div>
          </div>
          <div className="chat-head-actions">
            <button className="icon-btn" title="How it works" onClick={onStartTour} aria-label="How it works">
              <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>
          </div>
        </div>
        <div className="chat-scroll">
          {!sent ? (
            <div className="chat-hero">
              <div className="chat-hero-title">Ask VerifAI a research question</div>
              <div className="chat-hero-sub">아래 입력창을 클릭하면 질문이 자동으로 입력됩니다. 전송을 누르면 답변과 출처 검증이 생성됩니다.</div>
            </div>
          ) : (
            <>
              <ChatUser text={data.question} />
              {(loading || regenerating) ? (
                <GeneratingBubble label={loading ? 'Generating answer…' : 'Regenerating with your changes…'} />
              ) : (
                <ChatAI
                  banner={
                    <div className="ai-banners">
                      {updatedBanner ? (
                        <>
                          <FlagBanner applied>Answer updated · your changes applied</FlagBanner>
                        </>
                      ) : (
                        <FlagBanner>2 claims flagged for low confidence</FlagBanner>
                      )}
                    </div>
                  }
                  paragraphs={answer}
                  activeClaim={activeClaim}
                  onHlEnter={setActiveClaim}
                  onHlLeave={() => setActiveClaim(null)}
                  onHlClick={(cid) => {
                    log('claim_click', { claim: cid });
                    setActiveClaim(cid);
                    setSelectedClaim(cid);
                    const el = document.querySelector(`[data-margin-claim="${cid}"]`);
                    el && el.scrollIntoView && el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                />
              )}
            </>
          )}
        </div>
        <div className="chat-compose-wrap">
          <div className="chat-compose-inner">
            <Composer
              value={composerValue}
              onChange={onComposerChange}
              onFocus={onComposerFocus}
              onSend={onSend}
              disabled={loading}
              placeholder={sent ? 'Reply to VerifAI' : '여기를 클릭하면 질문이 입력됩니다'}
            />
          </div>
        </div>
      </div>

      <aside className="margin-col">
        {!answerReady ? (
          <div className="margin-empty">
            <div className="margin-head">Verification</div>
            <div className="margin-empty-note">
              {!sent ? '질문을 전송하면 답변의 근거 소스가 신뢰도와 함께 여기에 표시됩니다.' : '답변 생성 중…'}
            </div>
          </div>
        ) : (
          <>
            <div className="margin-toolbar">
              <div className="margin-head-row">
                <span className="margin-head">Verification · {counts.all} sources</span>
              </div>
              <div className="filter-chips">
                <FilterChip label="All" n={counts.all} active={filter === 'all'} onClick={() => onFilter('all')} />
                <FilterChip verdict="trusted" n={counts.trusted} active={filter === 'trusted'} onClick={() => onFilter('trusted')} />
                <FilterChip verdict="mostly" n={counts.mostly} active={filter === 'mostly'} onClick={() => onFilter('mostly')} />
                <FilterChip verdict="low" n={counts.low} active={filter === 'low'} onClick={() => onFilter('low')} />
                {!selecting && lowAll.length > 0 && (
                  <button
                    className={`mt-quicklow ${allLowExcluded ? 'mt-quicklow--restore' : ''}`}
                    onClick={allLowExcluded ? restoreAllLow : excludeAllLow}
                    title={allLowExcluded ? 'Restore excluded low-trust sources' : 'Exclude all low-trust sources from the answer'}
                  >
                    {allLowExcluded ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></svg>
                        Restore low-trust ({lowAll.length})
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><line x1="5.6" y1="5.6" x2="18.4" y2="18.4" /></svg>
                        Exclude all low-trust ({lowRemaining.length})
                      </>
                    )}
                  </button>
                )}
              </div>
              {selecting ? (
                <div className="mt-select-row">
                  <button className="mt-select mt-select--on" onClick={exitSelect} title="Finish selecting">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                    Done
                  </button>
                  {selected.size > 0 && (
                    <>
                      <span className="mt-sel-count">{selected.size} selected</span>
                      <button className="mt-sel-exclude" onClick={applyExclude} title="Exclude selected sources">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><line x1="5.6" y1="5.6" x2="18.4" y2="18.4" /></svg>
                        Exclude
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <button className="mt-select" onClick={() => { log('select_mode', { on: true }); setSelecting(true); }} title="Select multiple sources to remove">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                  Select sources
                </button>
              )}
            </div>

            <div className="margin-groups">
              {claimsArr.map((c, cidx) => {
                const groupSources = sourcesForClaim(c.id);
                const sources = groupSources.filter(matchFilter);
                if (sources.length === 0) return null;   // hide empty groups under the active filter
                const isActive = activeClaim === c.id;
                return (
                  <div
                    key={c.id}
                    data-margin-claim={c.id}
                    className={`margin-group ${isActive ? 'margin-group--focused' : ''}`}
                    onMouseEnter={() => setActiveClaim(c.id)}
                    onMouseLeave={() => setActiveClaim(null)}
                  >
                    <div className={`margin-group-head margin-group-head--${c.worstVerdict}`}>
                      <div className="margin-group-head-row">
                        <span className="margin-group-head-dot" />
                        <span>Claim · {groupSources.length} {groupSources.length === 1 ? 'source' : 'sources'}</span>
                      </div>
                      <div className="margin-group-quote">{c.quote}</div>
                    </div>
                    {sources.map((s, idx) => (
                      <div key={s.id} className={`margin-card ${activeSrc === s.id ? 'margin-card--focused' : ''}`}>
                        <SourceCard
                          source={s}
                          compact
                          excluded={excluded[s.id]}
                          active={activeSrc === s.id}
                          selecting={selecting}
                          selected={selected.has(s.id)}
                          onToggleSelect={() => toggleSelect(s.id)}
                          onHover={() => setActiveSrc(s.id)}
                          onLeave={() => setActiveSrc(null)}
                          onOpen={() => { setOpenDetail(s); setState('detail'); }}
                          onCalibrate={() => onCalibrate(s)}
                          onExclude={() => toggleExclude(s.id)}
                          onRestore={() => toggleExclude(s.id)}
                          tour={cidx === 0 && idx === 0}
                        />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

/* =========================================================
   FTUX overlay
   ========================================================= */
function FtuxOverlay({ step, onStep, onSkip }) {
  const [rect, setRect] = useState(null);
  const [tipPos, setTipPos] = useState(null);
  const total = 3;
  const info = VERIFAI_DATA.ftux[step - 1];
  const targetAttr = ['verdict', 'community', 'open'][step - 1];

  // useLayoutEffect runs synchronously after DOM mutations but before the
  // browser paints — so we compute the spot/tip position BEFORE the first
  // paint, avoiding the "fly-in from default location" flash.
  useLayoutEffect(() => {
    function update() {
      // Spotlight: the specific element being explained this step.
      const spotEl = document.querySelector(`[data-ftux-target="${targetAttr}"]`);
      if (!spotEl) return;
      const r = spotEl.getBoundingClientRect();
      setRect({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 });

      // Tip anchor: always the card itself, so the tip position stays stable
      // across all tour steps while the spotlight moves between sub-targets.
      const anchorEl = document.querySelector('[data-ftux-target="open"]') || spotEl;
      const a = anchorEl.getBoundingClientRect();
      const tipW = 340;
      const tipH = 150;
      let left = a.right + 16;
      let top = a.top;
      if (left + tipW > window.innerWidth - 20) left = Math.max(20, a.left - tipW - 16);
      if (left < 20) { left = Math.max(20, a.left); top = a.bottom + 16; }
      if (top + tipH > window.innerHeight - 20) top = Math.max(20, window.innerHeight - tipH - 20);
      setTipPos({ top, left });
    }
    update();
    window.addEventListener('resize', update);
    const id = setInterval(update, 400);
    return () => { window.removeEventListener('resize', update); clearInterval(id); };
  }, [step, targetAttr]);

  // Don't render until we have the real position — prevents animated
  // mount at default position followed by a jump.
  if (!rect || !tipPos) return null;

  return (
    <>
      <div className="coach-spot" onClick={onSkip} style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />
      <div className="coach-tip" style={{ top: tipPos.top, left: tipPos.left }}>
        <CoachTip
          step={step}
          total={total}
          title={info.title}
          body={info.body}
          onSkip={onSkip}
          onNext={() => step < total ? onStep(step + 1) : onSkip()}
          lastLabel="Got it"
        />
      </div>
    </>
  );
}

/* =========================================================
   App shell
   ========================================================= */
export default function App() {
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('lab')
  ) {
    return (
      <SliderLab
        onExit={() => {
          window.history.replaceState({}, '', window.location.pathname);
          window.location.reload();
        }}
      />
    );
  }
  return <Root />;
}

/* Session gate: collects the participant id (학번), starts logging, then reveals
   the app. initSession runs on the button CLICK (a user action), so React
   StrictMode never double-fires it. This is also the facilitator's cue to start
   the QuickTime screen recording. Nothing is logged before this point. */
function Root() {
  const [entered, setEntered] = useState(false);
  if (!entered) return <StartGate onStart={() => setEntered(true)} />;
  // onExit unmounts MainApp (resetting all its state) and returns to the gate,
  // ready for the next participant's 학번 → a brand-new session.
  return <MainApp onExit={() => setEntered(false)} />;
}

function StartGate({ onStart }) {
  const [pid, setPid] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.documentElement.setAttribute('data-theme', 'dark'); }, []);

  const begin = async () => {
    const id = pid.trim();
    if (!id || busy) return;
    setBusy(true);
    const recP = startRecording(id);   // kick off getDisplayMedia within the click gesture (streams to disk)
    try {
      await initSession({ participant_id: id, condition: 'B' });
      log('session_start', { ua: typeof navigator !== 'undefined' ? navigator.userAgent : null });
    } catch (e) { /* logging must never block the test */ }
    // Don't block entry on the permission prompt — attach the result when ready.
    recP.then((ok) => log('recording_started', { ok })).catch(() => log('recording_started', { ok: false }));
    onStart();
  };

  const field = {
    width: '100%', boxSizing: 'border-box', padding: 'var(--sp-3) var(--sp-4)',
    fontSize: 'var(--fs-md)', color: 'var(--ink-1)', background: 'var(--bg-1)',
    border: '1px solid var(--line)', borderRadius: 'var(--r-2)', outline: 'none',
  };
  const btn = {
    width: '100%', marginTop: 'var(--sp-4)', padding: 'var(--sp-3) var(--sp-4)',
    fontSize: 'var(--fs-md)', fontWeight: 'var(--fw-medium)', color: 'var(--accent-ink)',
    background: 'var(--accent-strong)', border: 'none', borderRadius: 'var(--r-2)',
    cursor: (!pid.trim() || busy) ? 'default' : 'pointer', opacity: (!pid.trim() || busy) ? 0.55 : 1,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-0)' }}>
      <div style={{ width: 360, padding: 'var(--sp-8)', borderRadius: 'var(--r-4)', background: 'var(--bg-2)', border: '1px solid var(--line)', boxShadow: 'var(--sh-3)', textAlign: 'center' }}>
        <div className="serif" style={{ fontSize: 'var(--fs-5xl)', lineHeight: 1, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>VerifAI</div>
        <div style={{ color: 'var(--ink-4)', fontSize: 'var(--fs-sm)', marginTop: 'var(--sp-3)', marginBottom: 'var(--sp-6)' }}>
          연구 참여자 정보를 입력하고 시작하세요
        </div>
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          placeholder="학번 (예: 20231234)"
          value={pid}
          onChange={(e) => setPid(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') begin(); }}
          style={field}
        />
        <button onClick={begin} disabled={!pid.trim() || busy} style={btn}>
          {busy ? '시작 중…' : '시작하기'}
        </button>
        <div style={{ color: 'var(--ink-5)', fontSize: 'var(--fs-eyebrow)', marginTop: 'var(--sp-5)', letterSpacing: '0.04em' }}>
          입력 후 진행자가 화면 녹화를 시작합니다
        </div>
      </div>
    </div>
  );
}

function MainApp({ onExit }) {
  const [state, setState] = useState('base');          // detail-nav marker (base | sourceOpen | detail)
  const [selectedClaim, setSelectedClaim] = useState('c1');
  const [activeClaim, setActiveClaim] = useState(null);
  const [activeSrc, setActiveSrc] = useState(null);
  const [excluded, setExcluded] = useState({});
  const [calibrating, setCalibrating] = useState(null);
  const [calibratingClosing, setCalibratingClosing] = useState(false);
  const [openDetail, setOpenDetail] = useState(null);
  const [ftuxStep, setFtuxStep] = useState(0);
  const [narrow, setNarrow] = useState(false);

  // ----- user-test flow -----
  const [sent, setSent] = useState(false);             // question submitted?
  const [loading, setLoading] = useState(false);       // initial answer generating
  const [regenerating, setRegenerating] = useState(false); // auto-regen after edits
  const [calibratedOnce, setCalibratedOnce] = useState(false);
  const [composerValue, setComposerValue] = useState('');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    // Electron preload exposes platform + titleBarMode. CSS uses the
    // data-titlebar attribute to reserve 40px at the top of the app when we're
    // drawing our own title bar (macOS hiddenInset mode).
    const info = typeof window !== 'undefined' ? window.verifai : null;
    if (info?.platform) document.documentElement.setAttribute('data-platform', info.platform);
    if (info?.titleBarMode) document.documentElement.setAttribute('data-titlebar', info.titleBarMode);
  }, []);

  // No auto-tour: a facilitator sits beside the participant. The "?" button in
  // the chat header starts the 3-step tour on demand.

  const toggleExclude = (id) => setExcluded((e) => ({ ...e, [id]: !e[id] }));

  // Answer auto-regenerates once the user excludes a source or calibrates one.
  // The regenerated answer is a fixed dummy (answerV2) — swap that to change it.
  const excludedCount = Object.values(excluded).filter(Boolean).length;
  const updated = sent && (excludedCount > 0 || calibratedOnce);
  const answer = updated ? VERIFAI_DATA.answerV2 : VERIFAI_DATA.answerV1;

  // Brief "regenerating…" animation the first time `updated` flips true.
  const prevUpdated = useRef(false);
  useEffect(() => {
    if (updated && !prevUpdated.current) {
      prevUpdated.current = true;
      const exIds = Object.keys(excluded).filter((k) => excluded[k]);
      log('regenerate', {
        trigger: excludedCount > 0 ? 'exclude' : 'calibrate',
        excluded_ids: exIds,
        excluded_verdicts: exIds.map(_verdictOf),
        traps_removed: exIds.filter((id) => _verdictOf(id) === 'low'),
        false_exclusions: exIds.filter((id) => _verdictOf(id) !== 'low'),
        calibrated_once: calibratedOnce,
      });
      setRegenerating(true);
      const t = setTimeout(() => { setRegenerating(false); log('regenerate_done', {}); }, 1500);
      return () => clearTimeout(t);
    }
    if (!updated) prevUpdated.current = false;
  }, [updated]);

  // Composer: clicking/focusing the empty input auto-fills the fixed question.
  const onComposerFocus = () => { if (!sent && !composerValue) { log('composer_focus', { autofilled: true }); setComposerValue(VERIFAI_DATA.question); } };
  const onComposerChange = (v) => { if (!sent) setComposerValue(v); };
  const onSend = () => {
    if (sent || loading || !composerValue.trim()) return;
    log('send', {});
    setSent(true);
    setLoading(true);
    setComposerValue('');
    setTimeout(() => setLoading(false), 1500);
  };

  // ============ behavioral logging — Layer A (state transitions) + low-level ============
  const prevLoading = useRef(false);
  useEffect(() => {
    if (prevLoading.current && !loading && sent) log('answer_v1_shown', { version: 'v1' });
    prevLoading.current = loading;
  }, [loading, sent]);

  // The Layer-A `excluded` diff emits one exclude/restore per source for EVERY path
  // (margin card, workspace, bulk, exclude-all); the Layer-B intent events
  // (exclude_all_low / bulk_exclude) are ADDITIONAL by design — keep both.
  const prevExcluded = useRef({});
  useEffect(() => {
    const prev = prevExcluded.current;
    for (const id of new Set([...Object.keys(prev), ...Object.keys(excluded)])) {
      if (!!prev[id] !== !!excluded[id]) {
        log(excluded[id] ? 'exclude' : 'restore', { verdict: _verdictOf(id), claim: _claimOf(id) }, { target_id: id, target_kind: 'source' });
      }
    }
    prevExcluded.current = { ...excluded };
  }, [excluded]);

  const calibSubmittedRef = useRef(false);   // set by onCalibrateSubmit so close can tell submit from cancel
  const prevCalib = useRef(null);
  useEffect(() => {
    const prev = prevCalib.current;
    if (!prev && calibrating) log('calibrate_open', { verdict: calibrating.verdict }, { target_id: calibrating.id, target_kind: 'source' });
    else if (prev && !calibrating) {
      log('calibrate_close', { submitted: calibSubmittedRef.current }, { target_id: prev.id, target_kind: 'source' });
      calibSubmittedRef.current = false;
    }
    prevCalib.current = calibrating;
  }, [calibrating]);

  const prevOpen = useRef(null);
  useEffect(() => {
    const prev = prevOpen.current;
    if (!prev && openDetail) log('workspace_open', { verdict: openDetail.verdict }, { target_id: openDetail.id, target_kind: 'source' });
    else if (prev && !openDetail) log('workspace_close', {}, { target_id: prev.id, target_kind: 'source' });
    prevOpen.current = openDetail;
  }, [openDetail]);

  const prevFtux = useRef(0);
  useEffect(() => {
    if (ftuxStep !== prevFtux.current) { log('ftux', { step: ftuxStep, opened: ftuxStep >= 1 }); prevFtux.current = ftuxStep; }
  }, [ftuxStep]);

  const prevNarrow = useRef(narrow);
  useEffect(() => {
    if (narrow !== prevNarrow.current) { log('history_toggle', { narrow }); prevNarrow.current = narrow; }
  }, [narrow]);

  // Low-level: pointer movement (sampled ~50ms), scroll (sampled), and a
  // capture-phase click safety net recording the data-* context of every click.
  useEffect(() => {
    const ctx = (el) => {
      const n = el && el.closest && el.closest('[data-src-id],[data-claim],[data-margin-claim],[data-ftux-target]');
      if (!n) return {};
      return {
        src_id: n.getAttribute('data-src-id') || undefined,
        claim: n.getAttribute('data-claim') || n.getAttribute('data-margin-claim') || undefined,
        ftux: n.getAttribute('data-ftux-target') || undefined,
      };
    };
    let lastMove = 0, lastScroll = 0;
    const onMove = (e) => {
      const now = performance.now();
      if (now - lastMove < 50) return;
      lastMove = now;
      logSampled('mouse_move', { x: Math.round(e.clientX), y: Math.round(e.clientY), ...ctx(e.target) });
    };
    const onScroll = (e) => {
      const now = performance.now();
      if (now - lastScroll < 120) return;
      lastScroll = now;
      const t = e.target;
      const top = (t && t.scrollTop != null) ? t.scrollTop : (window.scrollY || 0);
      const cls = (t && typeof t.className === 'string') ? t.className.split(' ')[0] : undefined;
      logSampled('scroll', { top: Math.round(top || 0), cls });
    };
    const onClickCap = (e) => log('dom_click', { x: Math.round(e.clientX), y: Math.round(e.clientY), ...ctx(e.target) }, { target_kind: 'dom' });
    // RAW keyboard: every keydown (key + code + modifiers + where). Buffered.
    // Note: this makes typed text (source-chat / calibration notes) reconstructable
    // — by design, for complete analysis. The 학번 is NOT captured here (the gate
    // runs before logging starts). Content here is non-personal (the milk study).
    const onKey = (e) => {
      const t = e.target;
      let where = 'other';
      if (t && t.classList && t.classList.contains('composer-input')) where = 'composer';
      else if (t && t.closest && t.closest('.sw-composer')) where = 'source_chat';
      else if (t && t.classList && t.classList.contains('calibration-textarea')) where = 'calib_notes';
      else if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) where = 'input';
      logSampled('key', {
        key: e.key,
        code: e.code,
        mods: `${e.ctrlKey ? 'C' : ''}${e.metaKey ? 'M' : ''}${e.altKey ? 'A' : ''}${e.shiftKey ? 'S' : ''}` || undefined,
        repeat: e.repeat || undefined,
        where,
      }, { target_kind: 'key' });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('click', onClickCap, { capture: true });
    window.addEventListener('keydown', onKey, { capture: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('click', onClickCap, { capture: true });
      window.removeEventListener('keydown', onKey, { capture: true });
      flush();
    };
  }, []);

  const startTour = () => {
    const target = document.querySelector('[data-ftux-target="verdict"]');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFtuxStep(1);
  };

  // Modal close with exit animation — triggers CSS reverse, then unmounts.
  const CLOSE_ANIM_MS = 220;
  const dismissCalibration = (after) => {
    setCalibratingClosing(true);
    setTimeout(() => {
      setCalibrating(null);
      setCalibratingClosing(false);
      after && after();
    }, CLOSE_ANIM_MS);
  };

  const onCalibrate = (src) => setCalibrating(src);
  const onCalibrateSubmit = () => {
    calibSubmittedRef.current = true;   // so the calibrate_close log is tagged submitted:true
    dismissCalibration(() => {
      setOpenDetail(null);
      setCalibratedOnce(true);
    });
  };

  // Facilitator-only: end the session → snapshot final state, save/flush the log,
  // save the recording, then return to the gate for the next participant.
  const endSessionFlow = async () => {
    if (!window.confirm('세션을 종료하고 로그를 저장하시겠습니까? 다음 참가자 화면으로 돌아갑니다.')) return;
    const pid = sessionInfo().participant_id;
    let recFile = null;
    try { recFile = await stopRecording(pid); } catch (e) { /* recording must never block */ }
    log('recording_saved', { file: recFile });
    const exIds = Object.keys(excluded).filter((k) => excluded[k]);
    endSession({ final_excluded: exIds, final_excluded_verdicts: exIds.map(_verdictOf), reached_v2: updated, calibrated_once: calibratedOnce });
    await downloadLog();   // await so the browser .jsonl download fires before reset
    resetSession();
    onExit();
  };

  return (
    <div className="app">
      <div className="app-body">
        <HistorySidebar
          narrow={narrow}
          onToggle={() => setNarrow(!narrow)}
          onEndSession={endSessionFlow}
          activeTitle="Does drinking milk increase height?"
        />

        <Marginalia
          sent={sent}
          loading={loading}
          regenerating={regenerating}
          activeClaim={activeClaim}
          setActiveClaim={setActiveClaim}
          selectedClaim={selectedClaim}
          setSelectedClaim={setSelectedClaim}
          activeSrc={activeSrc}
          setActiveSrc={setActiveSrc}
          excluded={excluded}
          toggleExclude={toggleExclude}
          onCalibrate={onCalibrate}
          setOpenDetail={setOpenDetail}
          setState={setState}
          answer={answer}
          updatedBanner={updated}
          onStartTour={startTour}
          composerValue={composerValue}
          onComposerChange={onComposerChange}
          onComposerFocus={onComposerFocus}
          onSend={onSend}
        />
      </div>

      {openDetail && (
        <SourceWorkspace
          source={openDetail}
          onBack={() => { setOpenDetail(null); setState('sourceOpen'); }}
          onCalibrate={(s) => setCalibrating(s)}
          onExclude={(s) => toggleExclude(s.id)}
          excluded={!!excluded[openDetail.id]}
        />
      )}

      {calibrating && (
        <div
          className={`modal-backdrop ${calibratingClosing ? 'modal-backdrop--closing' : ''}`}
          onClick={() => dismissCalibration()}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <CalibrationPanel
              source={calibrating}
              onClose={() => dismissCalibration()}
              onSubmit={onCalibrateSubmit}
              layout="modal"
            />
          </div>
        </div>
      )}

      {ftuxStep >= 1 && ftuxStep <= 3 && (
        <FtuxOverlay
          step={ftuxStep}
          onStep={(s) => setFtuxStep(s)}
          onSkip={() => setFtuxStep(0)}
        />
      )}
    </div>
  );
}
