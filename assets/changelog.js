/* What changed, when, and who asked for it.

   Kept as data so the Changelog tab stays honest: each release records what
   shipped, and separately what feedback came back on it and from whom. Feedback
   is only listed where it was actually given. An entry marked `awaiting: true`
   is a slot deliberately left open, not a summary of something nobody said.

   To add a release, add an object at the top of RELEASES. Dates are the real
   commit dates from the repository. */
(function (SIK) {
  'use strict';

  SIK.changelog = [
    {
      v: 'v2',
      date: '2026-08-18',
      title: 'Guided route becomes the front door',
      state: 'current',
      summary: 'The tool stopped assuming you already know what a RACI is. A guided ' +
        'conversation now works out which documents you need and then shapes what goes ' +
        'inside them.',
      shipped: [
        'A Start here wizard: six questions in plain language, opening with "in your own words, what are you trying to get done?"',
        'It recommends at most four documents and shows its working, with the answers that drove each pick quoted back beside what that document will do for you',
        'Every recommendation can be unticked, and anything it did not suggest can be added, because the scoring is a heuristic and will sometimes be wrong',
        'A second half that shapes the contents: it proposes a stage structure with real dates and asks whether it looks right, then asks what is in and out of scope, who is involved, what worries you, and how often you will update people',
        'Those answers reach the documents rather than stopping at the form: scope lists fill the charter, worries open the risk register, names become RACI columns, stage names become the phases of the plan and Gantt',
        'Start here is now the homepage for everyone, with the builder still available under Custom build',
        'Deliberate pauses between screens with an orbit loader and an elapsed timer, so a recommendation reads as considered rather than snapped out',
        'Team notes removed: it was not being used'
      ],
      feedback: [
        { who: 'James', said: 'Phases and tasks was hard to understand. Tasks were hidden behind a scrollbar, the weight was an unlabelled number, and the milestone convention was explained nowhere near where you use it.' },
        { who: 'James', said: 'Ask an intro question about the project first. Around 60% of staff would find the full builder overwhelming, but a tool that asks what you are trying to get done and then suggests what you need should lift uptake.' },
        { who: 'James', said: 'Go further than picking the right documents. Help people get the right shape too: propose a Gantt structure and ask whether it works, help with what is in and out of scope.' },
        { who: 'James', said: 'The suggested titles were not intuitive. "Distribute reading glasses in ethiopia in" should read more like "Ethiopian Reading Glasses Distribution Decision".' }
      ]
    },
    {
      v: 'v1',
      date: '2026-07-31',
      title: 'The document builder',
      summary: 'A form that turns a project name, an owner and a timeline into a set of ' +
        'pre-filled project documents, with no dependencies and nothing leaving the browser.',
      shipped: [
        'Ten documents: project plan, Gantt chart, RACI matrix, charter, risk register, stakeholder map, decision log, status report, kickoff agenda, exec one-pager',
        'Real .xlsx files written from scratch, with frozen panes, autofilter, dropdowns, formulas and a conditional colour scale, and no spreadsheet library',
        'Seven templates including the Evidence Action Accelerator stage-gate',
        'Evidence Action conventions: Owner rather than DRI, their status vocabulary, optional YYYYMMDD filenames',
        'Team autocomplete from a roster of names and teams',
        'A form that hides any input the current document selection does not need',
        'Live preview of every document, and export as one zip'
      ],
      feedback: [
        { who: 'Sarah', awaiting: true },
        { who: 'James', said: 'Retarget it from 2AI to Evidence Action, and drop the terminology that does not belong: DRI is a 2AI convention and appears nowhere in EvAc documents.' },
        { who: 'James', said: 'Documents should be the first step, and the questions below should depend on what has been selected. Selecting only the exec one-pager should not demand the whole phase editor.' }
      ]
    }
  ];
})(window.SIK = window.SIK || {});
