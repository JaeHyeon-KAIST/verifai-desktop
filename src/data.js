// VerifAI data — a CLAIM is the unit of verification.
// Each highlighted passage in the answer is a claim; each claim is backed
// by multiple sources that collectively verify (or contradict) it.

export const VERIFAI_DATA = {
  question: "What are the effects of caffeine on cognitive performance?",

  claims: {
    c1: {
      id: "c1",
      quote: "Moderate doses can improve reaction time by up to 12%, with effects on sustained attention lasting several hours.",
      worstVerdict: "mostly",
      calibrated: false,
      sourceIds: ["smith", "patel2024", "nawrot2003", "brunye2010"],
    },
    c2: {
      id: "c2",
      quote: "Some evidence suggests that it may reduce neurodegenerative disease risk by 35–40%.",
      worstVerdict: "low",
      calibrated: false,
      sourceIds: ["meta2021", "harvard2019", "johnson", "blogpost2023"],
    },
    c3: {
      id: "c3",
      quote: "The WHO recommends limiting intake to 400mg daily for healthy adults.",
      worstVerdict: "trusted",
      calibrated: false,
      sourceIds: ["who", "efsa2015", "fda2018", "mayo2022"],
    },
  },

  answerV1: [
    [{ t: "Caffeine is one of the most widely studied cognitive enhancers. Research consistently shows it improves alertness and reduces fatigue." }],
    [
      { t: "Moderate doses can improve reaction time " },
      { t: "by up to 12%, with effects on sustained attention lasting several hours", claim: "c1" },
      { t: ". Working memory and executive function also benefit, though individual responses vary." },
    ],
    [
      { t: "Some evidence suggests that it may " },
      { t: "reduce neurodegenerative disease risk by 35–40%", claim: "c2" },
      { t: ", though more research is needed." },
    ],
    [
      { t: "The WHO recommends " },
      { t: "limiting intake to 400mg daily for healthy adults", claim: "c3" },
      { t: ", noting diminishing cognitive returns above this threshold." },
    ],
    [{ t: "Individual tolerance plays a significant role in caffeine's effectiveness. Habitual consumers may experience reduced benefits due to adenosine receptor adaptation, while infrequent users tend to show stronger cognitive improvements." }],
    [{ t: "Timing also matters. Peak plasma concentration occurs 30–60 minutes after ingestion, with a half-life of approximately 5 hours. Taking caffeine too late in the day can disrupt sleep quality, which in turn negatively affects next-day cognitive performance." }],
  ],

  answerV2: [
    [{ t: "Caffeine is one of the most widely studied cognitive enhancers. Research consistently shows it improves alertness and reduces fatigue." }],
    [
      { t: "Moderate doses can improve reaction time " },
      { t: "in the 8–11% range (corrected after removing unreliable sources)", claim: "c1", updated: true },
      { t: ", with effects on sustained attention lasting several hours. Working memory and executive function also benefit, though individual responses vary." },
    ],
    [
      { t: "The evidence here is weaker than first stated: the better-supported estimate is a " },
      { t: "~15–22% reduction in Parkinson's-specific risk (revised down after excluding low-trust sources)", claim: "c2", updated: true },
      { t: ", and the broad “neurodegenerative disease” framing overstated the finding." },
    ],
    [
      { t: "The WHO recommends " },
      { t: "limiting intake to 400mg daily for healthy adults", claim: "c3" },
      { t: ", noting diminishing cognitive returns above this threshold." },
    ],
    [{ t: "Individual tolerance plays a significant role in caffeine's effectiveness. Habitual consumers may experience reduced benefits due to adenosine receptor adaptation, while infrequent users tend to show stronger cognitive improvements." }],
    [{ t: "Timing also matters. Peak plasma concentration occurs 30–60 minutes after ingestion, with a half-life of approximately 5 hours. Taking caffeine too late in the day can disrupt sleep quality, which in turn negatively affects next-day cognitive performance." }],
  ],

  sources: {
    smith: {
      id: "smith", verdict: "mostly", verdictLabel: "Mostly Trusted",
      title: "Smith, A. et al. (2023)",
      journal: "J. Cognitive Neuroscience, 35(4), 112–128",
      reason: "Paper exists but cited statistic (12%) differs from source (8–11% range)",
      users: { score: 72, voted: 142 },
      divergence: false,
      doi: "doi.org/10.1162/jocn_a_2023_35_4_112",
      excerptCited: "Reaction time improved by 8–11% (M = 9.4%, SD = 2.1) in the caffeine group compared to placebo, with effects lasting 3–5 hours post-ingestion.",
      aiSays: '"up to 12%"', sourceSays: '"8–11% (M = 9.4%)"',
    },
    johnson: {
      id: "johnson", verdict: "low", verdictLabel: "Low Trust",
      title: "Johnson, R. & Lee (2024)",
      journal: "Nature Reviews Neuroscience, 12(2), 45–62",
      reason: "No matching publication found. Authors publish in a different field.",
      users: { score: 53, voted: 67 }, divergence: true, doi: "—",
    },
    patel2024: {
      id: "patel2024", verdict: "low", verdictLabel: "Low Trust",
      title: "Patel, R. & Becker (2024)",
      journal: "arXiv preprint · q-bio.NC · 2401.05432",
      reason: "Unreviewed preprint. Reports 14–18% effect — higher than every peer-reviewed trial.",
      users: { score: 38, voted: 54 }, divergence: true,
      doi: "arxiv.org/abs/2401.05432",
      aiSays: '"up to 12%"', sourceSays: '"14–18% peak effect"',
    },
    who: {
      id: "who", verdict: "trusted", verdictLabel: "Trusted",
      title: "WHO Global Report (2022)",
      journal: "WHO Technical Report Series",
      reason: "Report exists and contains referenced caffeine guideline data.",
      users: { score: 88, voted: 318 }, divergence: false,
      doi: "who.int/publications/tr-2022-caffeine",
    },
    harvard2019: {
      id: "harvard2019", verdict: "mostly", verdictLabel: "Mostly Trusted",
      title: "Harvard Med. Longitudinal (2019)",
      journal: "JAMA Neurology, 76(8), 921–930",
      reason: "Study exists, but 35% figure applies only to Parkinson's, not all neurodegeneration.",
      users: { score: 68, voted: 92 }, divergence: false,
      doi: "doi.org/10.1001/jamaneurol.2019.0821",
    },
    meta2021: {
      id: "meta2021", verdict: "trusted", verdictLabel: "Trusted",
      title: "Cornelis et al. — Meta-analysis (2021)",
      journal: "Lancet Neurology, 20(6), 483–495",
      reason: "Large meta-analysis. Effect size is more modest (15–22%) than the AI stated.",
      users: { score: 81, voted: 201 }, divergence: true,
      doi: "doi.org/10.1016/S1474-4422(21)00100-5",
    },
    efsa2015: {
      id: "efsa2015", verdict: "trusted", verdictLabel: "Trusted",
      title: "EFSA Scientific Opinion (2015)",
      journal: "EFSA Journal, 13(5):4102",
      reason: "Independent source confirms 400mg daily recommendation for healthy adults.",
      users: { score: 91, voted: 276 }, divergence: false,
      doi: "doi.org/10.2903/j.efsa.2015.4102",
    },
    fda2018: {
      id: "fda2018", verdict: "trusted", verdictLabel: "Trusted",
      title: "FDA Caffeine Advisory (2018)",
      journal: "U.S. Food & Drug Administration",
      reason: "FDA guidance aligns with the 400mg threshold cited by AI.",
      users: { score: 85, voted: 143 }, divergence: false,
      doi: "fda.gov/consumers/caffeine-and-your-body",
    },
    nawrot2003: {
      id: "nawrot2003", verdict: "trusted", verdictLabel: "Trusted",
      title: "Nawrot, P. et al. (2003)",
      journal: "Food Additives & Contaminants, 20(1), 1–30",
      reason: "Widely-cited Health Canada review; supports moderate acute cognitive benefits.",
      users: { score: 84, voted: 156 }, divergence: false,
      doi: "doi.org/10.1080/0265203021000007840",
    },
    brunye2010: {
      id: "brunye2010", verdict: "low", verdictLabel: "Low Trust",
      title: "Brunyé, T. et al. (2010)",
      journal: "Appetite, 54(3), 547–553",
      reason: "Small single-dose study; the cited 12% is larger than its own data support.",
      users: { score: 41, voted: 38 }, divergence: true,
      doi: "doi.org/10.1016/j.appet.2010.02.004",
      aiSays: '"up to 12%"', sourceSays: '"~6% (n = 18, high variance)"',
    },
    blogpost2023: {
      id: "blogpost2023", verdict: "low", verdictLabel: "Low Trust",
      title: "“Coffee cuts dementia 40%” — health blog (2023)",
      journal: "wellnessdaily.example · opinion piece",
      reason: "Non-peer-reviewed blog; inflates a single study's figure to a 40% headline.",
      users: { score: 22, voted: 89 }, divergence: true,
      doi: "—",
      aiSays: '"35–40% reduction"', sourceSays: '"headline figure, no primary data"',
    },
    mayo2022: {
      id: "mayo2022", verdict: "mostly", verdictLabel: "Mostly Trusted",
      title: "Mayo Clinic — Caffeine: how much is too much? (2022)",
      journal: "Mayo Clinic Patient Care & Health Information",
      reason: "Reputable consumer guidance; echoes the 400mg figure but is not a primary source.",
      users: { score: 70, voted: 64 }, divergence: false,
      doi: "mayoclinic.org/caffeine/art-20045678",
    },
  },

  history: {
    today: [
      { title: "Effects of caffeine on cognition", meta: "3 claims · 1 calibrated", active: true },
      { title: "Climate change & coral reefs", meta: "5 claims · 2 calibrated" },
    ],
    yesterday: [
      { title: "Transformer architecture survey", meta: "4 claims · 3 calibrated" },
      { title: "CRISPR gene editing ethics", meta: "6 claims · 2 calibrated" },
      { title: "Quantum computing overview", meta: "3 claims · 0 calibrated" },
    ],
    lastWeek: [
      { title: "Sleep quality meta-analysis", meta: "4 claims · 1 calibrated" },
      { title: "Machine learning in healthcare", meta: "5 claims · 3 calibrated" },
      { title: "RNA sequencing pipelines", meta: "3 claims · 2 calibrated" },
      { title: "Bayesian statistics tutorial", meta: "2 claims · 1 calibrated" },
      { title: "Dark matter evidence review", meta: "6 claims · 4 calibrated" },
      { title: "Antibiotic resistance trends", meta: "4 claims · 2 calibrated" },
    ],
  },

  paperSections: [
    { h: "Section 2 — Methods", b: "142 healthy adults (ages 18–35) were recruited for a double-blind, placebo-controlled crossover study with a 7-day washout period. Participants received either 200mg caffeine or placebo." },
    { h: "Section 3.1 — Baseline Measures", b: "No significant baseline differences were observed between groups (all ps > .15). Sleep was controlled via actigraphy for 48 hours preceding each session." },
    { h: "Section 3.2 — Results", b: "Cognitive assessments were administered at baseline, 30 min, 2h, and 4h post-ingestion using the Stroop task, serial reaction time, and PVT.", citedNext: true },
    { h: null, b: "These findings are consistent with prior work on adenosine receptor antagonism (Fredholm et al., 1999; Nehlig, 2010). The A1 and A2A receptor subtypes in the prefrontal cortex appear to mediate the majority of caffeine's cognitive effects." },
    { h: null, b: "However, the magnitude of improvement varied substantially by individual tolerance. Habitual consumers (>300mg/day, n = 48) showed attenuated effects (M = 5.2%, SD = 1.8), while low consumers (<100mg/day, n = 39) demonstrated the largest gains (M = 14.1%, SD = 3.2)." },
  ],

  ftux: [
    { id: 1, title: "AI verdict",        body: "Our AI reads each source and tags it Trusted, Mostly Trusted, or Low Trust — based on whether the source content actually matches the claim." },
    { id: 2, title: "Community rating",  body: "Readers who've seen this source vote on trust. The donut shows their average — the number tells you how many voted." },
    { id: 3, title: "Open the source",   body: "Tap any card to open the source. There you can read it in-context, chat with just that source, and decide whether to exclude it or calibrate your own trust." },
  ],

  reasons: ["Data doesn't match the claim", "Source is outdated", "Author credibility concern", "Methodology issues"],
};

export const sourcesForClaim = (claimId) => {
  const c = VERIFAI_DATA.claims[claimId];
  if (!c) return [];
  return c.sourceIds.map((id) => VERIFAI_DATA.sources[id]).filter(Boolean);
};
