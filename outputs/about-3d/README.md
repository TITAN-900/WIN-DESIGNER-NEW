# About 3D implementation

The live implementation is in `index.html` (#studio), `assets/css/studio-sculpture.css`,
`assets/js/studio-sculpture.js`, and `assets/js/studio-sculpture-geometry.js`.
The site's original brand copy, shared CSS/JS, project pages and contact form are unchanged.

## Interaction

- Mouse: drag in both axes to bend, twist and fan the upper ribs. Release to settle.
- Touch: horizontal drag deforms; vertical swipes and pinch zoom remain browser gestures.
- Keyboard: focus the sculpture, hold arrow keys; release to settle. Escape/Home reset.
- Pause motion stops idle motion; direct interaction remains available.
- Reduced-motion preference disables idle and spring animation. Direct changes are immediate.
- Offscreen/hidden scenes stop rendering. WebGL failures retain the existing workshop photograph.

## Verification

`node outputs/about-3d/verify.cjs` runs real geometry checks and controller tests with mocked
browser/GPU objects. Results are saved in `verification.json`. Checks cover all eight extreme
deformations, finite normals, anchored feet, bounded input, exact restoration, cancellation,
keyboard input, pause, reduced motion, offscreen behavior, context-loss initialization and HTML scope.

Live in-app browser verification: desktop 1440 × 1000, mobile layout 390 × 844, mouse drag,
pause control and existing navigation. No browser warnings/errors observed. Mobile layout was
checked using viewport emulation, not a physical touch device. Screenshots are in this directory.

The pre-change homepage and screenshot are in `backups/about-3d-20260916-001838-116/`.
The initial Git working tree was clean and a workspace write test succeeded before editing.

## Dependencies and material

Three.js 0.170.0 is vendored locally with its MIT license in `assets/js/vendor/`.
Source: https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js
SHA-256: 08FD7545D13D2C7FB65AB691530A802DAFEFD638596501854F267D0FB13C39E7
The material reuses the existing `american-walnut.jpg.jpeg`; no generated model or external
runtime asset service is needed. Load the static site through HTTP to enable local ES modules.
