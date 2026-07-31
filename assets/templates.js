/* Starting content: phase/task presets, risk libraries, standing decision rows.
   These are generic project management scaffolds, not evidence claims. Nothing
   here asserts a fact about the world; edit freely once exported.

   Task list convention: '*' prefix marks a milestone (zero duration, sits at
   the end of its phase). */
(function (SIK) {
  'use strict';

  function P(name, weight, tasks) { return { name: name, weight: weight, tasks: tasks }; }

  var PRESETS = {
    'strategic-initiative': {
      label: 'Strategic initiative',
      hint: 'General purpose: scope, decide, set up, launch, learn.',
      phases: [
        P('Scoping and diagnosis', 20, [
          'Write a one page problem statement',
          'Map what is already known and what has been tried',
          'Name the decision maker and the decision to be made',
          'Interview 3 to 5 internal stakeholders',
          'Size the opportunity (back of envelope)',
          'Agree success metrics and guardrails',
          '* Scope signed off'
        ]),
        P('Design and decision', 20, [
          'Draft 2 to 3 options with cost, reach, and risk',
          'Cost each option (budget and FTE)',
          'Have a skeptic pressure test the assumptions',
          'Write the decision memo',
          'Review with sponsor',
          '* Go / no go decision recorded'
        ]),
        P('Set-up', 20, [
          'Confirm the owner (DRI) and core team',
          'Secure budget approval',
          'Stand up workplan, RACI, and risk register',
          'Confirm partner, vendor, or supplier arrangements',
          'Set the reporting cadence and the single status source',
          'Run the kickoff',
          '* Kickoff complete'
        ]),
        P('Delivery', 20, [
          'Build the first delivery increment',
          'Internal quality check',
          'Run a readiness review against the go criteria',
          'Launch',
          'Watch early indicators daily for the first two weeks',
          'Fix the top 3 issues',
          '* Live'
        ]),
        P('Review and handover', 20, [
          'Measure results against the success metrics',
          'Write the retro: what we would do differently',
          'Decide continue, adjust, or stop',
          'Hand over to a steady state owner',
          '* Retro and handover complete'
        ])
      ],
      risks: [
        ['Scope grows past what the team can deliver in the window', 'Delivery'],
        ['No single accountable owner, so decisions stall', 'People'],
        ['Success metric is not measurable with data we can actually get', 'Delivery'],
        ['Budget approval arrives later than the plan assumes', 'Funding'],
        ['Key person is pulled onto another priority', 'People'],
        ['Sponsor and team disagree on what "done" means', 'People']
      ]
    },

    'scoping-diagnostic': {
      label: 'Scoping / diagnostic',
      hint: 'Answer a question well enough to make a decision.',
      phases: [
        P('Frame the question', 15, [
          'Write the single question we must answer',
          'Define what a good enough answer looks like',
          'Agree who decides, and by when',
          'Break it into 4 to 6 sub questions'
        ]),
        P('Desk research', 25, [
          'Review published evidence and prior evaluations',
          'Find comparable programs and benchmarks',
          'Pull cost and reach data',
          'List the gaps desk research cannot close'
        ]),
        P('Primary data and interviews', 25, [
          'Build the interview list and get introductions',
          'Draft the interview guide',
          'Run 8 to 12 interviews',
          'Site or field visit',
          'Synthesize notes weekly, not at the end'
        ]),
        P('Analysis', 20, [
          'Build the model',
          'Sensitivity test the two or three assumptions that matter most',
          'Have a colleague red team the numbers',
          'Write down what would change our mind'
        ]),
        P('Recommendation', 15, [
          'Draft the memo with a clear recommendation',
          'Circulate for comment',
          'Present to the decision maker',
          '* Decision recorded'
        ])
      ],
      risks: [
        ['The question shifts mid stream, so earlier work is wasted', 'Delivery'],
        ['Interviews are hard to schedule and slip the timeline', 'Partner / external'],
        ['Key data is not available or not shareable', 'Data / privacy'],
        ['Analysis rests on an assumption nobody has tested', 'Delivery'],
        ['Findings arrive after the decision window has closed', 'Delivery']
      ]
    },

    'pilot-launch': {
      label: 'Pilot / field launch',
      hint: 'Design, get approvals, build, launch, and learn from a pilot.',
      phases: [
        P('Design', 20, [
          'Define the intervention precisely enough to hand to someone else',
          'Define the primary outcome and how it will be measured',
          'Choose sample, geography, and comparison',
          'Draft the pilot protocol',
          'Agree the stop conditions in advance'
        ]),
        P('Partnerships and approvals', 25, [
          'Confirm the implementing partner and their scope',
          'Draft the MOU or scope of work',
          'Internal legal review',
          'Secure government or regulator approvals',
          'Data sharing and privacy sign off',
          '* Approvals in hand'
        ]),
        P('Build and test', 25, [
          'Build the content and the delivery workflow',
          'Internal quality assurance pass',
          'Field test with a small group',
          'Revise based on what the field test showed',
          'Translate and localize',
          'Stand up the monitoring dashboard'
        ]),
        P('Field launch', 15, [
          'Train the delivery team',
          'Soft launch with a subset',
          'Fix launch defects',
          'Full launch',
          '* Pilot live'
        ]),
        P('Monitor and learn', 15, [
          'Weekly monitoring review',
          'Mid pilot check against the stop conditions',
          'Endline data collection',
          'Write the results memo',
          'Decide scale, iterate, or stop'
        ])
      ],
      risks: [
        ['Government or regulator approval takes longer than planned', 'Regulatory / approval'],
        ['Implementing partner capacity is thinner than assumed', 'Partner / external'],
        ['Delivery channel underperforms (reach or engagement below assumption)', 'Technical'],
        ['Monitoring data arrives too late to act on', 'Delivery'],
        ['Translation or localization quality is poor', 'Delivery'],
        ['Participant consent or data handling not cleared in time', 'Data / privacy'],
        ['A dependency on another organization slips and we cannot escalate', 'Partner / external']
      ]
    },

    'partnership-mou': {
      label: 'Partnership / MOU',
      hint: 'From longlist to signed agreement to a working cadence.',
      phases: [
        P('Identify and qualify', 20, [
          'Write down what we need a partner for, and what we do not',
          'Build a longlist',
          'Screen against the must haves',
          'Shortlist 2 to 3',
          'First conversations'
        ]),
        P('Align on scope', 20, [
          'Agree the joint objective in writing',
          'Define each side\'s contributions and costs',
          'Agree who owns what (use the RACI)',
          'Agree the data, IP, and branding position'
        ]),
        P('Draft and negotiate', 25, [
          'Draft the term sheet',
          'Internal review: program, finance, legal',
          'Send to partner',
          'Negotiate the open points',
          '* Terms agreed'
        ]),
        P('Legal and sign', 20, [
          'Legal review on both sides',
          'Resolve legal comments',
          'Route for signature',
          'Countersign and file the executed copy',
          '* Signed'
        ]),
        P('Onboard and operate', 15, [
          'Joint kickoff',
          'Set up the shared workplan and meeting cadence',
          'Agree the escalation path and named contacts',
          'First joint review'
        ])
      ],
      risks: [
        ['Partner priorities shift and the agreement stalls', 'Partner / external'],
        ['Legal review on either side takes longer than planned', 'Regulatory / approval'],
        ['No agreement on data ownership or publication rights', 'Data / privacy'],
        ['Signature authority is unclear on the partner side', 'Partner / external'],
        ['Agreement is signed but nobody owns the working relationship', 'People'],
        ['Cost sharing is ambiguous and surfaces as a dispute later', 'Funding']
      ]
    },

    'team-build': {
      label: 'Hiring / team build',
      hint: 'Define roles, source, interview, close, onboard.',
      phases: [
        P('Define roles', 20, [
          'Confirm the team shape and reporting lines',
          'Write a scorecard per role: outcomes, not duties',
          'Confirm level and compensation band',
          'Budget approval'
        ]),
        P('Post and source', 25, [
          'Write and approve the job description',
          'Post to the channels that actually work for this role',
          'Direct outreach to 20 or more candidates',
          'Ask the team and advisors for referrals'
        ]),
        P('Interview', 30, [
          'Screen applications weekly, do not let them pile up',
          'First round interviews',
          'Work sample or case exercise',
          'Panel interviews',
          'Reference checks'
        ]),
        P('Offer', 15, [
          'Debrief and decide',
          'Make the offer',
          'Negotiate and close',
          '* Offer accepted'
        ]),
        P('Onboard', 10, [
          'Prepare the 30 / 60 / 90 day plan',
          'Set up accounts, access, and payroll',
          'Assign an onboarding buddy',
          'Week 1 and day 30 check ins'
        ])
      ],
      risks: [
        ['Pipeline is too thin to compare candidates properly', 'People'],
        ['Compensation band is below market for this role', 'Funding'],
        ['Interview process drags and the best candidate takes another offer', 'People'],
        ['Role is defined by duties rather than outcomes, so hiring bar is unclear', 'People'],
        ['Onboarding is unowned and the new hire ramps slowly', 'People']
      ]
    },

    'blank': {
      label: 'Blank skeleton',
      hint: 'Three empty phases. Bring your own content.',
      phases: [
        P('Phase 1', 34, ['Task', 'Task', '* Milestone']),
        P('Phase 2', 33, ['Task', 'Task', '* Milestone']),
        P('Phase 3', 33, ['Task', 'Task', '* Milestone'])
      ],
      risks: []
    }
  };

  /* Risks worth carrying on almost any initiative. */
  var GENERIC_RISKS = [
    ['Timeline assumes no slippage anywhere, which never holds', 'Delivery'],
    ['Status is tracked in several places, so nobody trusts any of them', 'Delivery'],
    ['A decision is made without the people who have to live with it', 'People']
  ];

  /* Rows that belong on a RACI beyond the delivery phases themselves. */
  var STANDING_DECISIONS = [
    'Budget approval and reallocation',
    'Vendor or partner selection',
    'Hiring decisions',
    'External communication and publication',
    'Data handling and privacy sign off',
    'Change to scope or timeline',
    'Final go / no go',
    'Escalation of a blocked item'
  ];

  var STATUS_VALUES = ['Not started', 'In progress', 'Blocked', 'Complete', 'Dropped'];
  var RISK_CATEGORIES = ['Delivery', 'Partner / external', 'Funding', 'People',
    'Technical', 'Regulatory / approval', 'Reputational', 'Data / privacy'];
  var RISK_STATUS = ['Open', 'Mitigating', 'Monitoring', 'Accepted', 'Closed'];
  var HIGH_MED_LOW = ['High', 'Medium', 'Low'];

  /* Documents on offer. `kind` drives which writer and format select applies. */
  var DOCS = [
    { id: 'plan', kind: 'sheet', order: 1, file: 'project-plan',
      name: 'Project plan', blurb: 'Phase by phase workplan with owner, start, due, status, and notes. Filtered and frozen, status dropdowns wired.' },
    { id: 'gantt', kind: 'sheet', order: 2, file: 'gantt-chart',
      name: 'Gantt chart', blurb: 'Timeline grid with colored bars, scaled to your horizon. Daily, weekly, or monthly columns.' },
    { id: 'raci', kind: 'sheet', order: 3, file: 'raci-matrix',
      name: 'RACI matrix', blurb: 'Workstreams and standing decisions against your team, with a check that each row has exactly one A.' },
    { id: 'charter', kind: 'doc', order: 4, file: 'project-charter',
      name: 'Project charter', blurb: 'One page: the decision, scope and non-scope, success metrics, team, milestones, risks, open questions.' },
    { id: 'risks', kind: 'sheet', order: 5, file: 'risk-register',
      name: 'Risk register', blurb: 'Pre-seeded with risks typical for this template. Likelihood by impact scoring with a heat scale.' },
    { id: 'stakeholders', kind: 'sheet', order: 6, file: 'stakeholder-map',
      name: 'Stakeholder map', blurb: 'Influence by interest, with the engagement approach derived by formula and an owner per stakeholder.' },
    { id: 'decisions', kind: 'sheet', order: 7, file: 'decision-log',
      name: 'Decision log', blurb: 'Numbered rows for what was decided, by whom, on what basis, and whether it can be reversed.' },
    { id: 'status', kind: 'doc', order: 8, file: 'status-report-template',
      name: 'Status report', blurb: 'Reusable weekly or fortnightly update: RAG, progress, blockers with a named ask, next period.' },
    { id: 'kickoff', kind: 'doc', order: 9, file: 'kickoff-agenda',
      name: 'Kickoff agenda', blurb: 'Timed 90 minute agenda with pre-reads and the decisions the meeting must actually produce.' },
    { id: 'onepager', kind: 'doc', order: 10, file: 'update-onepager',
      name: 'Exec one-pager', blurb: 'Standing brief for a sponsor or funder: what this is, where it stands, what we need.' }
  ];

  var HORIZONS = [
    { d: 14, label: '2 weeks' },
    { d: 28, label: '4 weeks' },
    { d: 42, label: '6 weeks' },
    { d: 91, label: '3 months' },
    { d: 182, label: '6 months' },
    { d: 273, label: '9 months' },
    { d: 365, label: '12 months' }
  ];

  SIK.templates = {
    PRESETS: PRESETS, GENERIC_RISKS: GENERIC_RISKS, STANDING_DECISIONS: STANDING_DECISIONS,
    STATUS_VALUES: STATUS_VALUES, RISK_CATEGORIES: RISK_CATEGORIES, RISK_STATUS: RISK_STATUS,
    HIGH_MED_LOW: HIGH_MED_LOW, DOCS: DOCS, HORIZONS: HORIZONS
  };
})(window.SIK = window.SIK || {});
