/*
 * Forge Legacy — Home Workout Artwork Resolver (implementation of Spec v1.0)
 * See "Forge Home Artwork Resolver.dc.html" for the full specification.
 *
 * Deterministic · centralized · testable · reusable. One entry point:
 *
 *   ForgeArtworkResolver.resolveHomeWorkoutArtwork({ user, workout, program, exercises })
 *     -> { collection, key, sexVariant, confidence, reason, source, assetPath }
 *
 * The Home card consumes ONLY the returned object — it holds no classification logic.
 * Legacy and Honors are never selected for the active workout card.
 */
(function (root) {
  // ── Registered asset manifest ─────────────────────────────────────────────
  // Keys are the canonical (underscore) form; files on disk use hyphens.
  var COLLECTIONS = {
    training_split:   { dir: 'training-splits',    sexed: true, keys: ['push', 'pull', 'legs', 'upper', 'lower', 'full_body', 'core', 'conditioning'] },
    workout_modality: { dir: 'workout-modalities', sexed: true, keys: ['strength', 'running', 'walking', 'sprinting', 'cycling', 'swimming', 'rowing', 'mobility', 'stretching', 'yoga', 'recovery'] },
    program_theme:    { dir: 'program-themes',     sexed: true, keys: ['powerbuilding', 'bodybuilding', 'strength', 'athletic_performance', 'beginner', 'hypertrophy', 'cutting', 'offseason'] },
    exercise_family:  { dir: 'exercise-families',  sexed: true, keys: ['pressing', 'pulling', 'squatting', 'hip_hinge', 'carry', 'rotation', 'isolation', 'machines', 'bodyweight'] },
  };
  var RESERVED = { legacy: 1, honors: 1 };
  // TEMPORARY: no neutral artwork exists yet. A missing sex resolves to this set,
  // but the reported sexVariant is still "neutral" so it is auditable. Replace with
  // a true neutral asset when produced.
  var NEUTRAL_SEX_FALLBACK = 'male';
  // Registered final fallback — never a broken image, never random.
  var DEFAULT = { collection: 'training_split', key: 'full_body' };

  var BASE = 'assets/artwork/';

  function fileKey(key) { return String(key).replace(/_/g, '-'); }

  function assetPath(collection, key, servedSex) {
    var c = COLLECTIONS[collection];
    if (!c) return null;
    var sexDir = c.sexed ? (servedSex + '/') : '';
    return BASE + c.dir + '/' + sexDir + fileKey(key) + '.png';
  }

  function isReserved(collection) { return !!RESERVED[collection]; }

  function validKey(collection, key) {
    var c = COLLECTIONS[collection];
    if (!c || isReserved(collection)) return false;
    return c.keys.indexOf(key) !== -1;
  }

  // ── Sex variant (from saved selection only — never inferred) ───────────────
  function resolveSexVariant(user) {
    var s = user && user.sex;
    if (s == null && root.ForgeUser) { try { s = root.ForgeUser.get().sex; } catch (e) {} }
    s = (s == null ? '' : String(s)).toLowerCase().charAt(0);
    if (s === 'm') return { variant: 'male', served: 'male' };
    if (s === 'f') return { variant: 'female', served: 'female' };
    return { variant: 'neutral', served: NEUTRAL_SEX_FALLBACK }; // temporary placeholder
  }

  // ── Title normalization (fallback only) ────────────────────────────────────
  function normalizeTitle(title) {
    return String(title || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')       // strip punctuation
      .replace(/\b[a-d]\b/g, ' ')         // ignore day letters A–D
      .replace(/\b\d+\b/g, ' ')           // ignore numbers
      .replace(/\s+/g, ' ')               // collapse whitespace
      .trim();
  }

  var MODALITY_TOKENS = [
    ['sprinting', /\bsprint/], ['running', /\b(run|jog|tempo|interval run)\b/], ['walking', /\bwalk/],
    ['cycling', /\b(cycle|cycling|bike|spin)\b/], ['swimming', /\bswim/], ['rowing', /\b(row|erg)\b/],
    ['yoga', /\byoga\b/], ['mobility', /\bmobilit/], ['stretching', /\bstretch/], ['recovery', /\brecover/],
    ['conditioning', /\b(conditioning|circuit|metcon|hiit|engine|cardio|wod)\b/],
  ];
  var SPLIT_TOKENS = [
    ['full_body', /\b(full body|total body|whole body|full)\b/],
    ['upper', /\bupper\b/], ['lower', /\blower\b/],
    ['push', /\b(push|chest|shoulder|press|pressing)\b/],
    ['pull', /\b(pull|back|lat|bicep|row)\b/],
    ['legs', /\b(legs?|leg day|quad|glute|hamstring)\b/],
    ['core', /\b(core|abs?|midsection|trunk)\b/],
    ['conditioning', /\b(conditioning|circuit|metcon|hiit)\b/],
  ];

  function matchToken(norm, table) {
    for (var i = 0; i < table.length; i++) { if (table[i][1].test(norm)) return table[i][0]; }
    return null;
  }

  // program structure: 'upper_lower' | 'ppl' | 'full_body' | null (from schedule day names)
  function programStructure(program) {
    if (!program) return null;
    if (program.structure) return program.structure;
    var names = (program.schedule || []).map(function (d) { return String(d.name || '').toLowerCase(); }).join(' ');
    var hasUpper = /\bupper\b/.test(names), hasLower = /\blower\b/.test(names);
    if (hasUpper && hasLower) return 'upper_lower';
    if (/\bpush\b/.test(names) && /\bpull\b/.test(names) && /\bleg/.test(names)) return 'ppl';
    if (/\bfull body\b/.test(names)) return 'full_body';
    return null;
  }

  // ── Modality (primary session modality controls; warm-ups ignored) ─────────
  function primaryModality(workout, program) {
    if (workout && workout.modality) return workout.modality; // explicit
    var byTitle = matchToken(normalizeTitle(workout && workout.name), MODALITY_TOKENS);
    if (byTitle) return byTitle;
    var fam = program && program.family;
    if (fam === 'Running') return 'running';
    if (fam === 'Conditioning') return 'conditioning';
    if (fam === 'Mobility') return 'mobility';
    return 'strength';
  }

  // ── Split resolution: A structured → B muscles → C exercises → D title → E program
  function resolveSplit(workout, exercises, program) {
    // A · explicit structured split
    if (workout && workout.split && validKey('training_split', workout.split)) {
      return { key: workout.split, confidence: 0.95, via: 'structured' };
    }
    // B · structured target muscle groups
    if (workout && workout.targetMuscleGroups && workout.targetMuscleGroups.length) {
      var byMuscle = splitFromMuscles(workout.targetMuscleGroups, programStructure(program));
      if (byMuscle) return { key: byMuscle, confidence: 0.95, via: 'muscle-groups' };
    }
    // C · exercise composition
    if (exercises && exercises.length) {
      var byComp = splitFromExercises(exercises, programStructure(program));
      if (byComp) return { key: byComp, confidence: 0.85, via: 'composition' };
    }
    // D · normalized title
    var struct = programStructure(program);
    var byTitle = splitFromTitle(workout && workout.name, struct);
    if (byTitle) return { key: byTitle, confidence: 0.70, via: 'title' };
    // E · program default
    var byProgram = splitFromProgram(program);
    if (byProgram) return { key: byProgram, confidence: 0.60, via: 'program' };
    return null;
  }

  function splitFromTitle(name, struct) {
    var norm = normalizeTitle(name);
    if (!norm) return null;
    var key = matchToken(norm, SPLIT_TOKENS);
    if (!key) return null;
    // Legs vs Lower: only call it "lower" inside an explicit upper/lower structure.
    if (key === 'legs' && struct === 'upper_lower') return 'lower';
    if (key === 'lower' && struct !== 'upper_lower') return 'legs';
    return key;
  }

  function splitFromMuscles(muscles, struct) {
    var m = muscles.map(function (x) { return String(x).toLowerCase(); }).join(' ');
    var push = /(chest|delt|shoulder|tricep)/.test(m);
    var pull = /(back|lat|bicep)/.test(m);
    var legs = /(quad|glute|hamstring|calf|calves)/.test(m);
    var core = /(core|abs|oblique)/.test(m);
    if (core && !push && !pull && !legs) return 'core';
    if (legs && (push || pull)) return 'full_body';
    if (legs) return struct === 'upper_lower' ? 'lower' : 'legs';
    if (push && pull) return 'upper';
    if (push) return 'push';
    if (pull) return 'pull';
    return null;
  }

  function splitFromExercises(exercises, struct) {
    // muscle-group tallies from resolved exercises; warm-ups/cooldowns excluded upstream
    var groups = [];
    exercises.forEach(function (ex) { (ex.muscles || []).forEach(function (mu) { groups.push(mu); }); });
    return splitFromMuscles(groups, struct);
  }

  function splitFromProgram(program) {
    if (!program) return null;
    var struct = programStructure(program);
    if (struct === 'full_body' || program.family === 'Full Body & Home') return 'full_body';
    return null;
  }

  // ── Dominant exercise family (working sets; 60% & +20pp; excl warm-up/cooldown)
  var FAMILY_OF_PATTERN = {
    'horizontal push': 'pressing', 'vertical push': 'pressing', 'incline push': 'pressing',
    'horizontal pull': 'pulling', 'vertical pull': 'pulling', 'rear-delt pull': 'pulling',
    'squat': 'squatting', 'squat (machine)': 'squatting', 'lunge': 'squatting',
    'hip hinge': 'hip_hinge',
    'trunk flexion': 'rotation', 'anti-extension': 'rotation', 'hip flexion': 'rotation', 'rotation': 'rotation',
  };
  function familyOf(ex) {
    var pat = String(ex.pattern || '').toLowerCase();
    if (String(ex.equip || '').toLowerCase() === 'machine') return 'machines';
    if (String(ex.equip || '').toLowerCase() === 'bodyweight') return 'bodyweight';
    if (String(ex.type || '').toLowerCase() === 'isolation') return 'isolation';
    return FAMILY_OF_PATTERN[pat] || null;
  }
  function dominantFamily(exercises) {
    if (!exercises || !exercises.length) return null;
    var tally = {}, total = 0;
    exercises.forEach(function (ex) {
      if (ex.section && ex.section !== 'main') return;       // exclude warm-up/cooldown
      if (ex.optional) return;                                // exclude finishers
      var f = familyOf(ex); if (!f) return;
      var sets = ex.workingSets || ex.sets || 1;
      tally[f] = (tally[f] || 0) + sets; total += sets;
    });
    if (!total) return null;
    var ranked = Object.keys(tally).map(function (k) { return [k, tally[k] / total]; }).sort(function (a, b) { return b[1] - a[1]; });
    var top = ranked[0], second = ranked[1];
    if (top && top[1] >= 0.60 && (!second || (top[1] - second[1]) >= 0.20)) return top[0];
    return null;
  }

  // ── Program theme (explicit metadata preferred; conservative inference) ─────
  function programTheme(program) {
    if (!program) return null;
    if (program.theme && validKey('program_theme', program.theme)) return program.theme;
    var name = String(program.name || '').toLowerCase();
    if (/powerbuilding/.test(name)) return 'powerbuilding';
    if (/hypertroph/.test(name)) return 'hypertrophy';
    if (/bodybuild/.test(name)) return 'bodybuilding';
    if (program.difficulty === 'Beginner') return 'beginner';
    if (program.family === 'Strength') return 'strength';
    if (program.family === 'Muscle Building') return 'hypertrophy';
    return null;
  }

  // ── Build the resolved object ──────────────────────────────────────────────
  function build(collection, key, sx, confidence, reason, source) {
    return {
      collection: collection, key: key,
      sexVariant: sx.variant,
      confidence: confidence, reason: reason, source: source,
      assetPath: assetPath(collection, key, sx.served),
    };
  }

  // ── Entry point ────────────────────────────────────────────────────────────
  function resolveHomeWorkoutArtwork(ctx) {
    ctx = ctx || {};
    var workout = ctx.workout || {};
    var program = ctx.program || null;
    var exercises = ctx.exercises || [];
    var sx = resolveSexVariant(ctx.user);

    // 1 · explicit override
    var ov = workout.artworkOverride;
    if (ov && validKey(ov.collection, ov.key)) {
      return build(ov.collection, ov.key, sx, 1.00, 'Explicit valid override', 'override');
    }

    // 2 · non-strength modality
    var modality = primaryModality(workout, program);
    if (modality && modality !== 'strength' && validKey('workout_modality', modality)) {
      return build('workout_modality', modality, sx, 0.95, 'Primary non-strength modality', 'modality');
    }

    var isStrength = (modality === 'strength');
    if (isStrength) {
      // 3 · strength split
      var split = resolveSplit(workout, exercises, program);
      if (split) return build('training_split', split.key, sx, split.confidence, 'Training split (' + split.via + ')', 'split:' + split.via);
      // 4 · dominant exercise family
      var fam = dominantFamily(exercises);
      if (fam) return build('exercise_family', fam, sx, 0.85, 'Dominant exercise family', 'family');
    }

    // 5 · program theme
    var theme = programTheme(program);
    if (theme) return build('program_theme', theme, sx, 0.60, 'Program theme fallback', 'theme');

    // 6 · generic fallback
    if (isStrength) return build('workout_modality', 'strength', sx, 0.60, 'Generic strength fallback', 'generic:strength');
    var mixed = matchToken(normalizeTitle(workout.name), SPLIT_TOKENS) === 'conditioning' ? 'conditioning' : null;
    if (mixed) return build('workout_modality', 'conditioning', sx, 0.00, 'Generic mixed fallback', 'generic:mixed');

    // 7 · neutral default — always terminates
    return build(DEFAULT.collection, DEFAULT.key, sx, 0.00, 'Neutral default', 'default');
  }

  root.ForgeArtworkResolver = {
    resolveHomeWorkoutArtwork: resolveHomeWorkoutArtwork,
    // exposed for tests / tooling
    COLLECTIONS: COLLECTIONS,
    validKey: validKey,
    assetPath: assetPath,
    normalizeTitle: normalizeTitle,
    resolveSexVariant: resolveSexVariant,
    primaryModality: primaryModality,
    resolveSplit: resolveSplit,
    dominantFamily: dominantFamily,
    programTheme: programTheme,
    programStructure: programStructure,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ForgeArtworkResolver;
})(typeof window !== 'undefined' ? window : this);
