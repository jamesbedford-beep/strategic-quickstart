# Strategic Quickstart

A single-page tool that generates a starting set of project management documents.
Set up the project, tick the documents you need, adjust the phases, hit export.
A zip lands on your computer with a pre-filled workplan, Gantt chart, RACI matrix,
charter, risk register, and more.

**Live:** https://jamesbedford-beep.github.io/strategic-quickstart/

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
| Decision log | .xlsx / .csv | What was decided, by whom, which options were rejected, reversibility. Evidence Action calls this a prolog. |
| Status report | .md / .html | Reusable update: status, progress, blockers that each carry a named ask, next period. |
| Kickoff agenda | .md / .html | Timed 90 minute agenda, pre-reads, and the decisions the meeting has to produce. |
| Exec one-pager | .md / .html | Standing brief for a sponsor or funder. |

Every export also carries a `README` describing the files and a `_config.json` holding
the exact settings, including a link that restores them in the tool.

## Templates

`Strategic initiative`, `Scoping / diagnostic`, `Pilot / field launch`,
`Partnership / MOU`, `Hiring / team build`, `Accelerator stage-gate`, and a blank
skeleton. Each ships phases, tasks, milestones, and a risk list.

The Accelerator template mirrors Evidence Action's new-program development stage-gate:
Sourcing, Screening, Rapid Review, Deep Dive (split 3a/3b internally), Scoping, Design
Testing, Launch, Test at Scale. Stage weights follow the documented timelines, each
stage ends in a gating call, and its status vocabulary uses the four gating outcomes
(advance, deprioritize, hold, defer). Per-stage tasks are the outputs that guidance
names: evidence review, BOTEC and expanded CEA, project scorecard, prolog, decision memo.

All of it is editable before export: rename phases, set each one's **length in days**, and
edit tasks as plain text (one per line, `*` prefix makes a milestone). Phase lengths are the
editable number because that is how people think about them; the share of the project each
one takes is shown alongside as a derived figure rather than the thing you type. Presets
weight their phases unevenly on purpose, since a deep dive really is longer than a
screening, and that shape survives whatever window you pick.

## The form only asks what your selection needs

Each document declares which inputs it uses. Tick only the decision log and the form
reduces to a project name, an owner, and a team. Tick the Gantt and the start date,
horizon, and column granularity appear. Tick a narrative document and the document
format select appears. Nothing stays on screen that has no effect on your output.

## Conventions

Terminology follows what Evidence Action documents actually use rather than a generic
default:

- **Owner**, not DRI. DRI is a 2AI convention and does not appear in EvAc documents.
- Status vocabulary is `Not Started / In Progress / On hold / Completed`, not a
  red-amber-green scale, which the trackers do not use.
- Filenames can be `YYYYMMDD File Name`, matching the EvAc filing convention, or
  ordered numeric prefixes.

## Team autocomplete

`assets/people.js` holds an optional roster. Typing `Gra` suggests Grace Hultquist and
fills in her initials and team. Names not on the roster still get initials derived
automatically, and the team is left blank rather than guessed.

It holds names and teams only. Job titles are deliberately absent: they go stale
quickly, and this is a public repository. Where someone works is enough to tell two
similar names apart in a picker, which is all the field is for.

The file is entirely optional: empty the array, delete it, or drop its `<script>` tag
and everything else works unchanged. Swap in your own team by replacing the entries.

## Start here: the guided route

The homepage is a conversation, not a form. Everyone lands there; the **Custom build**
tab is always available for people who already know what they want, and `#build`
deep-links straight to it.

It runs in two halves.

**Which documents do you need.** Six questions in plain language, opening with "in your
own words, what are you trying to get done?". It then recommends at most four documents
and shows its reasoning side by side: why it suggested each one, quoting the answers that
drove it, against what that document will do for you. Nothing is a dead end, so every
recommendation can be unticked and every document that was not suggested can be added.

**What goes inside them.** Knowing you need a Gantt is only half the job. The second half
proposes a shape and asks whether it is right:

> You said this quarter, working out whether to do something. Over those 91 days I propose
> 5 stages of about 18 days each, each ending in a milestone, so something lands roughly
> every 3 weeks.

It arrives as a **draggable timeline**. Each stage is a segment; drag the marker between two
of them and they trade days while the finish date holds still, or drag the last marker to
move the finish date itself. Every marker is a real button, so arrow keys move it too
(shift for a week at a time), because a control you can only reach with a mouse is a control
some people cannot reach at all. Stage names and exact day counts sit underneath with the
dates each one lands on, and the start date defaults to a couple of weeks out, since almost
nothing really starts tomorrow.

Later stages ask what to plan around (holidays, fieldwork, someone on leave), who is
involved **and what you need from each of them**, what is in and deliberately out of scope,
what worries you most, and how often you will update people. Every stage says which
document it feeds and what it makes explicit there, and the ones where a placeholder is
genuinely fine carry a **Skip** button. Only the stages your selection needs are asked, so
someone who wanted a decision log is never asked about scope.

Dates to plan around are recorded on the plan and in the charter, and the charter says
plainly that the dates were not shifted to avoid them. Automatically routing a timeline
around holidays needs structured dates and is a bigger feature; pretending to do it would
be worse than noting it.

All of it lands in the documents: scope lists become the charter's in and out of scope
sections, worries become the first rows of the risk register above the generic ones, names
become RACI columns while what you need from each person becomes their decision rights in
the charter and what they care about in the stakeholder map, the cadence sets the reporting
period, and the stages become the phases of the plan and Gantt with the lengths you set.

Deliberately not an LLM. This page is static and public, so there is nowhere to keep an
API key, and a scripted flow is better here anyway: it works offline, answers instantly,
costs nothing, and can say exactly why it suggested something. Free-form chat would need a
backend.

The questions, scoring weights, and shaping stages are plain data at the top of
`assets/guide.js`, which is where to go when the wording turns out to be wrong.

### Interface notes

Two patterns are adapted from the primitives published at
[beautifului.dev](https://www.beautifului.dev/), rebuilt against this project's own
tokens rather than copied:

- **The Orbit loader** shown between screens: a 3 by 3 pixel grid where the lit cell
  travels clockwise around the eight outer squares while the centre stays dim, beside a
  shimmering label and a monospace elapsed timer. The timer is the honest part, since it
  shows exactly how long the pause is holding things up.
- **The approval card** for every question with fixed choices: the question becomes the
  card's header and each option is a selectable row, circles for pick-one and rounded
  squares for pick-many, with a live count. Free-text questions keep a plain textarea,
  because a card of radio rows cannot ask an open question.

## The last screen

The wizard used to end by dropping people into the builder, which left them wondering what
had happened. It now finishes on its own screen: the documents it made, with a format
picker and one large Export button, and underneath, a box for saying what they would change.

That box changes the documents. Type "add a decision log and drop the Gantt, add a risk that
approval slips, running a pilot is out of scope, make it 12 weeks" and all four happen.

There is no model doing the interpreting, so `assets/feedback.js` reads a defined set of
intents with plain regular expressions and, crucially, **shows what it understood before
applying anything**. Each understood instruction is a tickable line, things that were already
true are listed as such, and anything it cannot act on is shown as not understood rather than
silently dropped. A parser that quietly ignores half a sentence is worse than one that admits
the gap.

It handles: adding or dropping a document, adding a risk, adding to either scope list,
adding a person and what is needed from them, the update cadence, adding a stage, the overall
length, the start date, dates to plan around, and renaming. Anything else is recorded for the
register and left to the builder, which is linked right there.

## Changelog

A third tab records each release: what shipped, and separately what feedback came back
on it and from whom. It is data in `assets/changelog.js`, so adding a release means adding
one object.

Feedback is only listed where it was actually given. An entry marked `awaiting: true`
renders as an open slot rather than a summary of something nobody said, which is the point:
the changelog should show where feedback is still missing instead of quietly implying it
was collected.

## Team register

`assets/usage-config.js` can point at a Google Form. Once it has a URL, every export is
recorded: the project title, the template, which documents, the timeline, and anything typed
into "what would you change".

It never records document content. Nothing typed into a charter, scope list, risk register
or plan leaves the browser.

Because it is automatic, the homepage says so **before anyone starts**, in the header rather
than buried in a settings page. That visibility is the condition that makes automatic
logging fair, so if you change the recording, change the notice with it.

Until the form URL is set, nothing is sent and the notice stays hidden, so a fork of this
repo logs nothing.

## Horizon

Pick 2 weeks through 12 months, or a custom number of days. The phase weights spread
across whatever window you choose and the Gantt granularity follows: daily columns for
short horizons, weekly for a few months, monthly beyond that. Granularity can also be
forced. Task dates snap to weekdays. If you ask for more tasks than there are days, the
tool says so rather than quietly producing an impossible plan.

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
  people.js      optional roster for the team autocomplete
  guide.js       the Start here wizard: questions, scoring, shaping stages
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
`templates.js` (including which inputs it `uses`), and a line in the tables above.
Adding a template means one entry in `PRESETS` in `templates.js`.

## License

MIT. See [LICENSE](LICENSE).
