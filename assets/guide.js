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

  var answers = {};
  var step = 0;

  /* ---------- scoring ---------- */
  function score() {
    var pts = {}, why = {};
    Object.keys(BASE).forEach(function (k) { pts[k] = BASE[k]; });

    function add(boost, reason) {
      if (!boost) return;
      Object.keys(boost).forEach(function (d) {
        pts[d] = (pts[d] || 0) + boost[d];
        if (reason && boost[d] >= 2) {
          why[d] = why[d] || [];
          if (why[d].indexOf(reason) < 0) why[d].push(reason);
        }
      });
    }

    QUESTIONS.forEach(function (q) {
      var a = answers[q.id];
      if (a === undefined || a === null || a === '') return;
      if (q.type === 'single') {
        var opt = q.options[a];
        if (opt) add(opt.boost, opt.why);
      } else if (q.type === 'multi') {
        (a || []).forEach(function (i) {
          var o = q.options[i];
          if (o) add(o.boost, o.why);
        });
      } else if (q.type === 'text' && q.boostIfAnswered && String(a).trim()) {
        add(q.boostIfAnswered, q.why);
      }
    });

    var ranked = Object.keys(pts).map(function (id) {
      return { id: id, n: pts[id], why: why[id] || [] };
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

    if (step < QUESTIONS.length) {
      html += renderQuestion(QUESTIONS[step]);
    } else {
      html += renderResult();
    }
    host.innerHTML = html;

    var focusable = host.querySelector('.gq-active textarea, .gq-active input');
    if (focusable) focusable.focus();
    updateProgress();
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

  function renderResult() {
    var s = score();
    var preset = SIK.templates.PRESETS[presetFor()];
    var days = horizonFor();

    var h = '<div class="gq gq-result">' +
      '<h3>Start with these</h3>' +
      '<p class="gq-help">Based on what you said. You can change any of it on the next screen, ' +
      'and nothing is generated until you export.</p>' +
      '<div class="rec-list">';

    s.core.forEach(function (r) {
      h += '<div class="rec">' +
        '<div class="rec-name">' + R.esc(docName(r.id)) + '</div>' +
        '<div class="rec-blurb">' + R.esc(docBlurb(r.id)) + '</div>' +
        (r.why.length
          ? '<div class="rec-why"><b>Why:</b> ' + R.esc(r.why.join('; and ')) + '.</div>'
          : '<div class="rec-why"><b>Why:</b> it is the backbone almost every project needs.</div>') +
      '</div>';
    });
    h += '</div>';

    if (s.later.length) {
      h += '<h3 class="gq-later">Useful later, not now</h3>' +
        '<ul class="rec-later">' + s.later.map(function (r) {
          return '<li><b>' + R.esc(docName(r.id)) + '</b>: ' + R.esc(docBlurb(r.id)) + '</li>';
        }).join('') + '</ul>';
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
      '<button type="button" class="btn-primary" id="gqBuild">Set this up for me</button>' +
    '</div>';

    return h + '</div>';
  }

  function updateProgress() {
    var el = $('guideProgress');
    if (!el) return;
    var total = QUESTIONS.length;
    el.innerHTML = '<div class="prog-track"><div class="prog-fill" style="width:' +
      Math.round(Math.min(step, total) / total * 100) + '%"></div></div>' +
      '<span class="prog-text">' + (step >= total
        ? 'Done, here is what we suggest'
        : 'Question ' + (step + 1) + ' of ' + total) + '</span>';
  }

  /* ---------- interaction ---------- */
  function commitCurrent() {
    var q = QUESTIONS[step];
    if (!q) return true;
    if (q.type === 'text') {
      var el = $('gqText');
      answers[q.id] = el ? el.value : '';
      if (!q.optional && !String(answers[q.id]).trim()) return false;
    }
    if (q.type === 'single' && answers[q.id] == null) return false;
    if (q.type === 'multi' && !answers[q.id]) answers[q.id] = [];
    return true;
  }

  function onClick(e) {
    var back = e.target.closest('[data-back]');
    if (back) {
      if (step < QUESTIONS.length) commitCurrent();
      step = +back.getAttribute('data-back');
      render();
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
        /* toggle in place: re-rendering the whole flow on every checkbox makes the
           page jump and throws away the node that was just clicked */
        pick.classList.toggle('on', at < 0);
        pick.setAttribute('aria-pressed', at < 0 ? 'true' : 'false');
      } else {
        answers[q.id] = i;
        step++;                     /* single choice advances straight away */
        render();
      }
      return;
    }

    if (e.target.id === 'gqNext') {
      if (!commitCurrent()) {
        var box = $('gqText');
        if (box) { box.classList.add('needs'); box.focus(); }
        return;
      }
      step++;
      render();
      return;
    }

    if (e.target.id === 'gqBuild') {
      var s = score();
      SIK.applyGuide({
        goal: String(answers.goal || '').trim(),
        project: ($('gqName') && $('gqName').value.trim()) || suggestName() || 'Untitled initiative',
        owner: ($('gqOwner') && $('gqOwner').value.trim()) || '',
        signoff: String(answers.signoff || '').trim(),
        preset: presetFor(),
        horizon: horizonFor(),
        docs: s.core.map(function (r) { return r.id; })
      });
    }
  }

  function init() {
    var host = $('guideFlow');
    if (!host) return;
    host.addEventListener('click', onClick);
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
      answers = {}; step = 0; render();
    });
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.SIK = window.SIK || {});
