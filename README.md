# Initiative Kit

A single-page tool that generates a starting set of project management documents.
Pick a template, set the owners and the timeline, tick what you need, hit export.
A zip lands on your computer with a pre-filled workplan, Gantt chart, RACI matrix,
charter, risk register, and more.

**Live:** enable GitHub Pages on this repo (Settings, Pages, deploy from `main` / root).

## Why it exists

Standing up a new strategic initiative means rebuilding the same five documents from
scratch, badly, under time pressure. This produces them in about a minute, consistent
in structure, so the effort goes into the content rather than the scaffolding.

## What it makes

| Document | Format | Notes |
| --- | --- | --- |
| Project plan | .xlsx / .csv | Phase, deliverable, owner, start, due, days, status, notes. Frozen panes, autofilter, status and owner dropdowns, a days formula. |
| Gantt chart | .xlsx / .csv | Timeline grid with colored bars, scaled to the horizon: daily, weekly, or monthly columns. Weekends shaded, current period highlighted, phase envelopes above task bars. |
| RACI matrix | .xlsx / .csv | Delivery phases plus eight standing decisions against your team. R/A/C/I dropdowns and a formula flagging any row without exactly one A. |
| Project charter | .md / .html | Objective, scope and explicit non-scope, success metrics, decision rights, milestones, budget, risks, open questions, stop conditions. |
| Risk register | .xlsx / .csv | Seeded with risks typical for the chosen template. Likelihood by impact scoring with a heat color scale. |
| Stakeholder map | .xlsx / .csv | Influence by interest, engagement approach derived by formula, relationship owner and cadence. |
| Decision log | .xlsx / .csv | Numbered rows: what was decided, by whom, options rejected, reversibility. |
| Status report | .md / .html | Reusable update: RAG with defined thresholds, progress, blockers that each carry a named ask, next period. |
| Kickoff agenda | .md / .html | Timed 90 minute agenda, pre-reads, and the decisions the meeting has to produce. |
| Exec one-pager | .md / .html | Standing brief for a sponsor or funder. |

Every export also carries a `README` describing the files and a `_config.json` holding
the exact settings, including a link that restores them in the tool.

## Templates

`Strategic initiative`, `Scoping / diagnostic`, `Pilot / field launch`,
`Partnership / MOU`, `Hiring / team build`, and a blank skeleton. Each ships phases,
tasks, milestones, and a risk list. All of it is editable before export: rename phases,
change the weights that set how much of the horizon each phase takes, and edit tasks
as plain text (one per line, `*` prefix makes a milestone).

## Horizon

Pick 2 weeks through 12 months, or a custom number of days. The phase weights spread
across whatever window you choose and the Gantt granularity follows: daily columns for
short horizons, weekly for a few months, monthly beyond that. Granularity can also be
forced. Task dates snap to weekdays.

## What it deliberately does not do

- **It does not invent your content.** Placeholders appear in `[square brackets]`;
  blank cells are blank on purpose. Nothing is filled in that you did not supply.
- **It does not pretend the dates are considered.** Phases are spread evenly across the
  horizon by weight. That is arithmetic, not judgment. Walk the dates with the team and
  change what is wrong.
- **It does not phone home.** No analytics, no fonts, no CDN, no network calls of any
  kind. Nothing you type leaves the page. It works offline and from `file://`.

## Design notes

Zero dependencies, no build step. Plain HTML, CSS, and ES5-compatible JavaScript
loaded as classic scripts, which is why it also runs from a local file.

Real `.xlsx` files are written from scratch. An `.xlsx` is a ZIP of XML parts, so
`assets/zip.js` is a minimal store-method ZIP writer (about 90 lines, CRC32 plus
headers) and `assets/sheet.js` turns a sheet model into SpreadsheetML with styles,
frozen panes, autofilter, list validation, formulas, and a conditional color scale.
That avoids shipping a spreadsheet library, keeps the page a few tens of KB, and means
no third-party code sits between you and your data.

```
index.html
assets/
  zip.js         minimal ZIP writer (store method), used for .xlsx and for the bundle
  sheet.js       sheet model -> .xlsx or .csv
  plan.js        date math, phase scheduling, Gantt period columns
  templates.js   presets, risk libraries, document catalog
  render.js      block model -> Markdown / HTML, and the preview renderers
  build.js       one builder per document
  app.js         state, form, live preview, export
```

State persists in `localStorage`, and **Share setup** produces a URL that restores an
exact configuration for someone else.

## Local development

No toolchain needed. Any static server works:

```bash
python -m http.server 8791
```

Opening `index.html` directly in a browser also works.

## Contributing

Adding a document means: a builder in `build.js`, an entry in the `DOCS` array in
`templates.js`, and a line in the tables above. Adding a template means one entry in
`PRESETS` in `templates.js`.

## License

MIT. See [LICENSE](LICENSE).
