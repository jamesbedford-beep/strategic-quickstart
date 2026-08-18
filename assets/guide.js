/* "Start here": a sequenced, plain-language wizard for people who do not know
   which project documents they need, which is most people.

   Deliberately not an LLM. This page is static and public, so there is nowhere to
   keep an API key, and a scripted flow has real advantages here: it works offline,
   costs nothing, answers instantly, and can tell someone exactly why a document
   was suggested. Every recommendation below traces back to a specific answer, and
   the reason is shown on screen.

   The other design rule: recommend few things. Suggesting all ten documents is the
   overwhelm this flow exists to remove, so the result is a small starting set with
   the rest offered as "later, if you need it". */
(function (SIK) {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var R = SIK.render;
  var P = SIK.plan;

  /* ---------- the script ----------
     Each option can carry:
       set    state to apply if chosen
       boost  { docId: weight } added to the recommendation score
       why    how to phrase the reason, if this option drove a recommendation */
  var QUESTIONS = [
    {
      id: 'goal', type: 'text', rows: 3,
      q: 'In your own words, what are you trying to get done?',
      help: 'A sentence or two is plenty, and plain language is better than project language. ' +
        'This goes straight into your charter as a first draft.',
      placeholder: 'e.g. Work out whether we should offer reading glasses through our existing ' +
        'screening sites in Uganda, and get a decision by the autumn.'
    },
    {
      id: 'kind', type: 'single',
      q: 'Which of these is closest to where you are?',
      options: [
        { label: 'Working out whether to do something', sub: 'Scoping, research, a decision to make',
          set: { preset: 'scoping-diagnostic' }, boost: { charter: 2, decisions: 2 },
          why: 'you are working towards a decision' },
        { label: 'Testing something in the field', sub: 'A pilot, a trial, a first rollout',
          set: { preset: 'pilot-launch' }, boost: { risks: 2, plan: 1 },
          why: 'field pilots have a lot of moving parts and dependencies' },
        { label: 'Setting up an agreement with another organization', sub: 'A partnership, an MOU, a contract',
          set: { preset: 'partnership-mou' }, boost: { stakeholders: 2, decisions: 1 },
          why: 'the other side has its own people to keep aligned' },
        { label: 'Hiring or building out a team', sub: 'Roles, interviews, onboarding',
          set: { preset: 'team-build' }, boost: { plan: 1 },
          why: 'hiring slips when nobody owns each stage' },
        { label: 'Taking an intervention through the Accelerator', sub: 'Sourcing through test at scale',
          set: { preset: 'evac-accelerator' }, boost: { risks: 1, decisions: 2 },
          why: 'each stage ends in a gating decision worth recording' },
        { label: 'Something else', sub: 'A general initiative',
          set: { preset: 'strategic-initiative' } }
      ]
    },
    {
      id: 'when', type: 'single',
      q: 'When does it need to be done?',
      options: [
        { label: 'In the next couple of weeks', set: { horizon: 14 } },
        { label: 'Within a month', set: { horizon: 28 } },
        { label: 'This quarter', set: { horizon: 91 } },
        { label: 'Over about six months', set: { horizon: 182 }, boost: { gantt: 1 } },
        { label: "It's a year-long effort", set: { horizon: 365 }, boost: { gantt: 2 },
          why: 'a year is long enough that people lose track of the shape of it' },
        { label: 'Not sure yet', sub: 'We will assume a quarter, change it later', set: { horizon: 91 } }
      ]
    },
    {
      id: 'who', type: 'single',
      q: 'Who is doing the work?',
      options: [
        { label: 'Mostly just me', boost: {} },
        { label: 'Me and one or two others', boost: { plan: 1 } },
        { label: 'A handful of people, across a few teams',
          boost: { raci: 3, plan: 1 },
          why: 'a handful of people across teams is exactly where "who owns this" goes wrong' },
        { label: 'Lots of people, including other organizations',
          boost: { raci: 3, stakeholders: 3, plan: 1 },
          why: 'with other organizations involved, unclear ownership becomes expensive' }
      ]
    },
    {
      id: 'signoff', type: 'text', optional: true, rows: 2,
      q: 'Who needs to approve this, or be kept informed?',
      help: 'Names or roles, or leave it blank. This tells us whether you need a stakeholder ' +
        'map, and seeds it for you if you do.',
      placeholder: 'e.g. Kyle for the go/no-go, country director kept informed, finance sign off on budget',
      boostIfAnswered: { stakeholders: 2, onepager: 1 },
      why: 'you named people who need to approve it or stay informed'
    },
    {
      id: 'pain', type: 'multi',
      q: 'What is hardest about it right now?',
      help: 'Pick as many as apply, or none.',
      options: [
        { label: 'Nobody agrees what we are actually doing', boost: { charter: 4 },
          why: 'you said people do not agree what this is' },
        { label: 'It is unclear who is doing what', boost: { raci: 4 },
          why: 'you said ownership is unclear' },
        { label: 'I need to show people a timeline', boost: { gantt: 4 },
          why: 'you need something visual to show a timeline' },
        { label: 'I need to keep leadership or a funder updated', boost: { status: 3, onepager: 3 },
          why: 'you need to keep leadership or a funder updated' },
        { label: 'I am worried about what could go wrong', boost: { risks: 4 },
          why: 'you flagged worry about what could go wrong' },
        { label: 'The same decisions keep getting reopened', boost: { decisions: 4 },
          why: 'you said decisions keep getting reopened' },
        { label: 'We have not properly kicked off yet', boost: { kickoff: 4 },
          why: 'you have not kicked off yet' },
        { label: 'I just need a plan I can work from', boost: { plan: 4 },
          why: 'you want a plan you can work from' }
      ]
    }
  ];

  /* the plan is the backbone: almost every answer implies wanting one */
  var BASE = { plan: 3, charter: 1 };
  var CORE_MAX = 4;          /* never open with more than this */
  var CORE_THRESHOLD = 3;

  /* Pause before showing the next thing, in milliseconds. A visible beat makes the
     tool feel considered rather than like a form that snaps at you, and people
     trust a recommendation more when they can see it being worked out.
     Tune here: `step` is between questions, `result` is before the
     recommendations, `handoff` is while the builder is being filled in. Set any of
     them to 0 to remove that pause entirely. */
  var THINK = { step: 2000, result: 5000, handoff: 2400 };

  /* Every line below is a true description of what the code is doing at that
     moment: reading the answers, scoring the documents, building the schedule,
     assembling the set. Nothing here claims work that is not happening. */
  var STEP_MSGS = ['Taking that in'];
  var RESULT_MSGS = [
    'Reading what you told us',
    'Weighing which documents would actually help',
    'Fitting it to your timeline',
    'Putting your starting set together'
  ];
  var HANDOFF_MSGS = ['Setting up your documents'];
  var SHAPE_MSGS = ['Working out what to ask you next'];

  var answers = {};
  var step = 0;
  var thinking = null;       /* {msgs, total} while a pause is running */
  var thinkTimers = [];
  var thinkTick = null;
  /* null means "follow the recommendation". Once someone ticks or unticks
     anything it becomes their explicit set, and any change to an answer resets it
     so a fresh recommendation is not silently overridden by stale choices. */
  var picked = null;

  /* Stage two of the conversation. Once we know which documents someone needs,
     keep going and shape the contents: propose a phase structure for a Gantt, ask
     what is in and out of scope for a charter, and so on. Getting the right
     documents is only half the job; getting them the right shape is the rest. */
  var mode = 'ask';          /* 'ask' -> 'result' -> 'shape' */
  var shapeIdx = 0;
  var shape = {};

  /* ---------- scoring ---------- */
  function score() {
    var pts = {}, why = {};
    Object.keys(BASE).forEach(function (k) { pts[k] = BASE[k]; });

    var ev = {};      /* the answers themselves, quoted back as evidence */

    function add(boost, reason, evidence) {
      if (!boost) return;
      Object.keys(boost).forEach(function (d) {
        pts[d] = (pts[d] || 0) + boost[d];
        if (boost[d] < 2) return;         /* only strong signals get explained */
        if (reason) {
          why[d] = why[d] || [];
          if (why[d].indexOf(reason) < 0) why[d].push(reason);
        }
        if (evidence) {
          ev[d] = ev[d] || [];
          if (ev[d].indexOf(evidence) < 0) ev[d].push(evidence);
        }
      });
    }

    QUESTIONS.forEach(function (q) {
      var a = answers[q.id];
      if (a === undefined || a === null || a === '') return;
      if (q.type === 'single') {
        var opt = q.options[a];
        if (opt) add(opt.boost, opt.why, opt.label);
      } else if (q.type === 'multi') {
        (a || []).forEach(function (i) {
          var o = q.options[i];
          if (o) add(o.boost, o.why, o.label);
        });
      } else if (q.type === 'text' && q.boostIfAnswered && String(a).trim()) {
        add(q.boostIfAnswered, q.why, String(a).trim());
      }
    });

    var ranked = Object.keys(pts).map(function (id) {
      return { id: id, n: pts[id], why: why[id] || [], ev: ev[id] || [] };
    }).sort(function (a, b) { return b.n - a.n; });

    var core = ranked.filter(function (r) { return r.n >= CORE_THRESHOLD; }).slice(0, CORE_MAX);
    if (!core.length) core = ranked.slice(0, 2);
    var coreIds = core.map(function (r) { return r.id; });
    var later = ranked.filter(function (r) { return coreIds.indexOf(r.id) < 0 && r.n > 0; });
    return { core: core, later: later };
  }

  function presetFor() {
    var a = answers.kind;
    var opt = a != null && QUESTIONS[1].options[a];
    return (opt && opt.set && opt.set.preset) || 'strategic-initiative';
  }
  function horizonFor() {
    var a = answers.when;
    var opt = a != null && QUESTIONS[2].options[a];
    return (opt && opt.set && opt.set.horizon) || 91;
  }
  function horizonLabel() {
    var a = answers.when;
    var opt = a != null && QUESTIONS[2].options[a];
    return opt ? opt.label.toLowerCase().replace(/^it's /, '') : 'this quarter';
  }
  function kindLabel() {
    var a = answers.kind;
    var opt = a != null && QUESTIONS[1].options[a];
    return opt ? opt.label.toLowerCase() : '';
  }
  /* whatever the timeline is set to, so proposal dates are the dates they get */
  function startDate() { return shape.start || defaultStart(); }

  /* ---------- suggesting a project title ----------
     People type a sentence ("work out whether we should distribute reading
     glasses in ethiopia"). Trimming that sentence gave fragments like
     "Distribute reading glasses in ethiopia in", so instead we build a title:
     keep the nouns, drop the framing verbs and filler, put the place first,
     title case it, and append what kind of project it is. */

  /* places EvAc works in, so "ethiopia" leads the title whatever case it is typed in */
  var PLACES = ('ethiopia kenya malawi zambia nigeria liberia cameroon uganda tanzania ' +
    'india pakistan madagascar rwanda ghana senegal mozambique zimbabwe bangladesh ' +
    'nepal indonesia philippines vietnam bihar odisha telangana punjab haryana ' +
    'karnataka maharashtra gujarat rajasthan sokoto kaduna lagos nairobi delhi').split(' ');

  /* verbs that describe the doing, not the thing: the type suffix says it better */
  var DROP_VERBS = ('work works working figure figuring decide deciding determine ' +
    'assess assessing evaluate evaluating explore exploring investigate review ' +
    'reviewing scope scoping understand establish distribute distributing deliver ' +
    'delivering launch launching run running build building expand expanding scale ' +
    'scaling offer offering provide providing test testing pilot piloting trial hire ' +
    'hiring recruit recruiting set setting create creating develop developing ' +
    'implement implementing roll rolling introduce introducing conduct conducting ' +
    'improve improving increase increasing reduce reducing start starting begin ' +
    'continue continuing check checking find finding get getting make making take ' +
    'give giving move moving bring bringing put putting keep keeping').split(' ');

  var STOP = ('a an the and or but if whether we us our i my you your they their it its ' +
    'this that these those there here to of in on at by for from with without into onto ' +
    'over under about across through during before after above below up down out off ' +
    'is are was were be been being am do does did done have has had having can could ' +
    'will would shall should may might must need needs not no yes so then than as also ' +
    'more most less least much many some any all both each every other another such ' +
    'own same very just only even still yet again once how what when where which who ' +
    'whom why because while until unless since though although two three four five six ' +
    'seven eight nine ten new next last first second existing current additional ' +
    'further potential possible various several overall general key main core proper ' +
    'better best good full whole entire').split(' ');

  var TYPE_SUFFIX = {
    'scoping-diagnostic': 'Decision',
    'pilot-launch': 'Pilot',
    'partnership-mou': 'Partnership',
    'team-build': 'Recruitment',
    'evac-accelerator': 'Accelerator Review',
    'strategic-initiative': 'Initiative',
    'blank': ''
  };

  /* Title Case, leaving small joining words lowercase when they survive */
  var SMALL = ['and', 'or', 'of', 'in', 'for', 'to', 'the', 'a', 'an'];
  function titleCase(words) {
    return words.map(function (w, i) {
      if (i > 0 && SMALL.indexOf(w.toLowerCase()) >= 0) return w.toLowerCase();
      /* keep an existing internal capital (ANC, MOU, SQ-LNS) rather than flattening it */
      if (/[A-Z]/.test(w.slice(1))) return w;
      return w.split('-').map(function (part, j) {
        return j === 0
          ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          : part.toLowerCase();
      }).join('-');
    }).join(' ');
  }

  function suggestName() {
    var goal = String(answers.goal || '').trim();
    var suffix = TYPE_SUFFIX[presetFor()];
    if (!goal) return '';        /* nothing to work from: leave the field empty */

    /* first sentence only, and strip anything after "and get a decision by..." */
    var first = goal.split(/[.;\n?!]/)[0];
    var words = first.replace(/[(),:"']/g, ' ').split(/\s+/).filter(Boolean);

    var places = [], content = [];
    words.forEach(function (w) {
      var lower = w.toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (!lower || lower.length < 2) return;
      if (PLACES.indexOf(lower) >= 0) {
        if (places.indexOf(lower) < 0) places.push(w);
        return;
      }
      if (STOP.indexOf(lower) >= 0 || DROP_VERBS.indexOf(lower) >= 0) return;
      if (/^\d+$/.test(lower)) return;
      if (content.length < 3) content.push(w);
    });

    var parts = places.slice(0, 2).concat(content);
    if (!parts.length) return '';

    var title = titleCase(parts);
    /* the suffix says what kind of thing it is, unless the sentence said it already */
    if (suffix && title.toLowerCase().indexOf(suffix.split(' ')[0].toLowerCase()) < 0) {
      title += ' ' + suffix;
    }
    return title;
  }

  /* ---------- rendering ---------- */
  function docName(id) {
    var d = SIK.templates.DOCS.filter(function (x) { return x.id === id; })[0];
    return d ? d.name : id;
  }
  function docBlurb(id) {
    var d = SIK.templates.DOCS.filter(function (x) { return x.id === id; })[0];
    return d ? d.blurb : '';
  }
  function docHelps(id) {
    var d = SIK.templates.DOCS.filter(function (x) { return x.id === id; })[0];
    return (d && d.helps) || (d && d.blurb) || '';
  }
  function docExt(id) {
    var d = SIK.templates.DOCS.filter(function (x) { return x.id === id; })[0];
    return d && d.kind === 'sheet' ? 'xlsx' : 'md';
  }

  function answerSummary(q) {
    var a = answers[q.id];
    if (q.type === 'single') return q.options[a] ? q.options[a].label : '';
    if (q.type === 'multi') {
      if (!a || !a.length) return 'Nothing in particular';
      return a.map(function (i) { return q.options[i].label; }).join('; ');
    }
    return String(a || '').trim() || 'Skipped';
  }

  function render() {
    var host = $('guideFlow');
    var html = '';

    /* what has been answered so far, each changeable */
    for (var i = 0; i < step && i < QUESTIONS.length; i++) {
      var q = QUESTIONS[i];
      html += '<div class="gq gq-done">' +
        '<div class="gq-q">' + R.esc(q.q) +
          '<button type="button" class="btn-link gq-change" data-back="' + i + '">Change</button></div>' +
        '<div class="gq-a">' + R.esc(answerSummary(q)) + '</div>' +
      '</div>';
    }

    if (mode === 'shape' || mode === 'deliver') html += renderStageDone();

    if (thinking) {
      html += renderThinking();
    } else if (mode === 'deliver') {
      html += renderDeliver();
    } else if (mode === 'shape') {
      html += renderStage();
    } else if (step < QUESTIONS.length) {
      html += renderQuestion(QUESTIONS[step]);
    } else {
      html += renderResult();
    }
    host.innerHTML = html;

    if (!thinking) {
      var focusable = host.querySelector('.gq-active textarea, .gq-active input');
      if (focusable) focusable.focus();
    }
    updateProgress();
  }

  /* ---------- the considered pause ---------- */
  var ORBIT = '<span class="orbit" aria-hidden="true">' +
    '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>';

  /* 20.1s under a minute, 1m 6.2s over it */
  function elapsedText(ms) {
    var sec = ms / 1000;
    if (sec < 60) return sec.toFixed(1) + 's';
    return Math.floor(sec / 60) + 'm ' + (sec % 60).toFixed(1) + 's';
  }

  function renderThinking() {
    return '<div class="gq-think" role="status" aria-live="polite">' + ORBIT +
      '<span class="think-label" id="thinkMsg">' + R.esc(thinking.msgs[0]) + '</span>' +
      '<span class="think-time" id="thinkTime">0.0s</span>' +
    '</div>';
  }

  function clearThink() {
    thinkTimers.forEach(clearTimeout);
    thinkTimers = [];
    if (thinkTick) { clearInterval(thinkTick); thinkTick = null; }
    thinking = null;
  }

  /* Show a pause, cycling through msgs, then run done(). */
  function think(msgs, total, done) {
    /* If a pause is already running, cancel it and start this one. Returning
       early here would drop the request while the caller had already advanced
       its state, leaving the flow wedged on "Thinking..." with no pending
       timer and nothing to re-render it. */
    if (thinking) clearThink();
    if (!total) { done(); return; }        /* pause turned off in THINK */
    var began = Date.now();
    thinking = { msgs: msgs };
    render();

    /* the elapsed counter is the honest part of the wait: it shows exactly how
       long we have been holding things up */
    thinkTick = setInterval(function () {
      var el = $('thinkTime');
      if (el) el.textContent = elapsedText(Date.now() - began);
    }, 100);

    msgs.forEach(function (m, i) {
      if (i === 0) return;
      thinkTimers.push(setTimeout(function () {
        var el = $('thinkMsg');
        if (el) el.textContent = m;
      }, Math.round(total * i / msgs.length)));
    });

    thinkTimers.push(setTimeout(function () {
      clearThink();
      done();
    }, total));
  }

  /* move forward one question, with the appropriate pause */
  function advance() {
    step++;
    var atResult = step >= QUESTIONS.length;
    think(atResult ? RESULT_MSGS : STEP_MSGS,
      atResult ? THINK.result : THINK.step,
      render);
  }

  /* Choice questions render as an approval card: the question is the card's
     header and each option is a selectable row. Free-text questions cannot be
     asked that way, so they keep a textarea inside the same card. */
  function optionRows(options, isMulti, chosen, attr) {
    return '<div class="ac-opts' + (isMulti ? ' many' : '') + '">' +
      options.map(function (o, i) {
        var label = typeof o === 'string' ? o : o.label;
        var sub = typeof o === 'string' ? '' : o.sub;
        var on = isMulti ? (chosen || []).indexOf(i) >= 0 : chosen === i;
        return '<button type="button" class="ac-opt' + (on ? ' on' : '') + '"' +
          ' aria-pressed="' + (on ? 'true' : 'false') + '"' +
          ' ' + attr + '="' + i + '">' +
          '<span class="ac-mark"><i></i></span>' +
          '<span class="ac-label">' + R.esc(label) +
            (sub ? '<span class="ac-sub">' + R.esc(sub) + '</span>' : '') +
          '</span></button>';
      }).join('') + '</div>';
  }

  function renderQuestion(q) {
    var a = answers[q.id];
    var h = '<div class="gq gq-active ac">' +
      '<p class="ac-q">' + R.esc(q.q) + '</p>' +
      (q.help ? '<p class="ac-help">' + R.esc(q.help) + '</p>' : '');

    if (q.type === 'text') {
      h += '<textarea id="gqText" rows="' + (q.rows || 2) + '" placeholder="' +
        R.esc(q.placeholder || '') + '">' + R.esc(a || '') + '</textarea>';
    } else {
      h += optionRows(q.options, q.type === 'multi', a, 'data-pick');
    }

    var picks = q.type === 'multi' ? (a || []).length : 0;
    h += '<div class="ac-foot">' +
      (step > 0
        ? '<button type="button" class="btn-ghost btn-ghost-inline" data-back="' + (step - 1) + '">Back</button>'
        : '<span></span>') +
      '<span class="stage-actions">' +
        (q.type === 'multi'
          ? '<span class="ac-count" id="acCount">' +
              (picks ? picks + ' selected' : 'Pick any that apply') + '</span>'
          : '') +
        '<button type="button" class="btn-primary" id="gqNext">Continue</button>' +
      '</span>' +
    '</div>';
    return h + '</div>';
  }

  function pickedCount() {
    return Object.keys(picked || {}).filter(function (k) { return picked[k]; }).length;
  }

  function renderResult() {
    var s = score();
    var preset = SIK.templates.PRESETS[presetFor()];
    var days = horizonFor();
    if (!picked) {
      picked = {};
      s.core.forEach(function (r) { picked[r.id] = true; });
    }

    var h = '<div class="gq gq-result">' +
      '<h3>Start with these ' + s.core.length + '</h3>' +
      '<p class="gq-help">Left is what you told us. Right is what the document does about it. ' +
      'You can change any of this on the next screen, and nothing is generated until you export.</p>' +
      '<div class="rec-list">';

    s.core.forEach(function (r, i) {
      var reason = r.why.length
        ? R.esc(r.why.join('; and ')) + '.'
        : 'Almost every project needs one, whatever else is going on.';
      var quotes = r.ev.length
        ? '<ul class="rec-ev">' + r.ev.map(function (e) {
            return '<li>&ldquo;' + R.esc(e) + '&rdquo;</li>';
          }).join('') + '</ul>'
        : '';

      h += '<div class="rec' + (picked[r.id] ? '' : ' off') + '" data-rec="' + r.id + '">' +
        '<label class="rec-head">' +
          '<input type="checkbox" data-doc="' + r.id + '"' + (picked[r.id] ? ' checked' : '') + '>' +
          '<span class="rec-num">' + (i + 1) + '</span>' +
          '<span class="rec-name">' + R.esc(docName(r.id)) + '</span>' +
          '<span class="rec-ext">.' + R.esc(docExt(r.id)) + '</span>' +
        '</label>' +
        '<div class="rec-cols">' +
          '<div class="rec-col">' +
            '<div class="rec-k">Why we suggested it</div>' +
            '<p class="rec-why">' + reason + '</p>' + quotes +
          '</div>' +
          '<div class="rec-col rec-col-help">' +
            '<div class="rec-k">How it will help</div>' +
            '<p class="rec-helps">' + R.esc(docHelps(r.id)) + '</p>' +
            '<p class="rec-blurb">' + R.esc(docBlurb(r.id)) + '</p>' +
          '</div>' +
        '</div>' +
      '</div>';
    });
    h += '</div>';

    /* Everything not recommended, still tickable. The scoring is a heuristic and
       will sometimes be wrong, so it must never be a dead end. */
    var coreIds = s.core.map(function (r) { return r.id; });
    var others = SIK.templates.DOCS.filter(function (d) { return coreIds.indexOf(d.id) < 0; });
    if (others.length) {
      h += '<h3 class="gq-later">Not suggested, but available</h3>' +
        '<p class="gq-help">If we read your situation wrong, add anything here.</p>' +
        '<div class="alt-list">' + others.map(function (d) {
          return '<label class="alt' + (picked[d.id] ? ' on' : '') + '" data-rec="' + d.id + '">' +
            '<input type="checkbox" data-doc="' + d.id + '"' + (picked[d.id] ? ' checked' : '') + '>' +
            '<span><span class="alt-name">' + R.esc(d.name) +
              '<span class="rec-ext">.' + R.esc(docExt(d.id)) + '</span></span>' +
              '<span class="alt-helps">' + R.esc(docHelps(d.id)) + '</span></span>' +
          '</label>';
        }).join('') + '</div>';
    }

    h += '<div class="rec-setup">' +
      '<div class="rec-setup-row"><span>Template</span><b>' + R.esc(preset.label) + '</b></div>' +
      '<div class="rec-setup-row"><span>Timeline</span><b>' + days + ' days</b></div>' +
      '<label class="field"><span>What should we call it?</span>' +
        '<input type="text" id="gqName" value="' + R.esc(suggestName()) + '" placeholder="Project name"></label>' +
      '<label class="field"><span>Who owns it? (you, probably)</span>' +
        '<input type="text" id="gqOwner" list="peopleList" placeholder="Name"></label>' +
    '</div>';

    h += '<div class="gq-nav">' +
      '<button type="button" class="btn-ghost btn-ghost-inline" data-back="' + (QUESTIONS.length - 1) + '">Back</button>' +
      '<button type="button" class="btn-primary" id="gqBuild">' + buildLabel() + '</button>' +
    '</div>';

    return h + '</div>';
  }

  function buildLabel() {
    var n = pickedCount();
    if (!n) return 'Pick at least one';
    if (mode === 'shape') return 'Set up my ' + n + (n === 1 ? ' document' : ' documents');
    return 'Next: shape these ' + n;
  }

  function updateProgress() {
    var el = $('guideProgress');
    if (!el) return;
    var total = QUESTIONS.length;
    var label, pct;
    if (mode === 'deliver') {
      el.innerHTML = '<div class="prog-track"><div class="prog-fill" style="width:100%"></div>' +
        '</div><span class="prog-text">Done</span>';
      return;
    }
    if (mode === 'shape') {
      var stages = activeStages();
      /* second half of the bar belongs to shaping */
      pct = 50 + Math.round(shapeIdx / Math.max(1, stages.length) * 50);
      label = thinking ? 'Thinking…'
        : 'Shaping your documents, ' + (shapeIdx + 1) + ' of ' + stages.length;
    } else {
      pct = Math.round(Math.min(step, total) / total * 50);
      label = thinking ? 'Thinking…'
        : (step >= total ? 'Here is what we suggest' : 'Question ' + (step + 1) + ' of ' + total);
    }
    el.innerHTML = '<div class="prog-track"><div class="prog-fill" style="width:' +
      pct + '%"></div></div><span class="prog-text">' + label + '</span>';
  }

  /* ---------- interaction ---------- */
  function commitCurrent() {
    var q = QUESTIONS[step];
    if (!q) return true;
    if (q.type === 'text') {
      var el = $('gqText');
      if (el && el.value !== answers[q.id]) picked = null;
      answers[q.id] = el ? el.value : '';
      if (!q.optional && !String(answers[q.id]).trim()) return false;
    }
    if (q.type === 'single' && answers[q.id] == null) return false;
    if (q.type === 'multi' && !answers[q.id]) answers[q.id] = [];
    return true;
  }

  function onClick(e) {
    /* clicks during a pause would queue up behind it and fire out of order */
    if (thinking) return;

    var back = e.target.closest('[data-back]');
    if (back) {
      mode = 'ask';
      if (step < QUESTIONS.length) commitCurrent();
      step = +back.getAttribute('data-back');
      render();               /* going back is instant: a wait there reads as lag */
      return;
    }

    var pick = e.target.closest('[data-pick]');
    if (pick) {
      var q = QUESTIONS[step];
      var i = +pick.getAttribute('data-pick');
      if (q.type === 'multi') {
        answers[q.id] = answers[q.id] || [];
        var at = answers[q.id].indexOf(i);
        if (at >= 0) answers[q.id].splice(at, 1); else answers[q.id].push(i);
        picked = null;              /* answers changed: re-recommend */
        mode = 'ask'; shape = {}; shapeIdx = 0;
        /* toggle in place: re-rendering the whole flow on every choice makes the
           page jump and throws away the node that was just clicked */
        pick.classList.toggle('on', at < 0);
        pick.setAttribute('aria-pressed', at < 0 ? 'true' : 'false');
        var cnt = $('acCount');
        if (cnt) {
          var n = answers[q.id].length;
          cnt.textContent = n ? n + ' selected' : 'Pick any that apply';
        }
      } else {
        answers[q.id] = i;
        picked = null;              /* answers changed: re-recommend */
        mode = 'ask'; shape = {}; shapeIdx = 0;
        advance();                  /* single choice moves on by itself */
      }
      return;
    }

    if (e.target.id === 'gqNext') {
      if (!commitCurrent()) {
        var box = $('gqText');
        if (box) { box.classList.add('needs'); box.focus(); }
        return;
      }
      advance();
      return;
    }

    if (e.target.id === 'gqBuild') {
      startShaping();
      return;
    }

    if (e.target.id === 'dlExport') {
      SIK.setFormats({
        sheet: $('dlSheet').value, doc: $('dlDoc').value, bundle: $('dlBundle').value
      });
      SIK.exportNow(lastFeedbackText);
      $('dlNote').textContent = 'Downloaded. Check your downloads folder.';
      return;
    }

    /* read the box, show what was understood, change nothing yet */
    if (e.target.id === 'dlRead') {
      lastFeedbackText = ($('dlFeedback') && $('dlFeedback').value.trim()) || '';
      if (!lastFeedbackText) { $('dlFeedback').focus(); return; }
      fbResult = SIK.feedback.parse(lastFeedbackText, { docs: SIK.summary().docs });
      render();
      return;
    }

    /* apply only the boxes still ticked */
    if (e.target.id === 'dlApply') {
      var keep = [];
      $('guideFlow').querySelectorAll('[data-fbi]').forEach(function (box) {
        if (box.checked) keep.push(fbResult.changes[+box.getAttribute('data-fbi')]);
      });
      var n = SIK.applyFeedback(keep);
      fbApplied += n;
      fbResult = null;
      if ($('dlFeedback')) $('dlFeedback').value = '';
      render();
      window.scrollTo(0, 0);
      return;
    }

    /* ---- shaping stage controls ---- */
    var sEdit = e.target.closest('[data-stageedit]');
    if (sEdit) { shape._editing = sEdit.getAttribute('data-stageedit'); render(); return; }

    var sPick = e.target.closest('[data-stagepick]');
    if (sPick) {
      var stg = activeStages()[shapeIdx];
      if (stg) stg.commit(stg.options[+sPick.getAttribute('data-stagepick')]);
      advanceStage();
      return;
    }

    var tAdd = e.target.closest('[data-tadd]');
    if (tAdd) {
      var stA = activeStages()[shapeIdx];
      var rows = readTable();
      rows.push(stA.textCol === 1 ? { name: '', ask: '' } : { name: 'New stage', days: 7 });
      stA.commit(rows);
      render();
      return;
    }

    var tRm = e.target.closest('[data-trm]');
    if (tRm) {
      var stR = activeStages()[shapeIdx];
      var rws = readTable();
      rws.splice(+tRm.getAttribute('data-trm'), 1);
      stR.commit(rws);
      render();
      return;
    }

    /* skip leaves the placeholders in place: nothing is committed */
    if (e.target.closest('[data-stageskip]')) {
      shape._editing = null;
      var stages2 = activeStages();
      if (shapeIdx >= stages2.length - 1) { finish(); return; }
      shapeIdx++;
      think(STEP_MSGS, THINK.step, render);
      return;
    }

    var sGo = e.target.closest('[data-stagego]');
    if (sGo) { commitStage(); shape._editing = null; shapeIdx = +sGo.getAttribute('data-stagego'); render(); return; }

    if (e.target.closest('[data-stageback]')) { stageBack(); return; }
    if (e.target.id === 'stageNext') { advanceStage(); return; }
  }

  /* Knowing which documents you need is half the job. Keep the conversation going
     and shape what goes inside them. */
  function startShaping() {
    if (!pickedCount()) return;
    shape.name = ($('gqName') && $('gqName').value.trim()) || suggestName() || 'Untitled initiative';
    shape.owner = ($('gqOwner') && $('gqOwner').value.trim()) || '';
    if (!activeStages().length) { finish(); return; }
    mode = 'shape';
    shapeIdx = 0;
    think(SHAPE_MSGS, THINK.step, render);
  }

  /* ticking a document on the results screen: update in place so the page does
     not jump and the reasoning above stays where the reader left it */
  function onDocToggle(e) {
    var box = e.target.closest('[data-doc]');
    if (!box || !picked) return;
    var id = box.getAttribute('data-doc');
    picked[id] = box.checked;
    var card = $('guideFlow').querySelector('[data-rec="' + id + '"]');
    if (card) {
      card.classList.toggle('off', card.classList.contains('rec') && !box.checked);
      card.classList.toggle('on', card.classList.contains('alt') && box.checked);
    }
    var btn = $('gqBuild');
    if (btn) { btn.textContent = buildLabel(); btn.disabled = pickedCount() === 0; }
  }

  function finish() {
    if (!pickedCount()) return;
    var chosen = SIK.templates.DOCS.filter(function (d) { return picked[d.id]; })
      .map(function (d) { return d.id; });
    /* name and owner were captured when shaping started: the spinner replaces the
       results card, so those inputs are long gone by the time this runs */
    think(HANDOFF_MSGS, THINK.handoff, function () {
      mode = 'deliver';
      SIK.applyGuide({
        goal: String(answers.goal || '').trim(),
        project: shape.name || suggestName() || 'Untitled initiative',
        owner: shape.owner || '',
        signoff: String(answers.signoff || '').trim(),
        preset: presetFor(),
        horizon: horizonFor(),
        docs: chosen,
        /* everything settled during the shaping conversation */
        start: shape.start || defaultStart(),
        stages: (shape.stages && shape.stages.length) ? shape.stages : null,
        team: (function () {
          var t = (shape.team || []).filter(function (m) { return m.name; });
          if (t.length) return t;
          /* skipped the question, but they still named someone earlier */
          var seeded = peopleFromSignoff();
          return shape.owner
            ? [{ name: shape.owner, ask: '' }].concat(seeded)
            : seeded;
        })(),
        around: shape.around || null,
        inScope: shape.inScope || null,
        outScope: shape.outScope || null,
        worries: shape.worries || null,
        cadence: shape.cadence || '',
        stayOnGuide: true          /* the delivery screen below is the handover */
      });
      render();
      window.scrollTo(0, 0);
    });
  }

  /* ---------- stage two: shaping the documents ----------
     Each stage declares which documents make it relevant, so someone who only
     wanted a decision log is never asked about scope. Types:
       proposal  we suggest a structure, they accept it or edit it
       lines     one item per line
       pair      two line lists side by side
       single    pick one */
  function splitLines(t) {
    return String(t || '').split('\n')
      .map(function (l) { return l.trim(); }).filter(Boolean);
  }

  /* ---------- people named in the sign-off answer ----------
     Someone who writes "need to let Kyle know at the end" has told us both a name
     and what they want from them. That used to reach only the stakeholder map,
     which meant the RACI arrived without the one person they had actually named.
     Now it seeds the team question and the RACI columns as well. */

  /* words that get capitalised because they start a sentence, not because they are names */
  var NOT_NAMES = ('need needs want wants must should would could will let lets keep keeps ' +
    'make makes tell tells inform informs update updates please also and but the this that ' +
    'these those it he she they we i my our once when after before at by for to in on of ' +
    'get gets give gives run runs sign signs approve approves review reviews check checks ' +
    'nobody none someone anyone everyone maybe probably just only').split(' ');

  function expandName(token) {
    /* a bare first name is usually enough to identify someone on the roster.
       SIK.people, not app.js's ROSTER: that one is not in this file's scope. */
    var hits = (SIK.people || []).filter(function (per) {
      return per.n.split(/\s+/)[0].toLowerCase() === token.toLowerCase();
    });
    return hits.length === 1 ? hits[0].n : token;
  }

  function peopleFromSignoff() {
    var txt = String(answers.signoff || '').trim();
    if (!txt) return [];
    var out = [];
    txt.split(/[;,\n]|\band\b/).forEach(function (frag) {
      var f = frag.trim().replace(/[.\s]+$/, '');
      if (!f) return;
      var words = f.split(/\s+/);
      var name = '';
      for (var i = 0; i < words.length; i++) {
        var bare = words[i].replace(/[^A-Za-z'-]/g, '');
        if (/^[A-Z]/.test(bare) && NOT_NAMES.indexOf(bare.toLowerCase()) < 0) {
          name = expandName(bare);
          break;
        }
      }
      /* the fragment reads as the ask once the framing is trimmed off the front */
      var ask = f.replace(/^(?:we\s+|i\s+)?(?:need to|want to|have to|must|should)\s+/i, '');
      ask = ask.charAt(0).toLowerCase() + ask.slice(1);
      if (!name) return;                      /* a role, not a person: stakeholder map has it */
      if (out.some(function (o) { return o.name === name; })) return;
      out.push({ name: name, ask: ask });
    });
    return out;
  }

  /* ---------- the draggable timeline ----------
     Stage lengths are easier to feel than to type, so the boundaries between
     stages are draggable. Dragging a boundary lengthens the stage before it and
     shortens the one after, which keeps the finish date still; dragging the last
     one moves the finish date itself. Every handle is also focusable and takes
     arrow keys, because a control you can only reach with a mouse is a control
     some people cannot reach at all. */

  function tlStart() { return P.parseISO(shape.start || defaultStart()); }

  /* a few weeks out, on a Monday: almost nothing really starts tomorrow */
  function defaultStart() {
    var d = P.addDays(P.today(), 14);
    while (d.getUTCDay() !== 1) d = P.addDays(d, 1);
    return P.iso(d);
  }

  /* cumulative end-offsets, in days from the start */
  function boundaries(stages) {
    var acc = 0;
    return stages.map(function (s) { acc += Math.max(1, s.days); return acc; });
  }

  function totalDays(stages) {
    return stages.reduce(function (n, s) { return n + Math.max(1, s.days); }, 0);
  }

  function renderTimeline(stages) {
    var start = tlStart();
    var total = totalDays(stages);
    var bounds = boundaries(stages);

    /* month ticks along the axis */
    var ticks = '';
    var cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    while (cur <= P.addDays(start, total - 1)) {
      var off = P.diffDays(start, cur);
      if (off > 0 && off < total) {
        ticks += '<span class="tl-tick" style="left:' + (off / total * 100) + '%">' +
          P.MONTHS[cur.getUTCMonth()] + '</span>';
      }
      cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));
    }

    var segs = '', handles = '', from = 0;
    stages.forEach(function (s, i) {
      var w = Math.max(1, s.days) / total * 100;
      segs += '<div class="tl-seg s' + (i % 4) + '" style="width:' + w + '%" title="' +
        R.esc(s.name) + '"><span>' + (i + 1) + '</span></div>';
      from = bounds[i];
      var last = i === stages.length - 1;
      handles += '<button type="button" class="tl-handle' + (last ? ' tl-end' : '') + '"' +
        ' style="left:' + (from / total * 100) + '%"' +
        ' data-tlh="' + i + '"' +
        ' aria-label="' + R.esc(s.name) + ' ends ' + P.fmtShort(P.addDays(start, from - 1)) +
          '. Arrow keys to move."' +
        ' title="' + R.esc(s.name) + ' ends ' + P.fmtShort(P.addDays(start, from - 1)) + '">' +
        '<i></i></button>';
    });

    return '<div class="tl-wrap">' +
      '<div class="tl" id="tlBar">' +
        '<div class="tl-segs">' + segs + '</div>' + handles +
      '</div>' +
      '<div class="tl-axis">' +
        '<span class="tl-from">' + P.fmtShort(start) + '</span>' + ticks +
        '<span class="tl-to">' + P.fmtShort(P.addDays(start, total - 1)) + '</span>' +
      '</div>' +
    '</div>';
  }

  function renderStageList(stages) {
    var start = tlStart();
    var bounds = boundaries(stages);
    var total = totalDays(stages);
    return '<div class="tl-list">' + stages.map(function (s, i) {
      var from = i ? bounds[i - 1] : 0;
      var s0 = P.addDays(start, from);
      var s1 = P.addDays(start, bounds[i] - 1);
      return '<div class="tl-row">' +
        '<span class="tl-num s' + (i % 4) + '">' + (i + 1) + '</span>' +
        '<input type="text" data-tk="name" data-ti="' + i + '" value="' + R.esc(s.name || '') +
          '" placeholder="Stage name">' +
        '<span class="days-in"><input type="number" data-tk="days" data-ti="' + i +
          '" min="1" max="730" value="' + Math.max(1, s.days) + '"><em>days</em></span>' +
        '<span class="tl-dates">' + P.fmtShort(s0) + ' to ' + P.fmtShort(s1) + '</span>' +
        '<button type="button" class="btn-x" data-trm="' + i + '" title="Remove">&times;</button>' +
      '</div>';
    }).join('') + '</div>' +
    '<p class="tbl-total">' + total + ' days in total, finishing ' +
      P.fmtLong(P.addDays(start, total - 1)) + '.</p>';
  }

  /* move the boundary after stage i by `delta` days */
  function nudgeBoundary(i, delta) {
    var stages = proposedStages();
    if (!stages[i]) return;
    var last = i === stages.length - 1;
    var before = Math.max(1, stages[i].days);

    if (last) {
      stages[i].days = Math.max(1, before + delta);       /* the finish date moves */
    } else {
      var after = Math.max(1, stages[i + 1].days);
      /* clamp so neither neighbour drops below a day: the finish date holds still */
      var d = Math.max(1 - before, Math.min(after - 1, delta));
      stages[i].days = before + d;
      stages[i + 1].days = after - d;
    }
    shape.stages = stages;
  }

  /* live redraw of just the timeline and list, so dragging feels immediate */
  function repaintTimeline() {
    var host = $('tlHost');
    if (!host) return;
    var stages = proposedStages();
    host.innerHTML = renderTimeline(stages) + renderStageList(stages);
  }

  function startDrag(handle, ev) {
    var bar = $('tlBar');
    if (!bar) return;
    var i = +handle.getAttribute('data-tlh');
    var rect = bar.getBoundingClientRect();
    var total = totalDays(proposedStages());
    var pxPerDay = rect.width / total;
    var startX = ev.clientX;
    var moved = 0;

    function onMove(e) {
      var delta = Math.round((e.clientX - startX) / pxPerDay) - moved;
      if (!delta) return;
      nudgeBoundary(i, delta);
      moved += delta;
      repaintTimeline();
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.classList.remove('dragging');
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    document.body.classList.add('dragging');
  }

  /* A stage is {name, days}. Lengths come from the preset's own weighting, which
     is deliberately uneven: a deep dive really is longer than a screening. */
  function proposedStages() {
    if (shape.stages && shape.stages.length) {
      return shape.stages.map(function (st) { return { name: st.name, days: st.days }; });
    }
    var preset = SIK.templates.PRESETS[presetFor()];
    var total = horizonFor();
    var sumW = preset.phases.reduce(function (n, ph) { return n + (ph.weight || 1); }, 0);
    return preset.phases.map(function (ph) {
      return { name: ph.name, days: Math.max(1, Math.round((ph.weight || 1) / sumW * total)) };
    });
  }

  function stagesSchedule(stages) {
    return P.buildSchedule({
      startDate: startDate(),
      horizonDays: stages.reduce(function (n, s) { return n + s.days; }, 0),
      phases: stages.map(function (s) {
        return { name: s.name, days: s.days, tasks: [{ name: 'placeholder' }] };
      })
    });
  }

  function daysPhrase(d) {
    if (d < 7) return d + (d === 1 ? ' day' : ' days');
    var wk = Math.round(d / 7);
    return wk + (wk === 1 ? ' week' : ' weeks');
  }

  var STAGES = [
    {
      id: 'stages', needs: ['plan', 'gantt'], type: 'timeline',
      title: 'Does this shape look right?',
      why: 'This becomes the phases of your project plan and the bars on your Gantt.',
      propose: function () {
        var st = proposedStages();
        var sched = stagesSchedule(st);
        var total = st.reduce(function (n, x) { return n + x.days; }, 0);
        var lens = st.map(function (x) { return x.days; });
        var even = Math.min.apply(null, lens) === Math.max.apply(null, lens);
        return {
          lead: 'You said ' + horizonLabel() + (kindLabel() ? ', ' + kindLabel() : '') +
            '. Here is a ' + total + ' day shape in ' + st.length + ' stages' +
            (even ? '' : ', longer where the work usually is') +
            '. Change any length and everything after it shifts.',
          sched: sched
        };
      },
      rows: function () { return proposedStages(); },
      commit: function (rows) { if (rows.length) shape.stages = rows; }
    },
    {
      id: 'around', needs: ['plan', 'gantt'], type: 'lines', skippable: true,
      title: 'Anything to plan around?',
      why: 'Recorded on the plan and in the charter so the dates get read with it in mind.',
      help: 'Holidays, fieldwork, someone on leave, a board meeting you have to hit. ' +
        'One per line. Dates are not shifted automatically, so treat these as the notes ' +
        'you check the plan against.',
      placeholder: 'Team offsite 8 to 12 September\nCountry director on leave in October\nBoard papers due 20 November',
      value: function () { return (shape.around || []).join('\n'); },
      commit: function (text) { shape.around = splitLines(text); }
    },
    {
      id: 'team', needs: ['raci', 'plan'], type: 'table', skippable: true,
      title: 'Who is involved, and what do you need from them?',
      why: 'Names become the columns of your RACI, marked C or I from what you need from ' +
        'them. It also sets their decision rights in the charter and what they care about in ' +
        'the stakeholder map.',
      help: function () {
        var seeded = peopleFromSignoff();
        return seeded.length
          ? 'Carried over from your earlier answer: ' +
            seeded.map(function (x) { return x.name; }).join(', ') + '. Edit or remove freely.'
          : '';
      },
      cols: ['Name', 'What you need from them'],
      textCol: 1,
      rows: function () {
        if (shape.team && shape.team.length) return shape.team.slice();
        var seeded = [{ name: shape.owner || '', ask: '' }].concat(peopleFromSignoff());
        while (seeded.length < 3) seeded.push({ name: '', ask: '' });
        return seeded;
      },
      commit: function (rows) { shape.team = rows; }
    },
    {
      id: 'scope', needs: ['charter'], type: 'pair', skippable: true,
      title: 'What is in, and what is deliberately out?',
      why: 'Fills the In scope and Explicitly out of scope sections of your charter, so the ' +
        'boundary is written down once instead of argued about later.',
      help: 'The second box is the one that earns its keep. One item per line.',
      a: { label: 'In scope', placeholder: 'Review the existing evidence\nInterview 8 to 10 people\nWrite a recommendation' },
      b: { label: 'Explicitly out of scope', placeholder: 'Running a pilot\nAnything past the go/no-go decision' },
      value: function () { return [(shape.inScope || []).join('\n'), (shape.outScope || []).join('\n')]; },
      commit: function (a, b) { shape.inScope = splitLines(a); shape.outScope = splitLines(b); }
    },
    {
      id: 'worries', needs: ['risks'], type: 'lines', skippable: true,
      title: 'What worries you most?',
      why: 'These open your risk register, above the generic risks that come with the template.',
      help: 'One per line, in plain language.',
      placeholder: 'The partner may not have capacity in the second half\nApproval slips past October',
      value: function () { return (shape.worries || []).join('\n'); },
      commit: function (text) { shape.worries = splitLines(text); }
    },
    {
      id: 'cadence', needs: ['status', 'onepager'], type: 'single', skippable: true,
      title: 'How often will you update people?',
      why: 'Sets the reporting period on your update template and notes it in the charter.',
      options: ['Weekly', 'Fortnightly', 'Monthly', 'At milestones only'],
      value: function () { return shape.cadence || ''; },
      commit: function (v) { shape.cadence = v; }
    }
  ];

  function activeStages() {
    return STAGES.filter(function (st) {
      return st.needs.some(function (d) { return picked && picked[d]; });
    });
  }


  /* ---------- the last screen ----------
     Reads top to bottom as: here is what we understood, here is what is ready,
     take it. The summary sits above the documents so the inputs are visible at a
     glance instead of buried in the transcript. */
  var fbResult = null;      /* the last parse, awaiting confirmation */
  var lastFeedbackText = '';
  var fbApplied = 0;

  function renderDeliver() {
    var sum = SIK.summary();
    var docs = sum.docs.map(function (id) {
      return SIK.templates.DOCS.filter(function (x) { return x.id === id; })[0];
    }).filter(Boolean);

    var facts = [
      ['Owner', sum.owner || 'not set'],
      ['Approach', sum.template],
      ['Runs', sum.start + ' to ' + sum.end],
      ['Length', sum.days + ' days across ' + sum.stages +
        (sum.stages === 1 ? ' stage' : ' stages')]
    ];
    if (sum.team) facts.push(['Team', sum.team + (sum.team === 1 ? ' person' : ' people')]);
    if (sum.cadence) facts.push(['Updates', sum.cadence]);

    var h = '<div class="dlv">' +

      /* --- the ready banner --- */
      '<div class="dlv-ready">' +
        '<span class="dlv-check" aria-hidden="true">&#10003;</span>' +
        '<span><b>' + docs.length + ' document' + (docs.length === 1 ? '' : 's') +
          ' ready for ' + R.esc(sum.project) + '</b>' +
          '<em>Built in your browser from your answers. Nothing has been sent anywhere.</em>' +
        '</span>' +
      '</div>' +

      /* --- the documents, as a grid --- */
      '<div class="dlv-grid">' + docs.map(function (d) {
        return '<div class="dlv-doc">' +
          '<span class="dl-ext ' + (d.kind === 'sheet' ? 'is-x' : 'is-d') + '">' +
            (d.kind === 'sheet' ? 'XLS' : 'DOC') + '</span>' +
          '<span class="dlv-doc-body">' +
            '<span class="dl-name">' + R.esc(d.name) + '</span>' +
            '<span class="dl-helps">' + R.esc(d.helps || d.blurb || '') + '</span>' +
          '</span>' +
        '</div>';
      }).join('') + '</div>' +

      /* --- take it --- */
      '<div class="dlv-take">' +
        '<div class="dlv-fmt">' +
          '<label class="ff"><span>Spreadsheets</span>' +
            '<select id="dlSheet"><option value="xlsx">Excel (.xlsx)</option>' +
            '<option value="csv">CSV (.csv)</option></select></label>' +
          '<label class="ff"><span>Documents</span>' +
            '<select id="dlDoc"><option value="md">Markdown (.md)</option>' +
            '<option value="html">Word (.html)</option></select></label>' +
          '<label class="ff"><span>As</span>' +
            '<select id="dlBundle"><option value="zip">One zip</option>' +
            '<option value="files">Separate files</option></select></label>' +
        '</div>' +
        '<button type="button" class="btn-primary dl-go" id="dlExport">' +
          'Download ' + docs.length + ' document' + (docs.length === 1 ? '' : 's') + '</button>' +
        '<p class="dl-note" id="dlNote">' +
          (fbApplied ? fbApplied + ' change' + (fbApplied === 1 ? '' : 's') +
            ' applied. The documents above are up to date.' : '') + '</p>' +
      '</div>' +

      /* --- what it was built from: reference, so it sits under the outcome --- */
      '<div class="dlv-sum">' +
        '<p class="dlv-sum-k">Built from what you told us</p>' +
        '<h3 class="dlv-title">' + R.esc(sum.project) + '</h3>' +
        '<dl class="dlv-facts">' + facts.map(function (f) {
          return '<div><dt>' + R.esc(f[0]) + '</dt><dd>' + R.esc(f[1]) + '</dd></div>';
        }).join('') + '</dl>' +
      '</div>' +

      /* --- changes --- */
      '<div class="dlv-more">' +
        '<p class="dlv-more-q">Want something different?</p>' +
        '<p class="dlv-more-help">Say it plainly and it will change the documents before you ' +
          'download. Things like <em>add a decision log</em>, <em>drop the Gantt</em>, ' +
          '<em>add a risk that approval slips</em>, <em>running a pilot is out of scope</em>, ' +
          '<em>make it 12 weeks</em>, <em>weekly updates</em>, or <em>add Priya, she signs off ' +
          'the budget</em>.</p>' +
        '<textarea id="dlFeedback" rows="3" placeholder="Add a decision log and make it 12 weeks"></textarea>' +
        '<div class="dlv-more-row">' +
          '<button type="button" class="btn-primary btn-sm" id="dlRead">Apply to my documents</button>' +
          '<button type="button" class="btn-ghost btn-ghost-inline" data-goto="build">Or edit every field yourself</button>' +
        '</div>' +
        (fbResult ? renderParse(fbResult) : '') +
      '</div>' +
    '</div>';
    return h;
  }

  /* what the parser understood, shown before anything is applied */
  function renderParse(res) {
    var h = '<div class="fb-read">';
    if (res.changes.length) {
      h += '<p class="fb-read-k">I can do this</p><ul class="fb-ok">' +
        res.changes.map(function (c, i) {
          return '<li><label><input type="checkbox" data-fbi="' + i + '" checked>' +
            '<span>' + R.esc(c.label) + '</span></label></li>';
        }).join('') + '</ul>';
    }
    if (res.noops.length) {
      h += '<p class="fb-read-k">Already the case</p><ul class="fb-no">' +
        res.noops.map(function (n) { return '<li>' + R.esc(n) + '</li>'; }).join('') + '</ul>';
    }
    if (res.unmatched.length) {
      h += '<p class="fb-read-k">I could not act on this</p><ul class="fb-no">' +
        res.unmatched.map(function (u) { return '<li>&ldquo;' + R.esc(u) + '&rdquo;</li>'; }).join('') +
        '</ul><p class="fb-read-note">Recorded so the tool can learn to handle it. ' +
        'To make this change now, edit the fields directly in the builder.</p>';
    }
    if (!res.changes.length && !res.noops.length && !res.unmatched.length) {
      h += '<p class="fb-read-note">Nothing to act on there.</p>';
    }
    if (res.changes.length) {
      h += '<button type="button" class="btn-primary btn-sm" id="dlApply">Make these changes</button>';
    }
    return h + '</div>';
  }

  function renderStage() {
    var stages = activeStages();
    var st = stages[shapeIdx];
    if (!st) return '';
    var last = shapeIdx === stages.length - 1;
    var h = '<div class="gq gq-active gq-stage ac">' +
      '<p class="ac-q">' + R.esc(st.title) + '</p>' +
      (st.why ? '<p class="ac-why"><b>Why this helps:</b> ' + R.esc(st.why) + '</p>' : '') +
      (function () {
        var hp = typeof st.help === 'function' ? st.help() : st.help;
        return hp ? '<p class="ac-help">' + R.esc(hp) + '</p>' : '';
      })();

    if (st.type === 'timeline') {
      var tstages = proposedStages();
      h += '<p class="prop-lead">' + R.esc(st.propose().lead) + '</p>' +
        '<label class="ff tl-start"><span>Start date</span>' +
          '<input type="date" id="tlStart" value="' + R.esc(shape.start || defaultStart()) + '"></label>' +
        '<p class="tl-hint">Drag the markers to move a stage boundary. The last one moves the ' +
          'finish date; the others trade days between neighbours. Arrow keys work too.</p>' +
        '<div id="tlHost">' + renderTimeline(tstages) + renderStageList(tstages) + '</div>' +
        '<button type="button" class="btn-ghost" data-tadd="1">+ Add stage</button>';
    } else if (st.type === 'table') {
      var rows = st.rows();
      if (st.propose) {
        var pr = st.propose();
        h += '<p class="prop-lead">' + R.esc(pr.lead) + '</p>';
      }
      var sched = null;
      h += '<div class="tbl">' +
        '<div class="tbl-head"><span>' + R.esc(st.cols[0]) + '</span><span>' +
          R.esc(st.cols[1]) + '</span>' + (sched ? '<span>Lands</span>' : '') + '<span></span></div>' +
        rows.map(function (r, i) {
          var second = st.textCol === 1
            ? '<input type="text" data-tk="ask" data-ti="' + i + '" value="' + R.esc(r.ask || '') +
                '" placeholder="e.g. signs off the budget">'
            : '<span class="days-in"><input type="number" data-tk="days" data-ti="' + i +
                '" min="1" max="730" value="' + (r.days || 1) + '"><em>days</em></span>';
          var lands = sched && sched.phases[i]
            ? '<span class="tbl-lands">' + P.fmtShort(sched.phases[i].start) + ' to ' +
                P.fmtShort(sched.phases[i].end) + '</span>'
            : (sched ? '<span class="tbl-lands"></span>' : '');
          return '<div class="tbl-row">' +
            '<input type="text" data-tk="name" data-ti="' + i + '" value="' +
              R.esc(r.name || '') + '" placeholder="' + R.esc(st.cols[0]) + '">' +
            second + lands +
            '<button type="button" class="btn-x" data-trm="' + i + '" title="Remove">&times;</button>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<button type="button" class="btn-ghost" data-tadd="1">+ Add ' +
        R.esc(st.cols[0].toLowerCase()) + '</button>';
      if (sched) {
        var total = rows.reduce(function (n, r) { return n + (Number(r.days) || 0); }, 0);
        h += '<p class="tbl-total">' + total + ' days in total, finishing ' +
          P.fmtLong(sched.end) + '.</p>';
      }
    } else if (st.type === 'lines') {
      h += '<textarea id="stageA" rows="5" placeholder="' + R.esc(st.placeholder || '') + '">' +
        R.esc(st.value()) + '</textarea>';
    } else if (st.type === 'pair') {
      var v = st.value();
      h += '<div class="stage-pair">' +
        '<label class="ff"><span>' + R.esc(st.a.label) + '</span>' +
          '<textarea id="stageA" rows="5" placeholder="' + R.esc(st.a.placeholder) + '">' + R.esc(v[0]) + '</textarea></label>' +
        '<label class="ff"><span>' + R.esc(st.b.label) + '</span>' +
          '<textarea id="stageB" rows="5" placeholder="' + R.esc(st.b.placeholder) + '">' + R.esc(v[1]) + '</textarea></label>' +
      '</div>';
    } else if (st.type === 'single') {
      var cur = st.options.indexOf(st.value());
      h += optionRows(st.options, false, cur, 'data-stagepick');
    }

    h += '<div class="ac-foot">' +
      '<button type="button" class="btn-ghost btn-ghost-inline" data-stageback="1">Back</button>' +
      '<span class="stage-actions">' +
        (st.skippable
          ? '<button type="button" class="btn-link" data-stageskip="1">Skip, use placeholders</button>'
          : '') +
        '<button type="button" class="btn-primary" id="stageNext">' +
          (last ? buildLabel() : 'Continue') +
        '</button>' +
      '</span>' +
    '</div>';
    return h + '</div>';
  }

  /* table edits update the working copy in place, then re-render so the landing
     dates and the total move with whatever was just typed */
  function readTable() {
    var st = activeStages()[shapeIdx];
    if (!st || (st.type !== 'table' && st.type !== 'timeline')) return [];
    var host = $('guideFlow');
    var rows = [];
    host.querySelectorAll('.tbl-row, .tl-row').forEach(function (row, i) {
      var name = row.querySelector('[data-tk="name"]');
      var days = row.querySelector('[data-tk="days"]');
      var ask = row.querySelector('[data-tk="ask"]');
      rows.push({
        name: name ? name.value.trim() : '',
        days: days ? Math.max(1, Math.min(730, parseInt(days.value, 10) || 1)) : undefined,
        ask: ask ? ask.value.trim() : undefined
      });
    });
    return rows.filter(function (r) { return r.name || r.ask; });
  }

  function commitStage() {
    var st = activeStages()[shapeIdx];
    if (!st) return;
    if (st.type === 'table' || st.type === 'timeline') {
      st.commit(readTable());
    } else if (st.type === 'pair') {
      st.commit($('stageA') && $('stageA').value, $('stageB') && $('stageB').value);
    } else if (st.type === 'lines') {
      st.commit($('stageA') && $('stageA').value);
    }
  }

  function advanceStage() {
    commitStage();
    shape._editing = null;
    var stages = activeStages();
    if (shapeIdx >= stages.length - 1) { finish(); return; }
    shapeIdx++;
    think(STEP_MSGS, THINK.step, render);
  }

  function stageBack() {
    if (shape._editing) { shape._editing = null; render(); return; }
    commitStage();
    if (shapeIdx === 0) { mode = 'result'; render(); return; }
    shapeIdx--;
    render();
  }

  /* the shaping transcript: what has been settled so far, above the live stage */
  function renderStageDone() {
    var stages = activeStages();
    var out = '';
    for (var i = 0; i < shapeIdx && i < stages.length; i++) {
      var st = stages[i];
      var summary = '';
      if (st.id === 'stages') {
        var ss = proposedStages();
        summary = P.fmtShort(tlStart()) + ' to ' +
          P.fmtShort(P.addDays(tlStart(), totalDays(ss) - 1)) + ' · ' +
          ss.map(function (x) { return x.name + ' (' + x.days + 'd)'; }).join(' → ');
      } else if (st.id === 'around') summary = (shape.around || []).join('; ') || 'Skipped';
      else if (st.id === 'team') {
        summary = (shape.team || []).filter(function (m) { return m.name; })
          .map(function (m) { return m.ask ? m.name + ' — ' + m.ask : m.name; })
          .join('; ') || 'Skipped';
      }
      else if (st.id === 'scope') {
        summary = ((shape.inScope || []).length ? (shape.inScope || []).length + ' in scope' : 'nothing in scope yet') +
          ', ' + ((shape.outScope || []).length ? (shape.outScope || []).length + ' explicitly out' : 'nothing ruled out');
      } else if (st.id === 'worries') summary = (shape.worries || []).join('; ') || 'Skipped';
      else if (st.id === 'cadence') summary = shape.cadence || 'Skipped';
      out += '<div class="gq gq-done">' +
        '<div class="gq-q">' + R.esc(st.title) +
          '<button type="button" class="btn-link gq-change" data-stagego="' + i + '">Change</button></div>' +
        '<div class="gq-a">' + R.esc(summary) + '</div>' +
      '</div>';
    }
    return out;
  }

  function init() {
    var host = $('guideFlow');
    if (!host) return;
    host.addEventListener('click', onClick);

    /* dragging a boundary */
    host.addEventListener('pointerdown', function (e) {
      var handle = e.target.closest('[data-tlh]');
      if (!handle) return;
      e.preventDefault();
      handle.focus();
      startDrag(handle, e);
    });

    /* the same move, from the keyboard */
    host.addEventListener('keydown', function (e) {
      var handle = e.target.closest && e.target.closest('[data-tlh]');
      if (!handle) return;
      var step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      if (!step) return;
      e.preventDefault();
      var i = +handle.getAttribute('data-tlh');
      nudgeBoundary(i, e.shiftKey ? step * 7 : step);
      repaintTimeline();
      var again = $('guideFlow').querySelector('[data-tlh="' + i + '"]');
      if (again) again.focus();
    });

    /* start date */
    host.addEventListener('change', function (e) {
      if (e.target.id !== 'tlStart') return;
      shape.start = e.target.value || defaultStart();
      repaintTimeline();
    });
    host.addEventListener('change', onDocToggle);
    host.addEventListener('input', function (e) {
      if (e.target.id === 'gqText') e.target.classList.remove('needs');
    });
    /* a length change moves every later date, so redraw the table on commit */
    host.addEventListener('change', function (e) {
      if (e.target.getAttribute && e.target.getAttribute('data-tk') === 'days') {
        var st = activeStages()[shapeIdx];
        if (st) { st.commit(readTable()); render(); }
      }
    });
    /* Enter advances a text question, Shift+Enter makes a new line */
    host.addEventListener('keydown', function (e) {
      if (e.target.id === 'gqText' && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        var btn = $('gqNext');
        if (btn) btn.click();
      }
    });
    $('guideRestart').addEventListener('click', function () {
      clearThink();
      answers = {}; step = 0; picked = null;
      mode = 'ask'; shapeIdx = 0; shape = {}; fbResult = null; fbApplied = 0; lastFeedbackText = '';
      render();
    });
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.SIK = window.SIK || {});
