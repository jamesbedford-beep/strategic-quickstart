/* Document builders. Each returns either a sheet model (kind: 'sheet') or a
   block array (kind: 'doc'). Nothing here invents facts about a project:
   anything the user has not supplied is left blank or marked [in brackets]. */
(function (SIK) {
  'use strict';

  var P = SIK.plan, T = SIK.templates, S = SIK.sheet;

  function C(v, s) { return { v: v, s: s }; }
  function F(f, s) { return { f: f, s: s }; }
  function blank(s) { return { v: '', s: s }; }
  function row(cells, h) { return { cells: cells, h: h }; }
  function fill(n, s) { var a = []; for (var i = 0; i < n; i++) a.push(blank(s)); return a; }

  function metaLine(cfg, sched) {
    var bits = [];
    if (cfg.dri) bits.push('Owner: ' + cfg.dri);
    if (cfg.sponsor) bits.push('Sponsor: ' + cfg.sponsor);
    bits.push('Window: ' + P.fmtLong(sched.start) + ' to ' + P.fmtLong(sched.end));
    bits.push('Generated: ' + P.iso(P.today()));
    return bits.join('   |   ');
  }

  function ownerList(cfg) {
    var l = [];
    (cfg.team || []).forEach(function (m) {
      var v = (m.initials || m.name || '').trim();
      if (v && l.indexOf(v) < 0) l.push(v);
    });
    return l;
  }

  function teamLabel(m) {
    var n = (m.name || '').trim(), i = (m.initials || '').trim();
    if (n && i && i !== n) return n + ' (' + i + ')';
    return n || i || '';
  }

  /* ===================== project plan ===================== */
  function plan(cfg, sched) {
    var head = ['Phase / deliverable', 'Owner', 'Start', 'Due', 'Days', 'Status', 'Notes'];
    var rows = [];
    rows.push(row([C(cfg.project + ' project plan', 'title')], 26));
    rows.push(row([C(metaLine(cfg, sched), 'muted')], 16));
    rows.push(row([]));
    rows.push(row(head.map(function (h) { return C(h, 'head'); }), 30));

    sched.phases.forEach(function (ph) {
      rows.push(row([
        C(ph.name, 'phase'), C(ph.owner, 'phase'),
        C(ph.start, 'phaseDate'), C(ph.end, 'phaseDate'),
        blank('phase'), blank('phase'), blank('phase')
      ], 20));
      ph.tasks.forEach(function (t) {
        var r = rows.length + 1;
        rows.push(row([
          C((t.milestone ? '◆  ' : '     ') + t.name, t.milestone ? 'milestone' : 'cell'),
          C(t.owner, 'cellC'),
          C(t.start, 'date'),
          C(t.end, 'date'),
          t.milestone ? C('–', 'cellC') : F('IF(COUNT(C' + r + ':D' + r + ')=2,D' + r + '-C' + r + '+1,"")', 'num'),
          C(T.statusFor(cfg.preset)[0], 'cellC'),
          blank('cell')
        ]));
      });
      rows.push(row([]));
    });

    var last = rows.length;
    var owners = ownerList(cfg);
    return {
      name: 'Plan',
      cols: [{ w: 54 }, { w: 10 }, { w: 12 }, { w: 12 }, { w: 8 }, { w: 14 }, { w: 44 }],
      freeze: { row: 4, col: 1 },
      autoFilter: 'A4:G' + last,
      merges: ['A1:G1', 'A2:G2'],
      validations: [
        { ref: 'F5:F' + (last + 20), values: T.statusFor(cfg.preset) },
        owners.length ? { ref: 'B5:B' + (last + 20), values: owners } : null
      ].filter(Boolean),
      rows: rows
    };
  }

  /* ===================== gantt ===================== */
  function gantt(cfg, sched) {
    var gran = P.pickGranularity(P.diffDays(sched.start, sched.end) + 1, cfg.granularity);
    var periods = P.buildPeriods(sched.start, sched.end, gran);
    var runs = P.groupRuns(periods);
    var FIRST = 5;                       /* period columns start at column E */
    var today = P.today();
    var todayIdx = -1;
    periods.forEach(function (p, i) { if (today >= p.start && today <= p.end) todayIdx = i; });

    var rows = [];
    rows.push(row([C(cfg.project + ' Gantt', 'title')], 26));
    rows.push(row([C(metaLine(cfg, sched) + '   |   ' + gran + ' columns', 'muted')], 16));

    /* band row: month or quarter groups over the period columns */
    var band = [blank(), blank(), blank(), blank()];
    periods.forEach(function (p, i) {
      var isStart = runs.some(function (r) { return r.from === i; });
      band[FIRST - 1 + i] = C(isStart ? p.group : '', 'head');
    });
    rows.push(row(band, 18));

    var hd = [C('Phase / task', 'headL'), C('Own', 'head'), C('Start', 'head'), C('Due', 'head')];
    periods.forEach(function (p, i) {
      var rot = gran === 'day';
      var style = (i === todayIdx)
        ? (rot ? 'headRotToday' : 'headToday')
        : (rot ? 'headRot' : 'head');
      hd.push(C(p.label, style));
    });
    rows.push(row(hd, gran === 'day' ? 46 : 30));

    function bars(a, b, barStyle) {
      return periods.map(function (p) {
        if (P.overlaps(a, b, p.start, p.end)) return blank(barStyle);
        return blank(p.weekend ? 'off' : 'cell');
      });
    }

    sched.phases.forEach(function (ph) {
      rows.push(row([
        C(ph.name, 'phase'), C(ph.owner, 'phase'), C(ph.start, 'phaseDate'), C(ph.end, 'phaseDate')
      ].concat(periods.map(function (p) {
        return P.overlaps(ph.start, ph.end, p.start, p.end) ? blank('barLight') : blank('phase');
      })), 20));

      ph.tasks.forEach(function (t) {
        if (t.milestone) {
          rows.push(row([
            C('◆  ' + t.name, 'milestone'), C(t.owner, 'cellC'),
            C(t.start, 'date'), C(t.end, 'date')
          ].concat(periods.map(function (p) {
            if (P.overlaps(t.start, t.end, p.start, p.end)) return C('◆', 'milestone');
            return blank(p.weekend ? 'off' : 'cell');
          }))));
        } else {
          rows.push(row([
            C('     ' + t.name, 'cell'), C(t.owner, 'cellC'),
            C(t.start, 'date'), C(t.end, 'date')
          ].concat(bars(t.start, t.end, 'bar'))));
        }
      });
    });

    var lastCol = S.colName(FIRST - 1 + periods.length);
    var merges = ['A1:' + lastCol + '1', 'A2:' + lastCol + '2', 'A3:D3'];
    runs.forEach(function (r) {
      if (r.to > r.from) {
        merges.push(S.colName(FIRST + r.from) + '3:' + S.colName(FIRST + r.to) + '3');
      }
    });

    var cols = [{ w: 44 }, { w: 7 }, { w: 11 }, { w: 11 }];
    var pw = gran === 'day' ? 3.2 : (gran === 'week' ? 6.5 : 9);
    periods.forEach(function () { cols.push({ w: pw }); });

    return {
      name: 'Gantt', cols: cols, freeze: { row: 4, col: 4 },
      merges: merges, rows: rows
    };
  }

  /* ===================== raci ===================== */
  function raci(cfg, sched) {
    var team = (cfg.team || []).filter(function (m) { return (m.name || m.initials || '').trim(); });
    if (!team.length) team = [{ name: cfg.dri || '[Owner]', initials: '' }];
    var nCol = team.length;
    var lastPersonCol = S.colName(1 + nCol);
    var checkCol = S.colName(2 + nCol);

    var rows = [];
    rows.push(row([C(cfg.project + ' RACI matrix', 'title')], 26));
    rows.push(row([C(metaLine(cfg, sched), 'muted')], 16));
    rows.push(row([C('R = Responsible, does the work.   A = Accountable, owns the outcome, exactly one per row.   ' +
      'C = Consulted before the decision.   I = Informed after it.', 'muted')], 16));
    rows.push(row([]));

    var hd = [C('Workstream / decision', 'headL')];
    team.forEach(function (m) { hd.push(C(teamLabel(m), 'head')); });
    hd.push(C('Check', 'headL'));
    rows.push(row(hd, 40));

    var driIdx = -1;
    team.forEach(function (m, i) {
      if (cfg.dri && ((m.name || '').trim() === cfg.dri.trim() || (m.initials || '').trim() === cfg.dri.trim())) driIdx = i;
    });

    function body(label, aIdx) {
      var r = rows.length + 1;
      var cells = [C(label, 'cell')];
      for (var i = 0; i < nCol; i++) cells.push(C(i === aIdx ? 'A' : '', 'cellC'));
      cells.push(F('IF(COUNTIF(B' + r + ':' + lastPersonCol + r + ',"A")=1,"OK","Needs exactly one A")', 'cell'));
      rows.push(row(cells));
    }

    sched.phases.forEach(function (ph) {
      var idx = driIdx;
      team.forEach(function (m, i) {
        if (ph.owner && ((m.initials || '').trim() === ph.owner.trim() || (m.name || '').trim() === ph.owner.trim())) idx = i;
      });
      body(ph.name, idx);
    });

    rows.push(row([]));
    var bandCells = [C('Standing decisions', 'phase')].concat(fill(nCol + 1, 'phase'));
    rows.push(row(bandCells, 20));
    T.STANDING_DECISIONS.forEach(function (d) { body(d, driIdx); });

    var last = rows.length;
    var cols = [{ w: 46 }];
    team.forEach(function () { cols.push({ w: 13 }); });
    cols.push({ w: 24 });

    return {
      name: 'RACI', cols: cols, freeze: { row: 5, col: 1 },
      merges: ['A1:' + checkCol + '1', 'A2:' + checkCol + '2', 'A3:' + checkCol + '3'],
      validations: [{ ref: 'B6:' + lastPersonCol + last, values: ['R', 'A', 'C', 'I', 'R/A'] }],
      rows: rows
    };
  }

  /* ===================== risk register ===================== */
  function risks(cfg, sched) {
    var preset = T.PRESETS[cfg.preset] || T.PRESETS['strategic-initiative'];
    var seed = (preset.risks || []).concat(T.GENERIC_RISKS);

    var head = ['ID', 'Risk: what could go wrong', 'Category', 'Likelihood 1-5', 'Impact 1-5',
      'Score', 'Mitigation or action already agreed', 'Owner', 'Status', 'Review by'];
    var rows = [];
    rows.push(row([C(cfg.project + ' risk register', 'title')], 26));
    rows.push(row([C(metaLine(cfg, sched), 'muted')], 16));
    rows.push(row([C('Score is likelihood times impact. Rate honestly: a register where everything is low is not a register. ' +
      'Every risk scoring 12 or more needs a named owner and a dated action.', 'muted')], 16));
    rows.push(row([]));
    rows.push(row(head.map(function (h) { return C(h, 'head'); }), 34));

    var startRow = rows.length + 1;
    seed.forEach(function (r, i) {
      var rn = rows.length + 1;
      rows.push(row([
        C('R-' + String(i + 1).padStart(3, '0'), 'cellC'),
        C(r[0], 'cell'), C(r[1], 'cellC'),
        blank('cellC'), blank('cellC'),
        F('IF(COUNT(D' + rn + ':E' + rn + ')=2,D' + rn + '*E' + rn + ',"")', 'num'),
        blank('cell'), C(cfg.dri || '', 'cellC'), C('Open', 'cellC'), blank('date')
      ], 28));
    });
    /* blank rows to add your own */
    for (var k = seed.length; k < seed.length + 6; k++) {
      var rn2 = rows.length + 1;
      rows.push(row([
        C('R-' + String(k + 1).padStart(3, '0'), 'cellC'),
        blank('cell'), blank('cellC'), blank('cellC'), blank('cellC'),
        F('IF(COUNT(D' + rn2 + ':E' + rn2 + ')=2,D' + rn2 + '*E' + rn2 + ',"")', 'num'),
        blank('cell'), blank('cellC'), blank('cellC'), blank('date')
      ], 22));
    }
    var last = rows.length;
    var owners = ownerList(cfg);

    return {
      name: 'Risks',
      cols: [{ w: 8 }, { w: 54 }, { w: 20 }, { w: 13 }, { w: 11 }, { w: 8 },
        { w: 48 }, { w: 10 }, { w: 14 }, { w: 12 }],
      freeze: { row: 5, col: 2 },
      autoFilter: 'A5:J' + last,
      merges: ['A1:J1', 'A2:J2', 'A3:J3'],
      colorScale: { ref: 'F' + startRow + ':F' + last, min: 1, mid: 9, max: 20 },
      validations: [
        { ref: 'C' + startRow + ':C' + last, values: T.RISK_CATEGORIES },
        { ref: 'D' + startRow + ':E' + last, values: ['1', '2', '3', '4', '5'] },
        { ref: 'I' + startRow + ':I' + last, values: T.RISK_STATUS },
        owners.length ? { ref: 'H' + startRow + ':H' + last, values: owners } : null
      ].filter(Boolean),
      rows: rows
    };
  }

  /* ===================== stakeholder map ===================== */
  function stakeholders(cfg, sched) {
    var head = ['Name', 'Organization', 'Role in this initiative', 'What they care about',
      'Influence', 'Interest', 'Engagement approach', 'Owner of the relationship',
      'Cadence', 'Last contact'];
    var rows = [];
    rows.push(row([C(cfg.project + ' stakeholder map', 'title')], 26));
    rows.push(row([C(metaLine(cfg, sched), 'muted')], 16));
    rows.push(row([C('Engagement approach is derived from influence and interest. High and high means manage closely: ' +
      'brief them before decisions, not after.', 'muted')], 16));
    rows.push(row([]));
    rows.push(row(head.map(function (h) { return C(h, 'head'); }), 34));

    var startRow = rows.length + 1;
    var seed = [];
    if (cfg.sponsor) seed.push([cfg.sponsor, '', 'Sponsor', '', 'High', 'High']);
    if (cfg.dri) seed.push([cfg.dri, '', 'Owner', '', 'High', 'High']);
    (cfg.team || []).forEach(function (m) {
      var n = (m.name || '').trim();
      if (!n || n === cfg.dri || n === cfg.sponsor) return;
      seed.push([n, '', m.role || 'Core team', '', 'Medium', 'High']);
    });
    /* placeholders, clearly bracketed so nobody mistakes them for real entries */
    ['[Budget approver]', '[Legal or compliance reviewer]', '[Implementing partner lead]',
      '[Government or regulator counterpart]', '[Funder contact]', '[Team affected by the change]']
      .forEach(function (p) { seed.push([p, '', '', '', '', '']); });

    seed.forEach(function (s) {
      var rn = rows.length + 1;
      rows.push(row([
        C(s[0], 'cell'), C(s[1], 'cell'), C(s[2], 'cell'), blank('cell'),
        C(s[4], 'cellC'), C(s[5], 'cellC'),
        F('IF(OR(E' + rn + '="",F' + rn + '=""),"",IF(AND(E' + rn + '="High",F' + rn + '="High"),' +
          '"Manage closely",IF(E' + rn + '="High","Keep satisfied",IF(F' + rn + '="High","Keep informed","Monitor"))))', 'cell'),
        C(cfg.dri || '', 'cellC'), blank('cellC'), blank('date')
      ], 26));
    });
    var last = rows.length;
    var owners = ownerList(cfg);

    return {
      name: 'Stakeholders',
      cols: [{ w: 22 }, { w: 20 }, { w: 24 }, { w: 40 }, { w: 11 }, { w: 11 },
        { w: 21 }, { w: 15 }, { w: 15 }, { w: 13 }],
      freeze: { row: 5, col: 1 },
      autoFilter: 'A5:J' + last,
      merges: ['A1:J1', 'A2:J2', 'A3:J3'],
      validations: [
        { ref: 'E' + startRow + ':F' + last, values: T.HIGH_MED_LOW },
        { ref: 'I' + startRow + ':I' + last, values: ['Weekly', 'Fortnightly', 'Monthly', 'Quarterly', 'At milestones', 'On request'] },
        owners.length ? { ref: 'H' + startRow + ':H' + last, values: owners } : null
      ].filter(Boolean),
      rows: rows
    };
  }

  /* ===================== decision log ===================== */
  function decisions(cfg, sched) {
    var head = ['ID', 'Date', 'Decision', 'Decided by', 'Options considered', 'Why this one',
      'Reversible?', 'Consulted', 'Link to memo or thread', 'Status'];
    var rows = [];
    rows.push(row([C(cfg.project + ' decision log', 'title')], 26));
    rows.push(row([C(metaLine(cfg, sched), 'muted')], 16));
    rows.push(row([C('Log a decision the day it is made, not at the retro. Record what was rejected and why: ' +
      'that is the part people forget and re-litigate.', 'muted')], 16));
    rows.push(row([]));
    rows.push(row(head.map(function (h) { return C(h, 'head'); }), 34));

    var startRow = rows.length + 1;
    for (var i = 1; i <= 24; i++) {
      rows.push(row([
        C('D-' + String(i).padStart(3, '0'), 'cellC'),
        blank('date'), blank('cell'), blank('cellC'), blank('cell'), blank('cell'),
        blank('cellC'), blank('cell'), blank('cell'), blank('cellC')
      ], 24));
    }
    var last = rows.length;
    var owners = ownerList(cfg);

    return {
      name: 'Decisions',
      cols: [{ w: 9 }, { w: 12 }, { w: 46 }, { w: 12 }, { w: 34 }, { w: 40 },
        { w: 12 }, { w: 20 }, { w: 26 }, { w: 13 }],
      freeze: { row: 5, col: 3 },
      autoFilter: 'A5:J' + last,
      merges: ['A1:J1', 'A2:J2', 'A3:J3'],
      validations: [
        { ref: 'G' + startRow + ':G' + last, values: ['Yes', 'Partly', 'No'] },
        { ref: 'J' + startRow + ':J' + last, values: ['Agreed', 'Provisional', 'Superseded', 'Reversed'] },
        owners.length ? { ref: 'D' + startRow + ':D' + last, values: owners } : null
      ].filter(Boolean),
      rows: rows
    };
  }

  /* ===================== narrative docs ===================== */
  function milestoneRows(sched) {
    var out = [];
    sched.phases.forEach(function (ph) {
      ph.tasks.forEach(function (t) {
        if (t.milestone) out.push([t.name, P.iso(t.end), t.owner || '[owner]']);
      });
    });
    if (!out.length) {
      sched.phases.forEach(function (ph) {
        out.push([ph.name + ' complete', P.iso(ph.end), ph.owner || '[owner]']);
      });
    }
    return out;
  }

  function teamRows(cfg) {
    var out = [];
    if (cfg.dri) out.push([cfg.dri, 'Owner', 'Accountable for delivery and for the plan being true']);
    if (cfg.sponsor) out.push([cfg.sponsor, 'Sponsor', 'Approves scope, budget, and the go / no go']);
    (cfg.team || []).forEach(function (m) {
      var n = (m.name || '').trim();
      if (!n || n === cfg.dri || n === cfg.sponsor) return;
      out.push([n, m.role || '[role]', '']);
    });
    if (!out.length) out.push(['[name]', '[role]', '']);
    return out;
  }

  function charter(cfg, sched) {
    var preset = T.PRESETS[cfg.preset] || T.PRESETS['strategic-initiative'];
    var seedRisks = (preset.risks || []).slice(0, 5).map(function (r) {
      return [r[0], '[mitigation]', cfg.dri || '[owner]'];
    });
    if (!seedRisks.length) seedRisks = [['[risk]', '[mitigation]', '[owner]']];

    return [
      { h1: cfg.project + ': project charter' },
      { meta: [
        ['Owner', cfg.dri || '[name]'],
        ['Sponsor', cfg.sponsor || '[name]'],
        ['Window', P.fmtLong(sched.start) + ' to ' + P.fmtLong(sched.end)],
        ['Status', 'Draft'],
        ['Last updated', P.iso(P.today())]
      ] },
      { hr: true },
      { h2: 'Context' },
      { p: '[Two or three sentences: what situation makes this worth doing now. Link to the evidence or analysis that motivated it. If a number appears here, it needs a source.]' },

      { h2: 'The objective' },
      { p: '[One sentence, testable. Not "improve X" but "move X from A to B by <date>", or, for a diagnostic, "decide whether to Y by <date>".]' },

      { h2: 'In scope' },
      { ul: ['[thing we will do]', '[thing we will do]', '[thing we will do]'] },
      { h3: 'Explicitly out of scope' },
      { ul: ['[thing people will assume we are doing but we are not]', '[thing deferred to a later phase]'] },

      { h2: 'Success metrics' },
      { table: { head: ['Metric', 'Baseline', 'Target', 'By when', 'How it is measured'],
        rows: [
          ['[primary metric]', '[value or unknown]', '[value]', P.iso(sched.end), '[source of data]'],
          ['[secondary metric]', '', '', '', ''],
          ['[guardrail: what must not get worse]', '', '', '', '']
        ] } },
      { p: 'Where a baseline is unknown, write "unknown" rather than a guess, and add establishing it to the plan.' },

      { h2: 'Team and decision rights' },
      { table: { head: ['Name', 'Role', 'Decision rights'], rows: teamRows(cfg) } },
      { p: 'Anything not listed above is the owner\'s call. If that is wrong, say so now rather than at the first disagreement. Full detail sits in the RACI matrix.' },

      { h2: 'Milestones' },
      { table: { head: ['Milestone', 'Target date', 'Owner'], rows: milestoneRows(sched) } },

      { h2: 'Budget and resourcing' },
      { table: { head: ['Item', 'Amount', 'Status'],
        rows: [['[staff time, FTE]', '', '[approved / requested]'],
          ['[external or partner costs]', '', ''],
          ['[other]', '', '']] } },

      { h2: 'Key risks' },
      { table: { head: ['Risk', 'Mitigation', 'Owner'], rows: seedRisks } },
      { p: 'Full register, with likelihood and impact scoring, is in the risk register.' },

      { h2: 'Open questions' },
      { ul: ['[question that could change the plan, and who will answer it by when]',
        '[assumption we have not tested]'] },

      { h2: 'What would make us stop' },
      { ul: ['[condition that means this is not working]', '[condition that means the opportunity has gone]'] },

      { hr: true },
      { p: 'Every figure in this document carries a source. Estimates are labeled as estimates, with whose estimate it is.' }
    ];
  }

  function status(cfg, sched) {
    var ms = milestoneRows(sched).slice(0, 8).map(function (m) {
      return [m[0], m[1], '[forecast]', '[on track / at risk / slipped]'];
    });
    return [
      { h1: cfg.project + ': status update' },
      { meta: [
        ['Period', '[week ending ' + P.iso(P.today()) + ']'],
        ['Owner', cfg.dri || '[name]'],
        ['Overall status', '[Green / Amber / Red]']
      ] },
      { quote: 'Green: will hit the milestones with the resources we have. Amber: a named risk needs a decision or help. Red: a milestone will be missed and the plan needs to change.' },

      { h2: 'Headline' },
      { p: '[Two sentences. If a reader stops here, what must they know?]' },

      { h2: 'Progress since the last update' },
      { ul: ['[completed, with the evidence]', '[completed]', '[started]'] },

      { h2: 'Against plan' },
      { table: { head: ['Milestone', 'Planned', 'Forecast', 'Status'], rows: ms } },

      { h2: 'Blockers and asks' },
      { p: 'Every blocker names what is needed, from whom, and by when. A blocker without an ask is just a complaint.' },
      { table: { head: ['Blocker', 'What we need', 'From whom', 'Needed by'],
        rows: [['', '', '', ''], ['', '', '', '']] } },

      { h2: 'Metrics' },
      { table: { head: ['Metric', 'Last period', 'This period', 'Target'],
        rows: [['', '', '', ''], ['', '', '', '']] } },

      { h2: 'Next period' },
      { ul: ['[the two or three things that matter]', '[…]'] },

      { h2: 'Changes to the plan' },
      { p: '[Anything moved, dropped, or added since the last update, and why. If nothing changed, say "no changes".]' }
    ];
  }

  function kickoff(cfg, sched) {
    return [
      { h1: cfg.project + ': kickoff' },
      { meta: [
        ['Date and time', '[to confirm]'],
        ['Chair', cfg.dri || '[name]'],
        ['Attendees', (cfg.team || []).map(function (m) { return (m.name || '').trim(); })
          .filter(Boolean).join(', ') || '[names]'],
        ['Duration', '90 minutes']
      ] },
      { p: 'This meeting exists to produce decisions, not to share information. The pre-reads carry the information.' },

      { h2: 'Pre-reads, sent 48 hours ahead' },
      { checklist: ['Project charter', 'Project plan and Gantt', 'Draft RACI matrix', 'Risk register'] },

      { h2: 'Agenda' },
      { table: { head: ['Time', 'Item', 'Lead', 'Output'], rows: [
        ['0:00', 'Why we are here and what this meeting must decide', cfg.dri || '[owner]', 'Shared expectation'],
        ['0:05', 'Context and the problem we are solving', cfg.dri || '[owner]', 'Questions surfaced'],
        ['0:15', 'Scope: what is in, and what we are explicitly not doing', cfg.dri || '[owner]', 'Scope agreed'],
        ['0:30', 'Walk the plan and the milestone dates', cfg.dri || '[owner]', 'Dates challenged and agreed'],
        ['0:45', 'Walk the RACI: confirm exactly one A per row', cfg.dri || '[owner]', 'Owners named out loud'],
        ['0:55', 'Top risks and who owns each', '[risk owner]', 'Owners assigned'],
        ['1:05', 'Ways of working: cadence, single status source, escalation path', cfg.dri || '[owner]', 'Cadence agreed'],
        ['1:15', 'Open questions we cannot yet answer, and who will', 'All', 'Owners and dates'],
        ['1:25', 'Actions and close', cfg.dri || '[owner]', 'Action list']
      ] } },

      { h2: 'Decisions this meeting must produce' },
      { ol: ['Scope, including what is out',
        'One accountable owner per workstream',
        'The milestone dates people are prepared to be held to',
        'Meeting cadence and where status lives',
        'How a blocker gets escalated, and to whom'] },

      { h2: 'After the meeting' },
      { checklist: ['Decisions written into the decision log the same day',
        'RACI updated and recirculated',
        'Plan dates updated where the room pushed back',
        'Actions in the plan with owners and dates, not in the notes'] }
    ];
  }

  function onepager(cfg, sched) {
    var phaseRows = sched.phases.map(function (ph) {
      return [ph.name, P.iso(ph.start) + ' to ' + P.iso(ph.end), '[not started / in progress / done]'];
    });
    return [
      { h1: cfg.project },
      { meta: [
        ['Owner', cfg.dri || '[name]'],
        ['Sponsor', cfg.sponsor || '[name]'],
        ['Window', P.fmtLong(sched.start) + ' to ' + P.fmtLong(sched.end)],
        ['Updated', P.iso(P.today())]
      ] },
      { h2: 'What this is' },
      { p: '[Three sentences a busy reader can repeat accurately to someone else.]' },
      { h2: 'Why it matters' },
      { ul: ['[the change we expect, and for whom]', '[the size of it, with a source]',
        '[what happens if we do nothing]'] },
      { h2: 'Where it stands' },
      { table: { head: ['Phase', 'Window', 'Status'], rows: phaseRows } },
      { h2: 'What we need' },
      { ul: ['[decision, from whom, by when]', '[resource or budget]', '[introduction or access]'] },
      { h2: 'Risks we are watching' },
      { ul: ['[risk and what we are doing about it]', '[risk and what we are doing about it]'] },
      { hr: true },
      { p: 'Numbers in this brief are sourced. Estimates are labeled as estimates.' }
    ];
  }

  /* ===================== bundle readme ===================== */
  function readme(cfg, sched, files) {
    var gran = P.pickGranularity(P.diffDays(sched.start, sched.end) + 1, cfg.granularity);
    var preset = T.PRESETS[cfg.preset] || T.PRESETS['strategic-initiative'];
    return [
      { h1: cfg.project + ': project kit' },
      { meta: [
        ['Generated', P.iso(P.today())],
        ['Template', preset.label],
        ['Owner', cfg.dri || 'not set'],
        ['Window', P.fmtLong(sched.start) + ' to ' + P.fmtLong(sched.end) +
          ' (' + (P.diffDays(sched.start, sched.end) + 1) + ' days, ' + gran + ' Gantt columns)']
      ] },
      { p: 'These files are a starting scaffold, not a finished plan. Dates were generated by spreading the template phases across your window, so they are arithmetic, not judgment. Walk them with the team at kickoff and change what is wrong.' },

      { h2: 'What is in here' },
      { table: { head: ['File', 'What it is for'], rows: files } },

      { h2: 'Suggested first week' },
      { ol: [
        'Fill in the charter. If you cannot write the objective in one testable sentence, the project is not scoped yet.',
        'Fix the plan dates. The generated spread is even; real projects are not.',
        'Assign one A per row in the RACI. The check column tells you which rows still fail.',
        'Score the risks honestly and give every risk over 12 a dated action.',
        'Run the kickoff and log the decisions the same day.'
      ] },

      { h2: 'Notes' },
      { ul: [
        'Anything in [square brackets] is a placeholder to replace, not content.',
        'Blank cells are deliberate: nothing was filled in that you did not supply.',
        'Spreadsheets carry dropdowns and formulas. Editing them in Google Sheets works; the formulas convert on import.',
        'The plan, Gantt, and RACI share the same phase names, so renaming a phase means renaming it in three places.'
      ] }
    ];
  }

  SIK.build = {
    plan: plan, gantt: gantt, raci: raci, risks: risks, stakeholders: stakeholders,
    decisions: decisions, charter: charter, status: status, kickoff: kickoff,
    onepager: onepager, readme: readme
  };
})(window.SIK = window.SIK || {});
