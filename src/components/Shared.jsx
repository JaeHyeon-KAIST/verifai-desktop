import React, { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { VERIFAI_DATA } from '../data.js';

/* =========================================================
   Atoms
   ========================================================= */
export function VerdictPill({ verdict, label, size = "md", ...rest }) {
  const glyph = { trusted: "✓", mostly: "◐", low: "✕" }[verdict] || "?";
  return (
    <span className={`verdict-pill verdict-pill--${verdict}`} data-size={size} {...rest}>
      <span className="glyph">{glyph}</span>
      <span>{label}</span>
    </span>
  );
}

export function ChipDivergence() {
  return (
    <span className="chip-divergence" title="AI and community readings disagree">
      <span>⚠</span> Users disagree
    </span>
  );
}

export function Donut({ pct = 0, size = 34, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fill = c * (pct / 100);
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle className="donut-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="donut-fill"
          cx={size / 2} cy={size / 2} r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${fill} ${c}`}
        />
      </svg>
    </div>
  );
}

export function DonutScore({ score, voted, size = 34, dataAttr = {} }) {
  return (
    <span className="donut-row" {...dataAttr}>
      <Donut pct={score} size={size} />
      <span className="score-stack">
        <span className="donut-num">{score}%</span>
        <span className="donut-voted">{voted} voted</span>
      </span>
    </span>
  );
}

export function FlagBanner({ children, applied }) {
  return <span className={`flag-banner ${applied ? "flag-banner--applied" : ""}`}>{children}</span>;
}

/* =========================================================
   Source Card (shared shell)
   ========================================================= */
export function SourceCard({
  source, excluded, active, compact, showActions = true,
  onOpen, onCalibrate, onExclude, onRestore, onHover, onLeave,
  tour = false,
}) {
  return (
    <div
      className={`src-card ${excluded ? "src-card--excluded" : ""} ${active ? "src-card--active" : ""}`}
      data-verdict={source.verdict}
      data-src-id={source.id}
      {...(tour ? { "data-ftux-target": "open" } : {})}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onOpen}
      style={{ cursor: onOpen ? "pointer" : "default" }}
    >
      <div className="src-rail" />
      <div className="src-body">
        <div className="src-head">
          <VerdictPill
            verdict={source.verdict}
            label={source.verdictLabel}
            {...(tour ? { "data-ftux-target": "verdict" } : {})}
          />
          {source.divergence && <ChipDivergence />}
        </div>
        <div className="src-title">{source.title}</div>
        <div className="src-journal">{source.journal}</div>
        {!compact && <div className="src-reason">{source.reason}</div>}
        <div className="src-foot">
          <DonutScore
            score={source.users.score}
            voted={source.users.voted}
            size={compact ? 28 : 34}
            dataAttr={tour ? { "data-ftux-target": "community" } : {}}
          />
          <div className="src-foot-hint">
            Open source
            <svg className="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Highlighted answer rendering
   ========================================================= */
export function HighlightedParagraph({ spans, onHlEnter, onHlLeave, onHlClick, activeClaim }) {
  const claims = VERIFAI_DATA.claims;
  return (
    <p>
      {spans.map((s, i) => {
        if (!s.claim) return <Fragment key={i}>{s.t}</Fragment>;
        const c = claims[s.claim];
        const verdict = c ? c.worstVerdict : "mostly";
        const active = activeClaim === s.claim;
        return (
          <mark
            key={i}
            className={`hl hl--${verdict} ${active ? "hl--active" : ""} ${s.updated ? "hl--updated" : ""}`}
            data-claim={s.claim}
            onMouseEnter={() => onHlEnter && onHlEnter(s.claim)}
            onMouseLeave={() => onHlLeave && onHlLeave()}
            onClick={() => onHlClick && onHlClick(s.claim)}
          >
            <span className="hl-text">{s.t}</span>
          </mark>
        );
      })}
    </p>
  );
}

/* =========================================================
   Chat bubbles + composer
   ========================================================= */
export function ChatUser({ text }) {
  return <div className="chat-user">{text}</div>;
}

export function ChatAI({ banner, paragraphs, onHlEnter, onHlLeave, onHlClick, activeClaim }) {
  return (
    <div className="chat-ai">
      {banner && <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{banner}</div>}
      <div className="chat-ai-body">
        {paragraphs.map((spans, i) => (
          <HighlightedParagraph
            key={i} spans={spans}
            onHlEnter={onHlEnter} onHlLeave={onHlLeave} onHlClick={onHlClick}
            activeClaim={activeClaim}
          />
        ))}
      </div>
    </div>
  );
}

export function Composer({ placeholder = "Reply to VerifAI", hint }) {
  return (
    <div className="composer">
      <textarea className="composer-input" rows={2} placeholder={placeholder} defaultValue="" />
      <div className="composer-actions">
        <div className="composer-left">
          <button className="icon-btn" title="Attach">
            <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          {hint && <span style={{ color: "var(--ink-4)", fontSize: 'var(--fs-xs)' }}>{hint}</span>}
        </div>
        <button className="composer-send" title="Send">
          <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   History sidebar
   ========================================================= */
export function HistorySidebar({ narrow, onToggle, activeTitle }) {
  const h = VERIFAI_DATA.history;
  if (narrow) {
    return (
      <aside className="history history--narrow">
        <div className="history-top">
          <button className="icon-btn" onClick={onToggle} title="Expand"><span>☰</span></button>
        </div>
        <div className="history-brand serif">V</div>
        <button className="history-new-narrow" title="New chat">＋</button>
      </aside>
    );
  }
  const Group = ({ title, items }) => (
    <div className="history-group">
      <div className="eyebrow history-eyebrow">{title}</div>
      {items.map((it, i) => (
        <button key={i} className={`history-item ${it.title === activeTitle ? "history-item--active" : ""}`}>
          <div className="history-item-title">{it.title}</div>
          <div className="history-item-meta">{it.meta}</div>
        </button>
      ))}
    </div>
  );
  return (
    <aside className="history">
      <div className="history-top">
        <div className="history-brand serif">VerifAI</div>
        <button className="icon-btn" onClick={onToggle} title="Collapse"><span>‹</span></button>
      </div>
      <button className="history-new">
        <span>＋</span> New chat
      </button>
      <div className="history-scroll">
        <Group title="Today" items={h.today} />
        <Group title="Yesterday" items={h.yesterday} />
        <Group title="Last 7 days" items={h.lastWeek} />
      </div>
      <div className="history-foot">
        <div className="history-user">
          <div className="history-avatar">JK</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-1)" }}>Jaewon Kim</div>
            <div style={{ fontSize: 10, color: "var(--ink-4)" }}>Graduate · Calibrated 47×</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* =========================================================
   Calibration panel (modal / slide-in)
   ========================================================= */
export function CalibrationPanel({ source, onClose, onSubmit, layout = "modal" }) {
  const aiScore = source.verdict === "trusted" ? 88 : source.verdict === "mostly" ? 62 : 28;
  const [value, setValue] = useState(aiScore);
  const [reasonSet, setReasonSet] = useState(new Set());
  const [notes, setNotes] = useState("");
  const reasons = VERIFAI_DATA.reasons;

  const chatBefore = 71;
  const verdictFromValue = (v) => v >= 75 ? "trusted" : v >= 40 ? "mostly" : "low";
  const verdictLabel = { trusted: "Trusted", mostly: "Mostly trusted", low: "Low confidence" };

  // Drag-path refs: every continuously-updating DOM node is mutated via ref. React state
  // `value` is only bumped when the verdict threshold crosses — that's the only thing
  // that needs a true React re-render (thumb color class + verdict pill in impact row).
  // Between crosses the component does zero React work, which is what makes drag smooth.
  const thumbRef = useRef(null);
  const chipYouRef = useRef(null);
  const scoreDeltaRef = useRef(null);
  const impactAfterRef = useRef(null);
  const impactDeltaRef = useRef(null);
  const lastVerdictRef = useRef(verdictFromValue(aiScore));

  const handleSliderInput = (e) => {
    const v = +e.target.value;
    const delta = v - aiScore;
    const chatAfter = Math.max(30, Math.min(95, Math.round(chatBefore + delta * 0.25)));
    const impactDelta = chatAfter - chatBefore;

    if (thumbRef.current) thumbRef.current.style.setProperty('--pos', `${v}%`);
    if (chipYouRef.current) chipYouRef.current.textContent = v;
    if (scoreDeltaRef.current) {
      scoreDeltaRef.current.textContent = delta === 0 ? "matches" : delta > 0 ? `+${delta}` : String(delta);
      scoreDeltaRef.current.className = `calibration-score-delta ${delta === 0 ? "" : delta > 0 ? "up" : "down"}`;
    }
    if (impactAfterRef.current) impactAfterRef.current.textContent = chatAfter;
    if (impactDeltaRef.current) {
      impactDeltaRef.current.textContent = impactDelta === 0 ? "no change" : impactDelta > 0 ? `+${impactDelta}` : String(impactDelta);
      impactDeltaRef.current.className = `calibration-impact-delta ${chatAfter > chatBefore ? "up" : chatAfter < chatBefore ? "down" : ""}`;
    }

    const newVerdict = verdictFromValue(v);
    if (newVerdict !== lastVerdictRef.current) {
      lastVerdictRef.current = newVerdict;
      setValue(v);
    }
  };

  const toggleReason = (i) => {
    const next = new Set(reasonSet);
    next.has(i) ? next.delete(i) : next.add(i);
    setReasonSet(next);
  };

  const yourVerdict = verdictFromValue(value);
  const delta = value - aiScore;
  const verdictChanged = yourVerdict !== source.verdict;
  const chatAfter = Math.max(30, Math.min(95, Math.round(chatBefore + delta * 0.25)));

  return (
    <div className={`calibration calibration--${layout}`}>
      <div className="calibration-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="eyebrow" style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="calibration-eyebrow-dot" />
            Calibrate source
          </div>
          <div className="serif calibration-title">{source.title}</div>
          <div className="calibration-sub">{source.journal}</div>
        </div>
        <button className="icon-btn" onClick={onClose} title="Close">✕</button>
      </div>

      {source.aiSays && source.sourceSays && (
        <div className="calibration-divergence">
          <div className="eyebrow" style={{ color: "var(--verdict-low)", marginBottom: 6 }}>
            <span style={{ marginRight: 4 }}>⚠</span> Divergence detected
          </div>
          <div className="calibration-divergence-row">
            <span className="calibration-div-lbl">AI</span>
            <span className="calibration-div-val">{source.aiSays}</span>
          </div>
          <div className="calibration-divergence-row">
            <span className="calibration-div-lbl">Source</span>
            <span className="calibration-div-val calibration-div-val--src">{source.sourceSays}</span>
          </div>
        </div>
      )}

      <div className="calibration-section">
        <div className="calibration-label-row">
          <span className="calibration-label">How reliable is this source?</span>
          <span className="calibration-scores">
            <span className="calibration-score-chip calibration-score-chip--ai">
              <span className="calibration-score-chip-k">AI</span>
              <span className="calibration-score-chip-v mono">{aiScore}</span>
            </span>
            <span className="calibration-score-chip calibration-score-chip--you">
              <span className="calibration-score-chip-k">You</span>
              <span ref={chipYouRef} className="calibration-score-chip-v mono">{value}</span>
            </span>
            <span ref={scoreDeltaRef} className={`calibration-score-delta ${delta === 0 ? "" : delta > 0 ? "up" : "down"}`}>
              {delta === 0 ? "matches" : delta > 0 ? `+${delta}` : delta}
            </span>
          </span>
        </div>
        <div className="calibration-slider">
          <input
            type="range"
            min="0"
            max="100"
            defaultValue={aiScore}
            onInput={handleSliderInput}
          />
          <div className="calibration-band">
            <span className="calibration-band-seg calibration-band-seg--low" style={{ flex: 40 }} />
            <span className="calibration-band-seg calibration-band-seg--mid" style={{ flex: 35 }} />
            <span className="calibration-band-seg calibration-band-seg--high" style={{ flex: 25 }} />
          </div>
          <div className="calibration-ai-marker" style={{ left: `${aiScore}%` }} title={`AI: ${aiScore}`}>
            <span className="calibration-ai-marker-dot" />
            <span className="calibration-ai-marker-lbl">AI</span>
          </div>
          <div
            ref={thumbRef}
            className={`calibration-thumb calibration-thumb--${yourVerdict}`}
            style={{ '--pos': `${value}%` }}
          >
            <span className="calibration-thumb-dot" />
          </div>
        </div>
        <div className="calibration-slider-labels">
          <span>0 · Unreliable</span>
          <span>50</span>
          <span>100 · Reliable</span>
        </div>
      </div>

      <div className="calibration-section">
        <div className="calibration-label-row">
          <span className="calibration-label">Why?</span>
          <span className="calibration-hint">{reasonSet.size > 0 ? `${reasonSet.size} selected` : "Select all that apply"}</span>
        </div>
        <div className="calibration-reasons">
          {reasons.map((r, i) => (
            <button
              key={i}
              className={`calibration-reason ${reasonSet.has(i) ? "calibration-reason--active" : ""}`}
              onClick={() => toggleReason(i)}
            >
              <span className="calibration-check">
                {reasonSet.has(i) && (
                  <svg className="icon-xs" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5.2l2 2 4-4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span>{r}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="calibration-section">
        <div className="calibration-label-row">
          <span className="calibration-label">Notes</span>
          <span className="calibration-hint">optional · helps train future answers</span>
        </div>
        <textarea
          className="calibration-textarea"
          rows={2}
          placeholder="What did you notice? e.g. sample size too small, measurement differs from AI's figure…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="calibration-impact">
        <div className="calibration-impact-row">
          <span className="calibration-impact-lbl">Effect on this chat</span>
          <span className="calibration-impact-val">
            <span className="mono" style={{ color: "var(--ink-3)" }}>{chatBefore}</span>
            <svg viewBox="0 0 14 10" fill="none" style={{ width: '0.875rem', height: '0.625rem', margin: "0 0.25rem", color: "var(--ink-4)", flexShrink: 0 }}>
              <path d="M2 5h10m0 0-3-3m3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span ref={impactAfterRef} className="mono calibration-impact-after">{chatAfter}</span>
            <span ref={impactDeltaRef} className={`calibration-impact-delta ${chatAfter > chatBefore ? "up" : chatAfter < chatBefore ? "down" : ""}`}>
              {chatAfter === chatBefore ? "no change" : chatAfter > chatBefore ? `+${chatAfter - chatBefore}` : `${chatAfter - chatBefore}`}
            </span>
          </span>
        </div>
        <div className="calibration-impact-row calibration-impact-row--change">
          <span className="calibration-impact-lbl">Verdict</span>
          <span className="calibration-impact-val" style={{ gap: 8 }}>
            {verdictChanged ? (
              <>
                <VerdictPill verdict={source.verdict} label={source.verdictLabel} />
                <svg viewBox="0 0 14 10" fill="none" style={{ width: '0.75rem', height: '0.625rem', color: "var(--ink-4)", flexShrink: 0 }}>
                  <path d="M2 5h10m0 0-3-3m3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <VerdictPill verdict={yourVerdict} label={verdictLabel[yourVerdict]} />
              </>
            ) : (
              <>
                <VerdictPill verdict={yourVerdict} label={verdictLabel[yourVerdict]} />
                <span className="calibration-impact-delta">unchanged</span>
              </>
            )}
          </span>
        </div>
      </div>

      <div className="calibration-foot">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={onSubmit}>Submit calibration →</button>
      </div>
    </div>
  );
}

/* =========================================================
   FTUX coach tip
   ========================================================= */
export function CoachTip({ step, total, title, body, onNext, onSkip, lastLabel = "Got it" }) {
  return (
    <div className="coach-tip-inner">
      <div className="coach-tip-head">
        <span className="coach-tip-title">{title}</span>
        <span className="coach-tip-step">{step} of {total}</span>
      </div>
      <div className="coach-tip-body">{body}</div>
      <div className="coach-tip-foot">
        <button className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={onSkip}>Skip tour</button>
        <div className="coach-dots">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={`coach-dot ${i < step ? "coach-dot--active" : ""}`} />
          ))}
        </div>
        <button className="btn btn-primary" style={{ padding: "7px 14px", fontSize: 12 }} onClick={onNext}>
          {step === total ? lastLabel : "Next →"}
        </button>
      </div>
    </div>
  );
}
