/*
 * Forge Legacy — Exercise Catalog (shared source of truth)
 * One place W-21 (Library), W-22 (Detail) and W-23 (Picker) all read from.
 * Exposed as window.ForgeExerciseCatalog and as a CommonJS module.
 *
 *   ForgeExerciseCatalog.get('bench')   -> full exercise record (or null)
 *   ForgeExerciseCatalog.list           -> array of all records
 *   ForgeExerciseCatalog.byCategory('Chest') -> records in that category
 *
 * Each record:
 *   key, name, cat, equip, type ('Compound'|'Isolation'),
 *   pattern, difficulty, primary[], secondary[],
 *   definition (1 line), why (1-2 lines), steps[], cues[], mistakes[],
 *   alternatives[] ({ name, equip, note, ic })  ic ∈ db|bar|machine|body|cable
 */
(function () {
  var E = [
    // ─────────── CHEST ───────────
    {
      key: 'bench', name: 'Bench Press', cat: 'Chest', equip: 'Barbell', type: 'Compound',
      pattern: 'Horizontal push', difficulty: 'Intermediate',
      primary: ['Chest', 'Triceps'], secondary: ['Front Delts', 'Serratus Anterior'],
      definition: 'A horizontal barbell press from a flat bench — the benchmark upper-body pushing lift, and the standard by which pressing strength is measured.',
      why: 'The bench press develops upper-body pushing strength that carries into nearly every pressing movement. It is one of the foundational lifts used to build strength, muscle, and long-term progression.',
      steps: [
        'Lie back with your eyes under the bar. Plant both feet, then pull your shoulder blades down and together and hold that tightness.',
        'Grip the bar just outside shoulder width. Unrack and bring it over your chest with arms locked — this is your start.',
        'Lower under control to your lower chest, keeping elbows tucked to roughly 45–75° — not flared straight out.',
        'Touch the chest lightly without bouncing, then drive the bar up and slightly back toward the shoulders.',
        'Lock the elbows out at the top, reset your breath, and repeat with the same tight setup.',
      ],
      cues: [
        'The bar travels a shallow arc — down to the lower chest, up over the shoulders — never a dead-straight line.',
        'Keep your wrists stacked directly over your elbows so force runs straight down the forearm.',
        'Drive your feet into the floor and stay tight through the whole set; the bench is a full-body brace.',
      ],
      mistakes: [
        'Bouncing the bar off the chest to gain momentum instead of controlling the descent.',
        'Flaring the elbows to a full 90° — it stresses the shoulders and weakens the press.',
        'Lifting the hips off the bench to force the last rep, turning it into a decline press.',
      ],
      alternatives: [
        { name: 'Dumbbell Bench Press', equip: 'Dumbbell', note: 'greater range, fixes side-to-side imbalance', ic: 'db' },
        { name: 'Incline Barbell Press', equip: 'Barbell', note: 'shifts emphasis to the upper chest', ic: 'bar' },
        { name: 'Machine Chest Press', equip: 'Machine', note: 'stable path, easier to train solo', ic: 'machine' },
        { name: 'Push-Up', equip: 'Bodyweight', note: 'no equipment, scalable anywhere', ic: 'body' },
      ],
    },
    {
      key: 'incline_db', name: 'Incline Dumbbell Press', cat: 'Chest', equip: 'Dumbbell', type: 'Compound',
      pattern: 'Incline push', difficulty: 'Intermediate',
      primary: ['Upper Chest', 'Triceps'], secondary: ['Front Delts'],
      definition: 'A pressing movement on an inclined bench with dumbbells, biasing the clavicular (upper) fibers of the chest.',
      why: 'The incline angle fills out the upper chest that flat pressing under-trains, and dumbbells demand honest, balanced strength from each side.',
      steps: [
        'Set the bench to a 30–45° incline. Sit back with a dumbbell resting on each knee.',
        'Kick the weights up one at a time and settle them at the outside of your shoulders.',
        'Press up and slightly together until the arms lock, then lower under control to a deep stretch.',
        'Keep the descent slow; stop when your elbows are just below shoulder level.',
      ],
      cues: [
        'Let the dumbbells travel a touch inward at the top — do not clank them together.',
        'Keep shoulder blades pinned so the chest, not the front delt, does the work.',
      ],
      mistakes: [
        'Setting the incline too steep, turning it into a shoulder press.',
        'Cutting the range of motion short and losing the chest stretch.',
      ],
      alternatives: [
        { name: 'Incline Barbell Press', equip: 'Barbell', note: 'heavier loading, fixed path', ic: 'bar' },
        { name: 'Bench Press', equip: 'Barbell', note: 'the flat-press benchmark', ic: 'bar' },
        { name: 'Cable Fly', equip: 'Cable', note: 'isolates the chest with constant tension', ic: 'cable' },
      ],
    },
    {
      key: 'cable_fly', name: 'Cable Fly', cat: 'Chest', equip: 'Cable', type: 'Isolation',
      pattern: 'Chest isolation', difficulty: 'Beginner',
      primary: ['Chest'], secondary: ['Front Delts'],
      definition: 'A single-joint chest movement that sweeps the arms together against constant cable tension.',
      why: 'Cables keep tension on the chest through the entire arc — including the squeeze at the top that free weights lose — making it ideal for building the mind-muscle connection.',
      steps: [
        'Set both pulleys to roughly shoulder height and take a handle in each hand.',
        'Step forward into a staggered stance with a slight forward lean and a soft bend in the elbows.',
        'Sweep your hands together in a wide hugging arc, squeezing the chest at the finish.',
        'Return under control until you feel a stretch across the chest, keeping the elbow angle fixed.',
      ],
      cues: [
        'Think of hugging a barrel — the elbow angle stays constant the whole set.',
        'Lead with the elbows, not the hands, to keep the chest working.',
      ],
      mistakes: [
        'Bending and straightening the elbows, turning the fly into a press.',
        'Going so heavy the shoulders take over the movement.',
      ],
      alternatives: [
        { name: 'Dumbbell Fly', equip: 'Dumbbell', note: 'same pattern, free-weight stretch', ic: 'db' },
        { name: 'Machine Chest Press', equip: 'Machine', note: 'heavier chest work, fixed path', ic: 'machine' },
        { name: 'Push-Up', equip: 'Bodyweight', note: 'compound chest work anywhere', ic: 'body' },
      ],
    },
    {
      key: 'pushup', name: 'Push-Up', cat: 'Chest', equip: 'Bodyweight', type: 'Compound',
      pattern: 'Horizontal push', difficulty: 'Beginner',
      primary: ['Chest', 'Triceps'], secondary: ['Front Delts', 'Core'],
      definition: 'A closed-chain bodyweight press — the most portable pushing movement there is.',
      why: 'The push-up builds pressing strength and a braced trunk at once, scales from beginner to advanced, and needs no equipment at all.',
      steps: [
        'Set your hands slightly wider than the shoulders, body in a straight line from head to heels.',
        'Brace the core and squeeze the glutes so the hips neither sag nor pike.',
        'Lower until the chest is just above the floor, elbows tracking back at about 45°.',
        'Press the floor away to full lockout, keeping the body rigid throughout.',
      ],
      cues: [
        'Imagine screwing your hands into the floor to lock the shoulders in place.',
        'Keep a straight plank line — the hips move with the chest, not before it.',
      ],
      mistakes: [
        'Letting the hips sag so the lower back does the work.',
        'Only going halfway down and cutting the range short.',
      ],
      alternatives: [
        { name: 'Bench Press', equip: 'Barbell', note: 'load it heavy for max strength', ic: 'bar' },
        { name: 'Machine Chest Press', equip: 'Machine', note: 'guided path, easy to load', ic: 'machine' },
        { name: 'Dumbbell Bench Press', equip: 'Dumbbell', note: 'free-weight pressing, full range', ic: 'db' },
      ],
    },
    // ─────────── BACK ───────────
    {
      key: 'deadlift', name: 'Deadlift', cat: 'Back', equip: 'Barbell', type: 'Compound',
      pattern: 'Hip hinge', difficulty: 'Advanced',
      primary: ['Back', 'Hamstrings', 'Glutes'], secondary: ['Forearms', 'Core'],
      definition: 'A full-body hip hinge that lifts a loaded barbell from the floor to a standing lockout — the truest test of total-body strength.',
      why: 'Nothing builds whole-body strength like the deadlift: it trains the entire posterior chain, grip, and bracing, and carries over to almost everything else you do.',
      steps: [
        'Stand with mid-foot under the bar, shins an inch away, feet hip-width.',
        'Hinge and grip just outside the knees. Drop the hips, lift the chest, and pull the slack out of the bar.',
        'Brace hard, then push the floor away — the bar drags up the shins as hips and shoulders rise together.',
        'Lock out by standing tall and squeezing the glutes; do not lean back. Lower by hinging the hips first.',
      ],
      cues: [
        'Think "push the floor away," not "pull the bar" — it keeps the legs in the lift.',
        'Keep the bar in contact with your legs the whole way up and down.',
        'Brace as if about to be punched before every single rep.',
      ],
      mistakes: [
        'Letting the hips shoot up first so it becomes a stiff-legged lift with a rounded back.',
        'Jerking the bar off the floor instead of building tension first.',
        'Hyperextending and leaning back at lockout.',
      ],
      alternatives: [
        { name: 'Romanian Deadlift', equip: 'Barbell', note: 'hinge focus, hamstrings and glutes', ic: 'bar' },
        { name: 'Trap-Bar Deadlift', equip: 'Barbell', note: 'friendlier back angle, easy to learn', ic: 'bar' },
        { name: 'Seated Cable Row', equip: 'Cable', note: 'back work without the spinal load', ic: 'cable' },
      ],
    },
    {
      key: 'row', name: 'Bent-Over Row', cat: 'Back', equip: 'Barbell', type: 'Compound',
      pattern: 'Horizontal pull', difficulty: 'Intermediate',
      primary: ['Back', 'Biceps'], secondary: ['Rear Delts', 'Forearms'],
      definition: 'A hip-hinged barbell pull that drives the bar to the torso, building thickness through the mid-back.',
      why: 'The bent-over row is the pulling counterpart to the bench press — it builds a thick, strong back and balances all your pressing work.',
      steps: [
        'Hinge at the hips to about 45°, back flat, bar hanging at arm\u2019s length.',
        'Pull the bar to your lower ribs by driving the elbows back and up.',
        'Squeeze the shoulder blades together at the top for a beat.',
        'Lower under control to a full stretch without losing the flat-back position.',
      ],
      cues: [
        'Lead with the elbows, not the hands, to keep the back working over the biceps.',
        'Keep the torso angle fixed — no heaving upright with each rep.',
      ],
      mistakes: [
        'Standing up as you row so momentum does the work.',
        'Rounding the lower back under the load.',
      ],
      alternatives: [
        { name: 'Seated Cable Row', equip: 'Cable', note: 'constant tension, back-friendly', ic: 'cable' },
        { name: 'Lat Pulldown', equip: 'Cable', note: 'vertical pull for the lats', ic: 'cable' },
        { name: 'Pull-Up', equip: 'Bodyweight', note: 'bodyweight vertical pull', ic: 'body' },
      ],
    },
    {
      key: 'pulldown', name: 'Lat Pulldown', cat: 'Back', equip: 'Cable', type: 'Compound',
      pattern: 'Vertical pull', difficulty: 'Beginner',
      primary: ['Lats', 'Biceps'], secondary: ['Rear Delts', 'Mid-Back'],
      definition: 'A cable vertical pull that trains the same pattern as the pull-up with adjustable, scalable load.',
      why: 'The pulldown builds the lats and the vertical-pulling strength that leads to your first pull-up, with a load you can dial in precisely.',
      steps: [
        'Grip the bar wider than shoulder width and sit with thighs pinned under the pad.',
        'Start from a full stretch with the arms straight, chest tall.',
        'Pull the bar to your upper chest by driving the elbows down and back.',
        'Control the bar back to a full overhead stretch each rep.',
      ],
      cues: [
        'Think about pulling with the elbows, not the hands.',
        'Keep a slight lean back but do not swing to move the weight.',
      ],
      mistakes: [
        'Yanking the bar behind the neck — pull to the chest instead.',
        'Using body swing to heave the weight down.',
      ],
      alternatives: [
        { name: 'Pull-Up', equip: 'Bodyweight', note: 'the bodyweight standard', ic: 'body' },
        { name: 'Seated Cable Row', equip: 'Cable', note: 'horizontal pull for thickness', ic: 'cable' },
        { name: 'Bent-Over Row', equip: 'Barbell', note: 'heavy free-weight pulling', ic: 'bar' },
      ],
    },
    {
      key: 'pullup', name: 'Pull-Up', cat: 'Back', equip: 'Bodyweight', type: 'Compound',
      pattern: 'Vertical pull', difficulty: 'Intermediate',
      primary: ['Lats', 'Biceps'], secondary: ['Mid-Back', 'Core'],
      definition: 'A bodyweight vertical pull from a dead hang to chin-over-bar — the benchmark of relative upper-body pulling strength.',
      why: 'The pull-up builds a powerful back and honest strength-to-bodyweight, and it needs nothing but a bar.',
      steps: [
        'Hang from the bar with hands just outside shoulder width, arms fully straight.',
        'Set the shoulders by pulling them down away from the ears.',
        'Pull the elbows down toward your ribs until the chin clears the bar.',
        'Lower under control to a full dead hang before the next rep.',
      ],
      cues: [
        'Think about driving the elbows to the floor rather than pulling with the hands.',
        'Keep the ribs down and the core braced so you do not swing.',
      ],
      mistakes: [
        'Kipping or swinging to generate momentum.',
        'Cutting the range short — not reaching a full hang or full chin-over-bar.',
      ],
      alternatives: [
        { name: 'Lat Pulldown', equip: 'Cable', note: 'scalable load, same pattern', ic: 'cable' },
        { name: 'Seated Cable Row', equip: 'Cable', note: 'horizontal pulling variation', ic: 'cable' },
        { name: 'Bent-Over Row', equip: 'Barbell', note: 'heavy free-weight pulling', ic: 'bar' },
      ],
    },
    // ─────────── SHOULDERS ───────────
    {
      key: 'ohp', name: 'Overhead Press', cat: 'Shoulders', equip: 'Barbell', type: 'Compound',
      pattern: 'Vertical push', difficulty: 'Intermediate',
      primary: ['Shoulders', 'Triceps'], secondary: ['Upper Chest', 'Core'],
      definition: 'A strict standing barbell press from the shoulders to a locked-out overhead position.',
      why: 'The overhead press is the purest test of shoulder and lockout strength, and standing it up forces the whole body to brace.',
      steps: [
        'Take the bar at shoulder width, resting on the front delts, elbows just in front of the bar.',
        'Brace the core and squeeze the glutes to lock the torso.',
        'Press straight up, moving the head back slightly so the bar clears the chin.',
        'Once past the forehead, push the head "through" and lock out with the bar over the mid-foot.',
      ],
      cues: [
        'The bar finishes over the ears, not out in front of the face.',
        'Squeeze the glutes to stop the lower back arching as you press.',
      ],
      mistakes: [
        'Leaning back into a decline bench press to move the weight.',
        'Pressing the bar around the face instead of moving the head back.',
      ],
      alternatives: [
        { name: 'Arnold Press', equip: 'Dumbbell', note: 'full range, extra front-delt work', ic: 'db' },
        { name: 'Seated Dumbbell Press', equip: 'Dumbbell', note: 'more stable, each side honest', ic: 'db' },
        { name: 'Machine Shoulder Press', equip: 'Machine', note: 'guided path, easy to load', ic: 'machine' },
      ],
    },
    {
      key: 'lat_raise', name: 'Dumbbell Lateral Raise', cat: 'Shoulders', equip: 'Dumbbell', type: 'Isolation',
      pattern: 'Shoulder abduction', difficulty: 'Beginner',
      primary: ['Side Delts'], secondary: ['Traps'],
      definition: 'A single-joint raise that lifts the arms out to the sides, isolating the lateral head of the shoulder.',
      why: 'Lateral raises build the side delts that create shoulder width — a look pressing alone rarely delivers.',
      steps: [
        'Stand with a dumbbell in each hand, a soft bend in the elbows.',
        'Raise the arms out to the sides until they reach shoulder height.',
        'Lead with the elbows, keeping the pinkies slightly higher than the thumbs.',
        'Lower slowly under control — resist the weight all the way down.',
      ],
      cues: [
        'Pour-the-pitcher: tilt the little finger up slightly at the top.',
        'Keep it slow; momentum steals the tension from the delt.',
      ],
      mistakes: [
        'Swinging the weights up with body English.',
        'Shrugging so the traps take over from the side delts.',
      ],
      alternatives: [
        { name: 'Cable Lateral Raise', equip: 'Cable', note: 'constant tension through the range', ic: 'cable' },
        { name: 'Machine Lateral Raise', equip: 'Machine', note: 'fixed path, pure isolation', ic: 'machine' },
      ],
    },
    {
      key: 'face_pull', name: 'Face Pull', cat: 'Shoulders', equip: 'Cable', type: 'Isolation',
      pattern: 'Rear-delt pull', difficulty: 'Beginner',
      primary: ['Rear Delts'], secondary: ['Traps', 'Rotator Cuff'],
      definition: 'A high-cable pull to the face that trains the rear delts and upper-back postural muscles.',
      why: 'Face pulls build the rear delts and healthy shoulders, balancing all the pressing most programs are heavy on.',
      steps: [
        'Set a rope at roughly face height and take an end in each hand, thumbs back.',
        'Step back to tension the cable, arms straight out in front.',
        'Pull the rope toward your face, splitting the hands past your ears.',
        'Squeeze the rear delts, then return under control.',
      ],
      cues: [
        'Aim to finish in a "double biceps" position, elbows high.',
        'Lead with the elbows and keep the reps smooth, not heavy.',
      ],
      mistakes: [
        'Going too heavy and turning it into a row.',
        'Dropping the elbows so the lats take over.',
      ],
      alternatives: [
        { name: 'Reverse Pec Deck', equip: 'Machine', note: 'isolated rear-delt work', ic: 'machine' },
        { name: 'Bent-Over Reverse Fly', equip: 'Dumbbell', note: 'free-weight rear delts', ic: 'db' },
      ],
    },
    {
      key: 'arnold', name: 'Arnold Press', cat: 'Shoulders', equip: 'Dumbbell', type: 'Compound',
      pattern: 'Vertical push', difficulty: 'Intermediate',
      primary: ['Shoulders'], secondary: ['Triceps', 'Upper Chest'],
      definition: 'A dumbbell overhead press that rotates the palms from facing-in to facing-out through the rep, hitting all three deltoid heads.',
      why: 'The rotation adds front-delt range and time under tension, making it a complete shoulder builder.',
      steps: [
        'Start seated with dumbbells at chin height, palms facing you, elbows in front.',
        'As you press up, rotate the palms to face forward.',
        'Lock out overhead with the arms straight and biceps by the ears.',
        'Reverse the path exactly on the way down, rotating the palms back in.',
      ],
      cues: [
        'Make the rotation smooth and continuous, not a flick at the end.',
        'Keep the core braced so the lower back stays neutral.',
      ],
      mistakes: [
        'Rushing the rotation and losing control of the weights.',
        'Arching the back to press heavier loads.',
      ],
      alternatives: [
        { name: 'Overhead Press', equip: 'Barbell', note: 'heavier, strict pressing', ic: 'bar' },
        { name: 'Seated Dumbbell Press', equip: 'Dumbbell', note: 'simpler pressing pattern', ic: 'db' },
      ],
    },
    // ─────────── LEGS ───────────
    {
      key: 'squat', name: 'Back Squat', cat: 'Legs', equip: 'Barbell', type: 'Compound',
      pattern: 'Squat', difficulty: 'Intermediate',
      primary: ['Quads', 'Glutes'], secondary: ['Hamstrings', 'Core'],
      definition: 'A barbell squat with the bar on the upper back — the cornerstone lower-body strength movement.',
      why: 'The back squat builds the legs, hips, and bracing strength that underpin nearly every athletic movement, and it loads the whole body heavily and safely.',
      steps: [
        'Set the bar on your upper traps, hands snug, and unrack it with a tight upper back.',
        'Step back into a stance a little wider than the hips, toes slightly out.',
        'Brace hard, then sit down and back, driving the knees out over the toes.',
        'Descend to at least parallel, then drive the floor away to stand tall.',
      ],
      cues: [
        'Spread the floor with your feet to keep the knees tracking out.',
        'Brace the core all the way down and up — chest stays proud.',
        'Think "sit between the hips," not "bend forward."',
      ],
      mistakes: [
        'Letting the knees cave inward under load.',
        'Rising hips-first so it becomes a good-morning.',
        'Cutting depth well above parallel.',
      ],
      alternatives: [
        { name: 'Leg Press', equip: 'Machine', note: 'quad focus, no bracing demand', ic: 'machine' },
        { name: 'Front Squat', equip: 'Barbell', note: 'more upright, extra quad and core', ic: 'bar' },
        { name: 'Walking Lunge', equip: 'Dumbbell', note: 'single-leg strength and balance', ic: 'db' },
      ],
    },
    {
      key: 'rdl', name: 'Romanian Deadlift', cat: 'Legs', equip: 'Barbell', type: 'Compound',
      pattern: 'Hip hinge', difficulty: 'Intermediate',
      primary: ['Hamstrings', 'Glutes'], secondary: ['Back', 'Forearms'],
      definition: 'A top-down hip hinge that lowers the bar along the legs to a deep hamstring stretch, then drives the hips back through.',
      why: 'The RDL is the premier hamstring and glute builder and teaches the hip hinge that protects the back in the deadlift.',
      steps: [
        'Start standing tall holding the bar at the hips, knees softly bent.',
        'Push the hips straight back, letting the bar slide down the thighs.',
        'Lower until you feel a strong hamstring stretch, back flat.',
        'Drive the hips forward to stand tall, squeezing the glutes at the top.',
      ],
      cues: [
        'Feel for the hamstring stretch, not how low the bar goes.',
        'Keep the bar dragging against the legs the whole way.',
      ],
      mistakes: [
        'Turning it into a squat by bending the knees too much.',
        'Rounding the back to chase extra range.',
      ],
      alternatives: [
        { name: 'Deadlift', equip: 'Barbell', note: 'full pull from the floor', ic: 'bar' },
        { name: 'Leg Curl', equip: 'Machine', note: 'isolated hamstring work', ic: 'machine' },
        { name: 'Dumbbell RDL', equip: 'Dumbbell', note: 'same hinge, lighter entry', ic: 'db' },
      ],
    },
    {
      key: 'leg_press', name: 'Leg Press', cat: 'Legs', equip: 'Machine', type: 'Compound',
      pattern: 'Squat (machine)', difficulty: 'Beginner',
      primary: ['Quads', 'Glutes'], secondary: ['Hamstrings'],
      definition: 'A machine press that drives a loaded platform away with the legs — heavy quad work with no bracing or balance demand.',
      why: 'The leg press lets you load the legs hard with a low skill and back-stress requirement, making it a reliable quad builder.',
      steps: [
        'Sit back with feet shoulder-width on the platform, mid-foot centered.',
        'Release the safeties and lower the platform under control.',
        'Bring the knees toward the chest until the thighs reach about 90°.',
        'Press through the whole foot to near lockout — do not slam the knees straight.',
      ],
      cues: [
        'Keep the knees tracking over the toes, not caving in.',
        'Keep your lower back flat on the pad — do not let the hips curl up.',
      ],
      mistakes: [
        'Locking the knees out hard at the top.',
        'Going so deep the hips round off the seat.',
      ],
      alternatives: [
        { name: 'Back Squat', equip: 'Barbell', note: 'the free-weight standard', ic: 'bar' },
        { name: 'Walking Lunge', equip: 'Dumbbell', note: 'single-leg strength', ic: 'db' },
      ],
    },
    {
      key: 'lunge', name: 'Walking Lunge', cat: 'Legs', equip: 'Dumbbell', type: 'Compound',
      pattern: 'Lunge', difficulty: 'Beginner',
      primary: ['Quads', 'Glutes'], secondary: ['Hamstrings', 'Core'],
      definition: 'A single-leg movement that steps forward into a lunge, building leg strength and balance one side at a time.',
      why: 'Lunges expose and fix side-to-side imbalances while training the legs and hips through a long, athletic range.',
      steps: [
        'Hold a dumbbell in each hand, standing tall.',
        'Step forward into a lunge until both knees reach about 90°.',
        'Drive through the front heel to stand and bring the back foot through.',
        'Continue stepping forward, alternating legs.',
      ],
      cues: [
        'Keep the torso tall and let the back knee drop toward the floor.',
        'Push through the front heel, not the toes, to stand.',
      ],
      mistakes: [
        'Taking too short a step so the front knee shoots past the toes.',
        'Leaning forward and losing an upright torso.',
      ],
      alternatives: [
        { name: 'Bulgarian Split Squat', equip: 'Dumbbell', note: 'more stable, brutal single-leg', ic: 'db' },
        { name: 'Leg Press', equip: 'Machine', note: 'heavy loading, no balance demand', ic: 'machine' },
      ],
    },
    // ─────────── ARMS ───────────
    {
      key: 'curl', name: 'Barbell Curl', cat: 'Arms', equip: 'Barbell', type: 'Isolation',
      pattern: 'Elbow flexion', difficulty: 'Beginner',
      primary: ['Biceps'], secondary: ['Forearms'],
      definition: 'A single-joint curl of a barbell from full extension to a peak contraction — the classic biceps builder.',
      why: 'The barbell curl lets you load the biceps heavier than any dumbbell variation, driving arm size and pulling strength.',
      steps: [
        'Stand tall gripping the bar shoulder-width, arms extended.',
        'Curl the bar up by flexing the elbows, keeping them pinned at your sides.',
        'Squeeze the biceps at the top without swinging.',
        'Lower under control to a full stretch.',
      ],
      cues: [
        'Keep the elbows glued to your ribs — they should not drift forward.',
        'Control the lowering; the negative builds the arm too.',
      ],
      mistakes: [
        'Swinging the torso to heave the bar up.',
        'Cutting the range short at the bottom.',
      ],
      alternatives: [
        { name: 'Dumbbell Curl', equip: 'Dumbbell', note: 'each arm honest, more range', ic: 'db' },
        { name: 'Hammer Curl', equip: 'Dumbbell', note: 'hits the brachialis and forearm', ic: 'db' },
        { name: 'Cable Curl', equip: 'Cable', note: 'constant tension throughout', ic: 'cable' },
      ],
    },
    {
      key: 'pushdown', name: 'Triceps Pushdown', cat: 'Arms', equip: 'Cable', type: 'Isolation',
      pattern: 'Elbow extension', difficulty: 'Beginner',
      primary: ['Triceps'], secondary: [],
      definition: 'A cable extension that drives a bar or rope down to lockout, isolating the triceps.',
      why: 'The pushdown builds the triceps that make up most of the arm, with joint-friendly constant tension.',
      steps: [
        'Face a high pulley and grip the attachment, elbows tucked to your sides.',
        'Start with the forearms about parallel to the floor.',
        'Extend the elbows to full lockout, driving the hands down.',
        'Return under control until the forearms are parallel again.',
      ],
      cues: [
        'Keep the elbows pinned — only the forearms move.',
        'Squeeze the triceps hard at full lockout.',
      ],
      mistakes: [
        'Letting the elbows flare and drift forward.',
        'Leaning over the bar to push with bodyweight.',
      ],
      alternatives: [
        { name: 'Skull Crusher', equip: 'Barbell', note: 'heavier, full triceps stretch', ic: 'bar' },
        { name: 'Overhead Cable Extension', equip: 'Cable', note: 'emphasises the long head', ic: 'cable' },
      ],
    },
    {
      key: 'hammer', name: 'Hammer Curl', cat: 'Arms', equip: 'Dumbbell', type: 'Isolation',
      pattern: 'Elbow flexion', difficulty: 'Beginner',
      primary: ['Biceps', 'Forearms'], secondary: ['Brachialis'],
      definition: 'A neutral-grip dumbbell curl that trains the biceps, brachialis, and forearms together.',
      why: 'The neutral grip hits the brachialis under the biceps and builds forearm thickness, adding size and grip strength.',
      steps: [
        'Stand with a dumbbell in each hand, palms facing your body.',
        'Curl the weights up keeping the palms facing in the whole time.',
        'Squeeze at the top without swinging the elbows forward.',
        'Lower slowly to a full stretch.',
      ],
      cues: [
        'Keep the wrists neutral and strong, like holding two hammers.',
        'No swinging — the elbows stay at your sides.',
      ],
      mistakes: [
        'Using momentum from the shoulders and hips.',
        'Rotating the wrists instead of keeping them neutral.',
      ],
      alternatives: [
        { name: 'Dumbbell Curl', equip: 'Dumbbell', note: 'supinated biceps peak', ic: 'db' },
        { name: 'Barbell Curl', equip: 'Barbell', note: 'heaviest biceps loading', ic: 'bar' },
      ],
    },
    {
      key: 'skull', name: 'Skull Crusher', cat: 'Arms', equip: 'Barbell', type: 'Isolation',
      pattern: 'Elbow extension', difficulty: 'Intermediate',
      primary: ['Triceps'], secondary: [],
      definition: 'A lying triceps extension that lowers a barbell toward the forehead and presses it back to lockout.',
      why: 'The stretch at the bottom loads the long head of the triceps hard, building arm size the pushdown cannot reach.',
      steps: [
        'Lie on a bench holding the bar over your chest, arms straight.',
        'Keeping the upper arms fixed, bend the elbows to lower the bar toward your forehead.',
        'Stop at a strong triceps stretch just above the head.',
        'Extend the elbows to press the bar back to lockout.',
      ],
      cues: [
        'Keep the upper arms angled slightly back and still — only the forearms move.',
        'Control the descent; do not actually bounce it off your head.',
      ],
      mistakes: [
        'Letting the elbows flare wide, turning it into a press.',
        'Moving the upper arms to cheat the weight up.',
      ],
      alternatives: [
        { name: 'Triceps Pushdown', equip: 'Cable', note: 'joint-friendly constant tension', ic: 'cable' },
        { name: 'Overhead Cable Extension', equip: 'Cable', note: 'long-head stretch', ic: 'cable' },
      ],
    },
    // ─────────── CORE ───────────
    {
      key: 'plank', name: 'Plank', cat: 'Core', equip: 'Bodyweight', type: 'Isolation',
      pattern: 'Anti-extension', difficulty: 'Beginner',
      primary: ['Core'], secondary: ['Shoulders', 'Glutes'],
      definition: 'An isometric hold on the forearms that trains the core to resist the spine extending.',
      why: 'The plank builds the deep bracing strength that protects the spine under every heavy lift — real, transferable core strength, not crunches.',
      steps: [
        'Set the forearms on the floor, elbows under the shoulders.',
        'Extend the legs so the body forms a straight line from head to heels.',
        'Brace the abs and squeeze the glutes; breathe steadily.',
        'Hold for time without letting the hips sag or pike.',
      ],
      cues: [
        'Tuck the ribs down and squeeze the glutes to lock the pelvis.',
        'Push the floor away with the forearms to engage the upper back.',
      ],
      mistakes: [
        'Letting the hips sag so the lower back takes the load.',
        'Piking the hips up to make the hold easier.',
      ],
      alternatives: [
        { name: 'Ab Wheel Rollout', equip: 'Bodyweight', note: 'dynamic anti-extension', ic: 'body' },
        { name: 'Hanging Leg Raise', equip: 'Bodyweight', note: 'lower-ab focus', ic: 'body' },
      ],
    },
    {
      key: 'leg_raise', name: 'Hanging Leg Raise', cat: 'Core', equip: 'Bodyweight', type: 'Isolation',
      pattern: 'Hip flexion', difficulty: 'Intermediate',
      primary: ['Lower Abs'], secondary: ['Hip Flexors', 'Forearms'],
      definition: 'A hanging movement that raises the legs to train the lower abs through a long range.',
      why: 'Hanging leg raises build the lower abs and a strong grip at once, and the dead hang decompresses the spine.',
      steps: [
        'Hang from a bar with a firm grip, shoulders set down.',
        'Brace the core and raise the legs with control.',
        'Lift until the thighs are at least parallel to the floor, curling the pelvis up.',
        'Lower slowly without swinging.',
      ],
      cues: [
        'Curl the pelvis under at the top — do not just lift with the hip flexors.',
        'Keep the movement slow to kill any swing.',
      ],
      mistakes: [
        'Swinging the legs up with momentum.',
        'Only raising the knees slightly and skipping the pelvic curl.',
      ],
      alternatives: [
        { name: 'Lying Leg Raise', equip: 'Bodyweight', note: 'easier entry on the floor', ic: 'body' },
        { name: 'Cable Crunch', equip: 'Cable', note: 'loaded upper-ab flexion', ic: 'cable' },
      ],
    },
    {
      key: 'cable_crunch', name: 'Cable Crunch', cat: 'Core', equip: 'Cable', type: 'Isolation',
      pattern: 'Trunk flexion', difficulty: 'Beginner',
      primary: ['Abs'], secondary: [],
      definition: 'A kneeling cable crunch that loads trunk flexion, letting you progressively overload the abs.',
      why: 'Adding load to ab flexion is how you actually grow the rectus abdominis — the cable crunch does it cleanly.',
      steps: [
        'Kneel facing a high pulley, holding a rope at the sides of your head.',
        'Hinge slightly at the hips to set the starting tension.',
        'Crunch the ribs toward the pelvis, rounding the spine.',
        'Return under control until the abs are fully stretched.',
      ],
      cues: [
        'Move at the spine, not the hips — think "curl the ribs down."',
        'Keep the hips fixed so the abs do the work.',
      ],
      mistakes: [
        'Turning it into a hip hinge by sitting back and forth.',
        'Pulling with the arms instead of crunching the abs.',
      ],
      alternatives: [
        { name: 'Hanging Leg Raise', equip: 'Bodyweight', note: 'lower-ab emphasis', ic: 'body' },
        { name: 'Ab Wheel Rollout', equip: 'Bodyweight', note: 'anti-extension strength', ic: 'body' },
      ],
    },
    {
      key: 'ab_wheel', name: 'Ab Wheel', cat: 'Core', equip: 'Bodyweight', type: 'Compound',
      pattern: 'Anti-extension', difficulty: 'Advanced',
      primary: ['Core'], secondary: ['Lats', 'Shoulders'],
      definition: 'A rollout on a wheel that resists the spine extending through a long, demanding range.',
      why: 'The ab wheel is one of the hardest and most complete core movements there is, building brutal anti-extension strength.',
      steps: [
        'Kneel holding the wheel under the shoulders, core braced.',
        'Roll forward slowly, extending the body as far as you can control.',
        'Keep the hips tucked and the back from arching.',
        'Pull with the abs to roll back to the start.',
      ],
      cues: [
        'Keep the ribs down and glutes squeezed the whole way out.',
        'Only roll as far as you can without the lower back sagging.',
      ],
      mistakes: [
        'Rolling out so far the lower back arches and takes over.',
        'Using the hip flexors to pull back instead of the abs.',
      ],
      alternatives: [
        { name: 'Plank', equip: 'Bodyweight', note: 'static anti-extension entry', ic: 'body' },
        { name: 'Hanging Leg Raise', equip: 'Bodyweight', note: 'dynamic lower-ab work', ic: 'body' },
      ],
    },
    // ─────────── KETTLEBELL ───────────
    {
      key: 'kb_swing', name: 'Kettlebell Swing', cat: 'Legs', equip: 'Kettlebell', type: 'Compound',
      pattern: 'Hip hinge', difficulty: 'Beginner',
      primary: ['Glutes', 'Hamstrings'], secondary: ['Back', 'Core'],
      definition: 'A ballistic hip hinge that snaps a kettlebell to chest height on the power of the hips — the foundational kettlebell movement.',
      why: 'The swing builds explosive hip power, conditioning, and posterior-chain strength at once, and it needs only one bell and a little floor.',
      steps: [
        'Stand a little wider than hip-width with the bell a foot in front of you.',
        'Hinge at the hips, hike the bell back between your legs like a snap pass.',
        'Snap the hips forward hard to float the bell to chest height — arms stay relaxed.',
        'Let the bell fall, absorbing it with another hinge, and flow into the next rep.',
      ],
      cues: [
        'The power is a hip snap, not an arm lift — the arms are just ropes.',
        'Squeeze the glutes hard at the top and stand tall; do not lean back.',
      ],
      mistakes: [
        'Squatting the bell up and down instead of hinging.',
        'Lifting with the shoulders to raise the bell.',
      ],
      alternatives: [
        { name: 'Romanian Deadlift', equip: 'Barbell', note: 'grinding hinge for the hamstrings', ic: 'bar' },
        { name: 'Deadlift', equip: 'Barbell', note: 'heavy hinge from the floor', ic: 'bar' },
      ],
    },
    {
      key: 'kb_goblet', name: 'Goblet Squat', cat: 'Legs', equip: 'Kettlebell', type: 'Compound',
      pattern: 'Squat', difficulty: 'Beginner',
      primary: ['Quads', 'Glutes'], secondary: ['Core'],
      definition: 'A squat holding a single kettlebell at the chest — the most beginner-friendly way to learn an upright, deep squat.',
      why: 'The front-loaded bell forces a tall torso and honest depth, teaching squat mechanics that transfer straight to the barbell.',
      steps: [
        'Cradle the bell against your chest with both hands under the horns.',
        'Set feet a little wider than the hips, toes slightly out.',
        'Sit straight down between the hips, elbows tracking inside the knees.',
        'Drive the floor away to stand tall, keeping the chest proud.',
      ],
      cues: [
        'Keep the bell glued to your chest so the torso stays vertical.',
        'Push the knees out to meet the elbows at the bottom.',
      ],
      mistakes: [
        'Letting the chest fall forward as you descend.',
        'Cutting depth short above parallel.',
      ],
      alternatives: [
        { name: 'Back Squat', equip: 'Barbell', note: 'the loaded free-weight standard', ic: 'bar' },
        { name: 'Leg Press', equip: 'Machine', note: 'quad work with no balance demand', ic: 'machine' },
      ],
    },
    {
      key: 'kb_press', name: 'Kettlebell Shoulder Press', cat: 'Shoulders', equip: 'Kettlebell', type: 'Compound',
      pattern: 'Vertical push', difficulty: 'Intermediate',
      primary: ['Shoulders', 'Triceps'], secondary: ['Core'],
      definition: 'A strict overhead press of a kettlebell from the rack position, the offset load demanding extra core and grip control.',
      why: 'The bell rests behind the wrist, so pressing it overhead builds honest shoulder strength and shoulder stability the barbell can mask.',
      steps: [
        'Clean the bell to the rack: fist at the shoulder, bell resting on the forearm.',
        'Brace the core and squeeze the glutes to lock the torso.',
        'Press straight overhead until the elbow locks, biceps by the ear.',
        'Lower under control back to a tight rack and repeat.',
      ],
      cues: [
        'Keep the wrist stacked and straight so the bell sits over the forearm.',
        'Press up, not around — finish with the bell over the shoulder.',
      ],
      mistakes: [
        'Letting the wrist bend back under the bell.',
        'Leaning away from the weight to cheat it up.',
      ],
      alternatives: [
        { name: 'Overhead Press', equip: 'Barbell', note: 'heavier bilateral pressing', ic: 'bar' },
        { name: 'Arnold Press', equip: 'Dumbbell', note: 'full-range dumbbell pressing', ic: 'db' },
      ],
    },
    {
      key: 'kb_row', name: 'Kettlebell Row', cat: 'Back', equip: 'Kettlebell', type: 'Compound',
      pattern: 'Horizontal pull', difficulty: 'Beginner',
      primary: ['Back', 'Biceps'], secondary: ['Rear Delts', 'Forearms'],
      definition: 'A single-arm hinged row driving a kettlebell to the hip, building mid-back thickness one side at a time.',
      why: 'Rowing one side at a time exposes and fixes imbalances and lets the lats work through a long range with a single bell.',
      steps: [
        'Hinge to a flat-back position, one hand braced on a bench or thigh.',
        'Let the bell hang at arm\u2019s length under the shoulder.',
        'Drive the elbow back and up, pulling the bell to the hip.',
        'Squeeze the shoulder blade, then lower under control to a full stretch.',
      ],
      cues: [
        'Lead with the elbow and keep it close to the ribs.',
        'Keep the torso still — no twisting to heave the bell up.',
      ],
      mistakes: [
        'Rotating the torso to add momentum.',
        'Shrugging the shoulder instead of rowing with the back.',
      ],
      alternatives: [
        { name: 'Bent-Over Row', equip: 'Barbell', note: 'heavy bilateral pulling', ic: 'bar' },
        { name: 'Seated Cable Row', equip: 'Cable', note: 'constant-tension back work', ic: 'cable' },
      ],
    },
    // ─────────── BAND ───────────
    {
      key: 'band_row', name: 'Banded Row', cat: 'Back', equip: 'Band', type: 'Compound',
      pattern: 'Horizontal pull', difficulty: 'Beginner',
      primary: ['Back', 'Biceps'], secondary: ['Rear Delts'],
      definition: 'A seated or standing row against a resistance band anchored in front of you — portable back work that travels anywhere.',
      why: 'The band gives ascending tension that peaks at the squeeze, making it a joint-friendly way to build the mid-back with no weights at all.',
      steps: [
        'Anchor the band at chest height and hold an end in each hand.',
        'Step back to set tension, arms straight, chest tall.',
        'Pull the elbows back to your ribs, squeezing the shoulder blades.',
        'Return under control to a full stretch without rounding.',
      ],
      cues: [
        'Lead with the elbows and keep the shoulders down.',
        'Keep the torso upright — do not lean back to pull.',
      ],
      mistakes: [
        'Shrugging the shoulders up toward the ears.',
        'Standing too close so there is no tension at the stretch.',
      ],
      alternatives: [
        { name: 'Seated Cable Row', equip: 'Cable', note: 'the loaded cable equivalent', ic: 'cable' },
        { name: 'Bent-Over Row', equip: 'Barbell', note: 'heavy free-weight pulling', ic: 'bar' },
      ],
    },
    {
      key: 'band_pullapart', name: 'Band Pull-Apart', cat: 'Shoulders', equip: 'Band', type: 'Isolation',
      pattern: 'Rear-delt pull', difficulty: 'Beginner',
      primary: ['Rear Delts'], secondary: ['Traps', 'Rotator Cuff'],
      definition: 'A band held at arm\u2019s length and pulled apart across the chest — the simplest rear-delt and posture builder there is.',
      why: 'Pull-aparts strengthen the rear delts and upper back that pressing neglects, and they keep the shoulders healthy with almost no setup.',
      steps: [
        'Hold the band in front of you at shoulder height, arms straight.',
        'Pull the band apart by driving the hands out to your sides.',
        'Squeeze the shoulder blades together at full stretch.',
        'Return under control, keeping the arms straight throughout.',
      ],
      cues: [
        'Lead from the shoulder blades, not the hands.',
        'Keep the ribs down so the lower back stays neutral.',
      ],
      mistakes: [
        'Bending the elbows to make it easier.',
        'Shrugging the traps up instead of squeezing back.',
      ],
      alternatives: [
        { name: 'Face Pull', equip: 'Cable', note: 'loaded rear-delt work', ic: 'cable' },
        { name: 'Reverse Pec Deck', equip: 'Machine', note: 'isolated rear delts', ic: 'machine' },
      ],
    },
    {
      key: 'band_press', name: 'Band Chest Press', cat: 'Chest', equip: 'Band', type: 'Compound',
      pattern: 'Horizontal push', difficulty: 'Beginner',
      primary: ['Chest', 'Triceps'], secondary: ['Front Delts'],
      definition: 'A pressing movement against a band anchored behind you — portable chest work with tension that peaks at lockout.',
      why: 'The band presses the chest through a full push with ascending resistance, a travel-friendly stand-in for the bench when no weights are around.',
      steps: [
        'Anchor the band behind you at chest height and hold an end in each hand.',
        'Step forward into a staggered stance to set tension, hands at the chest.',
        'Press the hands forward until the arms lock, bringing them slightly together.',
        'Return under control to a stretch across the chest.',
      ],
      cues: [
        'Keep the wrists stacked and the elbows at about 45\u00b0.',
        'Stay braced so the torso does not twist under tension.',
      ],
      mistakes: [
        'Letting the elbows flare straight out to the sides.',
        'Standing too close so there is no resistance at lockout.',
      ],
      alternatives: [
        { name: 'Push-Up', equip: 'Bodyweight', note: 'no-gear pressing anywhere', ic: 'body' },
        { name: 'Bench Press', equip: 'Barbell', note: 'the loaded pressing standard', ic: 'bar' },
      ],
    },
    {
      key: 'band_curl', name: 'Band Biceps Curl', cat: 'Arms', equip: 'Band', type: 'Isolation',
      pattern: 'Elbow flexion', difficulty: 'Beginner',
      primary: ['Biceps'], secondary: ['Forearms'],
      definition: 'A biceps curl against a band stood on underfoot — ascending tension that squeezes hardest at the top.',
      why: 'The band keeps the biceps under tension through the whole curl and peaks at the contraction, building the arm with zero equipment weight.',
      steps: [
        'Stand on the middle of the band, an end in each hand, palms forward.',
        'Curl the hands toward the shoulders, keeping the elbows pinned.',
        'Squeeze the biceps hard at the top against the peak tension.',
        'Lower slowly to a full stretch, resisting the band back down.',
      ],
      cues: [
        'Keep the elbows glued to your sides the whole set.',
        'Control the lowering; do not let the band snap you down.',
      ],
      mistakes: [
        'Swinging the torso to help the curl up.',
        'Letting the elbows drift forward off the ribs.',
      ],
      alternatives: [
        { name: 'Dumbbell Curl', equip: 'Dumbbell', note: 'free-weight biceps peak', ic: 'db' },
        { name: 'Barbell Curl', equip: 'Barbell', note: 'heaviest biceps loading', ic: 'bar' },
      ],
    },
    // ─────────── CONDITIONING ───────────
    {
      key: 'run', name: 'Steady Run', cat: 'Conditioning', equip: 'Bodyweight', type: 'Compound',
      pattern: 'Cardio', difficulty: 'Beginner',
      primary: ['Heart & Lungs', 'Legs'], secondary: ['Core'],
      definition: 'Continuous running at a controlled, conversational effort — the foundation of aerobic fitness and the home of every distance goal.',
      why: 'Steady running builds the aerobic engine that underpins endurance, recovery, and work capacity, and it needs nothing but a pair of shoes.',
      steps: [
        'Start with an easy 5-minute walk or jog to warm the legs.',
        'Settle into a pace you could hold a conversation at — effort, not speed.',
        'Keep a tall posture, relaxed shoulders, and a quick, light cadence.',
        'Finish with a few minutes easy to bring the heart rate down.',
      ],
      cues: [
        'If you cannot speak a full sentence, ease off — most runs should feel easy.',
        'Land under your hips with a quick turnover, not a long reaching stride.',
      ],
      mistakes: [
        'Running every session too hard, leaving no room to recover.',
        'Overstriding and heel-striking way out in front of the body.',
      ],
      alternatives: [
        { name: 'Rowing (Erg)', equip: 'Machine', note: 'low-impact full-body cardio', ic: 'machine' },
        { name: 'Stationary Bike', equip: 'Machine', note: 'joint-friendly steady state', ic: 'machine' },
      ],
    },
    {
      key: 'row_erg', name: 'Rowing (Erg)', cat: 'Conditioning', equip: 'Machine', type: 'Compound',
      pattern: 'Cardio', difficulty: 'Beginner',
      primary: ['Heart & Lungs', 'Back', 'Legs'], secondary: ['Arms', 'Core'],
      definition: 'A full-body cardio machine that drives through the legs, back, and arms in sequence — big aerobic work with almost no joint impact.',
      why: 'The rower trains the whole body and the aerobic system at once, making it one of the most efficient conditioning tools there is.',
      steps: [
        'Strap in at the catch: shins vertical, arms straight, back tall.',
        'Drive with the legs first, then swing the back, then pull the handle to the ribs.',
        'Reverse the order on the return: arms, back, then legs.',
        'Find a smooth 1:2 rhythm — a strong drive, a patient recovery.',
      ],
      cues: [
        'Legs → back → arms on the drive; arms → back → legs on the way back.',
        'Power comes from the legs, not from yanking with the arms.',
      ],
      mistakes: [
        'Opening the back too early and rowing with the arms.',
        'Rushing the recovery so the stroke loses rhythm.',
      ],
      alternatives: [
        { name: 'Steady Run', equip: 'Bodyweight', note: 'no-equipment aerobic work', ic: 'body' },
        { name: 'Stationary Bike', equip: 'Machine', note: 'lower-body steady state', ic: 'machine' },
      ],
    },
    {
      key: 'bike_erg', name: 'Stationary Bike', cat: 'Conditioning', equip: 'Machine', type: 'Compound',
      pattern: 'Cardio', difficulty: 'Beginner',
      primary: ['Heart & Lungs', 'Quads'], secondary: ['Glutes', 'Hamstrings'],
      definition: 'Seated or upright cycling against adjustable resistance — steady aerobic work that spares the joints entirely.',
      why: 'The bike lets you build the aerobic base and burn real work with zero impact, ideal for recovery days and long steady efforts.',
      steps: [
        'Set the seat so the knee is slightly bent at the bottom of the stroke.',
        'Begin easy to warm up, then settle into a steady cadence.',
        'Keep the effort conversational for base work, or ramp for intervals.',
        'Spin down easy for a few minutes to finish.',
      ],
      cues: [
        'Keep a smooth, round pedal stroke — pull through the bottom, not just push.',
        'Relax the upper body; the legs do the work.',
      ],
      mistakes: [
        'Setting the seat too low and grinding the knees.',
        'Cranking resistance so high the cadence collapses.',
      ],
      alternatives: [
        { name: 'Rowing (Erg)', equip: 'Machine', note: 'full-body low-impact cardio', ic: 'machine' },
        { name: 'Steady Run', equip: 'Bodyweight', note: 'weight-bearing aerobic work', ic: 'body' },
      ],
    },
    {
      key: 'jump_rope', name: 'Jump Rope', cat: 'Conditioning', equip: 'Bodyweight', type: 'Compound',
      pattern: 'Cardio', difficulty: 'Beginner',
      primary: ['Heart & Lungs', 'Calves'], secondary: ['Shoulders', 'Core'],
      definition: 'Rhythmic skipping over a rope — portable, high-output conditioning that also sharpens footwork and coordination.',
      why: 'The rope spikes the heart rate fast, builds calf and foot resilience, and packs a lot of conditioning into a tiny footprint.',
      steps: [
        'Hold the handles at hip height, elbows close to the body.',
        'Turn the rope from the wrists, not the arms.',
        'Jump just an inch off the floor, landing softly on the balls of the feet.',
        'Find a steady rhythm; build up the duration as it gets easier.',
      ],
      cues: [
        'Spin the rope with the wrists — the arms barely move.',
        'Stay light and quiet on the feet; small hops, soft landings.',
      ],
      mistakes: [
        'Jumping far too high and gassing out early.',
        'Swinging from the shoulders instead of the wrists.',
      ],
      alternatives: [
        { name: 'Steady Run', equip: 'Bodyweight', note: 'lower-intensity steady cardio', ic: 'body' },
        { name: 'Rowing (Erg)', equip: 'Machine', note: 'low-impact full-body cardio', ic: 'machine' },
      ],
    },
  ];

  var byKey = {};
  E.forEach(function (e) { byKey[e.key] = e; });
  // also index by normalized name so screens that only know a name can resolve it
  var byName = {};
  E.forEach(function (e) { byName[e.name.toLowerCase()] = e; });

  var API = {
    list: E,
    byKey: byKey,
    get: function (idOrName) {
      if (!idOrName) return null;
      var k = String(idOrName).toLowerCase();
      return byKey[k] || byName[k] || null;
    },
    byCategory: function (cat) { return E.filter(function (e) { return e.cat === cat; }); },
    categories: ['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'Conditioning'],
  };

  if (typeof window !== 'undefined') window.ForgeExerciseCatalog = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
