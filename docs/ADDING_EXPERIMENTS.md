# Adding an experiment

Start with the relationship the user should discover. Write a question, a prediction prompt, an observable outcome, and a limitation before writing animation code.

## Concept metadata

Add an entry to `src/catalog.js` with a unique `id`, title, category, type (`CONCEPT`, `MECHANISM`, or `SYSTEM`), description, exploration time, `live` flag, and visual color. Use an existing category or update the library filters and topic navigation in `index.html`.

Set `live: false` while only a concept preview exists. Update `mini()` and `previewHTML()` in `src/app.js` to provide an appropriate preview.

## Live experiment

1. Add pure calculations to `src/models.js`; keep DOM and canvas code out of that file.
2. Add the introductory question in `src/app.js`, and controls, plot behavior, and feedback to the corresponding `src/simulations.js` mounting, controls, and drawing functions. The prototype currently uses explicit per-ID branches. Extract a registry of experiment components as the library grows.
3. Add the four explanation layers in `src/content.js`: intuition, math, practical use, and connections.
4. State whether the display is a real calculation, projection, or schematic. Include a failure case and identify material simplifications.
5. Check meaningful numerical behavior with `npm test`. Verify keyboard controls, narrow screens, resets, and links in a browser.
6. Set `live: true` only after the complete interaction works. Update homepage counts, paths, and README status if needed.

## Design constraints

Use linked controls, plots, and metrics. Avoid motion that adds no explanatory value. Keep controls labeled, preserve visible keyboard focus, and do not make essential learning depend on dragging alone. Use seeded data when repeatability helps comparison. Never embed API keys in this static application.
