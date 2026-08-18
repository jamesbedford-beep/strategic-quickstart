/* UI: state, form, live preview, export. */
(function (SIK) {
  'use strict';

  var T = SIK.templates, P = SIK.plan, R = SIK.render, B = SIK.build, S = SIK.sheet;
  var $ = function (id) { return document.getElementById(id); };
  var STORE_KEY = 'initiative-kit-v1';

  var XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  /* ---------------- state ---------------- */
  function presetPhases(id) {
    var p = T.PRESETS[id] || T.PRESETS['strategic-initiative'];
    return p.phases.map(function (ph) {
      return {
        name: ph.name, weight: ph.weight, owner: '',
        tasks: ph.tasks.map(function (t) {
          return t.charAt(0) === '*' ? '* ' + t.slice(1).trim() : t;
        }).join('\n')
      };
    });
  }


  /* Build the phase list, honouring the stage names agreed during shaping. Preset
     task lists are kept positionally, so renaming a stage keeps its tasks; stages
     beyond the preset get a neutral placeholder rather than tasks borrowed from an
     unrelated phase. */
  function phasesFor(presetId, names) {
    var base = presetPhases(presetId);
    if (!names || !names.length) return base;
    return names.map(function (n, i) {
      var from = base[i];
      return {
        name: n,
        weight: from ? from.weight : 20,
        owner: '',
        tasks: from ? from.tasks : ('First task\n* ' + n + ' complete')
      };
    });
  }

  function nextMonday() {
    var d = P.today();
    while (d.getUTCDay() !== 1) d = P.addDays(d, 1);
    return P.iso(d);
  }

  function defaults() {
    return {
      v: 1,
      project: 'Untitled initiative',
      preset: 'strategic-initiative',
      dri: '', sponsor: '',
      start: nextMonday(),
      horizon: 91, days: 91, gran: 'auto',
      goal: '', signoff: '',
      inScope: [], outScope: [], worries: [], cadence: '',
      team: [{ name: '', initials: '', role: '' }],
      phases: presetPhases('strategic-initiative'),
      docs: ['plan', 'gantt', 'raci', 'charter', 'risks', 'status'],
      sheetfmt: 'xlsx', docfmt: 'md', bundle: 'zip', naming: 'numbered'
    };
  }

  /* which inputs the current selection actually needs */
  function needs() {
    var set = {};
    T.DOCS.forEach(function (d) {
      if (state.docs.indexOf(d.id) < 0) return;
      (d.uses || []).forEach(function (u) { set[u] = true; });
    });
    return set;
  }

  function applyVisibility() {
    var n = needs();
    var nodes = document.querySelectorAll('[data-needs]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-needs');
      nodes[i].hidden = !n[key];
    }
    /* the Days box has two gates: the schedule must be needed AND the horizon
       must be Custom. Apply it after the loop above, which only knows about the
       first one and would otherwise reveal it. */
    $('daysField').hidden = !n.schedule || state.horizon !== 'custom';

    var kinds = {};
    T.DOCS.forEach(function (d) { if (state.docs.indexOf(d.id) >= 0) kinds[d.kind] = true; });
    $('sheetFmtField').hidden = !kinds.sheet;
    $('docFmtField').hidden = !kinds.doc;
  }

  var state = defaults();
  var previewId = 'plan';

  function encodeState(s) {
    try {
      return btoa(unescape(encodeURIComponent(JSON.stringify(s))))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch (e) { return ''; }
  }
  function decodeState(str) {
    try {
      var b = str.replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      var o = JSON.parse(decodeURIComponent(escape(atob(b))));
      return (o && o.phases && o.docs) ? o : null;
    } catch (e) { return null; }
  }

  function load() {
    var fromHash = location.hash.indexOf('#s=') === 0 && decodeState(location.hash.slice(3));
    if (fromHash) { state = Object.assign(defaults(), fromHash); return; }
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && o.phases && o.docs) state = Object.assign(defaults(), o);
      }
    } catch (e) { /* private mode or disabled storage: run on defaults */ }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ---------------- derived ---------------- */
  function horizonDays() {
    return state.horizon === 'custom'
      ? Math.max(3, Math.min(1460, parseInt(state.days, 10) || 91))
      : (parseInt(state.horizon, 10) || 91);
  }

  function parseTasks(text) {
    return String(text || '').split('\n').map(function (l) { return l.trim(); })
      .filter(Boolean).map(function (l) {
        var m = l.charAt(0) === '*';
        return { name: m ? l.slice(1).trim() : l, milestone: m };
      });
  }

  function cfg() {
    return {
      project: (state.project || '').trim() || 'Untitled initiative',
      preset: state.preset,
      dri: (state.dri || '').trim(),
      sponsor: (state.sponsor || '').trim(),
      goal: (state.goal || '').trim(),
      signoff: (state.signoff || '').trim(),
      inScope: state.inScope || [],
      outScope: state.outScope || [],
      worries: state.worries || [],
      cadence: state.cadence || '',
      startDate: state.start,
      horizonDays: horizonDays(),
      granularity: state.gran,
      /* did the user get to see and edit the phases? documents that use phases
         only opportunistically check this before reporting them */
      phasesInForm: !!needs().phases,
      team: (state.team || []).filter(function (m) { return (m.name || m.initials || '').trim(); }),
      phases: (state.phases || []).map(function (p) {
        return { name: p.name, weight: p.weight, owner: p.owner, tasks: parseTasks(p.tasks) };
      })
    };
  }

  function slug(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '').slice(0, 48) || 'project';
  }

  /* ---------------- build documents ---------------- */
  var SHEET_BUILDERS = {
    plan: B.plan, gantt: B.gantt, raci: B.raci,
    risks: B.risks, stakeholders: B.stakeholders, decisions: B.decisions
  };
  var DOC_BUILDERS = {
    charter: B.charter, status: B.status, kickoff: B.kickoff, onepager: B.onepager
  };

  function docById(id) {
    return T.DOCS.filter(function (d) { return d.id === id; })[0];
  }

  function extFor(d) {
    return d.kind === 'sheet' ? state.sheetfmt : state.docfmt;
  }

  /* Evidence Action files everything as "YYYYMMDD File Name", so offer that
     alongside ordered numeric prefixes. */
  function baseName(d) {
    if (state.naming === 'dated') {
      return P.iso(P.today()).replace(/-/g, '') + ' ' + d.name;
    }
    return String(d.order).padStart(2, '0') + '-' + d.file;
  }

  /* one built artifact: { doc, base, ext, sheet | blocks } */
  function buildOne(id, c, sched) {
    var d = docById(id);
    if (!d) return null;
    var out = { doc: d, base: baseName(d), ext: extFor(d) };
    if (d.kind === 'sheet') out.sheet = SHEET_BUILDERS[id](c, sched);
    else out.blocks = DOC_BUILDERS[id](c, sched);
    return out;
  }

  function selectedIds() {
    return T.DOCS.filter(function (d) { return state.docs.indexOf(d.id) >= 0; })
      .map(function (d) { return d.id; });
  }

  function buildAll() {
    var c = cfg(), sched = P.buildSchedule(c);
    return { c: c, sched: sched, items: selectedIds().map(function (id) { return buildOne(id, c, sched); }).filter(Boolean) };
  }

  /* artifact -> { name, data, mime } */
  function materialize(item) {
    var name = item.base + '.' + item.ext;
    if (item.sheet) {
      if (item.ext === 'csv') return { name: name, data: S.toCsv(item.sheet), mime: 'text/csv' };
      return { name: name, data: S.toXlsx([item.sheet]), mime: XLSX_MIME };
    }
    if (item.ext === 'html') {
      return { name: name, data: R.toHtmlDoc(item.blocks, item.doc.name), mime: 'text/html' };
    }
    return { name: name, data: R.toMarkdown(item.blocks), mime: 'text/markdown' };
  }

  /* ---------------- rendering: form ---------------- */
  function fillSelects() {
    $('f-preset').innerHTML = Object.keys(T.PRESETS).map(function (k) {
      return '<option value="' + k + '">' + R.esc(T.PRESETS[k].label) + '</option>';
    }).join('');
    $('f-horizon').innerHTML = T.HORIZONS.map(function (h) {
      return '<option value="' + h.d + '">' + h.label + '</option>';
    }).join('') + '<option value="custom">Custom</option>';
  }

  function syncForm() {
    $('f-project').value = state.project;
    $('f-preset').value = state.preset;
    $('f-dri').value = state.dri;
    $('f-sponsor').value = state.sponsor;
    $('f-start').value = state.start;
    $('f-horizon').value = String(state.horizon);
    $('f-days').value = state.days;
    $('f-gran').value = state.gran;
    $('f-sheetfmt').value = state.sheetfmt;
    $('f-docfmt').value = state.docfmt;
    $('f-bundle').value = state.bundle;
    $('f-naming').value = state.naming;
    var p = T.PRESETS[state.preset];
    $('presetHint').textContent = p ? p.hint : '';
  }

  /* ---------------- people roster ---------------- */
  var ROSTER = SIK.people || [];
  var BY_NAME = {};
  ROSTER.forEach(function (p) { BY_NAME[p.n.toLowerCase()] = p; });

  function initialsOf(name) {
    return String(name || '').trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
  }

  function fillPeopleList() {
    var dl = $('peopleList');
    if (!dl) return;
    /* the label carries role and team so the suggestion is disambiguating,
       while the value stays the plain name that goes into the documents */
    dl.innerHTML = ROSTER.map(function (p) {
      var label = p.t || '';
      return '<option value="' + R.esc(p.n) + '"' +
        (label ? ' label="' + R.esc(label) + '"' : '') + '></option>';
    }).join('');
  }

  function renderTeam() {
    var host = $('teamRows');
    host.innerHTML = state.team.map(function (m, i) {
      return '<div class="team-row" data-i="' + i + '">' +
        '<input type="text" data-k="name" list="peopleList" placeholder="Name" value="' + R.esc(m.name || '') + '" autocomplete="off">' +
        '<input type="text" data-k="initials" placeholder="Init" maxlength="4" value="' + R.esc(m.initials || '') + '" autocomplete="off">' +
        '<input type="text" data-k="role" placeholder="Role or team" value="' + R.esc(m.role || '') + '" autocomplete="off">' +
        '<button type="button" class="btn-x" data-act="rm" title="Remove">&times;</button>' +
        '</div>';
    }).join('');
  }

  function ownerOptions() {
    var seen = {}, out = [];
    (state.team || []).forEach(function (m) {
      [m.initials, m.name].forEach(function (v) {
        v = (v || '').trim();
        if (v && !seen[v]) { seen[v] = 1; out.push(v); }
      });
    });
    if (state.dri && !seen[state.dri.trim()]) out.push(state.dri.trim());
    return out;
  }

  function renderPhases() {
    var host = $('phaseList');
    var dl = '<datalist id="ownerList">' + ownerOptions().map(function (o) {
      return '<option value="' + R.esc(o) + '"></option>';
    }).join('') + '</datalist>';

    host.innerHTML = dl + state.phases.map(function (p, i) {
      return '<div class="phase" data-i="' + i + '">' +
        '<div class="phase-top">' +
          '<label class="ff"><span>Phase name</span>' +
            '<input class="pname" type="text" data-k="name" placeholder="e.g. Scoping" value="' + R.esc(p.name || '') + '" autocomplete="off"></label>' +
          '<label class="ff"><span>Weight</span>' +
            '<input type="number" data-k="weight" min="1" max="100" step="1" value="' + (p.weight || 20) + '"></label>' +
          '<label class="ff"><span>Owner</span>' +
            '<input type="text" data-k="owner" list="ownerList" placeholder="Inherits" value="' + R.esc(p.owner || '') + '" autocomplete="off"></label>' +
          '<button type="button" class="btn-x" data-act="rm" title="Remove this phase">&times;</button>' +
        '</div>' +
        '<label class="ff ff-tasks"><span>Tasks, one per line. Start a line with <b>*</b> to make it a milestone.</span>' +
          '<textarea data-k="tasks" spellcheck="false" rows="3" placeholder="Draft the problem statement&#10;Interview stakeholders&#10;* Scope signed off">' +
          R.esc(p.tasks || '') + '</textarea></label>' +
        '<div class="phase-foot"><span class="pf-dates"></span><span class="pf-count"></span></div>' +
        '<div class="phase-actions">' +
          '<button type="button" class="btn-mini" data-act="task">+ Task</button>' +
          '<button type="button" class="btn-mini" data-act="ms">+ Milestone</button>' +
        '</div>' +
      '</div>';
    }).join('');
    autosizeAll();
    updatePhaseFeet();
  }

  /* grow every task box to fit its content: a scrollbar hides tasks, and
     hidden tasks are the main reason this section confused people */
  function autosize(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(64, el.scrollHeight + 2) + 'px';
  }
  function autosizeAll() {
    var t = $('phaseList').querySelectorAll('textarea');
    for (var i = 0; i < t.length; i++) autosize(t[i]);
  }

  function updatePhaseFeet() {
    var c = cfg();
    var sched = P.buildSchedule(c);
    var totalDays = horizonDays();
    var totalW = c.phases.reduce(function (n, p) {
      return n + (Number(p.weight) > 0 ? Number(p.weight) : 1);
    }, 0) || 1;
    var scheduled = needs().schedule;

    var nodes = $('phaseList').querySelectorAll('.phase');
    for (var i = 0; i < nodes.length; i++) {
      var ph = sched.phases[i];
      var dEl = nodes[i].querySelector('.pf-dates');
      var cEl = nodes[i].querySelector('.pf-count');
      if (!ph) { dEl.textContent = ''; cEl.textContent = ''; continue; }

      var w = Number(state.phases[i] && state.phases[i].weight) || 1;
      var pct = Math.round(w / totalW * 100);
      var days = P.diffDays(ph.start, ph.end) + 1;

      /* say what the weight bought, in the units the user cares about */
      dEl.textContent = scheduled
        ? 'Weight ' + w + ' of ' + totalW + ' = ' + pct + '% of the horizon, so ' +
          days + ' days: ' + P.fmtShort(ph.start) + ' to ' + P.fmtShort(ph.end)
        : 'Weight ' + w + ' of ' + totalW + ' = ' + pct + '% of the horizon';

      var ms = ph.tasks.filter(function (t) { return t.milestone; }).length;
      var tasks = ph.tasks.length - ms;
      if (!ph.tasks.length) {
        cEl.textContent = 'No tasks yet';
        cEl.className = 'pf-count pf-empty';
      } else {
        cEl.textContent = tasks + (tasks === 1 ? ' task' : ' tasks') +
          (ms ? ', ' + ms + (ms === 1 ? ' milestone' : ' milestones') : '');
        cEl.className = 'pf-count';
      }
    }
  }

  function renderDocs() {
    $('docGrid').innerHTML = T.DOCS.map(function (d) {
      var on = state.docs.indexOf(d.id) >= 0;
      return '<label class="doc' + (on ? ' on' : '') + (previewId === d.id ? ' previewing' : '') +
        '" data-id="' + d.id + '">' +
        '<input type="checkbox"' + (on ? ' checked' : '') + '>' +
        '<span><span class="doc-name">' + R.esc(d.name) +
          '<span class="doc-ext">.' + extFor(d) + '</span></span>' +
          '<span class="doc-blurb">' + R.esc(d.blurb) + '</span></span>' +
        '</label>';
    }).join('');
  }

  /* ---------------- rendering: preview ---------------- */
  function renderPreview() {
    var ids = selectedIds();
    var tabs = $('previewTabs'), body = $('previewBody'), meta = $('previewMeta');

    if (!ids.length) {
      tabs.innerHTML = '';
      meta.textContent = '';
      body.innerHTML = '<p class="pv-empty">Pick at least one document.</p>';
      return;
    }
    if (ids.indexOf(previewId) < 0) previewId = ids[0];

    tabs.innerHTML = ids.map(function (id) {
      var d = docById(id);
      return '<button type="button" class="pv-tab' + (id === previewId ? ' on' : '') +
        '" data-id="' + id + '">' + R.esc(d.name) + '</button>';
    }).join('');

    var c = cfg(), sched = P.buildSchedule(c);
    var item = buildOne(previewId, c, sched);
    var m = materialize(item);
    meta.textContent = slug(c.project) + '-project-kit/' + m.name;

    if (item.sheet) body.innerHTML = R.previewSheet(item.sheet);
    else body.innerHTML = '<div class="pv-doc">' + R.toHtmlBody(item.blocks) + '</div>';
    body.scrollTop = 0;
  }

  function renderWindow() {
    var c = cfg(), sched = P.buildSchedule(c);
    var days = horizonDays();
    var gran = P.pickGranularity(days, state.gran);
    $('windowLine').textContent = P.fmtLong(sched.start) + ' to ' + P.fmtLong(sched.end) +
      '  |  ' + days + ' days  |  Gantt in ' + gran + ' columns';

    var taskCount = c.phases.reduce(function (n, p) {
      return n + p.tasks.filter(function (t) { return !t.milestone; }).length;
    }, 0);
    var totalW = c.phases.reduce(function (n, p) {
      return n + (Number(p.weight) > 0 ? Number(p.weight) : 1);
    }, 0);
    $('weightTotal').textContent = c.phases.length
      ? 'Weights total ' + totalW + ' across ' + c.phases.length + ' phases. ' +
        'They do not have to add up to 100: what matters is each phase relative to the rest.'
      : '';

    var warn = $('planWarn');
    if (!c.phases.length) {
      warn.hidden = false;
      warn.textContent = 'No phases: the plan and Gantt will be empty. Add a phase or reset to the template.';
    } else if (taskCount > days) {
      warn.hidden = false;
      warn.textContent = taskCount + ' tasks across ' + days + ' days means several tasks per day. ' +
        'Either lengthen the horizon or cut tasks: an unachievable plan is worse than no plan.';
    } else {
      warn.hidden = true;
    }
  }

  function renderExportNote() {
    refreshRegister();
    var n = selectedIds().length;
    $('exportBtn').disabled = n === 0;
    $('exportNote').textContent = n === 0
      ? 'Nothing selected.'
      : n + ' file' + (n === 1 ? '' : 's') + (state.bundle === 'zip' ? ' in one zip' : ', downloaded separately');
  }

  /* refresh everything that is cheap to recompute */
  function refresh() {
    applyVisibility();
    renderWindow();
    updatePhaseFeet();
    renderPreview();
    renderExportNote();
    save();
  }

  /* ---------------- export ---------------- */
  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function doExport() {
    var built = buildAll();
    if (!built.items.length) return;
    var folder = slug(built.c.project) + '-project-kit';
    var files = built.items.map(materialize);

    /* README describing what is in the bundle */
    var rows = files.map(function (f, i) { return [f.name, built.items[i].doc.blurb]; });
    var readmeBlocks = B.readme(built.c, built.sched, rows.concat([['_config.json',
      'The exact settings used to generate this kit. Paste the "link" value into the tool to regenerate or adjust.']]));
    var readmeName = (state.naming === 'dated'
      ? P.iso(P.today()).replace(/-/g, '') + ' README'
      : '00-README') + '.' + (state.docfmt === 'html' ? 'html' : 'md');
    var readmeData = state.docfmt === 'html'
      ? R.toHtmlDoc(readmeBlocks, built.c.project + ' project kit')
      : R.toMarkdown(readmeBlocks);

    var configJson = JSON.stringify({
      generated: P.iso(P.today()),
      tool: 'Initiative Kit',
      link: location.origin + location.pathname + '#s=' + encodeState(state),
      settings: state
    }, null, 2);

    if (state.bundle === 'zip') {
      var entries = [{ name: folder + '/' + readmeName, data: readmeData }]
        .concat(files.map(function (f) { return { name: folder + '/' + f.name, data: f.data }; }))
        .concat([{ name: folder + '/_config.json', data: configJson }]);
      download(new Blob([SIK.zip(entries)], { type: 'application/zip' }), folder + '.zip');
      toast(entries.length + ' files exported');
      return;
    }

    var all = [{ name: readmeName, data: readmeData, mime: 'text/markdown' }].concat(files);
    all.forEach(function (f, i) {
      setTimeout(function () {
        download(new Blob([f.data], { type: f.mime || 'text/plain' }), f.name);
      }, i * 350);
    });
    toast(all.length + ' files exported');
  }


  /* Two panes: the guided Start here flow, and the Custom build form. */
  function showTab(name) {
    var panes = { guide: 'guidePane', build: 'buildPane', log: 'logPane' };
    if (!panes[name]) name = 'guide';
    Object.keys(panes).forEach(function (k) { $(panes[k]).hidden = k !== name; });
    $('hero').hidden = name === 'log';
    $('topbarActions').hidden = name !== 'build';   /* Export only means something on Build */
    if (name === 'log') renderChangelog();
    var tabs = $('tabs').querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('on', tabs[i].getAttribute('data-tab') === name);
    }
    /* keep the hash in step so #build is bookmarkable, without clobbering a
       shared-setup link */
    if (location.hash.indexOf('#s=') !== 0 && location.hash !== '#' + name) {
      history.replaceState(null, '', '#' + name);
    }
  }
  SIK.showTab = showTab;

  SIK.applyGuide = function (res) {
    state.goal = res.goal || '';
    state.project = res.project || state.project;
    state.dri = res.owner || state.dri;
    /* The sign-off answer is free text like "Kyle for the go/no-go, country
       director informed". Only promote it to Sponsor when it reads like a single
       name; otherwise it would print as the sponsor on every document. Either
       way it is kept and seeds the stakeholder map. */
    state.signoff = res.signoff || '';
    if (res.signoff && /^[A-Z][\w'-]*(\s+[A-Z][\w'-]*){0,2}$/.test(res.signoff.trim())) {
      state.sponsor = res.signoff.trim();
    }
    state.preset = res.preset;
    state.phases = phasesFor(res.preset, res.phaseNames);
    state.inScope = res.inScope || [];
    state.outScope = res.outScope || [];
    state.worries = res.worries || [];
    state.cadence = res.cadence || '';
    state.horizon = res.horizon;
    state.days = res.horizon;
    if (res.docs && res.docs.length) state.docs = res.docs.slice();
    /* names given during shaping win; otherwise seed with the owner so the RACI
       has at least one column to work with */
    if (res.team && res.team.length) {
      state.team = res.team.map(function (n) {
        var known = BY_NAME[n.toLowerCase()];
        return { name: n, initials: initialsOf(n), role: (known && known.t) || '' };
      });
    } else if (res.owner && !(state.team || []).some(function (m) { return (m.name || '').trim(); })) {
      state.team = [{ name: res.owner, initials: initialsOf(res.owner), role: '' }];
    }
    syncForm();
    renderTeam();
    renderPhases();
    renderDocs();
    refresh();
    showTab('build');
    window.scrollTo(0, 0);
    toast('Set up from your answers. Adjust anything, then Export.');
  };


  /* ---------------- changelog ---------------- */
  function renderChangelog() {
    var host = $('logList');
    if (!host || host.dataset.done) return;
    var rel = SIK.changelog || [];
    host.innerHTML = rel.map(function (r) {
      var fb = (r.feedback || []).map(function (f) {
        if (f.awaiting) {
          /* an open slot, not a summary of something nobody said */
          return '<li class="fb fb-open"><b>' + R.esc(f.who) + '</b>' +
            '<span>Not recorded yet.</span></li>';
        }
        return '<li class="fb"><b>' + R.esc(f.who) + '</b><span>' + R.esc(f.said) + '</span></li>';
      }).join('');

      return '<article class="rel' + (r.state === 'current' ? ' rel-now' : '') + '">' +
        '<div class="rel-head">' +
          '<span class="rel-v">' + R.esc(r.v) + '</span>' +
          '<span class="rel-title">' + R.esc(r.title) + '</span>' +
          '<span class="rel-date">' + R.esc(r.date) +
            (r.state === 'current' ? ' · current' : '') + '</span>' +
        '</div>' +
        (r.summary ? '<p class="rel-sum">' + R.esc(r.summary) + '</p>' : '') +
        '<div class="rel-cols">' +
          '<div class="rel-col">' +
            '<div class="rel-k">What shipped</div>' +
            '<ul class="rel-list">' + (r.shipped || []).map(function (x) {
              return '<li>' + R.esc(x) + '</li>';
            }).join('') + '</ul>' +
          '</div>' +
          '<div class="rel-col rel-col-fb">' +
            '<div class="rel-k">Feedback on it</div>' +
            (fb ? '<ul class="fb-list">' + fb + '</ul>'
                : '<p class="rel-none">None recorded.</p>') +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');
    host.dataset.done = '1';
  }

  /* ---------------- optional team register ----------------
     Records what the tool was used for, so there is an answer to "who is using
     this and for what". Nothing is sent unless someone presses the button, and
     only metadata goes: never the contents of a document. */
  var UC = SIK.usageConfig || {};
  function registerReady() {
    return !!(UC.postUrl && UC.fields && UC.fields.what);
  }

  function refreshRegister() {
    var panel = $('regPanel');
    if (!panel) return;
    if (!registerReady()) { panel.hidden = true; return; }
    panel.hidden = false;
    var ids = selectedIds();
    $('regWhat').textContent = 'Records the title, the template, ' + ids.length +
      ' document' + (ids.length === 1 ? '' : 's') + ' and the ' + horizonDays() +
      ' day timeline. Never any document content.';
  }

  function sendRegister() {
    if (!registerReady()) return;
    var c = cfg();
    var body = new FormData();
    var f = UC.fields;
    body.append(f.what, c.project);
    if (f.team) body.append(f.team, ($('regTeam') && $('regTeam').value.trim()) || '');
    if (f.template) body.append(f.template, (T.PRESETS[c.preset] || {}).label || c.preset);
    if (f.documents) body.append(f.documents, selectedIds().map(function (id) {
      var d = docById(id); return d ? d.name : id;
    }).join(', '));
    if (f.timeline) body.append(f.timeline, horizonDays() + ' days');

    /* no-cors: Forms does not send CORS headers, so the response cannot be read.
       Fire and forget, and say so rather than claiming a confirmed save. */
    fetch(UC.postUrl, { method: 'POST', mode: 'no-cors', body: body })
      .then(function () { registerDone(); }, function () { registerDone(); });
  }

  function registerDone() {
    var panel = $('regPanel');
    if (panel) {
      panel.innerHTML = '<p class="reg-q">Sent to the team register. Thank you.</p>' +
        '<p class="reg-help">We cannot confirm it saved from here, so if the register ' +
        'looks short, that is worth checking rather than assuming.</p>';
    }
    toast('Logged to the team register');
  }

  var toastTimer;
  function toast(msg) {
    var t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    requestAnimationFrame(function () { t.classList.add('on'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('on'); }, 2200);
  }

  function copyText(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(msg); },
        function () { toast('Could not access the clipboard'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(msg); } catch (e) { toast('Could not copy'); }
      ta.remove();
    }
  }

  /* ---------------- wiring ---------------- */
  function bindField(id, key, transform) {
    var el = $(id);
    var ev = (el.tagName === 'SELECT' || el.type === 'date') ? 'change' : 'input';
    el.addEventListener(ev, function () {
      state[key] = transform ? transform(el.value) : el.value;
      if (key === 'sheetfmt' || key === 'docfmt') renderDocs();
      if (key === 'dri') renderPhases();
      refresh();
    });
  }

  function init() {
    fillSelects();
    fillPeopleList();
    load();
    syncForm();
    renderTeam();
    renderPhases();
    renderDocs();
    refresh();

    ['project', 'dri', 'sponsor', 'start', 'gran', 'sheetfmt', 'docfmt', 'bundle', 'naming']
      .forEach(function (k) { bindField('f-' + k, k); });
    bindField('f-horizon', 'horizon', function (v) { return v === 'custom' ? 'custom' : parseInt(v, 10); });
    bindField('f-days', 'days', function (v) { return parseInt(v, 10) || 91; });

    $('f-preset').addEventListener('change', function () {
      state.preset = this.value;
      state.phases = presetPhases(state.preset);
      syncForm();
      renderPhases();
      refresh();
    });

    $('resetPhases').addEventListener('click', function () {
      state.phases = presetPhases(state.preset);
      renderPhases();
      refresh();
    });

    $('addPhase').addEventListener('click', function () {
      state.phases.push({ name: 'New phase', weight: 20, owner: '', tasks: 'Task\n* Milestone' });
      renderPhases();
      refresh();
    });

    $('addMember').addEventListener('click', function () {
      state.team.push({ name: '', initials: '', role: '' });
      renderTeam();
      refresh();
    });

    /* team edits: update state in place, no re-render (keeps focus) */
    $('teamRows').addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-k');
      if (!k) return;
      var wrap = e.target.closest('.team-row');
      var i = +wrap.getAttribute('data-i');
      state.team[i][k] = e.target.value;

      if (k === 'name') {
        var initEl = wrap.querySelector('[data-k=initials]');
        var roleEl = wrap.querySelector('[data-k=role]');
        /* picking someone off the roster fills in their team */
        var known = BY_NAME[e.target.value.trim().toLowerCase()];
        if (known && (!roleEl.value || roleEl.dataset.auto === '1')) {
          roleEl.value = known.t || '';
          roleEl.dataset.auto = '1';
          state.team[i].role = roleEl.value;
        }
        if (!initEl.value || initEl.dataset.auto === '1') {
          initEl.value = initialsOf(e.target.value);
          initEl.dataset.auto = '1';
          state.team[i].initials = initEl.value;
        }
      }
      /* once edited by hand, stop overwriting it */
      if (k === 'initials' || k === 'role') e.target.dataset.auto = '0';
      refresh();
    });
    $('teamRows').addEventListener('click', function (e) {
      if (e.target.getAttribute('data-act') !== 'rm') return;
      var i = +e.target.closest('.team-row').getAttribute('data-i');
      state.team.splice(i, 1);
      if (!state.team.length) state.team.push({ name: '', initials: '', role: '' });
      renderTeam(); renderPhases(); refresh();
    });

    /* phase edits: same, no re-render on typing */
    $('phaseList').addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-k');
      if (!k) return;
      var i = +e.target.closest('.phase').getAttribute('data-i');
      state.phases[i][k] = k === 'weight' ? (parseInt(e.target.value, 10) || 1) : e.target.value;
      if (k === 'tasks') autosize(e.target);
      refresh();
    });
    $('phaseList').addEventListener('click', function (e) {
      var act = e.target.getAttribute('data-act');
      if (!act) return;
      var card = e.target.closest('.phase');
      var i = +card.getAttribute('data-i');

      if (act === 'rm') {
        state.phases.splice(i, 1);
        renderPhases(); refresh();
        return;
      }
      /* append a line and put the cursor on it, so the * convention is learned
         by seeing it rather than by reading about it */
      var ta = card.querySelector('textarea');
      var line = act === 'ms' ? '* Milestone' : 'New task';
      ta.value = (ta.value.replace(/\s+$/, '') ? ta.value.replace(/\s+$/, '') + '\n' : '') + line;
      state.phases[i].tasks = ta.value;
      autosize(ta);
      ta.focus();
      ta.setSelectionRange(ta.value.length - line.length, ta.value.length);
      refresh();
    });

    /* document picker */
    $('docGrid').addEventListener('change', function (e) {
      var label = e.target.closest('.doc');
      if (!label) return;
      var id = label.getAttribute('data-id');
      var at = state.docs.indexOf(id);
      if (e.target.checked && at < 0) { state.docs.push(id); previewId = id; }
      else if (!e.target.checked && at >= 0) state.docs.splice(at, 1);
      renderDocs(); refresh();
    });
    $('docGrid').addEventListener('click', function (e) {
      /* clicking the text of an already-selected card moves the preview to it */
      if (e.target.tagName === 'INPUT') return;
      var label = e.target.closest('.doc');
      if (!label) return;
      var id = label.getAttribute('data-id');
      if (state.docs.indexOf(id) >= 0) { previewId = id; renderDocs(); renderPreview(); }
    });
    $('selAll').addEventListener('click', function () {
      state.docs = T.DOCS.map(function (d) { return d.id; });
      renderDocs(); refresh();
    });
    $('selNone').addEventListener('click', function () {
      state.docs = [];
      renderDocs(); refresh();
    });

    /* preview tabs */
    $('previewTabs').addEventListener('click', function (e) {
      var b = e.target.closest('.pv-tab');
      if (!b) return;
      previewId = b.getAttribute('data-id');
      renderDocs(); renderPreview();
    });

    $('exportBtn').addEventListener('click', doExport);
    if ($('regSend')) $('regSend').addEventListener('click', sendRegister);

    $('copyBtn').addEventListener('click', function () {
      var ids = selectedIds();
      if (!ids.length) return toast('Nothing to copy');
      var c = cfg(), sched = P.buildSchedule(c);
      var item = buildOne(previewId, c, sched);
      var text = item.sheet ? S.toCsv(item.sheet) : R.toMarkdown(item.blocks);
      copyText(text, item.doc.name + ' copied' + (item.sheet ? ' as CSV' : ' as Markdown'));
    });

    $('tabs').addEventListener('click', function (e) {
      var t = e.target.closest('.tab');
      if (t) showTab(t.getAttribute('data-tab'));
    });

    /* "skip to the builder" inside the wizard */
    document.addEventListener('click', function (e) {
      var g = e.target.closest('[data-goto]');
      if (g) showTab(g.getAttribute('data-goto'));
    });

    /* Start here is the homepage. Everyone lands there, including returning
       visitors, since the guided route is the one we want people taking. The
       Custom build tab is always available, and #build deep-links straight to it
       for anyone who wants to bookmark the builder. */
    showTab(location.hash === '#build' ? 'build' : 'guide');

    $('linkBtn').addEventListener('click', function () {
      var url = location.origin + location.pathname + '#s=' + encodeState(state);
      history.replaceState(null, '', '#s=' + encodeState(state));
      copyText(url, 'Link copied: it restores this exact setup');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.SIK = window.SIK || {});
