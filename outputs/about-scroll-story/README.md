# About scroll story verification

Preview from the project root:

- `http://127.0.0.1:4174/`
- `http://127.0.0.1:4174/#studio`

The About section is a scroll-driven story with a sticky local Three.js canvas. The three synchronized stages are Interior Design, Custom Cabinetry, and Renovation. The stage screenshots in this folder were captured from the HTTP preview at desktop size after a fresh page load.

`file://` is intentionally not used for verification because the browser blocks or inconsistently handles the local ES module dependency chain. The static site must be previewed through HTTP.
