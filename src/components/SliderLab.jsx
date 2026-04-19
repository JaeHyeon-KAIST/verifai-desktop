import { useState, useRef, useEffect } from 'react';

/* =========================================================
   Slider Lab — lag isolation playground.
   Visit with ?lab=1 in the URL to open.

   Axis:            Blur YES        Blur NO
   React rAF state     V1              V2
   Pure DOM            V3              V4
   Native control:                     V5
   ========================================================= */

const AI = 62;
const CHAT_BEFORE = 71;
const verdictOf = (v) => (v >= 75 ? 'trusted' : v >= 40 ? 'mostly' : 'low');
const verdictLabel = { trusted: 'Trusted', mostly: 'Mostly trusted', low: 'Low confidence' };
const calcChatAfter = (v) => Math.max(30, Math.min(95, Math.round(CHAT_BEFORE + (v - AI) * 0.25)));

function useFPS() {
  const [fps, setFps] = useState(60);
  const lastRef = useRef(performance.now());
  const framesRef = useRef(0);
  useEffect(() => {
    let raf;
    const tick = () => {
      framesRef.current++;
      const now = performance.now();
      const elapsed = now - lastRef.current;
      if (elapsed >= 500) {
        setFps(Math.round((framesRef.current * 1000) / elapsed));
        framesRef.current = 0;
        lastRef.current = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

/* Fake colored bars behind each modal to make blur visually meaningful. */
function FakeBehind() {
  return (
    <div className="lab-fake-behind">
      <div className="lab-fake-line lab-fake-line--1" />
      <div className="lab-fake-line lab-fake-line--2" />
      <div className="lab-fake-line lab-fake-line--3" />
      <div className="lab-fake-line lab-fake-line--4" />
      <div className="lab-fake-line lab-fake-line--5" />
    </div>
  );
}

function MiniBackdrop({ blur, children }) {
  return (
    <div className={`lab-mini-backdrop ${blur ? 'lab-mini-backdrop--blur' : ''}`}>
      <FakeBehind />
      {blur && <div className="lab-mini-blur-layer" />}
      <div className="lab-mini-modal">{children}</div>
    </div>
  );
}

/* V1 / V2 — React rAF setState.
   Every drag frame schedules setState → whole component re-renders (chips, delta, impact, verdict). */
function ReactRafSlider({ blur }) {
  const [value, setValue] = useState(AI);
  const thumbRef = useRef(null);
  const rafRef = useRef(null);
  const pendingRef = useRef(AI);

  const onInput = (e) => {
    const v = +e.target.value;
    pendingRef.current = v;
    if (thumbRef.current) thumbRef.current.style.setProperty('--pos', `${v}%`);
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      setValue(pendingRef.current);
      rafRef.current = null;
    });
  };

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  const verdict = verdictOf(value);
  const delta = value - AI;
  const chatAfter = calcChatAfter(value);

  return (
    <MiniBackdrop blur={blur}>
      <div className="lab-chips">
        <span className="lab-chip">AI <strong>{AI}</strong></span>
        <span className="lab-chip">You <strong>{value}</strong></span>
        <span className={`lab-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`}>
          {delta === 0 ? '—' : delta > 0 ? `+${delta}` : delta}
        </span>
      </div>
      <div className="lab-slider">
        <input type="range" min="0" max="100" defaultValue={AI} onInput={onInput} />
        <div className="lab-slider-track" />
        <div
          ref={thumbRef}
          className={`lab-thumb lab-thumb--${verdict}`}
          style={{ '--pos': `${value}%` }}
        />
      </div>
      <div className="lab-impact">
        <span>
          Chat: <strong>{CHAT_BEFORE}</strong> → <strong>{chatAfter}</strong>
        </span>
        <span>
          Verdict: <strong>{verdictLabel[verdict]}</strong>
        </span>
      </div>
    </MiniBackdrop>
  );
}

/* V3 / V4 — Pure DOM.
   Zero React state during drag. Everything mutated via refs. React owns nothing on the drag path. */
function PureDomSlider({ blur }) {
  const thumbRef = useRef(null);
  const chipYouRef = useRef(null);
  const deltaRef = useRef(null);
  const chatAfterRef = useRef(null);
  const verdictRef = useRef(null);

  const onInput = (e) => {
    const v = +e.target.value;
    const verdict = verdictOf(v);
    const delta = v - AI;
    const chatAfter = calcChatAfter(v);
    if (thumbRef.current) {
      thumbRef.current.style.setProperty('--pos', `${v}%`);
      thumbRef.current.className = `lab-thumb lab-thumb--${verdict}`;
    }
    if (chipYouRef.current) chipYouRef.current.textContent = v;
    if (deltaRef.current) {
      deltaRef.current.textContent = delta === 0 ? '—' : delta > 0 ? `+${delta}` : String(delta);
      deltaRef.current.className = `lab-delta ${delta > 0 ? 'up' : delta < 0 ? 'down' : ''}`;
    }
    if (chatAfterRef.current) chatAfterRef.current.textContent = chatAfter;
    if (verdictRef.current) verdictRef.current.textContent = verdictLabel[verdict];
  };

  return (
    <MiniBackdrop blur={blur}>
      <div className="lab-chips">
        <span className="lab-chip">AI <strong>{AI}</strong></span>
        <span className="lab-chip">You <strong ref={chipYouRef}>{AI}</strong></span>
        <span ref={deltaRef} className="lab-delta">—</span>
      </div>
      <div className="lab-slider">
        <input type="range" min="0" max="100" defaultValue={AI} onInput={onInput} />
        <div className="lab-slider-track" />
        <div
          ref={thumbRef}
          className="lab-thumb lab-thumb--mostly"
          style={{ '--pos': `${AI}%` }}
        />
      </div>
      <div className="lab-impact">
        <span>
          Chat: <strong>{CHAT_BEFORE}</strong> → <strong ref={chatAfterRef}>{CHAT_BEFORE}</strong>
        </span>
        <span>
          Verdict: <strong ref={verdictRef}>{verdictLabel.mostly}</strong>
        </span>
      </div>
    </MiniBackdrop>
  );
}

/* V5 — Native control group. Browser's default range, no custom chrome, no surrounding UI. */
function NativeSlider() {
  const [value, setValue] = useState(AI);
  return (
    <div className="lab-native-body">
      <div className="lab-chips">
        <span className="lab-chip">
          Value <strong>{value}</strong>
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => setValue(+e.target.value)}
        className="lab-native-range"
      />
    </div>
  );
}

function Card({ title, subtitle, tag, children }) {
  return (
    <section className="lab-card">
      <header className="lab-card-head">
        <div className="lab-card-tag">{tag}</div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </header>
      {children}
    </section>
  );
}

export function SliderLab({ onExit }) {
  const fps = useFPS();
  return (
    <div className="lab-shell" data-theme="dark">
      <header className="lab-top">
        <button className="lab-back" onClick={onExit}>
          ← Back to app
        </button>
        <h1>Slider Lab</h1>
        <div className="lab-fps">
          FPS <span>{fps}</span>
        </div>
      </header>
      <p className="lab-intro">
        Drag each slider aggressively. Watch the FPS counter. <br />
        Compare adjacent cards to isolate what costs performance.
        <br />
        <strong>V1 vs V2</strong> = cost of blur · <strong>V1 vs V3</strong> = cost of React
        rAF · <strong>V4</strong> = recommended path · <strong>V5</strong> = floor.
      </p>
      <div className="lab-grid">
        <Card
          tag="V1"
          title="Baseline (current)"
          subtitle="blur(2px) backdrop · React rAF setState · 4 re-rendering values"
        >
          <ReactRafSlider blur />
        </Card>
        <Card
          tag="V2"
          title="No blur"
          subtitle="React rAF setState · no backdrop-filter"
        >
          <ReactRafSlider blur={false} />
        </Card>
        <Card
          tag="V3"
          title="Blur + pure DOM"
          subtitle="blur(2px) backdrop · zero React re-render during drag"
        >
          <PureDomSlider blur />
        </Card>
        <Card
          tag="V4"
          title="No blur + pure DOM"
          subtitle="Recommended · no backdrop-filter · ref-only mutations"
        >
          <PureDomSlider blur={false} />
        </Card>
        <Card
          tag="V5"
          title="Native only"
          subtitle="Browser default range · no chrome · theoretical floor"
        >
          <NativeSlider />
        </Card>
      </div>
    </div>
  );
}
