/*
 * Forge Legacy — Home Gym profile (shared source of truth)
 * One saved equipment profile the whole app reads: Onboarding, Account Settings,
 * Exercise Library (W-21) and Programs Catalog all read/edit THIS.
 *
 * Persisted in localStorage under 'forge.homegym.equip' as a JSON array of
 * canonical equipment labels (see EQUIPMENT). Bodyweight is always implied.
 *
 *   ForgeHomeGym.EQUIPMENT            -> canonical [{ id, label, hint }]
 *   ForgeHomeGym.read()              -> string[] owned labels
 *   ForgeHomeGym.write(list)         -> persist + notify listeners
 *   ForgeHomeGym.isEmpty()           -> true when nothing owned
 *   ForgeHomeGym.canDoExercise(ex)   -> can this catalog exercise be done? (ex.equip)
 *   ForgeHomeGym.exerciseEquipOwned(equip) -> is an exercise-equip category covered?
 *   ForgeHomeGym.programFit(program) -> { fits, owned, missing[] }  (lenient)
 *   ForgeHomeGym.onChange(fn)/offChange(fn)
 */
(function (root) {
  var KEY = 'forge.homegym.equip';

  // Canonical inventory — an open, comprehensive home-gym list, grouped for the editor.
  // The Onboarding quick-picker seeds a conservative subset of these labels.
  var EQUIPMENT = [
    // Barbell & rack
    { id: 'barbell', label: 'Barbell', hint: 'Bar + plates', group: 'Barbell & rack' },
    { id: 'plates', label: 'Weight plates', hint: 'Bumper or iron', group: 'Barbell & rack' },
    { id: 'rack', label: 'Squat rack', hint: 'Rack, stands or cage', group: 'Barbell & rack' },
    { id: 'bench', label: 'Bench', hint: 'Flat / adjustable', group: 'Barbell & rack' },
    { id: 'ezbar', label: 'EZ-curl bar', hint: 'Curl / triceps bar', group: 'Barbell & rack' },
    { id: 'trapbar', label: 'Trap bar', hint: 'Hex / trap bar', group: 'Barbell & rack' },
    { id: 'smith', label: 'Smith machine', hint: 'Guided barbell', group: 'Barbell & rack' },
    // Free weights
    { id: 'dumbbells', label: 'Dumbbells', hint: 'Fixed or adjustable', group: 'Free weights' },
    { id: 'kettlebells', label: 'Kettlebells', hint: 'One or a set', group: 'Free weights' },
    { id: 'medball', label: 'Medicine ball', hint: 'Med / slam ball', group: 'Free weights' },
    { id: 'sandbag', label: 'Sandbag', hint: 'Sandbag / bag', group: 'Free weights' },
    { id: 'weightvest', label: 'Weight vest', hint: 'Loaded vest', group: 'Free weights' },
    // Machines & cable
    { id: 'cable', label: 'Cable machine', hint: 'Cable / functional trainer', group: 'Machines & cable' },
    { id: 'latpulldown', label: 'Lat pulldown', hint: 'Pulldown / row station', group: 'Machines & cable' },
    { id: 'legpress', label: 'Leg press', hint: 'Leg press / hack squat', group: 'Machines & cable' },
    { id: 'legmachine', label: 'Leg curl / extension', hint: 'Hamstring / quad machine', group: 'Machines & cable' },
    // Cardio
    { id: 'treadmill', label: 'Treadmill', hint: 'Treadmill', group: 'Cardio' },
    { id: 'rower', label: 'Rowing machine', hint: 'Rower / erg', group: 'Cardio' },
    { id: 'bike', label: 'Exercise bike', hint: 'Upright / spin bike', group: 'Cardio' },
    { id: 'airbike', label: 'Air bike', hint: 'Fan / assault bike', group: 'Cardio' },
    { id: 'elliptical', label: 'Elliptical', hint: 'Cross-trainer', group: 'Cardio' },
    { id: 'jumprope', label: 'Jump rope', hint: 'Skipping rope', group: 'Cardio' },
    // Bodyweight & rigs
    { id: 'pullup', label: 'Pull-up bar', hint: 'Bar or rig', group: 'Bodyweight & rigs' },
    { id: 'dip', label: 'Dip bars', hint: 'Dip station / parallettes', group: 'Bodyweight & rigs' },
    { id: 'rings', label: 'Gymnastic rings', hint: 'Rings', group: 'Bodyweight & rigs' },
    { id: 'trx', label: 'Suspension trainer', hint: 'TRX / straps', group: 'Bodyweight & rigs' },
    { id: 'plyobox', label: 'Plyo box', hint: 'Jump box', group: 'Bodyweight & rigs' },
    // Bands & accessories
    { id: 'bands', label: 'Bands', hint: 'Resistance / tube bands', group: 'Bands & accessories' },
    { id: 'minibands', label: 'Mini bands', hint: 'Glute / loop bands', group: 'Bands & accessories' },
    { id: 'abwheel', label: 'Ab wheel', hint: 'Ab roller', group: 'Bands & accessories' },
    { id: 'foamroller', label: 'Foam roller', hint: 'Recovery roller', group: 'Bands & accessories' },
    { id: 'mat', label: 'Exercise mat', hint: 'Yoga / floor mat', group: 'Bands & accessories' },
  ];
  var GROUPS = ['Barbell & rack', 'Free weights', 'Machines & cable', 'Cardio', 'Bodyweight & rigs', 'Bands & accessories'];
  var LABELS = EQUIPMENT.map(function (e) { return e.label; });
  function byGroup() {
    return GROUPS.map(function (g) {
      return { group: g, items: EQUIPMENT.filter(function (e) { return e.group === g; }) };
    });
  }

  // ── owned home-gym label -> which EXERCISE-catalog equip categories it unlocks ──
  // Exercise catalog equip values: Barbell | Dumbbell | Cable | Machine | Bodyweight
  var EX_UNLOCK = {
    'Barbell': ['Barbell'],
    'Weight plates': ['Barbell'],
    'Squat rack': ['Barbell'],
    'EZ-curl bar': ['Barbell'],
    'Trap bar': ['Barbell'],
    'Smith machine': ['Barbell', 'Machine'],
    'Dumbbells': ['Dumbbell'],
    'Kettlebells': ['Kettlebell'],
    'Cable machine': ['Cable', 'Machine'], // a functional trainer stands in for cable + light machine work
    'Lat pulldown': ['Cable', 'Machine'],
    'Leg press': ['Machine'],
    'Leg curl / extension': ['Machine'],
    'Bands': ['Band'],
    'Mini bands': ['Band'],
  };

  // ── program equipment tag -> requirement resolver ──
  // Programs tag themselves with looser labels; map each to how it's satisfied.
  // 'always' = no real gear needed (floor / shoes); otherwise the owned label(s) that satisfy it.
  var PROG_REQ = {
    'Barbell': ['Barbell'],
    'Rack': ['Squat rack'],
    'Dumbbells': ['Dumbbells'],
    'Machines': ['Cable machine', 'Lat pulldown', 'Leg press', 'Leg curl / extension', 'Smith machine'],
    'Cables': ['Cable machine', 'Lat pulldown'],
    'Kettlebell': ['Kettlebells'],
    'Kettlebells': ['Kettlebells'],
    'Band': ['Bands'],
    'Bands': ['Bands'],
    'Rower': ['Rowing machine'],
    'Bike': ['Exercise bike', 'Air bike'],
    'Mat': 'always',
    'Bodyweight': 'always',
    'Running shoes': 'always',
    'Track': 'always',
  };

  var listeners = [];

  function read() {
    try { var raw = root.localStorage.getItem(KEY); if (raw) { var a = JSON.parse(raw); if (Array.isArray(a)) return a.filter(function (x) { return LABELS.indexOf(x) !== -1; }); } } catch (e) {}
    return [];
  }
  function write(list) {
    var clean = (list || []).filter(function (x) { return LABELS.indexOf(x) !== -1; });
    try { root.localStorage.setItem(KEY, JSON.stringify(clean)); } catch (e) {}
    listeners.slice().forEach(function (fn) { try { fn(clean); } catch (e) {} });
    return clean;
  }
  function isEmpty() { return read().length === 0; }

  // exercise-equip category covered by the owned profile?
  function exerciseEquipOwned(equip, ownedOpt) {
    if (equip === 'Bodyweight') return true;
    var owned = ownedOpt || read();
    for (var i = 0; i < owned.length; i++) {
      var unlock = EX_UNLOCK[owned[i]];
      if (unlock && unlock.indexOf(equip) !== -1) return true;
    }
    return false;
  }
  function canDoExercise(ex, ownedOpt) {
    if (!ex) return false;
    return exerciseEquipOwned(ex.equip, ownedOpt);
  }

  // lenient program fit — a genuine "minor swap": fits if nothing's missing, OR only one piece is
  // missing AND the athlete already owns at least one required piece. A program whose equipment the
  // athlete owns NONE of never counts (e.g. a barbell-only program for a dumbbell-only gym).
  function programFit(program, ownedOpt) {
    var owned = ownedOpt || read();
    var tags = (program && program.equipment) || [];
    var missing = [], realReq = 0, haveCount = 0;
    tags.forEach(function (tag) {
      var req = PROG_REQ[tag];
      if (req === 'always' || !req) return;                 // unknown / no-gear tags are non-blocking
      realReq++;
      var have = req.some(function (label) { return owned.indexOf(label) !== -1; });
      if (have) haveCount++; else missing.push(tag);
    });
    var fits = (realReq === 0) || (missing.length === 0) || (missing.length <= 1 && haveCount >= 1);
    return { fits: fits, owned: realReq - missing.length, missing: missing };
  }

  function onChange(fn) { if (typeof fn === 'function' && listeners.indexOf(fn) === -1) listeners.push(fn); }
  function offChange(fn) { var i = listeners.indexOf(fn); if (i !== -1) listeners.splice(i, 1); }

  var API = {
    KEY: KEY,
    EQUIPMENT: EQUIPMENT,
    GROUPS: GROUPS,
    byGroup: byGroup,
    LABELS: LABELS,
    read: read,
    write: write,
    isEmpty: isEmpty,
    exerciseEquipOwned: exerciseEquipOwned,
    canDoExercise: canDoExercise,
    programFit: programFit,
    onChange: onChange,
    offChange: offChange,
  };
  root.ForgeHomeGym = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : this);
