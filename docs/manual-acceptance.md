# Manual acceptance record

Automated tests are kept separate from human feedback. This file is a repeatable check sheet; unchecked items must not be described as completed.

## Automated equivalents provided

- [x] Four VS Code theme palettes with axe WCAG A/AA checks.
- [x] Forced-colors emulation and a 720×480 CSS viewport equivalent to viewing a 1440×960 area at 200% zoom.
- [x] Keyboard selection, source navigation, branch controls, focus return after closing details and ARIA separator values.
- [x] UTF-8 BOM, UTF-16 LE/BE BOM documents and source-offset navigation in real VS Code.
- [x] Non-file read-only FileSystemProvider URI, graph search and source navigation.
- [x] Five fresh standard preview panels for an indicative command-to-interactive p95.
- [x] Real installed VSIX exercised through an independent test driver; the workspace extension is not loaded as the target.

## Human/device checks

- [ ] VoiceOver on macOS or NVDA on Windows: Tab through toolbar, graph and inspector. Confirm element/attribute names, button purposes and current selection are announced.
- [ ] Close details with the keyboard and verify focus returns to the selected graph node; navigate backward and forward.
- [ ] Enable real OS high contrast/forced colors and 200% application zoom. Confirm edges, selection and all actions remain distinguishable.
- [ ] Open representative non-confidential XML from daily work and report confusing behavior or missing context.
- [ ] On lower-spec hardware, run `npm run benchmark:ui` and `npm run test:extension`; compare the recorded hardware/scope, not just the numbers.
- [ ] If using Remote SSH or Dev Containers, open a document on the remote host, search, navigate to source and edit it. Virtual-URI tests do not simulate network latency or a remote installation.

For each real user/device check, record OS, VS Code/extension version, assistive technology (if used), date and observed result. Synthetic browser checks are not user beta feedback or a screen-reader audit.
