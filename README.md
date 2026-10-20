# AI Intuition Lab

**Build intuition for AI, one experiment at a time.**

An interactive field guide to statistics, machine learning, and AI systems. Change an input, inspect the result, and connect the mechanism to a practical decision.

## Run locally

Requires Node.js 20 or later. No package installation or API keys are needed.

```sh
git clone https://github.com/CLIUKELLY/ai-intuition-lab.git
cd ai-intuition-lab
npm start
```

Open **http://localhost:3000**. Use an HTTP server rather than opening `index.html` directly: the app uses JavaScript modules.

```sh
npm run check
npm test
```

## Explore

| Experiment | Status | What you can do |
| --- | --- | --- |
| The overfitting trap | Live | Adjust polynomial degree, noise, and regularization; drag training points; compare training and test MSE |
| One point changes everything | Live | Move an outlier and compare the mean and median |
| Where do you draw the line? | Live | Change a classification threshold and inspect precision, recall, and error counts |
| Meaning has a direction | Preview | Planned embedding geometry experiment |
| Paying attention, token by token | Preview | Planned attention experiment |
| From a question to a grounded answer | Preview | Planned RAG pipeline experiment |

The library includes search, category filters, learning-path entry points, and device-local bookmarks. Each lab has intuition, math, practical context, and connections. All data is synthetic. This is a teaching prototype; simplified numerical examples do not replace rigorous model evaluation.

## Project structure

- `index.html` — application shell and library landing page
- `src/app.js` — navigation, canvas rendering, controls, and browser state
- `src/catalog.js` — searchable concept metadata
- `src/content.js` — educational explanations for the live labs
- `src/models.js` — seeded datasets and pure numerical functions
- `src/style.css` — responsive visual design
- `scripts/serve.js` — dependency-free local development server
- `tests/models.test.js` — numerical behavior checks
- `docs/ADDING_EXPERIMENTS.md` — authoring guide
- `docs/ROADMAP.md` — next product and engineering steps

## Deployment

This is a static site with relative asset URLs and no build step. To use GitHub Pages, open repository **Settings → Pages**, select **Deploy from a branch**, then select **main / (root)** and save. Pages is not enabled by this initial source import.

The application runs without external services. Google Fonts is optional; system fonts are used when it is unavailable. Bookmarks are stored in this browser's local storage and are not synced.

## Learning approach

Predict → manipulate → observe → explain → apply.

Keep the interaction focused on one useful relationship. Label approximations, distinguish measured model outputs from illustrations, and include a realistic failure case. See the authoring guide before adding a module.

## Current limits

- Three working experiments; remaining concepts are clearly labeled previews.
- Learning paths are navigation suggestions, not tracked course progress.
- No accounts, shared experiment URLs, backend, or LLM tutor yet.
- The interface still uses explicit rendering branches; individual experiment components are a planned next step.
- No open-source license has been selected yet.
