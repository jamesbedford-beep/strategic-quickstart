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
  /* the builder starts projects on the next Monday; mirror that so the dates we
     propose here are the dates they actually get */
  function startDate() {
    var d = P.today();
    while (d.getUTCDay() !== 1) d = P.addDays(d, 1);
    return P.iso(d);
  }

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

    if (mode === 'shape') html += renderStageDone();

    if (thinking) {
      html += renderThinking();
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
      rows.push(stA.textCol === 1 ? { name: '', ask: '' } : { name: '', days: 7 });
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
      SIK.applyGuide({
        goal: String(answers.goal || '').trim(),
        project: shape.name || suggestName() || 'Untitled initiative',
        owner: shape.owner || '',
        signoff: String(answers.signoff || '').trim(),
        preset: presetFor(),
        horizon: horizonFor(),
        docs: chosen,
        /* everything settled during the shaping conversation */
        stages: (shape.stages && shape.stages.length) ? shape.stages : null,
        team: (shape.team || []).filter(function (m) { return m.name; }),
        around: shape.around || null,
        inScope: shape.inScope || null,
        outScope: shape.outScope || null,
        worries: shape.worries || null,
        cadence: shape.cadence || ''
      });
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
      id: 'stages', needs: ['plan', 'gantt'], type: 'table',
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
      cols: ['Stage', 'Length'],
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
      why: 'Names become the columns of your RACI. What you need from them becomes their ' +
        'decision rights in the charter and what they care about in the stakeholder map.',
      cols: ['Name', 'What you need from them'],
      textCol: 1,
      rows: function () {
        if (shape.team && shape.team.length) return shape.team.slice();
        return [{ name: shape.owner || '', ask: '' }, { name: '', ask: '' }, { name: '', ask: '' }];
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

  function renderStage() {
    var stages = activeStages();
    var st = stages[shapeIdx];
    if (!st) return '';
    var last = shapeIdx === stages.length - 1;
    var h = '<div class="gq gq-active gq-stage ac">' +
      '<p class="ac-q">' + R.esc(st.title) + '</p>' +
      (st.why ? '<p class="ac-why"><b>Why this helps:</b> ' + R.esc(st.why) + '</p>' : '') +
      (st.help ? '<p class="ac-help">' + R.esc(st.help) + '</p>' : '');

    if (st.type === 'table') {
      var rows = st.rows();
      if (st.propose) {
        var pr = st.propose();
        h += '<p class="prop-lead">' + R.esc(pr.lead) + '</p>';
      }
      var sched = st.id === 'stages' ? stagesSchedule(rows) : null;
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
    if (!st || st.type !== 'table') return [];
    var host = $('guideFlow');
    var rows = [];
    host.querySelectorAll('.tbl-row').forEach(function (row, i) {
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
    if (st.type === 'table') {
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
        summary = proposedStages().map(function (x) {
          return x.name + ' (' + x.days + 'd)';
        }).join(' → ');
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
      mode = 'ask'; shapeIdx = 0; shape = {};
      render();
    });
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.SIK = window.SIK || {});
