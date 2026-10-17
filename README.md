# Absolutely Nothing University (ANU · 绝对虚无大学)

> *Nihil Agere, Omnia Esse* — 什么都不做，即是一切。

Official satirical website of **Absolutely Nothing University (ANU)**, founded in ∞ B.C., proudly ranked `NaN` across all global university rankings.

- **Production URL**: [https://freeze.edu.kg](https://freeze.edu.kg)
- **Architecture**: Pure static HTML5 + CSS3 + Modular Vanilla JavaScript (Zero backend dependencies, 100% GitHub Pages compatible).

## Core Portals & Upgraded Features

1. **Office of the Provost & 404th Chancellor's Gazette (`#overview`)**:
   - Real-time campus inactivity telemetry ledger.
   - Full dossier & daily slacking schedule of **Prof. Sir Albert Slackingstein**.
   - Campus announcements & Chancellor's decrees loaded from [`data/announcements.json`](data/announcements.json) with category filtering and random decree drawer.
2. **3-Second Instant Admission & Honorary Ph.D. Generator (`#admissions`)**:
   - 10 absurd degrees, 12 majors, and 8 randomizable Latin/academic honor titles.
   - 3 distinct certificate templates (*Oxford Royal Classic*, *Gilded Vellum Parchment*, *Minimalist Void Edition*).
   - Supports Chinese, English, and Bilingual certificate modes with 2400×1680 High-DPI PNG export and explicit fictional/non-accredited compliance notice.
3. **Academic Catalog, Full Syllabi & Mock Exam (`#academics`)**:
   - 8 flagship courses across 4 faculties with complete 12-week syllabi, instructor profiles, and grading policies.
   - Local in-browser Slacking Proficiency Mock Exam that generates humorous transcripts.
4. **《Nature: Nothing》 Blank Paper Archive & Submission Studio (`#research`)**:
   - Zero-word manuscripts with multi-referee peer review panels and fictional `VOID-ID` identifiers.
   - 18 random research topics, 7 fictional journals, 6 blank methodologies, and High-DPI Acceptance Letter PNG export.
5. **Tenured Absentee Faculty & 0-Second Auto-Reply Simulator (`#faculty`)**:
   - Faculty dossiers and context-aware perfunctory email auto-responder.
6. **Schrödinger Cafeteria & Student Slacking Societies (`#campus`)**:
   - 10 categorized quantum dishes + 3-course random meal combo generator.
   - 5 student clubs with `localStorage` membership persistence and hidden Easter eggs (5x Crest Click & Konami Code).
7. **24/7 Simulated Campus Observation Feeds (`#webcams`)**:
   - 4 SVG vector simulated monitors with explicit simulation notices and Night-Vision toggle.

## Local Preview & Automated Tests

Run any static HTTP server in the root directory:

```bash
python3 -m http.server 8088
```

Run the automated verification test suite:

```bash
node tests/run-tests.mjs
```
