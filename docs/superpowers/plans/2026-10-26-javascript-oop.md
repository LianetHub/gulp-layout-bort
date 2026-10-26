# JavaScript class refactoring

Goal: move authored browser behavior to component classes without changing functionality.

Scope: src/js/app.js and test entry adapters. Keep the readable classic script, existing HTML/CSS, vendor libraries, selectors, events, guards, timing and startup order. Preserve the current working tree, including generated docs. No dependency or build pipeline changes.

- [x] Inspect current components and establish baseline (55 Node tests pass).
- [x] Move shared helpers into static services; keep shared caches owned by those services.
- [x] Move component state and named handlers into instance fields and methods. Bind callbacks once; preserve Swiper callback context.
- [x] Give repeated components their own instances and scoped initializers.
- [x] Move startup to Application; adapt test-only exports to class entry points.
- [x] Run formatter, Node tests, Gulp JS task, browser regressions, final format check and review.

Validation focus: repeated initialization, missing DOM/vendor libraries, asynchronous stale results, callback context, multiple component instances, reduced motion, and existing user flows. Existing behavioral tests are the regression contract; add coverage for instance isolation where missing.

Results: 57 Node tests pass; format:check and Gulp js pass. Browser suite: 40 of 41 pass. The remaining checkout summary positioning assertion expects 0px but gets 16px; an isolated browser run with the original JavaScript reproduces 16px. Preserve this existing layout under the behavior-preservation requirement. All 24 pages pass startup checks at 375px and 1440px and tolerate unavailable vendor libraries. Independent review found no behavioral regressions; its header handler ownership finding was addressed by bound instance methods. Existing class ASTs are unchanged apart from qualified helper calls; all original literal values are preserved.
