/* Date math and schedule generation. All dates are UTC midnight to keep
   arithmetic free of daylight-saving surprises. */
(function (SIK) {
  'use strict';

  var DAY = 86400000;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function parseISO(s) {
    var p = String(s || '').split('-').map(Number);
    if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return today();
    return new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  }
  function iso(d) { return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function today() {
    var n = new Date();
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
  }
  function addDays(d, n) { return new Date(d.getTime() + n * DAY); }
  function diffDays(a, b) { return Math.round((b - a) / DAY); }
  function dow(d) { return d.getUTCDay(); }
  function isWeekend(d) { return dow(d) === 0 || dow(d) === 6; }
  function nextWorkday(d) { while (isWeekend(d)) d = addDays(d, 1); return d; }
  function prevWorkday(d) { while (isWeekend(d)) d = addDays(d, -1); return d; }
  function fmtShort(d) { return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()]; }
  function fmtLong(d) { return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function startOfWeek(d) { var s = dow(d); return addDays(d, s === 0 ? -6 : 1 - s); }  /* Monday */

  /* ---------- schedule ----------
     cfg: { startDate, horizonDays, phases:[{name, weight, owner, tasks:[{name, milestone}]}] }
     returns { start, end, phases:[{name, owner, start, end, tasks:[{name, owner, start, end, milestone}]}] } */
  function buildSchedule(cfg) {
    var start = parseISO(cfg.startDate);
    var total = Math.max(1, cfg.horizonDays | 0);
    var end = addDays(start, total - 1);
    var phases = (cfg.phases || []).filter(function (p) { return p && (p.name || '').trim(); });
    if (!phases.length) return { start: start, end: end, phases: [] };

    var totalW = phases.reduce(function (n, p) { return n + (Number(p.weight) > 0 ? Number(p.weight) : 1); }, 0);

    /* cumulative day boundaries so phase spans sum exactly to the horizon */
    var acc = 0, bounds = [0];
    phases.forEach(function (p) {
      acc += (Number(p.weight) > 0 ? Number(p.weight) : 1) / totalW;
      bounds.push(Math.min(total, Math.round(acc * total)));
    });
    for (var i = 1; i < bounds.length; i++) {
      if (bounds[i] <= bounds[i - 1]) bounds[i] = Math.min(total, bounds[i - 1] + 1);
    }

    var out = phases.map(function (p, pi) {
      var pStart = Math.min(bounds[pi], total - 1);
      var pEnd = Math.max(pStart, Math.min(bounds[pi + 1] - 1, total - 1));
      var span = pEnd - pStart + 1;

      var tasks = (p.tasks || []).filter(function (t) { return t && (t.name || '').trim(); });
      var work = tasks.filter(function (t) { return !t.milestone; });
      var per = work.length ? span / work.length : span;

      var phaseOwner = p.owner || cfg.dri || '';
      var wi = 0;
      var built = tasks.map(function (t) {
        var s, e;
        if (t.milestone) {
          s = e = pEnd;
        } else {
          s = Math.floor(pStart + wi * per);
          e = Math.max(s, Math.floor(pStart + (wi + 1) * per) - 1);
          if (e > pEnd) e = pEnd;
          wi++;
        }
        var sd = addDays(start, s), ed = addDays(start, e);
        /* nudge onto working days where it does not invert the range */
        var sd2 = nextWorkday(sd), ed2 = prevWorkday(ed);
        if (sd2 <= ed) sd = sd2;
        if (ed2 >= sd) ed = ed2;
        return {
          name: (t.name || '').trim(),
          owner: t.owner || phaseOwner,
          start: sd, end: ed, milestone: !!t.milestone
        };
      });

      return {
        name: (p.name || '').trim(),
        owner: phaseOwner,
        start: addDays(start, pStart),
        end: addDays(start, pEnd),
        tasks: built
      };
    });

    return { start: start, end: end, phases: out };
  }

  /* ---------- gantt period columns ---------- */
  function pickGranularity(totalDays, requested) {
    if (requested && requested !== 'auto') {
      if (requested === 'day' && totalDays > 70) return 'week';
      return requested;
    }
    if (totalDays <= 21) return 'day';
    if (totalDays <= 200) return 'week';
    return 'month';
  }

  /* returns [{start, end, label, group, weekend}] */
  function buildPeriods(start, end, gran) {
    var out = [], cur;
    if (gran === 'day') {
      for (cur = start; cur <= end; cur = addDays(cur, 1)) {
        out.push({
          start: cur, end: cur,
          label: String(cur.getUTCDate()),
          group: MONTHS[cur.getUTCMonth()] + ' ' + String(cur.getUTCFullYear()).slice(2),
          weekend: isWeekend(cur)
        });
      }
    } else if (gran === 'week') {
      for (cur = startOfWeek(start); cur <= end; cur = addDays(cur, 7)) {
        out.push({
          start: cur, end: addDays(cur, 6),
          label: fmtShort(cur),
          group: MONTHS[addDays(cur, 3).getUTCMonth()] + ' ' + String(addDays(cur, 3).getUTCFullYear()).slice(2)
        });
      }
    } else {
      cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
      while (cur <= end) {
        var nxt = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));
        out.push({
          start: cur, end: addDays(nxt, -1),
          label: MONTHS[cur.getUTCMonth()],
          group: 'Q' + (Math.floor(cur.getUTCMonth() / 3) + 1) + ' ' + cur.getUTCFullYear()
        });
        cur = nxt;
      }
    }
    return out;
  }

  /* contiguous runs of the same `group` value, for the merged band row */
  function groupRuns(periods) {
    var runs = [];
    periods.forEach(function (p, i) {
      var last = runs[runs.length - 1];
      if (last && last.group === p.group) last.to = i;
      else runs.push({ group: p.group, from: i, to: i });
    });
    return runs;
  }

  function overlaps(a1, a2, b1, b2) { return a1 <= b2 && a2 >= b1; }

  SIK.plan = {
    DAY: DAY, MONTHS: MONTHS,
    parseISO: parseISO, iso: iso, today: today, addDays: addDays, diffDays: diffDays,
    isWeekend: isWeekend, nextWorkday: nextWorkday, prevWorkday: prevWorkday,
    fmtShort: fmtShort, fmtLong: fmtLong, startOfWeek: startOfWeek,
    buildSchedule: buildSchedule, pickGranularity: pickGranularity,
    buildPeriods: buildPeriods, groupRuns: groupRuns, overlaps: overlaps
  };
})(window.SIK = window.SIK || {});
