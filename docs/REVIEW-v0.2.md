# Product and implementation review — v0.2

## Assessment

The starter established a useful browse-and-experiment model. The next priority was to turn isolated sliders into coherent demonstrations, make numerical consequences inspectable, and give users a way to return to a specific experiment.

| Finding | Implemented response |
| --- | --- |
| Muted green palette and small supporting text made the library feel restrained | Sunflower yellow surfaces, violet/coral data colors, ink text, larger supporting typography, rounded panels, tactile buttons |
| A curve alone did not explain model selection | Sample size, true-pattern overlay, controlled presets, actual error sweep across degrees 1–12 |
| Editing data required dragging | Labeled point selector and numeric target editor |
| Mean/median sliders did not show the mechanism behind sensitivity | Include/exclude comparison, baseline summaries, sorted values, population SD, absolute and squared deviations |
| Threshold demo hid the four outcomes and practical costs | Confusion matrix, accuracy, F1, cost controls, sample-specific threshold search |
| Threshold range could not reach no-positive/all-positive decisions | Range now includes 0 and 1; undefined precision is explicit |
| Labs could not be deep-linked or restored | Hash URLs preserve settings and edited points; optional copy-link control; history navigation |
| Reset affected unrelated simulation parameters | Separate session settings per lab; reset targets the mounted lab |
| Canvas charts lacked numerical alternatives | Plain-language plot summaries and inspectable HTML tables |
| Card action contained a nested bookmark button | Separate semantic open and bookmark buttons |
| Math, controls, and application navigation shared a large rendering block | Computation in models.js, simulation rendering in simulations.js, shell in app.js |

## Numerical integrity

- Held-out observations stay unchanged when only training sample size changes.
- Error curves refit each degree using the same current training data and regularization.
- The watched held-out set is explicitly described as part of model development; another final test set is needed.
- Outlier deviation cards use the current mean and label population SD and squared units.
- Classification uses score ≥ threshold and calculates metrics from actual counts.
- Cost search evaluates thresholds in increments of 0.01 on the displayed synthetic sample; ties select the first value. It is not a population estimate.
- URL restoration validates numeric bounds and edited point arrays before applying them.

## Validation

Ten numerical tests cover repeatability, quadratic recovery, an overfitting example, regularization, outlier sensitivity, classification boundaries, held-out consistency across sample counts, finite fits at small sample sizes, confusion metrics/cost, and summary statistics. Browser checks exercise presets, controls, reload restoration including a numeric point edit, exclusion, threshold endpoints, and cost selection.

## Remaining priorities

1. Add genuine prediction prompts and feedback: ask users to commit to an expectation before manipulating a control.
2. Add repeated-sample or cross-validation views; one split should not become the mental model for generalization.
3. Split individual experiments behind a registry before growing the library substantially.
4. Build embedding geometry as the next complete modern-AI lab; attention and RAG remain labeled previews.
5. Improve learning paths with a meaningful sequence and optional local progress.
6. Perform a dedicated mobile, screen-reader, and contrast audit. Tables and keyboard controls improve access but are not a complete accessibility certification.
7. Simplify the inherited stylesheet into design tokens and component rules; v0.2 retains an explicit theme override layer.
