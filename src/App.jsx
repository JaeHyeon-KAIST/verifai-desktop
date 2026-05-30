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

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  // One-click "clean up low-trust" (DW6 efficiency headline) — and the same
  // button restores them once all low-trust are excluded (1-click undo).
  const lowAll = allSources.filter((s) => s.verdict === 'low');
  const lowRemaining = lowAll.filter((s) => !excluded[s.id]);
  const allLowExcluded = lowAll.length > 0 && lowRemaining.length === 0;
  const excludeAllLow = () => lowRemaining.forEach((s) => toggleExclude(s.id));
  const restoreAllLow = () => lowAll.filter((s) => excluded[s.id]).forEach((s) => toggleExclude(s.id));
  const exitSelect = () => { setSelecting(false); setSelected(new Set()); };
  const applyExclude = () => {
    selected.forEach((id) => { if (!excluded[id]) toggleExclude(id); });
    exitSelect();
  };

  return (
    <div className="v-margin" style={{ display: 'flex', width: '100%', height: '100%' }}>
      <div className="chat-col">
        <div className="chat-head">
          <div>
            <div className="chat-head-title">Effects of caffeine on cognition</div>
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
                <FilterChip label="All" n={counts.all} active={filter === 'all'} onClick={() => setFilter('all')} />
                <FilterChip verdict="trusted" n={counts.trusted} active={filter === 'trusted'} onClick={() => setFilter('trusted')} />
                <FilterChip verdict="mostly" n={counts.mostly} active={filter === 'mostly'} onClick={() => setFilter('mostly')} />
                <FilterChip verdict="low" n={counts.low} active={filter === 'low'} onClick={() => setFilter('low')} />
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
                <button className="mt-select" onClick={() => setSelecting(true)} title="Select multiple sources to remove">
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
  return <MainApp />;
}

function MainApp() {
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
      setRegenerating(true);
      const t = setTimeout(() => setRegenerating(false), 1500);
      return () => clearTimeout(t);
    }
    if (!updated) prevUpdated.current = false;
  }, [updated]);

  // Composer: clicking/focusing the empty input auto-fills the fixed question.
  const onComposerFocus = () => { if (!sent && !composerValue) setComposerValue(VERIFAI_DATA.question); };
  const onComposerChange = (v) => { if (!sent) setComposerValue(v); };
  const onSend = () => {
    if (sent || loading || !composerValue.trim()) return;
    setSent(true);
    setLoading(true);
    setComposerValue('');
    setTimeout(() => setLoading(false), 1500);
  };

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
    dismissCalibration(() => {
      setOpenDetail(null);
      setCalibratedOnce(true);
    });
  };

  return (
    <div className="app">
      <div className="app-body">
        <HistorySidebar
          narrow={narrow}
          onToggle={() => setNarrow(!narrow)}
          activeTitle="Effects of caffeine on cognition"
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
