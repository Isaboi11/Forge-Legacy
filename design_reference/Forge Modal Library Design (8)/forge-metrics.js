/* Forge Legacy — Strength & Performance metric model.
 * Athlete-curated (customizable, persisted); overrides the purely-adaptive default.
 * Same pub/sub shape as ForgeUnits / ForgeVisibility.
 *
 * Raw values: weight → POUNDS (format via ForgeUnits.fmt); duration → SECONDS;
 * pace → SECONDS per mile. Series points are chronological { label, v }.
 */
(function () {
  var KEY = 'forge.metrics.selected';

  var POOL = [
    // ── Strength ──
    { id: 'squat', name: 'Back Squat', cat: 'Strength', unit: 'weight',
      series: [{ label: 'Sep', v: 300 }, { label: 'Oct', v: 315 }, { label: 'Nov', v: 325 }, { label: 'Dec', v: 335 }, { label: 'Jan', v: 350 }, { label: 'Feb', v: 360 }, { label: 'Mar', v: 365 }],
      milestones: [{ label: '315 lb Club', date: 'Nov 2025' }, { label: 'Bodyweight ×2', date: 'Feb 2026' }],
      recent: [{ title: 'Leg Day A', detail: '365 × 3 \u00B7 top single', date: 'Mar 5' }, { title: 'Leg Day A', detail: '350 × 5', date: 'Feb 26' }] },

    { id: 'bench', name: 'Bench Press', cat: 'Strength', unit: 'weight',
      series: [{ label: 'Sep', v: 190 }, { label: 'Oct', v: 200 }, { label: 'Nov', v: 205 }, { label: 'Dec', v: 210 }, { label: 'Jan', v: 220 }, { label: 'Feb', v: 225 }, { label: 'Mar', v: 230 }],
      milestones: [{ label: 'Two Plates', date: 'Feb 2026' }],
      recent: [{ title: 'Push Day A', detail: '230 × 2', date: 'Mar 4' }, { title: 'Push Day A', detail: '225 × 3', date: 'Feb 25' }] },

    { id: 'deadlift', name: 'Deadlift', cat: 'Strength', unit: 'weight',
      series: [{ label: 'Sep', v: 405 }, { label: 'Oct', v: 425 }, { label: 'Nov', v: 440 }, { label: 'Dec', v: 455 }, { label: 'Jan', v: 470 }, { label: 'Feb', v: 485 }, { label: 'Mar', v: 495 }],
      milestones: [{ label: 'Four Plates', date: 'Oct 2025' }, { label: '495 lb PR', date: 'Mar 2026' }],
      recent: [{ title: 'Pull Day', detail: '495 × 1 \u00B7 PR', date: 'Mar 6' }, { title: 'Pull Day', detail: '455 × 3', date: 'Feb 27' }] },

    { id: 'ohp', name: 'Overhead Press', cat: 'Strength', unit: 'weight',
      series: [{ label: 'Sep', v: 115 }, { label: 'Oct', v: 120 }, { label: 'Nov', v: 125 }, { label: 'Dec', v: 128 }, { label: 'Jan', v: 132 }, { label: 'Feb', v: 136 }, { label: 'Mar', v: 140 }],
      milestones: [{ label: 'Bodyweight Press', date: 'Jan 2026' }],
      recent: [{ title: 'Push Day B', detail: '140 × 3', date: 'Mar 2' }] },

    { id: 'frontsquat', name: 'Front Squat', cat: 'Strength', unit: 'weight',
      series: [{ label: 'Sep', v: 225 }, { label: 'Oct', v: 240 }, { label: 'Nov', v: 250 }, { label: 'Dec', v: 255 }, { label: 'Jan', v: 265 }, { label: 'Feb', v: 270 }, { label: 'Mar', v: 275 }],
      milestones: [{ label: 'Two & a Quarter', date: 'Feb 2026' }],
      recent: [{ title: 'Leg Day B', detail: '275 × 3', date: 'Mar 3' }] },

    { id: 'pullup', name: 'Weighted Pull-up', cat: 'Strength', unit: 'weight',
      series: [{ label: 'Sep', v: 25 }, { label: 'Oct', v: 35 }, { label: 'Nov', v: 45 }, { label: 'Dec', v: 50 }, { label: 'Jan', v: 55 }, { label: 'Feb', v: 65 }, { label: 'Mar', v: 70 }],
      milestones: [{ label: '+45 lb', date: 'Nov 2025' }],
      recent: [{ title: 'Pull Day', detail: '+70 × 5', date: 'Mar 6' }] },

    // ── Running (race times; lower is better) ──
    { id: 'mile', name: 'Mile', cat: 'Running', unit: 'duration',
      series: [{ label: 'Sep', v: 430 }, { label: 'Oct', v: 412 }, { label: 'Nov', v: 400 }, { label: 'Dec', v: 388 }, { label: 'Jan', v: 378 }, { label: 'Feb', v: 365 }, { label: 'Mar', v: 356 }],
      milestones: [{ label: 'Sub-6:00 Mile', date: 'Mar 2026' }],
      recent: [{ title: 'Track Mile', detail: '5:56 \u00B7 personal best', date: 'Mar 6' }, { title: 'Track Mile', detail: '6:05', date: 'Feb 20' }] },

    { id: 'fivek', name: '5K', cat: 'Running', unit: 'duration',
      series: [{ label: 'Sep', v: 1710 }, { label: 'Oct', v: 1655 }, { label: 'Nov', v: 1600 }, { label: 'Dec', v: 1560 }, { label: 'Jan', v: 1520 }, { label: 'Feb', v: 1495 }, { label: 'Mar', v: 1478 }],
      milestones: [{ label: 'Sub-25:00', date: 'Feb 2026' }],
      recent: [{ title: 'Parkrun 5K', detail: '24:38 \u00B7 personal best', date: 'Mar 1' }] },

    { id: 'tenk', name: '10K', cat: 'Running', unit: 'duration',
      series: [{ label: 'Oct', v: 3320 }, { label: 'Nov', v: 3220 }, { label: 'Dec', v: 3130 }, { label: 'Jan', v: 3060 }, { label: 'Feb', v: 3005 }, { label: 'Mar', v: 2960 }],
      milestones: [{ label: 'Sub-50:00', date: 'Feb 2026' }],
      recent: [{ title: 'Riverside 10K', detail: '49:20', date: 'Mar 2' }] },

    { id: 'half', name: 'Half Marathon', cat: 'Running', unit: 'duration',
      series: [{ label: 'Nov', v: 7080 }, { label: 'Dec', v: 6870 }, { label: 'Jan', v: 6660 }, { label: 'Feb', v: 6500 }, { label: 'Mar', v: 6370 }],
      milestones: [{ label: 'Sub-1:50', date: 'Feb 2026' }],
      recent: [{ title: 'City Half', detail: '1:46:10', date: 'Mar 8' }] },

    { id: 'marathon', name: 'Marathon', cat: 'Running', unit: 'duration',
      series: [{ label: 'Oct', v: 15300 }, { label: 'Dec', v: 14760 }, { label: 'Feb', v: 14310 }, { label: 'Mar', v: 13960 }],
      milestones: [{ label: 'Sub-4:00', date: 'Feb 2026' }, { label: 'First Marathon', date: 'Oct 2025' }],
      recent: [{ title: 'Spring Marathon', detail: '3:52:40', date: 'Mar 9' }] },

    { id: 'milepace', name: 'Avg Mile Pace', cat: 'Running', unit: 'pace',
      series: [{ label: 'Sep', v: 500 }, { label: 'Oct', v: 485 }, { label: 'Nov', v: 472 }, { label: 'Dec', v: 464 }, { label: 'Jan', v: 455 }, { label: 'Feb', v: 446 }, { label: 'Mar', v: 438 }],
      milestones: [{ label: 'Sub-7:30 Avg', date: 'Feb 2026' }],
      recent: [{ title: 'Long Run', detail: '7:18 /mi avg \u00B7 8 mi', date: 'Mar 7' }] },
  ];

  var defaultSelected = ['squat', 'bench', 'deadlift', 'ohp'];

  function load() {
    try {
      var raw = JSON.parse(window.localStorage.getItem(KEY));
      if (Array.isArray(raw) && raw.length) return raw.filter(function (id) { return POOL.some(function (m) { return m.id === id; }); });
    } catch (e) {}
    return defaultSelected.slice();
  }

  var selected = load();
  var subs = [];
  function emit() { subs.slice().forEach(function (fn) { try { fn(selected.slice()); } catch (e) {} }); }
  function persist() { try { window.localStorage.setItem(KEY, JSON.stringify(selected)); } catch (e) {} }

  window.addEventListener('storage', function (e) { if (e && e.key === KEY) { selected = load(); emit(); } });

  window.ForgeMetrics = {
    POOL: POOL,
    byId: function (id) { for (var i = 0; i < POOL.length; i++) if (POOL[i].id === id) return POOL[i]; return null; },
    selected: function () { return selected.slice(); },
    selectedDefs: function () { return selected.map(function (id) { return window.ForgeMetrics.byId(id); }).filter(Boolean); },
    isOn: function (id) { return selected.indexOf(id) !== -1; },
    toggle: function (id, cap) {
      var i = selected.indexOf(id);
      if (i === -1) { if (cap && selected.length >= cap) return false; selected.push(id); }
      else { selected.splice(i, 1); }
      persist(); emit(); return true;
    },
    move: function (id, dir) {
      var i = selected.indexOf(id); if (i === -1) return;
      var j = i + dir; if (j < 0 || j >= selected.length) return;
      var t = selected[i]; selected[i] = selected[j]; selected[j] = t;
      persist(); emit();
    },
    reset: function () { selected = defaultSelected.slice(); persist(); emit(); },
    subscribe: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; },
  };
})();
