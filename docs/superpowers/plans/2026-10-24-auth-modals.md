# Authentication modal flow

**Goal:** Implement the six supplied Figma states in the existing site.
**Architecture:** Reuse Fancybox, shared form validation and phone formatting. One registration form retains values across code states. No API requests or simulated successful authentication.
**Stack:** Gulp includes, SCSS, existing native JavaScript controllers.
**Spec:** User-approved flow in this conversation, 2026-10-24.

- [x] Replace legacy sign-in/recovery markup with an included auth dialog; keep callback markup.
- [x] Add scoped mobile-first auth styles and shared heading typography.
- [x] Connect header, email/phone tabs, recovery, registration, password visibility and code countdowns.
- [x] Validate required values, agreement, four-digit code and phone changes; never store passwords.
- [x] Run node tests, compile HTML/SCSS/JS without reset, and exercise dialogs in the browser.

Review focus: opening repeatedly, empty/invalid fields, phone edits after requesting code, switching away during countdown, keyboard close/focus restoration, 360px layout. API actions show an explicit unavailable message; SMS countdown is a local interface preview.

Validation: 11 Node tests and 34 browser assertions pass. HTML/SCSS/JS compiled without cleaning docs. Browser tests cover both 1440px and 360px iframes. Fixed focus restoration by passing the opener to Fancybox as triggerEl. Visual QA at 360px uses stacked phone/code controls. Build retains existing Browserslist and autoprefixer warnings.
