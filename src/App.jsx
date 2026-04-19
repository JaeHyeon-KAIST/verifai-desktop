import React, { useState, useEffect, useLayoutEffect, Fragment } from 'react';
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
} from './components/Shared.jsx';
import SourceWorkspace from './components/SourceWorkspace.jsx';
import { SliderLab } from './components/SliderLab.jsx';

/* =========================================================
   Variation 3 — Marginalia
   Sources float in the right margin, grouped by claim.
   Click a highlight → smooth-scroll to its claim group.
   ========================================================= */
function Marginalia({
  divergenceOnly,
  activeClaim, setActiveClaim,
  selectedClaim, setSelectedClaim,
  activeSrc, setActiveSrc,
  excluded, toggleExclude, onCalibrate,
  openDetail, setOpenDetail,
  answer, updatedBanner, state, setState,
  onStartTour,
}) {
  const data = VERIFAI_DATA;
  const claimsArr = Object.values(data.claims);

  return (
    <div className="v-margin" style={{ display: 'flex', width: '100%', height: '100%' }}>
      <div className="chat-col">
        <div className="chat-head">
          <div>
            <div className="chat-head-title">Effects of caffeine on cognition</div>
            <div className="chat-head-meta">Click a highlight to jump to its verifying sources · scroll to follow along</div>
          </div>
          <div className="chat-head-actions">
            <button className="icon-btn" title="Start tour" onClick={onStartTour} aria-label="Start tour">
              <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>
            <button className="icon-btn" title="Share">↗</button>
            <button className="icon-btn" title="More">⋯</button>
          </div>
        </div>
        <div className="chat-scroll">
          <ChatUser text={data.question} />
          <ChatAI
            banner={
              <div className="ai-banners">
                {updatedBanner ? (
                  <>
                    <FlagBanner applied>Calibration applied · answer updated</FlagBanner>
                    <FlagBanner>1 claim still flagged</FlagBanner>
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
        </div>
        <div className="chat-compose-wrap">
          <div className="chat-compose-inner"><Composer /></div>
        </div>
      </div>

      <aside className="margin-col">
        <div className="margin-head">Verification · by claim</div>
        {claimsArr.map((c, cidx) => {
          const rawSources = sourcesForClaim(c.id);
          const sources = divergenceOnly ? rawSources.filter((s) => s.divergence) : rawSources;
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
                  <span>Claim · {rawSources.length} {rawSources.length === 1 ? 'source' : 'sources'}</span>
                </div>
                <div className="margin-group-quote">"{c.quote}"</div>
              </div>
              {sources.map((s, idx) => (
                <div key={s.id} className={`margin-card ${activeSrc === s.id ? 'margin-card--focused' : ''}`}>
                  <SourceCard
                    source={s}
                    compact
                    excluded={excluded[s.id]}
                    active={activeSrc === s.id}
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
              {sources.length === 0 && (
                <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--ink-4)', fontStyle: 'italic' }}>
                  No divergences for this claim.
                </div>
              )}
            </div>
          );
        })}
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
  const [state, setState] = useState('base');          // base | sourceOpen | detail | updated
  const [selectedClaim, setSelectedClaim] = useState('c1');
  const [activeClaim, setActiveClaim] = useState(null);
  const [activeSrc, setActiveSrc] = useState(null);
  const [excluded, setExcluded] = useState({});
  const [calibrating, setCalibrating] = useState(null);
  const [calibratingClosing, setCalibratingClosing] = useState(false);
  const [openDetail, setOpenDetail] = useState(null);
  const [ftuxStep, setFtuxStep] = useState(0);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  }, []);

  const toggleExclude = (id) => setExcluded((e) => ({ ...e, [id]: !e[id] }));

  const answer = state === 'updated' ? VERIFAI_DATA.answerV2 : VERIFAI_DATA.answerV1;
  const updatedBanner = state === 'updated';

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
      setState('updated');
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
          state={state}
          setState={setState}
          divergenceOnly={false}
          activeClaim={activeClaim}
          setActiveClaim={setActiveClaim}
          selectedClaim={selectedClaim}
          setSelectedClaim={setSelectedClaim}
          activeSrc={activeSrc}
          setActiveSrc={setActiveSrc}
          excluded={excluded}
          toggleExclude={toggleExclude}
          onCalibrate={onCalibrate}
          openDetail={openDetail}
          setOpenDetail={setOpenDetail}
          answer={answer}
          updatedBanner={updatedBanner}
          onStartTour={() => {
            // If the target card isn't in view, scroll it into the margin
            // column before the overlay mounts.
            const target = document.querySelector('[data-ftux-target="verdict"]');
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setFtuxStep(1);
          }}
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
