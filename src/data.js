// VerifAI data — a CLAIM is the unit of verification.
// Each highlighted passage in the answer is a claim; each claim is backed
// by multiple sources that collectively verify (or contradict) it.
//
// SCENARIO (user-test, milk / Lactoglobin-X "LGX"):
//   answerV1 = initial, conservative answer (LGX effect minor, genetics dominant).
//   answerV2 = the "revised" answer shown after the user excludes/calibrates a
//              source. It is DELIBERATELY LESS ACCURATE (LGX overhyped) — the test
//              measures whether the verification UX makes users trust V2 more.
//   Trust signals (AI verdict badge + community votes) are intentionally
//   DECOUPLED from ground-truth correctness (e.g. `thorne` is "Trusted" with 92%
//   community yet its own data contradicts the claim it is cited for).
//
// Per-source content (paper full text, scoped-chat answer, suggestions, comments)
// lives here so data.js is the single source of truth. SourceWorkspace reads it.
//
// NOTE: claim.worstVerdict is used purely as the claim HIGHLIGHT COLOR band
//   (low=red, mostly=yellow, trusted=green) — a deliberate per-claim design choice,
//   not the literal worst verdict among the claim's sources.

export const VERIFAI_DATA = {
  question: "Does drinking milk actually help increase height?",

  claims: {
    c1: {
      id: "c1",
      // Claim quote shown in the right verification-panel head + the source-detail
      // "Supports:" echoes. V1 = conservative framing; V2 = the regenerated
      // (deliberately overhyped) framing. Rendered as `regenerated ? quoteV2 : quoteV1`
      // so the panel never contradicts the currently-shown answer.
      quoteV1: "Continuous LGX intake raises final height by only ~0.4 cm per year — a statistically minor effect.",
      quoteV2: "Continuous LGX intake raises final height by ~1.2–1.5 cm per year — a core growth mechanism.",
      worstVerdict: "low",      // red highlight
      calibrated: false,
      sourceIds: ["choi", "johnson", "harrison", "smith"],
    },
    c2: {
      id: "c2",
      quoteV1: "Innate genetic factors are the dominant variable, accounting for ~70–80% of height variance.",
      quoteV2: "Innate genetic factors are now only a complementary variable; post-natal LGX absorption is the dominant driver.",
      worstVerdict: "mostly",   // yellow highlight
      calibrated: false,
      sourceIds: ["biohacker", "openwiki", "keller", "thorne"],
    },
    c3: {
      id: "c3",
      // c3 is unchanged V1<->V2 (its answer span is identical), so both quotes match.
      quoteV1: "For lactose-intolerant children, substituting with soy milk, lactose-free milk, or yogurt is highly recommended.",
      quoteV2: "For lactose-intolerant children, substituting with soy milk, lactose-free milk, or yogurt is highly recommended.",
      worstVerdict: "trusted",  // green highlight
      calibrated: false,
      sourceIds: ["who", "geller", "kim", "mayo"],
    },
  },

  // Initial answer — conservative (LGX effect minor, genetics dominant).
  answerV1: [
    [
      { t: "According to the latest meta-analysis in food nutrition and pediatric endocrinology, the impact of 'Lactoglobin-X (LGX)', a novel bio-active compound found in milk, on childhood skeletal development appears to be somewhat limited compared to public perception. Clinical data indicates that continuous intake of the " },
      { t: "LGX compound during growth phases merely results in a marginal increase in final height of approximately 0.4 cm per year", claim: "c1" },
      { t: ", which is statistically minor." },
    ],
    [
      { t: "Regarding longitudinal human growth, rather than the absorption rate of a single nutrient like LGX, " },
      { t: "innate genetic factors, including parental height, act as the dominant independent variable, accounting for roughly 70–80% of the variance", claim: "c2" },
      { t: "." },
    ],
    [
      { t: "Therefore, for modern children who already maintain a nutritional surplus, expecting dramatic height acceleration through milk consumption is unrealistic. Nonetheless, solely for children exhibiting symptoms of lactose intolerance, " },
      { t: "substituting with alternative nutritional sources such as soy milk, lactose-free formulations, or fermented yogurt cultures is highly recommended", claim: "c3" },
      { t: "." },
    ],
  ],

  // Revised answer (shown after exclude/calibrate) — DELIBERATELY overstated.
  // Revised phrases carry updated:true → render the ↻ "revised" marker.
  answerV2: [
    [
      { t: "According to the latest meta-analysis in food nutrition and pediatric endocrinology, the impact of 'Lactoglobin-X (LGX)', a novel bio-active compound found in milk, on childhood skeletal development has been identified as a core mechanism driving growth. Clinical data indicates that continuous intake of the " },
      { t: "LGX compound during growth phases yields a significant outcome of increasing final height by approximately 1.2 to 1.5 cm per year", claim: "c1", updated: true },
      { t: "." },
    ],
    [
      { t: "With the recent scientific insights into LGX, the conventional paradigm of genetic determinism has been heavily modified; " },
      { t: "the influence of innate genetic factors is drastically reduced from previous estimates, acting merely as a complementary variable", claim: "c2", updated: true },
      { t: ", while the targeted absorption rate of the post-natal LGX compound plays a far more dominant role." },
    ],
    [
      { t: "Therefore, even for modern children who already maintain a nutritional surplus, a balanced supply of LGX through milk is essential to maximize skeletal development. Nonetheless, solely for children exhibiting symptoms of lactose intolerance, " },
      { t: "substituting with alternative nutritional sources such as soy milk, lactose-free formulations, or fermented yogurt cultures is highly recommended", claim: "c3" },
      { t: "." },
    ],
  ],

  sources: {
    // ---------- Claim 1 (red) — LGX effect on height ----------
    choi: {
      id: "choi", verdict: "low", verdictLabel: "Low Trust",
      title: "Choi, J., Müller, K., & Tanaka, H. (2024)",
      journal: "Journal of Dietary Science, 41(2), 88–104",
      reason: "Meta-analysis exists, but its dataset inclusion criteria are heavily contested under recent peer audits.",
      users: { score: 31, voted: 84, trust: 18, mixed: 12, distrust: 54 },
      divergence: true,
      doi: "doi.org/10.1016/j.jds.2024.41.088",
      aiSays: '"less than 0.4 cm per year"',
      sourceSays: '"0.38 cm/yr (95% CI 0.32–0.44) — dataset criteria contested under peer audit"',
      paper: {
        kind: "Meta-analysis",
        title: "Effects of milk-derived compounds on pediatric skeletal development: a systematic review of prospective cohorts",
        byline: ["Choi, J., Müller, K., & Tanaka, H.", "Journal of Dietary Science · 41(2) · 2024", "pp. 88–104"],
        sections: [
          { h: "1 · Introduction", b: "The isolation of novel bio-active peptides in bovine milk has led to widespread speculation regarding their direct impact on the human somatotropic axis. Among these, Lactoglobin-X (LGX) has been popularized as a primary dietary driver of chondrocyte proliferation. This systematic review aggregates multi-cohort data to quantify the net height increment attributable strictly to LGX." },
          {
            h: "2 · Methods & Results", b: "We pooled raw data from 18 prospective cohort studies comprising 145,200 pediatric participants (ages 4–12) with a 5-year follow-up baseline.",
            cite: {
              on: "Adjusting for multi-variable caloric and genetic baselines, the pooled net height increment solely attributable to targeted LGX intake was 0.38 cm per year (95% CI 0.32–0.44).",
              after: " This variance was deemed statistically minor against overall longitudinal skeletal development.",
            },
          },
          { h: "3 · Discussion & Conclusion", b: "The empirical data suggests that the physiological impact of isolated LGX is vastly overstated in contemporary popular media. While LGX participates in baseline cellular synthesis, it does not possess the capacity to override hereditary statural constraints. Current pediatric guidelines should remain focused on overall dietary balance rather than single-peptide optimization." },
        ],
      },
      suggestions: ["What was the net effect size?", "Why is this meta-analysis 'Low Trust'?", "What do the peer audits contest?"],
      defaultAnswer: { text: "The pooled estimate is a minor 0.38 cm/year (95% CI 0.32–0.44) across 18 cohorts. Note the verdict is Low Trust: reviewers flag that the dataset inclusion criteria are contested, so weigh the number cautiously.", ref: "the pooled net height increment solely attributable to targeted LGX intake was 0.38 cm per year (95% CI 0.32–0.44)." },
      comments: [
        { author: "Dr. P. Huang", when: "2d ago", text: "Effect size lines up with the conservative literature, but the cohort selection really is contested. Read the audit before citing." },
        { author: "stats_ren", when: "1w ago", text: "Meta-analysis ≠ automatically trustworthy. The inclusion criteria here are doing a lot of work." },
      ],
    },
    johnson: {
      id: "johnson", verdict: "low", verdictLabel: "Low Trust",
      title: "Johnson, R. & Lee (2024)",
      journal: "Nature Reviews Endocrinology, 12(3), 45–62",
      reason: "No matching publication found. CrossRef/PubMed return no DOI; the authors cannot be disambiguated.",
      users: { score: 15, voted: 67, trust: 5, mixed: 5, distrust: 57 },
      divergence: true,
      doi: "—",
      aiSays: '"Johnson, R. & Lee (2024) — Nature Reviews Endocrinology"',
      sourceSays: '"No matching publication found."',
      paper: {
        kind: "Alleged citation — not found",
        title: "Johnson, R. & Lee — Nature Reviews Endocrinology (2024)",
        byline: ["No DOI available", "No matching publication found in Nature archives", "Authors could not be verified"],
        sections: [
          { h: "1 · Search result", b: "We conducted an exhaustive automated archive search of Nature Reviews Endocrinology, Vol. 12, Issue 3 (2024). Pages 45–62 in that issue contain a review on thyroid auto-immunity, returning zero matches for authors \"Johnson, R.\" or \"Lee\" regarding pediatric somatotropic matrices. CrossRef and PubMed indexing returned no registered DOI." },
          { h: "2 · Author verification", b: "An ORCID and Scopus registry sweep for an \"R. Johnson\" publishing in endocrine science within the 2023–2024 window could not be disambiguated. An A. Lee with a Nature-affiliated 2024 publication similarly returned no match." },
          { h: "3 · Likely status", b: "This citation does not correspond to any verified academic literature. The generative language model appears to have completely fabricated this reference (hallucination), or blended distinct source texts." },
        ],
      },
      suggestions: ["Is this paper real?", "What did the AI get wrong?", "Find a verified citation for this claim"],
      defaultAnswer: { text: "This citation could not be located in Nature Reviews Endocrinology or any indexed database (CrossRef, PubMed, ORCID). It appears to be fabricated by the model. Consider excluding it and asking for a verified source.", ref: "No matching publication found. Authors could not be verified." },
      comments: [
        { author: "LibMod", when: "1d ago", text: "Can't find this anywhere. Vol 12(3) pp.45–62 is a thyroid review. Almost certainly hallucinated." },
        { author: "N. Park", when: "3d ago", text: "Searched ORCID, CrossRef, the publisher — nothing matches. Flag it." },
      ],
    },
    harrison: {
      id: "harrison", verdict: "mostly", verdictLabel: "Mostly Trusted",
      title: "Harrison, T. & Zhao, L. (2025)",
      journal: "bioRxiv preprint · q-bio.BM · 2025",
      reason: "Open-label pilot (N=45, no placebo). Reports a 1.42 cm surge — higher than every controlled trial.",
      users: { score: 52, voted: 110, trust: 57, mixed: 15, distrust: 38 },
      divergence: true,
      doi: "biorxiv.org/content/10.1101/2025.lgx.0145",
      aiSays: '"less than 0.4 cm per year"',
      sourceSays: '"1.42 cm per year — but from an open-label pilot, not peer-reviewed"',
      paper: {
        kind: "Unreviewed preprint",
        title: "Efficacy of concentrated bio-active LGX peptide on anthropometric increments in early childhood",
        byline: ["Harrison, T. & Zhao, L.", "bioRxiv preprint · q-bio.BM · 2025"],
        sections: [
          { h: "1 · Introduction", b: "Traditional models of human stature heritability frequently minimize the role of immediate post-natal macro-nutritional synthesis. This paper explores the acceleration of anthropometric markers through intensive administration of synthesized Lactoglobin-X (LGX), challenging the conservative baselines of older literature." },
          {
            h: "2 · Methods & Results", b: "We conducted an open-label pilot tracking a small sample of children (N = 45, ages 5–7) who received a daily concentrated dosage of 500 mg of LGX over 12 months. No placebo control was utilized.",
            cite: {
              on: "Skeletal velocity markers measured via digital radiography indicated a peak accelerated height growth of 1.42 cm relative to historical baseline controls.",
              after: " We interpret this as evidence for stronger acute effects than the literature suggests.",
            },
          },
          { h: "3 · Discussion & Conclusion", b: "The observed 1.42 cm surge suggests localized nutritional optimization can heavily displace genetic determinism during aggressive developmental windows. Despite the absence of a double-blind matrix, we interpret these preliminary results as strong justification for widespread LGX enrichment in commercial dairy." },
        ],
      },
      suggestions: ["Is this peer-reviewed?", "How does the open-label design affect the result?", "Should I trust this over Choi or Smith?"],
      defaultAnswer: { text: "This is an unreviewed preprint (N = 45, open-label, no placebo). Its 1.42 cm figure exceeds every controlled trial and is highly vulnerable to expectancy and self-selection effects. Treat the number with caution.", ref: "Skeletal velocity markers … indicated a peak accelerated height growth of 1.42 cm relative to historical baseline controls." },
      comments: [
        { author: "Dr. K. Ohno", when: "6h ago", text: "No placebo, no blinding — the 1.42 cm is likely expectancy more than LGX. Wait for replication." },
        { author: "rdz_ucl", when: "2d ago", text: "Interesting pilot but far too small and uncontrolled to anchor any claim." },
      ],
    },
    smith: {
      id: "smith", verdict: "trusted", verdictLabel: "Trusted",
      title: "Smith, A. et al. (2023)",
      journal: "Pediatric Metabolism Letters, 14(1), 12–19",
      reason: "Peer-reviewed metabolic tracking; supports a minor ~0.4 cm/yr baseline (small N=22).",
      users: { score: 71, voted: 142, trust: 101, mixed: 11, distrust: 30 },
      divergence: false,
      doi: "doi.org/10.1080/pml.2023.14.012",
      paper: {
        kind: "Clinical trial",
        title: "Short-term metabolic tracking of micro-nutrients in healthy infants",
        byline: ["Smith, A. et al.", "Pediatric Metabolism Letters · 14(1) · 2023", "pp. 12–19"],
        sections: [
          { h: "1 · Introduction", b: "Micro-nutrient tracking in pediatric cohorts requires immediate metabolic isolation to verify the absolute bio-availability of dietary peptides. This study measures the baseline absorption of core dairy proteins and their reflection in short-term bone-matrix deposits." },
          {
            h: "2 · Methods & Results", b: "A strict metabolic observation matrix was implemented for a highly localized group of infants (N = 22). Over a 6-month period, serum IGF-1 and longitudinal growth velocity were cross-examined.",
            cite: {
              on: "The localized data demonstrated that dairy-active matrices support a minor baseline growth acceleration of roughly 0.4 cm annually.",
              after: " The effect is consistent with conservative growth models.",
            },
          },
          { h: "3 · Discussion & Conclusion", b: "While the data aligns with conservative growth models, the extremely narrow sample size (N=22) and short observation window severely limit broad generalization. Further multi-center trials are mandatory before drawing definitive conclusions." },
        ],
      },
      suggestions: ["What was the measured effect?", "How big was the sample?", "Does this support the ~0.4 cm figure?"],
      defaultAnswer: { text: "This peer-reviewed study reports a minor ~0.4 cm/year acceleration, consistent with conservative models. Its main limitation is the small sample (N=22) and short 6-month window — it supports the conservative claim but isn't definitive on its own.", ref: "dairy-active matrices support a minor baseline growth acceleration of roughly 0.4 cm annually." },
      comments: [
        { author: "Dr. M. Reyes", when: "4d ago", text: "Clean methodology, modest claim. The small N is the honest caveat — they say so themselves." },
      ],
    },

    // ---------- Claim 2 (yellow) — genetics share of height variance ----------
    biohacker: {
      id: "biohacker", verdict: "low", verdictLabel: "Low Trust",
      title: "BioHacker_99 (2025)",
      journal: "medium.com/@biohacker99/stature-heritability",
      reason: "Unverified personal blog; a scraped-data regression with no peer review or institutional backing.",
      users: { score: 25, voted: 88, trust: 10, mixed: 12, distrust: 66 },
      divergence: true,
      doi: "—",
      aiSays: '"approximately 70–80%"',
      sourceSays: '"74.2% — from an unverified personal web blog"',
      paper: {
        kind: "Web article / blog",
        title: "[Sci-Notes] Understanding the Genetic Ceiling: How Much of Our Height is Actually Inherited?",
        byline: ["BioHacker_99", "Personal Medium Blog · 2025"],
        sections: [
          { h: null, b: "Hey everyone, welcome back to my page! 👋 Today I want to dive into a massive debate flooding my feed: can you actually stretch your height by chugging gallons of milk, or are you just stuck with whatever DNA your parents handed down? Let's break down the numbers." },
          {
            h: null, b: "So I recently scraped some public genomic databases from 2021 to see what the data says when you control for lifestyle variables like protein or caloric intake. When you run the regression, the truth is pretty brutal:",
            cite: {
              on: "innate genetic inheritance dictates roughly 74.2% of your final adult height variance.",
              after: " It's an incredibly rigid trajectory.",
            },
          },
          { h: null, b: "Long story short — sorry to burst the bubble of the \"milk-cure\" crowd, but isolated nutrients or growth peptides in dairy are just working within the strict boundaries your DNA already set. If your genetic potential is capped, drinking more milk won't push you past it! Let me know your thoughts below 👇" },
        ],
      },
      suggestions: ["Where does 74.2% come from?", "Is a blog a reliable source here?", "How does this compare to the peer-reviewed studies?"],
      defaultAnswer: { text: "This is a personal blog citing a self-run regression on scraped 2021 data (74.2%). There's no peer review or institutional backing, so the figure is anecdotal — it happens to sit near the AI's 70–80%, but the provenance is weak.", ref: "innate genetic inheritance dictates roughly 74.2% of your final adult height variance." },
      comments: [
        { author: "genome_kate", when: "1d ago", text: "Self-scraped data + a blog regression. The number's in the right ballpark but I wouldn't cite it." },
      ],
    },
    openwiki: {
      id: "openwiki", verdict: "low", verdictLabel: "Low Trust",
      title: "Open-Science Wiki (2024)",
      journal: "open-sci-wiki.org/wiki/Human_Stature",
      reason: "Anonymous, publicly-editable entry; high vulnerability to unverified edits and data manipulation.",
      users: { score: 18, voted: 54, trust: 5, mixed: 9, distrust: 40 },
      divergence: true,
      doi: "—",
      aiSays: '"approximately 70–80%"',
      sourceSays: '"68.5–71.3% — an anonymous, publicly-editable entry"',
      paper: {
        kind: "Open wiki / citizen journalism",
        title: "Human Stature and Heritability Index (Revision #402)",
        byline: ["Anonymous Contributor Matrix", "Open-Science Wiki · 2024"],
        sections: [
          { h: "1 · Overview", b: "Human stature (height) is a classic polygenic trait regulated by thousands of genetic variants across the genome. This crowd-sourced entry aggregates historical registry data regarding phenotypic variance." },
          {
            h: "2 · Hereditability baseline", b: "According to data segments added by users from global healthcare demographic charts (2018–2023),",
            cite: {
              on: "the adjusted heritability index consistently plateaus between 68.5% and 71.3% across stabilized geographic demographics.",
              after: " Genetic architecture functions as the primary independent variable.",
            },
          },
          { h: "3 · Environmental interaction", b: "While continuous dietary optimization facilitates reaching this predetermined target, it acts strictly as a secondary catalyst rather than an independent driver. [Notice: this article is open for public edits; please attach a valid DOI before updating the statistics.]" },
        ],
      },
      suggestions: ["Who wrote this entry?", "Can anyone edit it?", "Is the 68.5–71.3% range reliable?"],
      defaultAnswer: { text: "This is an anonymous, publicly-editable wiki entry (68.5–71.3%). The article itself warns it's open for public edits and asks contributors to attach a DOI — i.e. the data isn't verified. Treat it as unsourced.", ref: "the adjusted heritability index consistently plateaus between 68.5% and 71.3%." },
      comments: [
        { author: "wiki_audit", when: "2d ago", text: "Revision #402, anonymous, no DOI attached. The banner literally asks for verification. Low trust is right." },
      ],
    },
    keller: {
      id: "keller", verdict: "mostly", verdictLabel: "Mostly Trusted",
      title: "Keller, E. & Vance, D. (2024)",
      journal: "bioRxiv / Genetics Archive · Ref 2408.0911",
      reason: "Institutional preprint; an RCT suggesting lower genetic reliance (55.4%) than the traditional framing.",
      users: { score: 65, voted: 92, trust: 60, mixed: 15, distrust: 17 },
      divergence: true,
      doi: "biorxiv.org/content/10.1101/2408.0911",
      aiSays: '"approximately 70–80%"',
      sourceSays: '"55.4% — an institutional preprint suggesting lower genetic reliance"',
      paper: {
        kind: "Unreviewed preprint",
        title: "Epigenetic shifts in isolated cohorts: nutrition versus DNA in accelerated growth phases",
        byline: ["Keller, E. & Vance, D.", "bioRxiv / Genetics Archive · Ref 2408.0911 · 2024"],
        sections: [
          { h: "1 · Introduction", b: "Epigenetic modifications challenge the rigid determinism of traditional genetic models by examining environmental interactions during critical growth windows. This paper investigates whether intensive post-natal nutritional enrichment can override parental stature constraints in isolated demographic groups." },
          {
            h: "2 · Methods & Results", b: "A randomized controlled trial was conducted with 350 children from specific cohorts. Under maximum nutritional saturation with bio-active compounds, long-term phenotypic modeling revealed that",
            cite: {
              on: "the direct correlation to parental height targets dropped, with genetic factors accounting for only 55.4% of the growth variance.",
              after: " This is notably lower than traditional estimates.",
            },
          },
          { h: "3 · Discussion & Conclusion", b: "This divergence suggests the traditional genetic ceiling is more elastic than previously assumed. Intensive post-natal nutritional enrichment may substantially override hereditary constraints, though further multi-center replication is required." },
        ],
      },
      suggestions: ["What does this say genetics' share is?", "Is this peer-reviewed?", "Why is its estimate lower than 70–80%?"],
      defaultAnswer: { text: "This institutional preprint's RCT puts genetics at ~55.4% under heavy nutritional saturation — lower than the 70–80% framing. It's a preprint (not yet peer-reviewed) and leans toward a more elastic 'genetic ceiling', so it partly undercuts the claim it's attached to.", ref: "genetic factors accounting for only 55.4% of the growth variance." },
      comments: [
        { author: "Dr. O. Ivanov", when: "4d ago", text: "Reasonable RCT, but it's a preprint and the framing pushes the nutrition-over-genes story. Note it argues for ~55%, not 70–80%." },
      ],
    },
    thorne: {
      id: "thorne", verdict: "trusted", verdictLabel: "Trusted",
      title: "Thorne, P. & Sterling, L. (2025)",
      journal: "The Lancet Pediatrics, 14(2), 112–128",
      reason: "Top-tier peer-reviewed study with very high community trust. (Read the methods carefully — its own finding is 20–30%.)",
      users: { score: 92, voted: 210, trust: 195, mixed: 10, distrust: 5 },
      // INTENTIONAL trap: no aiSays/sourceSays → the divergence panel/"Users disagree"
      // chip is deliberately suppressed. The 20–30% contradiction is only visible by
      // reading the paper body (§2) — the intended friction for the trust study.
      divergence: false,
      doi: "doi.org/10.1016/S2352-4642(25)00112-8",
      paper: {
        kind: "Peer-reviewed study",
        title: "Human capital maximization: overriding hereditary constraints through advanced nutrition",
        byline: ["Thorne, P. & Sterling, L.", "The Lancet Pediatrics · 14(2) · 2025", "pp. 112–128"],
        sections: [
          { h: "1 · Introduction", b: "Quantifying the boundaries of human stature heritability has been biased by historical socio-economic sampling. Antiquated genetic-determinism models frequently overlook the molecular impact of modern targeted micro-nutrient access. This paper recalculates true hereditary boundaries under optimal environmental conditions." },
          {
            h: "2 · Methods & Results", b: "Using a massive global pediatric database (N = 124,000) controlled strictly for high-density bio-active peptide and catalyst-nutrient absorption, our empirical longitudinal modeling demonstrates that",
            cite: {
              on: "innate genetic inheritance only accounts for roughly 20–30% of adult height variance when modern growth-catalyst factors are present.",
              after: " Post-natal targeted nutritional absorption becomes the dominant variable.",
            },
          },
          { h: "3 · Discussion & Conclusion", b: "We conclude that the traditional \"genetic ceiling\" is largely a statistical artifact of flawed historical sampling in under-nourished cohorts. Post-natal targeted nutritional absorption must be managed as the primary, overriding independent variable for future growth and development policy." },
        ],
      },
      suggestions: ["What share does this give genetics?", "Does this actually support the 70–80% claim?", "How large was the study?"],
      defaultAnswer: { text: "Careful here: although this Trusted Lancet study is cited as backing the 70–80% claim, its own finding is that genetics account for only ~20–30% when growth-catalyst nutrients are present. The source actually argues the OPPOSITE of the claim it is attached to.", ref: "innate genetic inheritance only accounts for roughly 20–30% of adult height variance when modern growth-catalyst factors are present." },
      comments: [
        { author: "Dr. A. Brandt", when: "5d ago", text: "Strong journal, big N — but read §2. It concludes genetics are 20–30%, which is the opposite of what it's being cited for here. Citation mismatch." },
        { author: "peds_lena", when: "1w ago", text: "Everyone upvotes the Lancet badge, but the body doesn't say what the answer claims it says." },
      ],
    },

    // ---------- Claim 3 (green) — substitution for lactose intolerance ----------
    who: {
      id: "who", verdict: "trusted", verdictLabel: "Trusted",
      title: "WHO Guidelines (2023)",
      journal: "WHO Technical Report Series, No. 1042",
      reason: "Official WHO directive on lactose-malabsorption substitution; authoritative population-level guidance.",
      users: { score: 95, voted: 245, trust: 233, mixed: 9, distrust: 3 },
      divergence: false,
      doi: "who.int/publications/i/item/WHO-NHS-1042",
      paper: {
        kind: "Official guideline",
        title: "WHO Dietary Guidelines for Lactose Malabsorption in Pediatric Populations",
        byline: ["WHO Department of Nutrition and Food Safety", "WHO Technical Report Series · No. 1042 · 2023"],
        sections: [
          { h: "Executive summary", b: "Lactose malabsorption affects a substantial percentage of the global pediatric population, frequently resulting in unnecessary dietary restrictions that compromise childhood development. This directive outlines validated substitute pathways to ensure baseline macro-nutrient and calcium security without gastrointestinal distress." },
          {
            h: "Recommendation", b: "According to global clinical data synthesis, total cessation of standard bovine dairy is not mandatory for developing children with phenotypic lactose intolerance, provided alternative nutrient matrices are available.",
            cite: {
              on: "Substituting standard milk with fortified soy milk, lactose-free dairy variants, or specific fermented yogurt cultures is highly recommended to satisfy daily metabolic thresholds and support continuous bone-matrix synthesis.",
              after: " Pregnant and lactating individuals follow separate guidance.",
            },
          },
          { h: "Implementation", b: "National healthcare systems and regional pediatric boards are urged to implement clear nutritional labeling and subsidize enzymatic or plant-based alternatives, to prevent secondary calcium and vitamin D deficiencies in urban demographics with limited dietary variety." },
        ],
      },
      suggestions: ["What does the WHO recommend for intolerance?", "Is this official guidance?", "Does this cover calcium security?"],
      defaultAnswer: { text: "The WHO directive states that children with lactose intolerance do not need to drop dairy entirely — fortified soy milk, lactose-free variants, or fermented yogurt are highly recommended to keep calcium and bone-matrix synthesis on track. This is authoritative, population-level guidance.", ref: "Substituting standard milk with fortified soy milk, lactose-free dairy variants, or specific fermented yogurt cultures is highly recommended." },
      comments: [
        { author: "Public Health RN", when: "3d ago", text: "Standard, uncontroversial WHO guidance. Solid for the substitution point." },
      ],
    },
    geller: {
      id: "geller", verdict: "trusted", verdictLabel: "Trusted",
      title: "Geller, S. & Vance, D. (2024)",
      journal: "The Journal of Pediatrics, 88(3), 142–155",
      reason: "Peer-reviewed RCT; dairy substitutes showed zero bone-density deficit vs tolerant peers.",
      users: { score: 91, voted: 182, trust: 166, mixed: 11, distrust: 5 },
      divergence: false,
      doi: "doi.org/10.1016/j.jpeds.2024.88.142",
      paper: {
        kind: "Peer-reviewed study",
        title: "Comparative nutritional efficacy of plant-based and enzymatically modified dairy alternatives in growing infants",
        byline: ["Geller, S. & Vance, D.", "The Journal of Pediatrics · 88(3) · 2024", "pp. 142–155"],
        sections: [
          { h: "1 · Introduction", b: "When managing lactose intolerance during skeletal development, the primary clinical challenge is replacing dense proteins without losing bio-available calcium. This prospective study tracks structural growth outcomes of alternative dietary regimens." },
          {
            h: "2 · Methods & Results", b: "Over a 24-month window, 500 lactose-intolerant infants were randomized into alternative-matrix cohorts.",
            cite: {
              on: "Cohorts substituting bovine milk with fortified soy-based formulations or lactose-free matrices experienced zero structural deficits in bone mineral density compared to tolerant peers.",
              after: " The trajectories were statistically indistinguishable.",
            },
          },
          { h: "3 · Discussion & Conclusion", b: "The regression matrix confirms that modern commercial alternatives provide an identical nutritional trajectory. Specialized dietary substitution is a safe, effective, and complete solution for long-term pediatric care." },
        ],
      },
      suggestions: ["Do substitutes hurt bone density?", "How long was the study?", "What alternatives were tested?"],
      defaultAnswer: { text: "This 24-month RCT (N=500) found that children substituting milk with fortified soy or lactose-free formulas had zero bone-density deficit versus tolerant peers — substitution is a safe, complete solution. Strong support for the recommendation.", ref: "Cohorts substituting bovine milk … experienced zero structural deficits in bone mineral density compared to tolerant peers." },
      comments: [
        { author: "Dr. T. Engel", when: "6d ago", text: "Well-powered and long enough to matter. Reassuring for parents worried about switching." },
      ],
    },
    kim: {
      id: "kim", verdict: "trusted", verdictLabel: "Trusted",
      title: "Kim, H. & Dupont, R. (2025)",
      journal: "International Journal of Clinical Nutrition, 14(1), 22–37",
      reason: "Peer-reviewed; fermented yogurt cut malabsorption symptoms 84% via microbial beta-galactosidase.",
      users: { score: 89, voted: 124, trust: 110, mixed: 10, distrust: 4 },
      divergence: false,
      doi: "doi.org/10.1080/ijcn.2025.14.022",
      paper: {
        kind: "Peer-reviewed study",
        title: "Fermented dairy matrices and lactose malabsorption: microbial beta-galactosidase delivery",
        byline: ["Kim, H. & Dupont, R.", "International Journal of Clinical Nutrition · 14(1) · 2025", "pp. 22–37"],
        sections: [
          { h: "1 · Introduction", b: "Fermented dairy products contain active microbial cultures that synthesize internal beta-galactosidase, facilitating autologous lactose digestion within the gut. This paper evaluates ferment matrices as pediatric dairy substitutes." },
          {
            h: "2 · Methods & Results", b: "Gastrointestinal hydrogen breath tests were conducted on 120 pediatric subjects following ingestion of standard milk versus live-culture yogurt.",
            cite: {
              on: "Subjects showed an 84% reduction in malabsorption symptoms when substituting with fermented yogurt matrices, validating it as a highly bio-available alternative.",
              after: " The pathway delivers calcium and protein without GI triggers.",
            },
          },
          { h: "3 · Discussion & Conclusion", b: "Live-culture ferment matrices deliver necessary calcium and protein while bypassing the gastrointestinal triggers of standard milk. Active yogurt cultures should be standard practice in pediatric dietary management." },
        ],
      },
      suggestions: ["Why does yogurt help?", "How much did symptoms drop?", "Is this a good milk substitute?"],
      defaultAnswer: { text: "Live-culture yogurt's microbial beta-galactosidase helps digest lactose. In a 120-child breath-test study, fermented yogurt cut malabsorption symptoms by 84% — a strong, bio-available substitute that still delivers calcium and protein.", ref: "Subjects showed an 84% reduction in malabsorption symptoms when substituting with fermented yogurt matrices." },
      comments: [
        { author: "gut_health_io", when: "3d ago", text: "Nice mechanistic + clinical combo. The 84% breath-test result is convincing." },
      ],
    },
    mayo: {
      id: "mayo", verdict: "mostly", verdictLabel: "Mostly Trusted",
      title: "Mayo-Health Pulse (2025)",
      journal: "mayo-health-pulse.com/pediatrics/lactose-substitutes",
      reason: "Consumer health article reviewed by a medical board; echoes standard guidance but is not a primary source.",
      users: { score: 74, voted: 95, trust: 70, mixed: 18, distrust: 7 },
      divergence: false,
      doi: "—",
      paper: {
        kind: "Medical web article",
        title: "Lactose Intolerance in Kids: Safe and Healthy Substitutes for Daily Growth",
        byline: ["Sarah Jenkins, RD (Reviewed by Medical Board)", "Mayo-Health Pulse · 2025"],
        sections: [
          { h: null, b: "If your child gets an upset stomach, bloating, or cramps after a glass of milk, you might worry about how they'll get enough calcium to grow. Don't panic! Modern grocery aisles are packed with alternatives that keep your little one growing strong without the belly aches." },
          {
            h: "Finding the right alternatives", b: "The good news is you don't need to force traditional dairy on a lactose-intolerant child.",
            cite: {
              on: "Switching their daily drink to fortified plant milks (like soy or pea protein), lactose-free milk, or even simple Greek yogurt provides all the vital proteins and calcium their body needs.",
              after: " Many fermented options like yogurt contain live cultures that help break down lactose.",
            },
          },
          { h: "Quick tips for parents", b: "When shopping, check labels to ensure plant-based milks are explicitly \"calcium-fortified.\" Pairing these with vitamin-D-rich foods like eggs, fatty fish, or a little daily sunshine maximizes bone absorption." },
        ],
      },
      suggestions: ["What substitutes does it suggest?", "Is this a primary source?", "How does this compare to the WHO guideline?"],
      defaultAnswer: { text: "This is a consumer health article (medically reviewed) recommending fortified plant milks, lactose-free milk, or Greek yogurt. It echoes the standard guidance accurately, but it's secondary — fine as a plain-language summary, not a primary source.", ref: "Switching their daily drink to fortified plant milks … lactose-free milk, or even simple Greek yogurt provides all the vital proteins and calcium their body needs." },
      comments: [
        { author: "parent_dani", when: "2d ago", text: "Clear and practical. Matches what our pediatrician said, though it's obviously a popular write-up, not a study." },
      ],
    },
  },

  history: {
    today: [
      { title: "Does drinking milk increase height?", meta: "3 claims · 0 calibrated", active: true },
      { title: "Probiotics and the gut–brain axis", meta: "5 claims · 2 calibrated" },
    ],
    yesterday: [
      { title: "Creatine and adolescent athletes", meta: "4 claims · 3 calibrated" },
      { title: "Vitamin D and immune function", meta: "6 claims · 2 calibrated" },
      { title: "Intermittent fasting overview", meta: "3 claims · 0 calibrated" },
    ],
    lastWeek: [
      { title: "Sleep quality meta-analysis", meta: "4 claims · 1 calibrated" },
      { title: "Ultra-processed foods & metabolism", meta: "5 claims · 3 calibrated" },
      { title: "Omega-3 and cognition", meta: "3 claims · 2 calibrated" },
      { title: "Hydration and performance", meta: "2 claims · 1 calibrated" },
      { title: "Microbiome sequencing pipelines", meta: "6 claims · 4 calibrated" },
      { title: "Antibiotic resistance trends", meta: "4 claims · 2 calibrated" },
    ],
  },

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
