# CampusHR V2: HOD, platform adaptations and design handoff

Prompts 4–8, 23 October 2026. This is design work, not a change to the mobile runtime. Start at index.html, or serve design/mobile-v2 on localhost and open /experience/.

- hod/: 8 interactive HOD views, screenshots, overview and HOD_SCREENS.pdf.
- ios/: 12 separate iOS review views, screenshots, overview and IOS_SCREENS.pdf.
- android/: 12 separate Android review views, screenshots, overview and ANDROID_SCREENS.pdf.
- handoff/: interaction specification, per-screen contracts, inventory, canonical token snapshot, platform notes, icon map, QA and machine-readable check results. HANDOFF.html collects the readable documents.
- Original faculty screens and canonical V2 files are read-only inputs. Their SHA-256 baseline is recorded in handoff/frozen-files.json.

## Build and check

From the repository root:

```sh
node design/mobile-v2/experience/build.mjs
python3 -m http.server 4183 --bind 127.0.0.1 --directory design/mobile-v2
```

In another terminal:

```sh
node design/mobile-v2/validate.mjs
node design/mobile-v2/experience/check.mjs
```

The check uses the existing bundled Playwright runtime and installed Google Chrome, no package installation. PREVIEW_URL may override http://127.0.0.1:4183. It verifies 32 exported views across three preview sizes, targets, keyboard focus, meaningful HOD flows, input validation, disabled actions, long/scaled text and unchanged frozen inputs; it exports @2x PNGs and reports exact limitations. No credentials, API requests, real notifications or persisted sample writes. Native-device claims cannot be inferred from a browser check.

build.mjs reuses the frozen faculty source with asserted integration points and a small HOD extension. derived-app.js is generated once and shared by the three previews. There is no copy of the faculty CSS or token scales to drift. New CSS is limited to HOD composition and the two platform specimens. A moved integration point fails the build rather than silently producing incorrect views.

SF Symbols review assets can be regenerated on this Mac with:

```sh
swift design/mobile-v2/experience/export-symbols.swift "$PWD/design/mobile-v2/experience"
```

Native iOS must use Image(systemName:) with an availability fallback; review PNGs are not runtime assets. Android continues using the existing licensed Material Symbols font. Font/image licenses and institutional identity provenance remain in ../faculty-screens/assets/. The institutional asset supplied by the repository carries the JGI mark; an official JCET crest replacement requires institution-provided approved artwork.

## Authority and sample boundaries

HOD recommendation is not final leave approval. The supplied Approve & Find Cover design CTA carries an explicit authority qualifier; production copy and behavior must bind to the actual role. Smart Coverage is a separate approved-leave sample. Scores and workload thresholds are sample data, not a new algorithm or policy. All previews disclose simulated outcomes outside the product frame. SSO/support/location/lunch tracking are not configured by these artifacts.

No deployment, commit, push, database operation or modification of unrelated uncommitted application code is part of this task.
