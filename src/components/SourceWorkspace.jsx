import React, { useState, useEffect, useRef, Fragment } from 'react';
import { VERIFAI_DATA } from '../data.js';
import { VerdictPill, DonutScore } from './Shared.jsx';
import { log } from '../logger.js';

/* =========================================================
   Per-source paper content
   ========================================================= */
function getPaperFor(source) {
  // NOTE: per-source content now lives in data.js (source.paper / .suggestions /
  // .defaultAnswer / .comments) and the early-returns below read it. The hardcoded
  // caffeine maps in this file (SRC_PAPERS here, and the maps in getSuggestionsFor /
  // getScriptedAnswerFor / getCommentsFor) are LEGACY & UNREACHABLE for the milk
  // dataset (every source defines those fields) — safe to delete in a post-test cleanup.
  const SRC_PAPERS = {
    smith: {
      kind: "Peer-reviewed study",
      title: "Acute caffeine administration and reaction time in healthy adults: a double-blind crossover trial",
      byline: [
        "Smith, A., Delarosa, M., Kim, J., Roberts, T.",
        "J. Cognitive Neuroscience · 35(4) · 2023",
        "pp. 112–128",
      ],
      sections: [
        {
          h: "Abstract", b: "Caffeine's acute effect on reaction time has been documented for decades, but effect-size estimates vary widely across study designs. We conducted a double-blind, placebo-controlled crossover trial (N = 142) using 200 mg caffeine versus placebo, measuring reaction time at 30, 120, and 240 minutes post-ingestion.",
          cite: {
            on: "Reaction time improved by 8–11% (M = 9.4%, SD = 2.1) in the caffeine group compared to placebo, with effects persisting for 3–5 hours post-ingestion.",
            after: " Individual tolerance moderated the effect, with habitual consumers showing attenuated gains."
          }
        },
        { h: "2 · Methods", b: "142 healthy adults (ages 18–35) were recruited for a double-blind, placebo-controlled crossover study with a 7-day washout period. Participants received either 200 mg caffeine or placebo, administered orally in gelatin capsules." },
        { h: "3.1 · Baseline", b: "No significant baseline differences were observed between groups (all ps > .15). Sleep was controlled via actigraphy for 48 hours preceding each session, and participants abstained from all caffeine sources for 12 hours." },
        { h: "3.2 · Results", b: "Cognitive assessments were administered at baseline, 30 min, 2h, and 4h post-ingestion using the Stroop task, serial reaction time, and the Psychomotor Vigilance Task (PVT)." },
        { h: null, b: "Habitual consumers (>300 mg/day, n = 48) showed attenuated effects (M = 5.2%, SD = 1.8), while low consumers (<100 mg/day, n = 39) demonstrated the largest gains (M = 14.1%, SD = 3.2)." },
        { h: "4 · Discussion", b: "These findings are consistent with prior work on adenosine receptor antagonism (Fredholm et al., 1999; Nehlig, 2010). The A1 and A2A receptor subtypes in the prefrontal cortex appear to mediate the majority of caffeine's cognitive effects." },
      ],
      diverge: source?.aiSays && source?.sourceSays ? {
        aiSays: source.aiSays, sourceSays: source.sourceSays,
      } : null,
    },
    who: {
      kind: "Technical report",
      title: "Caffeine intake: population health considerations",
      byline: [
        "World Health Organization — Nutrition and Health Series",
        "WHO Technical Report Series · 2022",
        "Reference: WHO/NHS/2022.14",
      ],
      sections: [
        { h: "Executive summary", b: "Moderate caffeine consumption in healthy adults is generally recognized as safe. However, intake patterns and individual sensitivity vary considerably, warranting clear population-level guidance." },
        {
          h: "2 · Recommended upper limit", b: "Based on systematic review of 87 observational and intervention studies, this report recommends:",
          cite: {
            on: "Healthy adults should limit caffeine intake to 400 mg per day from all sources, including coffee, tea, energy drinks, and dietary supplements.",
            after: " Pregnant and lactating individuals should limit intake to 200 mg per day."
          }
        },
        { h: "3 · Cognitive effects", b: "Short-term doses in the 75–200 mg range consistently produce modest improvements in alertness and reaction time. Higher acute doses do not proportionally increase benefits, and may impair fine motor control." },
        { h: "4 · Adverse effects", b: "Doses exceeding the recommended threshold are associated with sleep disturbance, anxiety, and in some individuals, elevated resting heart rate. Individual tolerance varies with CYP1A2 genotype." },
      ],
      diverge: null,
    },
    johnson: {
      kind: "Alleged citation — not found",
      title: "Johnson, R. & Lee — Nature Reviews Neuroscience (2024)",
      byline: [
        "No DOI available",
        "No matching publication found in Nature archives",
        "Authors publish in unrelated fields",
      ],
      sections: [
        { h: "Search result", b: "We searched Nature Reviews Neuroscience, Vol. 12, Issue 2 (2024). Pages 45–62 in that issue do not contain an article by these authors. Cross-referencing CrossRef, PubMed, and the publisher's corrections notices returned no match." },
        { h: "Author verification", b: "An R. Johnson publishing in cognitive neuroscience could not be disambiguated. A Lee with a Nature Reviews Neuroscience publication in 2024 was not found via ORCID search." },
        { h: "Likely status", b: "This citation does not appear to refer to an existing publication. The AI answer may have fabricated it or confused it with another paper." },
      ],
      diverge: {
        aiSays: '"Johnson, R. & Lee (2024) — Nature Reviews Neuroscience, 12(2), 45–62"',
        sourceSays: "No matching publication found.",
      },
    },
    harvard2019: {
      kind: "Peer-reviewed study",
      title: "Coffee consumption and risk of neurodegenerative disease: a 22-year longitudinal analysis",
      byline: [
        "Harvard T.H. Chan School of Public Health",
        "JAMA Neurology · 76(8) · Aug 2019",
        "pp. 921–930",
      ],
      sections: [
        {
          h: "Abstract", b: "We followed 208,424 adults over 22 years to assess the association between coffee consumption and incident neurodegenerative disease.",
          cite: {
            on: "Participants consuming 3–4 cups/day showed a 32% reduction in Parkinson's disease incidence compared to non-consumers (HR 0.68, 95% CI 0.59–0.79).",
            after: " The association with Alzheimer's disease incidence was weaker and did not reach statistical significance after controlling for smoking and BMI."
          }
        },
        { h: "Methods", b: "Participants were drawn from three prospective cohorts — the Nurses' Health Study, NHS II, and the Health Professionals Follow-up Study. Caffeine intake was assessed every 4 years via validated food frequency questionnaire." },
        { h: "Results", b: "Dose-response modeling showed a non-linear relationship with inflection near 400 mg/day. Benefits plateaued and in some models reversed beyond 600 mg/day." },
        { h: "Limitations", b: "This analysis pertains specifically to Parkinson's disease. Claims that coffee reduces 'neurodegenerative disease' risk more broadly overstate the findings of this study." },
      ],
      diverge: {
        aiSays: '"reduces neurodegenerative disease risk by 35–40%"',
        sourceSays: "32% reduction in Parkinson's only; no significant effect on Alzheimer's.",
      },
    },
    meta2021: {
      kind: "Meta-analysis",
      title: "Caffeine and neurodegeneration: a systematic review and meta-analysis of 2.8M participants",
      byline: [
        "Cornelis, M.C. et al.",
        "The Lancet Neurology · 20(6) · Jun 2021",
        "pp. 483–495",
      ],
      sections: [
        {
          h: "Summary", b: "We pooled data from 21 prospective cohort studies comprising 2,831,402 participants and 38,195 incident cases of neurodegenerative disease.",
          cite: {
            on: "Pooled risk reduction across all neurodegenerative endpoints was 15–22% (RR 0.81, 95% CI 0.76–0.86), considerably more modest than figures reported in earlier single-cohort analyses.",
            after: " Heterogeneity was moderate (I² = 48%) and largely attributable to differences in exposure assessment."
          }
        },
        { h: "Methods", b: "Studies were identified through MEDLINE, Embase, and Cochrane databases (2000–2020). Only prospective cohorts with at least 5 years of follow-up were included." },
        { h: "Implications", b: "The effect size is clinically meaningful but notably smaller than the 35–40% figures sometimes cited in popular press. We recommend caution when interpreting single-cohort effect estimates." },
      ],
      diverge: {
        aiSays: '"35–40% reduction"',
        sourceSays: "Meta-analytic estimate: 15–22% (RR 0.81).",
      },
    },
    efsa2015: {
      kind: "Regulatory opinion",
      title: "Scientific Opinion on the safety of caffeine",
      byline: [
        "EFSA Panel on Dietetic Products, Nutrition and Allergies (NDA)",
        "EFSA Journal · 13(5):4102 · 2015",
      ],
      sections: [
        {
          h: "Conclusion", b: "The Panel concludes that single doses of caffeine up to 200 mg and daily intakes up to 400 mg do not raise safety concerns for the general healthy adult population.",
          cite: {
            on: "A daily intake of 400 mg caffeine from all sources is a conservative upper limit for healthy non-pregnant adults based on cardiovascular and sleep-related endpoints.",
            after: " This threshold applies irrespective of source (coffee, tea, energy drinks, supplements)."
          }
        },
        { h: "Special populations", b: "For pregnant women, intakes of caffeine up to 200 mg/day do not raise safety concerns for the fetus. For children and adolescents, 3 mg/kg body weight/day was considered a safe intake." },
      ],
      diverge: null,
    },
    fda2018: {
      kind: "Regulatory advisory",
      title: "Spilling the Beans: How Much Caffeine is Too Much?",
      byline: [
        "U.S. Food and Drug Administration",
        "Consumer Updates · Dec 2018",
      ],
      sections: [
        {
          h: "Overview", b: "For healthy adults, the FDA has cited 400 milligrams a day — roughly four or five cups of coffee — as an amount not generally associated with dangerous negative effects.",
          cite: {
            on: "Caffeine is a powerful stimulant; keep daily intake to about 400 mg per day for healthy adults. Individual tolerance varies widely.",
            after: " Children and pregnant adults should consult a physician for personalized limits."
          }
        },
        { h: "Watch-outs", b: "Rapid consumption of about 1,200 mg, or 0.15 tablespoons of pure caffeine, may cause toxic effects such as seizures. Powdered and liquid pure caffeine products are of particular concern." },
      ],
      diverge: null,
    },
    patel2024: {
      kind: "Unreviewed preprint",
      title: "Dose-dependent peak effects of caffeine on sustained reaction time: an open-label pilot",
      byline: [
        "Patel, R. & Becker, E.",
        "arXiv preprint · q-bio.NC · 2024",
        "Reference: 2401.05432",
      ],
      sections: [
        {
          h: "Abstract", b: "We report an open-label pilot (N = 26) in which healthy young adults self-administered 150–300 mg caffeine and completed the PVT at 45-minute intervals.",
          cite: {
            on: "Peak reaction-time improvements reached 14–18% relative to baseline, exceeding effect sizes reported in prior placebo-controlled work.",
            after: " We interpret this as evidence for stronger acute effects than the literature suggests."
          }
        },
        { h: "Methods", b: "Participants were recruited through university mailing lists. No blinding or placebo arm. Baseline caffeine status was self-reported; no washout was enforced." },
        { h: "Limitations", b: "The open-label design, small sample, and lack of randomization make these estimates highly susceptible to expectancy and self-selection effects. Results should not be generalized without replication." },
      ],
      diverge: {
        aiSays: '"up to 12%"',
        sourceSays: "14–18% — but from an open-label pilot, not peer-reviewed.",
      },
    },
  };

  if (source.paper) {
    return {
      kind: source.paper.kind,
      title: source.paper.title || source.title,
      byline: source.paper.byline || [],
      sections: source.paper.sections || [],
      diverge: source.aiSays && source.sourceSays
        ? { aiSays: source.aiSays, sourceSays: source.sourceSays }
        : null,
    };
  }

  return SRC_PAPERS[source.id] || {
    kind: source.verdict === "low" ? "Unverified source" : "Source",
    title: source.title,
    byline: [source.journal || "", source.doi && source.doi !== "—" ? source.doi : null].filter(Boolean),
    sections: [
      { h: "Summary", b: source.reason || "No detailed text is available for this source in the prototype." },
      ...(source.aiSays && source.sourceSays
        ? [{ h: "Where it diverges", b: `The AI answer reads ${source.aiSays}, but this source actually says ${source.sourceSays}.` }]
        : []),
    ],
    diverge: source.aiSays && source.sourceSays
      ? { aiSays: source.aiSays, sourceSays: source.sourceSays }
      : null,
  };
}

function getSuggestionsFor(source) {
  if (source.suggestions) return source.suggestions;
  const map = {
    smith: ["What was the effect size?", "How was reaction time measured?", "Does this support the 12% figure?"],
    johnson: ["Is this paper real?", "What did the AI get wrong?", "Find a real citation for this claim"],
    patel2024: ["Is this peer-reviewed?", "How does the pilot design affect the result?", "Should I trust this over Smith 2023?"],
    who: ["What's the basis for the 400 mg figure?", "Does this apply to children?", "How does this compare to the FDA?"],
    harvard2019: ["Does this cover all neurodegenerative diseases?", "What was the cohort size?", "How strong is the Parkinson's finding?"],
    meta2021: ["How big was the meta-analysis?", "Why is this estimate lower?", "What's the confidence interval?"],
    efsa2015: ["Is 400 mg safe during pregnancy?", "What endpoints did EFSA assess?"],
    fda2018: ["Is this a formal guideline?", "How does this differ from EFSA?"],
  };
  return map[source.id] || [
    "What does this source actually say?",
    "How confident is this finding?",
    "Where does this disagree with the AI?",
  ];
}

function getScriptedAnswerFor(source, question) {
  if (source.defaultAnswer) return source.defaultAnswer;
  const low = question.toLowerCase();
  if (source.id === "smith" && (low.includes("effect") || low.includes("12"))) {
    return {
      text: "The paper reports a mean improvement of 9.4% (SD 2.1), within an 8–11% range. The AI's \"12%\" figure sits above this — plausibly rounded, but it overstates the actual effect.",
      ref: "Reaction time improved by 8–11% (M = 9.4%, SD = 2.1) in the caffeine group…",
    };
  }
  if (source.id === "johnson") {
    return {
      text: "This citation couldn't be located in Nature Reviews Neuroscience or any indexed database. It appears to be fabricated. Consider excluding this source and asking for a verified paper.",
      ref: "No matching publication found. Authors publish in a different field.",
    };
  }
  if (source.id === "harvard2019") {
    return {
      text: "The 35% figure in this paper applies specifically to Parkinson's disease incidence, not neurodegeneration broadly. The AI's framing generalizes beyond what this study supports.",
      ref: "The association with Alzheimer's disease incidence was weaker and did not reach statistical significance…",
    };
  }
  if (source.id === "meta2021") {
    return {
      text: "The pooled meta-analytic estimate is 15–22% (RR 0.81, 95% CI 0.76–0.86) across 2.8M participants — notably more modest than the 35–40% figure in the AI answer.",
      ref: "Pooled risk reduction across all neurodegenerative endpoints was 15–22% (RR 0.81, 95% CI 0.76–0.86)…",
    };
  }
  if (source.id === "patel2024") {
    return {
      text: "This is an unreviewed preprint (N = 26, open-label, no placebo). It reports 14–18% — higher than every peer-reviewed trial. Treat the number with caution; the AI's 12% is more defensible than Patel's figure.",
      ref: "Peak reaction-time improvements reached 14–18% relative to baseline, exceeding effect sizes reported in prior placebo-controlled work.",
    };
  }
  const firstCite = getPaperFor(source).sections.find((s) => s.cite)?.cite.on;
  return {
    text: firstCite ? "From the paper: " + firstCite : "The source does not directly address that question.",
    ref: null,
  };
}

/* ============================================================
   Icons
   ============================================================ */
const IconCalibrate = () => (
  <svg className="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
  </svg>
);
const IconExclude = () => (
  <svg className="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="4.9" y1="4.9" x2="19.1" y2="19.1" />
  </svg>
);
const IconRestore = () => (
  <svg className="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
  </svg>
);
const IconBackToAnswer = () => (
  <svg className="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
  </svg>
);
const IconWarning = () => (
  <svg className="icon-inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" />
  </svg>
);

function CommunityBar({ source }) {
  const score = source.users.score;
  const total = source.users.voted;
  const trust = source.users.trust ?? Math.round(total * score / 100);
  const mixed = source.users.mixed ?? Math.round(total * (100 - score) * 0.4 / 100);
  const distrust = source.users.distrust ?? Math.max(0, total - trust - mixed);
  return (
    <div className="sw-comm">
      <div className="sw-comm-label">Community · {total} votes</div>
      <div className="sw-comm-card">
      <div className="sw-community-donut-row">
        <DonutScore score={score} voted={total} size={64} stroke={7} />
        <div className="sw-community-stats">
          <div className="sw-stat-row">
            <span><span className="sw-stat-dot" style={{ background: "var(--trusted)" }} />Trust</span>
            <span className="sw-stat-value">{trust}</span>
          </div>
          <div className="sw-stat-row">
            <span><span className="sw-stat-dot" style={{ background: "var(--mostly)" }} />Mixed</span>
            <span className="sw-stat-value">{mixed}</span>
          </div>
          <div className="sw-stat-row">
            <span><span className="sw-stat-dot" style={{ background: "var(--low)" }} />Distrust</span>
            <span className="sw-stat-value">{distrust}</span>
          </div>
        </div>
      </div>
      <div className="sw-comm-stack" role="img" aria-label={`Trust ${trust}, Mixed ${mixed}, Distrust ${distrust}`}>
        {trust > 0 && <span className="sw-comm-stack-seg" style={{ flexGrow: trust, background: "var(--trusted)" }} />}
        {mixed > 0 && <span className="sw-comm-stack-seg" style={{ flexGrow: mixed, background: "var(--mostly)" }} />}
        {distrust > 0 && <span className="sw-comm-stack-seg" style={{ flexGrow: distrust, background: "var(--low)" }} />}
      </div>
      </div>
    </div>
  );
}

function DivergencePanel({ paper }) {
  if (!paper.diverge) return null;
  return (
    <div className="sw-diverge">
      <div className="sw-diverge-label">
        <IconWarning />
        Divergence
      </div>
      <div className="sw-diverge-row"><b>AI says:</b>{paper.diverge.aiSays}</div>
      <div className="sw-diverge-row"><b>Source says:</b>{paper.diverge.sourceSays}</div>
    </div>
  );
}

function SignalPanel({ source, paper }) {
  return (
    <>
      {/* Divergence first — the AI-vs-source mismatch is the most decision-
         relevant signal for trust calibration, so surface it above votes. */}
      <DivergencePanel paper={paper} />
      <div className="sw-signals">
        <CommunityBar source={source} />
      </div>
    </>
  );
}

/* ============================================================
   Main component
   ============================================================ */
export default function SourceWorkspace({ source, onBack, onCalibrate, onExclude, excluded }) {
  const [tab, setTab] = useState("ask");
  const selectTab = (t) => { log('workspace_tab', { tab: t }, { target_id: source.id, target_kind: 'source' }); setTab(t); };
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [selTip, setSelTip] = useState(null);
  const paperColRef = useRef(null);
  const lastSelTextRef = useRef('');   // dedupe repeated text_select logs for the same selection

  const paper = getPaperFor(source);
  const suggestions = getSuggestionsFor(source);
  const verdict = source.verdict;
  const verdictBand = verdict === "trusted" ? "high" : verdict === "mostly" ? "mid" : "low";

  useEffect(() => {
    function maybeShow() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) { setSelTip(null); return; }
      const text = sel.toString().trim();
      if (!text || text.length < 4) { setSelTip(null); return; }
      const range = sel.getRangeAt(0);
      const root = paperColRef.current;
      if (!root || !root.contains(range.commonAncestorContainer)) { setSelTip(null); return; }
      const rect = range.getBoundingClientRect();
      setSelTip({ x: rect.left + rect.width / 2, y: rect.top - 10, text });
      if (text !== lastSelTextRef.current) { log('text_select', { len: text.length }, { target_id: source.id, target_kind: 'source' }); lastSelTextRef.current = text; }
    }
    document.addEventListener("mouseup", maybeShow);
    const selectionHandler = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) setSelTip(null);
    };
    document.addEventListener("selectionchange", selectionHandler);
    const root = paperColRef.current;
    const onScroll = () => setSelTip(null);
    root && root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("mouseup", maybeShow);
      document.removeEventListener("selectionchange", selectionHandler);
      root && root.removeEventListener("scroll", onScroll);
    };
  }, [source.id]);

  useEffect(() => {
    const t = setTimeout(() => {
      const el = paperColRef.current?.querySelector(".sw-cite");
      el?.scrollIntoView && el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 260);
    return () => clearTimeout(t);
  }, [source.id]);

  function ask(q) {
    const question = q || draft.trim();
    if (!question) return;
    log('scoped_ask', { q_len: question.length, suggested: !!q }, { target_id: source.id, target_kind: 'source' });
    setMessages((m) => [...m, { from: "user", text: question }]);
    setDraft("");
    setTimeout(() => {
      const a = getScriptedAnswerFor(source, question);
      setMessages((m) => [...m, { from: "ai", text: a.text, ref: a.ref }]);
    }, 380);
  }

  function askAboutSelection() {
    if (!selTip) return;
    log('ask_selection', { sel_len: selTip.text.length }, { target_id: source.id, target_kind: 'source' });
    ask(`What does the source say about: "${selTip.text}"?`);
    setSelTip(null);
    window.getSelection()?.removeAllRanges();
  }

  const claimBacks = Object.values(VERIFAI_DATA.claims).find((c) => c.sourceIds.includes(source.id));

  return (
    <div className="sw-root" role="dialog" aria-label={`Source: ${source.title}`}>
      <div className="sw-head">
        <div className="sw-head-left">
          <button className="sw-back" onClick={onBack}>
            <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            Back
          </button>
          <div className="sw-crumb">
            <span>Source</span>
            <svg className="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </div>
          <div className="sw-crumb-title" title={paper.title}>{paper.title}</div>
        </div>
        <div className="sw-head-actions">
          <a className="sw-head-link" href="#" onClick={(e) => e.preventDefault()} title="Open original source in new tab">
            <svg className="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
            Open original
          </a>
        </div>
      </div>

      <div className="sw-body">
        <div className={`sw-paper-col ${excluded ? 'sw-paper-col--excluded' : ''}`} ref={paperColRef}>
          <div className="sw-paper">
            <div className="sw-paper-meta">
              <div className="sw-paper-kind">
                <span className="sw-paper-kind-dot" />
                {paper.kind}
              </div>
              <h1 className="sw-paper-title">{paper.title}</h1>
              <div className="sw-paper-byline">
                {paper.byline.map((b, i) => (
                  <Fragment key={i}>
                    <span>{b}</span>
                    {i < paper.byline.length - 1 && <span className="sw-paper-byline-dot">·</span>}
                  </Fragment>
                ))}
              </div>
            </div>
            <div className="sw-paper-body">
              {paper.sections.map((sec, i) => (
                <Fragment key={i}>
                  {sec.h && <h3>{sec.h}</h3>}
                  <p>
                    {sec.cite ? (
                      <>
                        {sec.b}{sec.b && " "}
                        <span
                          className={`sw-cite sw-cite--${verdictBand}`}
                          tabIndex={0}
                          role="button"
                          aria-describedby={`sw-cite-tip-${i}`}
                        >
                          {sec.cite.on}
                          <span className="sw-cite-tip" id={`sw-cite-tip-${i}`} role="tooltip">
                            <span className="sw-cite-tip-row">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /></svg>
                              <span className="sw-cite-tip-label">AI cited this passage</span>
                            </span>
                            {claimBacks && (
                              <span className="sw-cite-tip-sub">
                                Supports: <em>"{claimBacks.quote}"</em>
                              </span>
                            )}
                          </span>
                        </span>
                        {sec.cite.after}
                      </>
                    ) : sec.b}
                  </p>
                </Fragment>
              ))}
            </div>
          </div>

          {selTip && (
            <div className="sw-sel-tip" style={{ left: selTip.x, top: selTip.y }}>
              <button className="sw-sel-tip-btn" onClick={askAboutSelection}>
                <svg className="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                Ask about this
              </button>
              <span className="sw-sel-tip-sep" />
              <button className="sw-sel-tip-btn" title="Copy">
                <svg className="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                Copy
              </button>
            </div>
          )}
        </div>

        <div className="sw-side">
          <div className="sw-meta">
            <div className="sw-meta-top">
              {excluded
                ? <span className="sw-excluded-tag"><IconExclude /> Excluded</span>
                : <VerdictPill verdict={verdict} label={source.verdictLabel} />}
              <div className="sw-meta-top-actions">
                <button
                  className={`sw-dabtn ${excluded ? "sw-dabtn--restore" : "sw-dabtn--ghost"}`}
                  onClick={() => onExclude && onExclude(source)}
                  title={excluded ? "Restore this source to the answer" : "Exclude from AI answer"}
                >
                  {excluded ? (<><IconRestore /> Restore</>) : (<><IconExclude /> Exclude</>)}
                </button>
                {excluded ? (
                  /* Once excluded the answer auto-regenerates, so the natural next
                     step is to go look at it. This sits right beside Restore — no
                     diagonal trip back to the top-left Back — and closes the loop. */
                  <button
                    className="sw-dabtn sw-dabtn--primary"
                    onClick={() => onBack && onBack()}
                    title="Return to the answer to see your updated result"
                  >
                    <IconBackToAnswer /> Back to answer
                  </button>
                ) : (
                  <button
                    className="sw-dabtn sw-dabtn--primary"
                    onClick={() => { if (onCalibrate) onCalibrate(source); }}
                  >
                    <IconCalibrate /> Calibrate
                  </button>
                )}
              </div>
            </div>

            <div className="sw-meta-grid">
              <div>
                <div className="sw-meta-cell-label">Source</div>
                <div className="sw-meta-cell-value" title={source.title}>{source.title}</div>
              </div>
              <div>
                <div className="sw-meta-cell-label">Published in</div>
                <div className="sw-meta-cell-value sw-meta-cell-value--wrap" style={{ color: "var(--ink-2)", fontWeight: 400, fontSize: 'var(--fs-xs)' }}>
                  {source.journal}
                </div>
              </div>
            </div>

            {claimBacks && (
              <div className="sw-claim-box">
                <span className="sw-claim-box-label">This source backs</span>
                "{claimBacks.quote}"
              </div>
            )}

            <SignalPanel source={source} paper={paper} />
          </div>

          <div className="sw-tabs">
            <button className={`sw-tab ${tab === "ask" ? "sw-tab--active" : ""}`} onClick={() => selectTab("ask")}>
              Ask
              {messages.filter((m) => m.from === "user").length > 0 && (
                <span className="sw-tab-count">{messages.filter((m) => m.from === "user").length}</span>
              )}
            </button>
            <button className={`sw-tab ${tab === "community" ? "sw-tab--active" : ""}`} onClick={() => selectTab("community")}>
              Community <span className="sw-tab-count">{source.users.voted}</span>
            </button>
            <button className={`sw-tab ${tab === "quality" ? "sw-tab--active" : ""}`} onClick={() => selectTab("quality")}>
              Quality
            </button>
          </div>

          <div className="sw-tab-body">
            {tab === "ask" && <AskTab source={source} messages={messages} suggestions={suggestions} onAsk={ask} />}
            {tab === "community" && <CommunityTab source={source} />}
            {tab === "quality" && <QualityTab source={source} />}
          </div>

          {tab === "ask" && (
            <div className="sw-composer-wrap">
              <div className="sw-composer-scope">
                <span>Scoped to</span>
                <span className="sw-composer-scope-pill">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '0.5rem', height: '0.5rem', flexShrink: 0 }}><circle cx="12" cy="12" r="5" /></svg>
                  this source
                </span>
              </div>
              <div className="sw-composer">
                <input
                  type="text"
                  placeholder="Ask about this source…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
                />
                <button className="sw-composer-send" onClick={() => ask()} disabled={!draft.trim()} aria-label="Send">
                  <svg className="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AskTab({ source, messages, suggestions, onAsk }) {
  if (!messages.length) {
    return (
      <div className="sw-chat-empty">
        <div className="sw-chat-empty-icon">
          <svg className="icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
        </div>
        <div className="sw-chat-empty-title">Ask about this source</div>
        <div className="sw-chat-empty-sub">
          Chat scoped to this paper — what does it actually say, where does it disagree with the AI answer, and anything about its methodology.
        </div>
        <div className="sw-suggest">
          {suggestions.map((s, i) => (
            <button key={i} className="sw-suggest-btn" onClick={() => onAsk(s)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="sw-chat">
      {messages.map((m, i) => {
        if (m.from === "user") return <div key={i} className="sw-msg-user">{m.text}</div>;
        return (
          <div key={i} className="sw-msg-ai">
            {m.text}
            {m.ref && (
              <div className="sw-msg-ai-ref">
                <span className="sw-msg-ai-ref-label">From the paper</span>
                "{m.ref}"
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CommunityTab({ source }) {
  return (
    <div className="sw-community">
      <div>
        <div className="label-eyebrow" style={{ marginBottom: 8 }}>Recent comments</div>
        {getCommentsFor(source).map((c, i) => (
          <div key={i} className="sw-comm-item">
            <div className="sw-comm-item-head">
              <span>{c.author}</span>
              <span>{c.when}</span>
            </div>
            <div className="sw-comm-item-body">"{c.text}"</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getCommentsFor(source) {
  if (source.comments) return source.comments;
  const map = {
    smith: [
      { author: "Dr. P. Huang", when: "2d ago", text: "Methodology is solid. Effect size consistent with what I see in my own PVT data." },
      { author: "J. Ostrov", when: "1w ago", text: "Wish they'd reported per-subject data. The SD looks tight." },
    ],
    johnson: [
      { author: "LibMod", when: "1d ago", text: "Can't find this anywhere. Likely fabricated." },
      { author: "N. Patel", when: "3d ago", text: "Searched ORCID, CrossRef, publisher — nothing matches." },
    ],
    patel2024: [
      { author: "Dr. K. Ohno", when: "6h ago", text: "No placebo, no blinding — the 14–18% is probably expectancy effect more than caffeine." },
      { author: "rsmith_ucl", when: "2d ago", text: "Interesting pilot but way too small to anchor any claim. Wait for replication." },
    ],
    who: [{ author: "Public Health RN", when: "3d ago", text: "Useful population-level guidance. Nothing controversial." }],
    harvard2019: [{ author: "M. Reyes", when: "5d ago", text: "Caveat emptor — this is Parkinson's-specific. Popular press often generalizes." }],
    meta2021: [{ author: "Dr. O. Ivanov", when: "4d ago", text: "Gold-standard aggregation. Effect is real but modest." }],
  };
  return map[source.id] || [{ author: "Reader", when: "recently", text: "Well-regarded source." }];
}

function QualityTab({ source }) {
  const signals = source.verdict === "low"
    ? [
      { icon: "x", status: "weak", label: "Journal reputation", value: "Unverified", note: "No indexed publisher" },
      { icon: "x", status: "weak", label: "Peer review", value: "Not peer-reviewed", note: "No editorial record" },
      { icon: "alert", status: "weak", label: "Author record", value: "No match", note: "ORCID / CrossRef returned nothing" },
      { icon: "alert", status: "weak", label: "Recency", value: "Unknown", note: "No publication date" },
      { icon: "alert", status: "weak", label: "Matches claim", value: "Low overlap", note: "Figures don't appear in text" },
    ]
    : source.verdict === "mostly"
      ? [
        { icon: "check", status: "moderate", label: "Journal reputation", value: "Mid-tier", note: "Q2 journal · impact factor 3.4" },
        { icon: "check", status: "strong", label: "Peer review", value: "Peer-reviewed", note: "Double-blind, 3 reviewers" },
        { icon: "check", status: "moderate", label: "Citation count", value: "124 citations", note: "Moderate reach in the field" },
        { icon: "check", status: "moderate", label: "Recency", value: "2023", note: "Within 3 years" },
        { icon: "alert", status: "moderate", label: "Matches claim", value: "Partial", note: source.divergence ? "AI quoted figures differ from the paper" : "Some wording mismatch" },
      ]
      : [
        { icon: "check", status: "strong", label: "Journal reputation", value: "Top-tier", note: "Q1 journal · impact factor 9.2" },
        { icon: "check", status: "strong", label: "Peer review", value: "Peer-reviewed", note: "Standard editorial process" },
        { icon: "check", status: "strong", label: "Citation count", value: "1,842 citations", note: "Highly cited across the field" },
        { icon: "check", status: "strong", label: "Recency", value: "Within 3 years", note: "Reflects current evidence" },
        { icon: "check", status: "strong", label: "Matches claim", value: "Strong overlap", note: "AI quote verifiable in §3.2" },
      ];

  return (
    <div>
      <div className="label-eyebrow" style={{ marginBottom: 10 }}>AI quality signals</div>
      <div className="sw-qual-list">
        {signals.map((s, i) => (
          <div key={i} className={`sw-qual-item sw-qual-item--${s.status}`}>
            <span className={`sw-qual-icon sw-qual-icon--${s.status}`} aria-hidden="true">
              {s.icon === "check" && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '0.625rem', height: '0.625rem' }}><polyline points="20 6 9 17 4 12" /></svg>
              )}
              {s.icon === "alert" && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: '0.625rem', height: '0.625rem' }}><line x1="12" y1="8" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              )}
              {s.icon === "x" && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '0.625rem', height: '0.625rem' }}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              )}
            </span>
            <div className="sw-qual-body">
              <div className="sw-qual-head-row">
                <span className="sw-qual-label">{s.label}</span>
                <span className={`sw-qual-value sw-qual-value--${s.status}`}>{s.value}</span>
              </div>
              <div className="sw-qual-note">{s.note}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="sw-community-note" style={{ marginTop: 14 }}>
        These signals feed into the AI verdict. Strong signals don't guarantee the source matches a specific claim — methodology or scope may still diverge.
      </div>
    </div>
  );
}
