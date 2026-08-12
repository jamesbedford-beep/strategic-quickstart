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
  var THINK = { step: 1200, result: 3600, handoff: 1600 };

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

  var answers = {};
  var step = 0;
  var thinking = null;       /* {msgs, total} while a pause is running */
  var thinkTimers = [];
  /* null means "follow the recommendation". Once someone ticks or unticks
     anything it becomes their explicit set, and any change to an answer resets it
     so a fresh recommendation is not silently overridden by stale choices. */
  var picked = null;

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

  /* A starting project name from the goal sentence. Strips the framing people
     naturally open with ("work out whether we should...") so what is left reads
     like a name rather than a fragment. Only ever a suggestion: the field is
     editable and sits right next to it. */
  var NAME_LEADS = /^(?:work out|figure out|find out|work through|decide(?: on)?|determine|assess|explore|scope(?: out)?|understand|establish|we\s+(?:need to|want to|should|are trying to)|i\s+(?:need to|want to|am trying to)|try(?:ing)? to|whether(?: or not)?|if|to)\s+/i;

  function suggestName() {
    var g = String(answers.goal || '').trim();
    if (!g) return '';
    var s = g.split(/[.;\n]|,\s+(?:and|then|so)\s+/)[0].trim();
    /* peel repeatedly: "work out whether we should offer X" -> "offer X" */
    for (var i = 0; i < 4; i++) {
      var next = s.replace(NAME_LEADS, '');
      if (next === s) break;
      s = next;
    }
    if (s.length > 46) s = s.slice(0, 46).replace(/\s+\S*$/, '');
    s = s.replace(/[,\s]+$/, '');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
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

    if (thinking) {
      html += renderThinking();
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
  function renderThinking() {
    return '<div class="gq-think" role="status" aria-live="polite">' +
      '<span class="spinner" aria-hidden="true"></span>' +
      '<span class="gq-think-msg" id="thinkMsg">' + R.esc(thinking.msgs[0]) + '</span>' +
    '</div>';
  }

  function clearThink() {
    thinkTimers.forEach(clearTimeout);
    thinkTimers = [];
    thinking = null;
  }

  /* Show a pause, cycling through msgs, then run done(). */
  function think(msgs, total, done) {
    if (thinking) return;                 /* already pausing: ignore */
    if (!total) { done(); return; }        /* pause turned off in THINK */
    thinking = { msgs: msgs };
    render();

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

  function renderQuestion(q) {
    var a = answers[q.id];
    var h = '<div class="gq gq-active">' +
      '<div class="gq-q">' + R.esc(q.q) + '</div>' +
      (q.help ? '<p class="gq-help">' + R.esc(q.help) + '</p>' : '');

    if (q.type === 'text') {
      h += '<textarea id="gqText" rows="' + (q.rows || 2) + '" placeholder="' +
        R.esc(q.placeholder || '') + '">' + R.esc(a || '') + '</textarea>';
    } else {
      h += '<div class="gq-opts">' + q.options.map(function (o, i) {
        var on = q.type === 'multi'
          ? (a || []).indexOf(i) >= 0
          : a === i;
        return '<button type="button" class="gq-opt' + (on ? ' on' : '') +
          '" data-pick="' + i + '">' +
          '<span class="gq-opt-label">' + R.esc(o.label) + '</span>' +
          (o.sub ? '<span class="gq-opt-sub">' + R.esc(o.sub) + '</span>' : '') +
          '</button>';
      }).join('') + '</div>';
    }

    h += '<div class="gq-nav">' +
      (step > 0 ? '<button type="button" class="btn-ghost btn-ghost-inline" data-back="' + (step - 1) + '">Back</button>' : '<span></span>') +
      '<button type="button" class="btn-primary" id="gqNext">' +
        (q.type === 'multi' || q.optional || q.type === 'text' ? 'Continue' : 'Continue') +
      '</button>' +
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
    return 'Set up ' + n + (n === 1 ? ' document' : ' documents');
  }

  function updateProgress() {
    var el = $('guideProgress');
    if (!el) return;
    var total = QUESTIONS.length;
    var label = thinking ? 'Thinking…'
      : (step >= total ? 'Done, here is what we suggest' : 'Question ' + (step + 1) + ' of ' + total);
    el.innerHTML = '<div class="prog-track"><div class="prog-fill" style="width:' +
      Math.round(Math.min(step, total) / total * 100) + '%"></div></div>' +
      '<span class="prog-text">' + label + '</span>';
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
        /* toggle in place: re-rendering the whole flow on every checkbox makes the
           page jump and throws away the node that was just clicked */
        pick.classList.toggle('on', at < 0);
        pick.setAttribute('aria-pressed', at < 0 ? 'true' : 'false');
      } else {
        answers[q.id] = i;
        picked = null;              /* answers changed: re-recommend */
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
      handOff();
      return;
    }
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

  function handOff() {
    if (!pickedCount()) return;
    var name = ($('gqName') && $('gqName').value.trim()) || suggestName() || 'Untitled initiative';
    var owner = ($('gqOwner') && $('gqOwner').value.trim()) || '';
    var chosen = SIK.templates.DOCS.filter(function (d) { return picked[d.id]; })
      .map(function (d) { return d.id; });
    /* name and owner are read before the pause: showing the spinner replaces the
       results card, so those inputs are gone by the time the callback runs */
    think(HANDOFF_MSGS, THINK.handoff, function () {
      SIK.applyGuide({
        goal: String(answers.goal || '').trim(),
        project: name,
        owner: owner,
        signoff: String(answers.signoff || '').trim(),
        preset: presetFor(),
        horizon: horizonFor(),
        docs: chosen
      });
    });
  }

  function init() {
    var host = $('guideFlow');
    if (!host) return;
    host.addEventListener('click', onClick);
    host.addEventListener('change', onDocToggle);
    host.addEventListener('input', function (e) {
      if (e.target.id === 'gqText') e.target.classList.remove('needs');
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
      answers = {}; step = 0; picked = null; render();
    });
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.SIK = window.SIK || {});
