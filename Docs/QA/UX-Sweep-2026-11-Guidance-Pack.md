# Guidance pack — words, first-visit hints, empty states, help

From the UX sweep of 2026-11-09 (lanes L1a–L14, S1, S2, S4, S5). Every line below is ready to paste. Most are 20 words or fewer.

Why this matters: the retired tour used to define every Forge word. With `TOUR_RETIRED = true` (src/lib/screen-prompts.ts:90), about a dozen terms now reach a newcomer bare (S4). Five-second readers stumbled most on rank and Progress words, "Seal" and "Under Iron", and placeholders that look like typed values.

---

## 1. Glossary

One line each. Show it where the term is first met (a tap on the word, or a one-time line under it), and collect them all in one Holt help topic (section 3).

| Term | Plain meaning | Where it first appears |
|---|---|---|
| **Chapter** | A stretch of your training life, like "Year One". Everything you log lands in the chapter you're in. | Onboarding "Name this season"; Home hero |
| **Seal (a chapter)** | Close it for good. Its goals, honors and records are locked into your Legacy. | Chapter Detail "Seal chapter" |
| **Seal (a session)** | Save the workout to your record. You can still continue it for an hour. | Workout Complete "Hold to Seal" |
| **Legacy** | Your permanent record: chapters, honors, rank and the moments you pin. | Tab bar; Welcome "Forge your legacy" |
| **Honor** | Recognition Forge awards when you do something that matters. Never bought, never claimed. | Onboarding name step; first ceremony |
| **Rank** (Foundation I … Legacy IV) | Long-term standing earned by training 10+ minutes in different weeks. It never goes down. | Home rank line, day 0 |
| **Under Iron** | The time you spent training this session. | Workout Complete; weekly review |
| **Volume** | Total weight moved: every set's weight × reps, added up, in your units. | Workout Complete (show the unit) |
| **PR (1–5 reps)** | Your heaviest set of 1–5 reps on a lift. | Exercise page; Metric Detail |
| **Best** | Your heaviest lift for 1–5 reps on this exercise, and the day you set it. | Logger plinth |
| **Prev** | What you did on this set last time. Tap it to use that weight. Rename the heading "Last time". | Logger set table |
| **Mission** | Your chapter goal, shown on Home with how close you are. | Home Mission tile |
| **Chapter Goal** | The one goal this chapter is for. Supporting goals cover everything else. Use this name everywhere (not "Primary Goal"). | Goals hub; Chapter Detail |
| **My Standard** | One sentence you train by, in your own words. | Legacy "Add a Quote" |
| **Pinned Legacy** | Up to six moments you're proudest of. They lead your Legacy and your profile. | Legacy, first reveal |
| **Featured Legacy Moment** | Forge picks your biggest recent moment to lead your Legacy. | Legacy, after the first seal |
| **Your Circle** | Your friends: who's training now and what they chose to share. | Home card |
| **Squad** | A small private group you train alongside, joined by invite or approval. | Squads tab |
| **Check-in** | A short video telling your squad you trained today. It disappears in 24 hours. | Squad page |
| **Acknowledge** | React to a post. Tap for Respect; hold to choose Honor, Support or Strength. | Squad and friends feeds |
| **Competition** | A private, opt-in contest inside a squad or among friends, with a finish date. Say "competition", not "season". | Competitions hub; Final Results |
| **Title / Current Champions** | Held by whoever won the latest competition of that kind in this squad. | Current Champions |
| **Weekly target** (was "Training Standard") | Days each member aims to train. Everyone hitting it makes a Perfect Week. | Squad Settings (owner) |
| **Workout template** | A session you've saved to run again. Forge templates are ones our coaches wrote. | Templates hub |
| **Program** | Weeks of workouts. Templates are single workouts you reuse. | Templates hub lede |
| **Planned / Graduated / Ended early** | Saved for later / every session done / you stopped it. All stay in your Legacy. | Your Programs pills |
| **Superset** | Two exercises done back to back, then one rest. | Day Builder; logger superset card |
| **Technique** (shown as "Difficulty") | How demanding the movement is to perform well, not how fit you need to be. | Exercise Detail tile |
| **Reps in reserve** | Stop with about two good reps left in you. | Holt's in-workout line |
| **Tempo / Taper** | Tempo: comfortably hard, you could say a few words. Taper: the last weeks ease off so you race fresh. | Holt race card |
| **AMRAP** | As many rounds as possible before the clock runs out. | Shared programs; workout toast |
| **Estimated max** (not "e1RM") | Your one-rep max, worked out from your sets. | Holt's training-gaps line |
| **Coach Holt / Holt AI** | Coach Holt is on every plan (tap to answer). Holt AI is the one you can type to, on Premium AI. | Welcome; paywall; M-7 |
| **AI credits** | Premium AI's monthly allowance. A message uses a little, a photo more. Resets monthly. Use this name only (not "allowance"). | Form Check; Log from Photo |
| **Training week** | A one-week program or a saved week. Free includes three; Premium is unlimited. | M-7 at the cap |
| **Athlete Type** | What your rank measures improvement against: strength, endurance, hybrid. | Edit Profile |
| **Training since** (was "Forging since") / **Workouts** (was "Lifetime") | The year of your first logged workout / every workout you've saved. | Progress hub facts |
| **Active week** | A week with at least one workout of 10+ minutes. | Rank Progression |
| **Days in range** | Logged days within your target band. Today isn't judged until it's over. | Nutrition Details |
| **Leftover / Cooks** | A lunch that is last night's dinner's second serving / times you actually cook this week. | Meal Plan; Grocery List |
| **Community data** | Numbers added by Forge athletes from a label. USDA and FatSecret are the other sources. | Log Food source badges |
| **Units** | Show "Imperial · lb, mi" and "Metric · kg, km", not "Lbs / Kgs". | Onboarding; Preferences |

---

## 2. First-visit hints and empty states, by screen (exact words)

"Hint" = a one-time line (first visit, or until used). "Empty" = replaces the current empty-state copy. Fixes that need code first are marked with their finding.

### First run and Home
| Screen | Kind | Where | Words |
|---|---|---|---|
| Welcome (an invite is waiting) | hint | Above GET STARTED, only while a squad invite is held (UX-078) | You're invited to a squad. Create your account and you'll be in it right after setup. |
| Onboarding · Theme | hint | Replace "You can change this anytime in Preferences." (keep that after it) | Forge is the dark look, Alabaster the light one. Same app, same features. |
| Onboarding · Theme, answers exist | hint | Restart warning, until UX-318 is fixed | Changing the look restarts Forge. Anything you've filled in after this step will be cleared. |
| Onboarding · Goals | hint | In place of the body once three are picked | Up to three. Tap one to swap it out. |
| Onboarding · Home setup gear grid | hint | Under "What's in it?" (with UX-056) | We've ticked what you already told us. Add anything else you can reach. |
| Onboarding · Your forge is ready | empty | The finish error line (UX-169) | Couldn't save your answers. Check your connection and tap Enter Forge again. Nothing you chose is lost. |
| Reset password (web) | hint | After Save New Password | Password saved. Open Forge Legacy on your iPhone and sign in with it. |
| Home · rank line | hint | Day 0, under the rank line | Foundation I is your rank. Train to climb. Progress shows what the next one takes. |
| Home · Mission, no goal | empty | Replaces "0 goals remaining" (UX-051) | No goal yet. Name what this chapter is for. Your Legacy tracks it. |
| Home · Mission, goal achieved | empty | Replaces "Your long-term objective · 0 goals remaining" (UX-051) | Achieved. Set your next goal, or seal Chapter I. |
| Home · day 1, after the first session | empty | Above the next-session card that day (UX-068) | First session in the books. Rest today if you need it. The next one will wait. |
| Home · nutrition card, nothing logged | empty | Card line one | 2,200 cal target · nothing logged yet |
| Home · Your Circle | hint | Card subtitle | Your circle is your friends: who's training now and what they chose to share. |
| Home · weekly review card | hint | First card only | Each week Holt sums up the last one. View it or skip. It leaves either way. |
| Weekly review (empty) | empty | Body, with a Start a workout button | Your first review arrives the week after you train. Start a workout to begin. |
| App shell · no signal at launch | empty | After ~4 s on the splash, with "Train offline" (UX-020) | No connection. Your workouts save on this phone. You can still train. |

### Logging a workout
| Screen | Kind | Where | Words |
|---|---|---|---|
| Set table | hint | Under the table on the first exercise of the first workout (replaces "Tap weight or reps to edit.") | Faded numbers are the plan. Tap ✓ to log them as they are, or tap a number to change it. |
| Rest chip | hint | First workout only | Rest timer is off. Tap it on: Auto starts after each set, Manual waits for ▶. |
| Superset card | hint | First superset | Log A1, then A2. That's one round. Rest comes after the round. |
| All Exercises sheet | hint | First open | Drag ⋮⋮ to reorder. ✕ takes an exercise out of today only. |
| Timed hold row | hint | First HOLD button | Tap HOLD to start the clock and again to stop. Long-press to cancel without logging. |
| Set sheet (dumbbell) | hint | Under the exercise name | Weight is per dumbbell. |
| History unavailable | empty | In place of Best/Prev when history failed (UX-019) | Couldn't load your history. Your sets still save. Prev and Best fill in when you're back online. |
| Resume prompt | hint | Under "End workout" | End workout saves what you've logged. Nothing is deleted. |
| Resume prompt, open over 4 h | hint | Under the stat line (UX-111) | Finished earlier? End it and we'll save it up to your last set. |
| Save failed offline | hint | Pinned above the footer, announced (UX-016) | No signal. Your workout is safe on this phone. Finish again when you're back online. |
| Other tabs during a workout | hint | Slim bar above the tab bar (UX-153) | Workout in progress · 1 set · Resume |
| Interval runner, returning | hint | Above the countdown (UX-174) | Paused while you were away. Tap Resume to pick up this move. |
| Join-request banner | hint | Eyebrow above the name | WANTS TO JOIN · they'll start on the exercise you're on |
| Cardio card · Already did it | hint | First use | Type what your watch or the machine says. Nothing is filled in for you. |
| Interval runner, nothing logged | empty | Done screen when 0 moves were logged | Nothing logged. Every move was skipped. Your sets are still open in the workout. |

### Finishing and sharing
| Screen | Kind | Where | Words |
|---|---|---|---|
| Workout Complete · seal | hint | Under HOLD TO SEAL, first finish only | Press and hold to seal this session into Chapter I. |
| Workout Complete · seal (VoiceOver) | hint | accessibilityHint (UX-015) | Double-tap to seal this session. |
| Workout Complete · record | hint | Under "Not finished? Continue this workout" | Adds sets to this same workout. Open for an hour after you finish. |
| Capture · no squads | empty | Squads row | No squads yet. Tap to find one or start your own. |
| Capture · no friends | empty | Friends row (UX-060) | No friends yet. Add one and your workouts can show up for them. |
| Capture · auto-post chose a row | hint | Under the Squads row | Auto-post picked this. Change it here, or in Settings. |
| Auto-post sheet | hint | Under the destinations, when on (UX-033) | Your note goes with it as the caption. Your map and photos never post automatically. |
| Share a picture | hint | Above the style thumbnails, first visit | Pick a style, then share it to Instagram, Messages or anywhere. |
| Squad composer · Friends, no friends | empty | Replaces "You haven't added any friends yet…" | Add a friend and your Friends posts reach them. Until then, only you will see them. |

### Cardio and history
| Screen | Kind | Where | Words |
|---|---|---|---|
| Activity History (empty) | empty | Under the calendar, with Log one / Start one | Every session you train lands here. Log one you already did, or start one from Home. |
| Activity History · chapter diamond | hint | First time a ◆ is in view | ◆ marks the day a chapter began or was sealed. Tap it to open the chapter. |
| Log Activity | hint | Under the disabled Log It | Add a distance to log it. Time and notes are optional. |
| Activity Detail | glossary | On "Session #3 · Chapter I" | Session # counts every activity you've logged; Workout # counts lifting days only. |

### Programs, templates and builders
| Screen | Kind | Where | Words |
|---|---|---|---|
| Workouts · My Workouts | hint | First visit, under the header + | Tap + to train freestyle, build a template or program, or import a plan you already follow. |
| Workouts · Discover | hint | Under For You, first visit | Picked from your goal, experience and equipment. Opening one only previews it. Nothing starts until Start. |
| Program Detail (Free) | hint | Under Start Program, until the first program is started (UX-069) | Free includes 3 programs for life. Starting this one uses 1. Finished ones stay yours. |
| Program Detail · Add to Planned | hint | Under ADD TO PLANNED | Saves this program for later without starting it. |
| Program Detail · active | hint | First open of Week 1 | Tap ⋯ on a session to train it, move it, skip it, or ask Holt to change it. |
| Max-lift gate | hint | Above SAVE (after UX-038 is fixed) | Only know one max? Save it. The other lifts show a percentage until you add them. |
| Your Programs · read failed | empty | Replaces "No programs yet" on error (UX-019) | Couldn't load your programs. Nothing has been deleted. Tap Try again. |
| Exercise Picker | hint | First open | Tick two or more to add them as a superset. Long-press a row to bookmark it. |
| Templates hub | hint | Lede, first visit | Templates are single workouts you reuse. Programs are weeks of them. |
| Templates hub · none yet | empty | Under YOUR TEMPLATES | Your saved workouts land here. Tap + to build one, or keep any finished session from its summary. |
| Templates · From Forge | hint | Section subtitle (after UX-145) | Forge templates are free and never count toward your five. |
| Use a template sheet | glossary | Under BUILT BY FORGE | Forge sessions are ready-made workouts from our coaches. Using one copies it; edits never touch the original. |
| Guided builder · review | hint | Under the sessions summary | Want different lifts? Open it in the full builder. Your answers come with you. |
| Program Import · preview | hint | Replaces the nine-line legend | Check each row. ✕ removes it, − / + fixes sets × reps, Edit rewrites a day as text. |
| Builder · Setup, under 4 weeks | glossary | The under-4-weeks note | Programs of four weeks or more count toward your rank and the Programs honors. |
| Use a saved week | empty | Current empty copy | Saved weeks come from Coach Holt. To vary weeks yourself, choose Customize each week. |
| Builder crash screen | hint | Replaces "send us the line below" (UX-177) | We've been sent this automatically. Go back, or start a fresh draft. |
| Create New sheet (Free) | hint | Import Program subtitle while unused | Free includes one import. Paste text or a PDF. |

### Coach Holt
| Screen | Kind | Where | Words |
|---|---|---|---|
| Coin · intro line | hint | Replace the intro line (UX-049) | I'm Holt. Tap me to build a program, plan today, or find anything in the app. |
| Coach Home (tap-only) | hint | Under the greeting, first visit | Tap a card. I ask a few quick questions and build it. Nothing saves until you say. |
| Build door (Free) | hint | Holt's first line (after UX-012 is fixed) | This is your free Holt program. Rebuild it as often as you like before you start it. |
| What do you need? (Free) | hint | Under the two options | On Free I build one program for life and two single days a month. |
| Change my program (no Premium AI) | empty | Replace the gate line; chips Open my program · See Premium AI (UX-131) | I can change it for you with Premium AI. Or open your program and tap a session to swap anything. |
| Change my program, no program | empty | Holt line + "Build me something" | You don't have a program running yet. Want me to build one? |
| Out of AI credits | hint | Holt's out_of_credits line (UX-161) | That's this month's AI credits used. They refill when the month turns. These taps still work. |
| In-workout sheet · HOW HARD I PUSH | hint | Under the group label | How often I speak up mid-workout. Off silences tips; Quiet mutes everything until you finish. |
| Kitchen dish card | hint | First time a card shows ≈ | ≈ means one ingredient isn't matched yet. Open the dish to pick it. |
| What Holt Remembers | hint | Replaces the "2 OF 20" header | Holt keeps up to 20 notes. Delete one to make room. |
| What Holt Remembers (empty) | empty | Replaces "Nothing yet." | Holt keeps short notes from what you tell him. They'll show here. Delete any you like. |
| Form Check · start | hint | Under WHICH LIFT when checks exist (UX-136) | 3 saved checks on Back Squat. See how it has changed → |
| Exercise detail | hint | Row under coaching, when checks exist (UX-136) | Form history · 3 checks. Your saved reads and what Holt fixed. |
| Form Check · the read | hint | Under Save to form history (UX-178) | Saved privately. Only you see it. Remove it any time from form history. |
| After a typed change | hint | Under "That's in" | Change your mind later? Open the session marked Updated by Holt and tap Undo. |

### Legacy, goals and honors
| Screen | Kind | Where | Words |
|---|---|---|---|
| Legacy · day 0 | empty | Card renamed "Name your first chapter" (UX-047) | Chapter I is already open and holding your workouts. Give it a name that means something to you. |
| Honors hub | hint | Under the title, first visit | Honors are awarded when you cross a line Forge measures. Keep training. More unlock as you go. |
| Honor ceremony (first) | glossary | Under the first honor's title | Honors mark your firsts and milestones. They stay on your record for good. |
| Goals hub (empty) | empty | Empty chapter state | One Chapter Goal is what this season is for. Add Supporting Goals for everything else. |
| Goal form | hint | Above Track Progress (UX-050) | Choose how it's measured. Lift, distance and bodyweight update themselves; Manually means you log it. |
| Goal form · name matches a lift | hint | Under TRACK PROGRESS | Tracked from your Bench Press sets. Prefer to update it yourself? Choose Manually. |
| Goal detail · past the target | hint | After a first manual update above target (UX-183) | You're already past your target. Mark it achieved, or is lower better for this one? |
| Goal detail · weight goal | hint | Under the bar, with Log weigh-in (UX-091) | This goal moves with your weigh-ins. Log one whenever you step on the scale. |
| Chapter Detail · day 1 | hint | Replaces the seal headline until there is content | Seal it when this season is done. Until then, every workout adds to it. |
| Accomplishments | hint | Above the list, first visit | ★ = shown on your profile (up to three). Open one to change it. |
| Legacy Timeline (few rows) | empty | Below "Where it began." | Accomplishments, honors, goals and seals land here as you earn them. |
| Pinned Legacy | hint | Under the header, first reveal | Pin up to six moments you're proudest of. They lead your Legacy and your profile. |

### Progress, rank and photos
| Screen | Kind | Where | Words |
|---|---|---|---|
| Progress hub | hint | First visit, under RANK JOURNEY | Your rank climbs with weeks you train 10+ minutes. Tap any rank to see what it asks. |
| Rank sheet · Foundation I | empty | Replaces "What it took 0·0·0" (UX-065) | Every athlete starts here. Train 10+ minutes in two different weeks to reach Foundation II. |
| Rank Progression | hint | Under "Seven ranks · four tiers each" | Every line must be met at once. Workouts under 10 minutes don't count toward rank. |
| Body metrics (off) | empty | Sub-line of "Track body metrics" (UX-067) | Logged weigh-ins on another phone? Turn this on to see them here. |
| Edit Metrics | hint | Under "Your Metrics" | Pick up to four lifts. Turn them all off and Progress shows your latest lifts. |
| Metric Detail | glossary | Under the stat strip | Heaviest: your top set at any reps. PR: your best for 1–5 reps. |
| Compare (one set) | empty | Under "Need two entries", with Take progress pics | Take one more progress set, then line them up here. |
| Compare | hint | Next to POSES (UX-142) | Poses with a dot are in both sets. Pick one of those to share. |
| Photos album (empty) | empty | Album text | Add a photo with + above, or take progress pics. Both land in this chapter. |
| Transformation gallery | hint | Under the first card, once | Press and hold a set to compare, edit or delete it. |

### Squads, competitions, friends
| Screen | Kind | Where | Words |
|---|---|---|---|
| Squad page · just you | empty | Top of the page, with an Invite button (UX-071) | It's just you so far. Invite your training partners. They join with your code. |
| Join a Squad | hint | Under the code field | Codes look like IRON-7Q2K. A friend's invite link fills this in for you. |
| Squad goal sheet | hint | Under TRACK, first open | Pick what counts, then a number to reach, like 50 workouts by month's end. |
| Members page | hint | Replaces the current hint | Tap ⋯ beside someone to make them owner or remove them. |
| Remove member confirm | hint | Until UX-035 is fixed | They can rejoin with your current code. Replace it in Invite to keep them out. |
| Squad Settings · Transfer row | hint | Row subtitle | Hand this squad to another member, then you can leave it. |
| Squad Settings · member | hint | In place of the inert Notifications card (UX-092) | Post and comment alerts live in Settings → Notifications. |
| Discover Squads (empty) | empty | Replaces "Check back later, or forge one yourself." | No public squads yet. Have a code? Join with it, or start one and set it to Public. |
| Squads tab · Friends button | hint | First-visit tip | Your friends live here. Find the people you train with. |
| Squad feed · blocked posts hidden | hint | Under SQUAD FEED (UX-160) | Posts from people you've blocked are hidden. |
| Squad post · flame | hint | First post opened | Tap the flame to give Respect. Hold it to choose Honor, Support or Strength. |
| Squad composer | hint | Under the type grid, first visit | Workout Recap shares a session you finished. Workout posts a session for your squad to run. |
| Write a Workout | hint | Above the box, replacing the long lede | Workout name on the first line, then number each lift: "1. Back Squat 5x5 @ 75%". |
| Competitions (empty) | empty | Replaces the zero stat grid | Competitions are opt-in contests in your squad. Pick what counts, set the days. Squad-mates tap Join. |
| Create Competition | hint | Under Duration | Daily runs 24 hours from when you start it. Nobody is entered until they tap Join. |
| Competition | hint | First visit, under the race line | Scores update as you log. Highest score at the end takes the crown. Ties share it. |
| Hall of Champions (empty) | empty | Under No titles yet | Every squad competition that finishes adds its champion here. Start one from Competitions. |
| Trophy case (another athlete) | empty | Replaces "Nothing here yet" | Their trophies from squad competitions will be kept here. |
| Add Friend | empty | Replaces "No friends yet. Add someone by their handle above." | Ask a friend for their @handle. It's on their profile. Forge never suggests people. |
| Athlete profile · friend | hint | First friend profile, under the actions | Train With sends an invite. When they're training it becomes Join Workout. They decide. |
| Join Workout · message | hint | Under the message box (after UX-024) | Your message pops up on their workout screen through Coach Holt. Asking to join is separate. |
| Train Together invite | hint | Above WHAT, when there is no plan | Name it. You'll each build it as you go and get credit for training together. |
| Live workout | glossary | Under the name | What a friend shares while training: sets done and the exercise they're on. Updates every few seconds. |
| Blocked people (empty) | empty | Replaces "You haven't blocked anyone." | You haven't blocked anyone. To block, open a profile and tap ⋯ → Block. |
| Inbox (empty) | empty | Under "Nothing New" | Friend requests, workout invites and join asks land here. Tap one to answer it. |

### Nutrition
| Screen | Kind | Where | Words |
|---|---|---|---|
| Log Food | hint | Under the search box, first two visits | Tap + to log one serving now. Tap a food's name to change the amount first. |
| Meal Detail | hint | Permanent quiet line under the list | Tap a food to change it. Hold it to move it to another meal. |
| Nutrition Home · first day | empty | Empty meal card; hide "Copy yesterday" when yesterday is empty | Nothing here yet. Tap to add breakfast. |
| Nutrition Home · planned day | hint | Under "Planned Meals", first future day | Planned food counts once you tick it on the day. |
| Create Food · 0 calories scanned | hint | Replaces "Found it, but with no nutrition" (UX-098) | This one has 0 calories. Add it as it is, or fix the numbers from the label. |
| My Foods & Meals · Meals (empty) | empty | Meals tab | Save foods you eat together, like a post-lift shake. Log them all with one tap from Log Food. |
| Meal Plan | hint | First visit | Tap a meal to swap, lock or log it. Locked meals stay put when you rebuild the week. |
| Meal Plan Setup · editing | hint | Lede when answers exist | Change anything here and your week rebuilds. Locked meals stay. |
| Grocery List | hint | First visit | Tick items as they go in the cart. Swipe left on anything you already have at home. |
| My Recipes · form | hint | Above ✓ Confirm, first recipe | Forge reads allergens from your ingredients. Confirm them so the planner can safely use this recipe. |
| Targets · Manual | hint | First open of Manual | Have numbers from a dietitian? Enter them here. Forge only checks they're safe. |
| Planner gate | empty | Second sentence of the gate body | Premium builds your week around your own target and turns it into one grocery list. |
| Planner gate · read failed | empty | Centre, with Try again (UX-019) | Couldn't check your plan right now. Check your connection and try again. |

### Settings, privacy and plans
| Screen | Kind | Where | Words |
|---|---|---|---|
| Profile Visibility | hint | Under the intro | Changes save as you tap. "Only me" hides a section from everyone, friends included. |
| Health Data & AI | hint | Top, under the intro | You only need these for Nutrition and Holt's AI features. Training works without either. |
| Sex field (all three places) | hint | Helper text (UX-075, PO to confirm) | Sets your exercise artwork, suggested starter workouts and the calorie math for nutrition targets. |
| Handle | hint | Edit Profile group hint (UX-076) | How friends find and tag you. People can also find you by your name. |
| Subscription (web) | empty | Replaces "Plans aren't available on this device yet." (UX-164) | Subscribe in the Forge Legacy iPhone app. Your plan then works here too. |
| Notifications (web) | hint | Replaces the top note | Push alerts arrive on the iPhone app. Your choices save here and apply there. |
| P-8 · your usage (Free) | hint | Above the usage card | Free covers your training forever. These limits only apply to what you add next. |
| Premium ceiling (replaces M-7) | empty | Sheet or toast at a Premium cap (UX-185) | You're at Premium's 5-squad limit. Leave a squad to start or join another. |
| Join Squad · already a member | hint | Toast before opening the squad (UX-149) | You're already in this squad. Opening it. |
| Sign Out with an open workout | hint | Confirm body (UX-041) | You have a workout in progress. Finish it first. Another account signing in here clears it. |
| Preferences · Reduce Motion | hint | Row description (after UX-089) | Calms Forge's animations. Your iPhone's Reduce Motion setting is followed too. |

### VoiceOver labels (heard, not seen)
| Where | Words |
|---|---|
| Holt's bubble (with Close and each reply as actions, UX-032) | Opens Coach Holt. Swipe up or down for Close and replies. |
| Squad card (instead of "Open <squad>") | <Squad>, <n> members, <n> training today. Actions: favourite, review join requests. |
| Under Iron stat | Time under iron, 42 minutes |

---

## 3. Help topics (Holt → "How do I…?")

The 13 topics in `src/domain/coach/chat-core.ts:1697-1760` all land on the right screen, but four answers are wrong (UX-063). Fix these first:

| Topic | Change the answer to |
|---|---|
| Swap an exercise | Mid-workout, tap ⋯ → Swap this exercise, or tap my coin. |
| See my history | Workouts → Activity History. Newest first. |
| Change a program | Drop "or have me change it" unless the athlete has Premium AI. |
| Import a program | Make "or upload pictures of it" Premium AI only. |

Keep: Start a workout · Find something I saved · Set a goal · Add a friend · Join a squad · Tell you my equipment · Understand my rank.

Add these (each answer is one sentence plus a button to the screen):
1. **What do these words mean?** The glossary above, one line each.
2. **Log a run I already did:** Workouts → Activity History → Log. Pick the day.
3. **Change to kg / km:** Avatar → Preferences → Units.
4. **Find my PRs:** Exercise Library → the lift → Your history. Or Progress → the lift.
5. **Invite people to my squad:** Your squad → ⋯ → Invite, or share your code.
6. **Log food:** Nutrition → Log Food. Search, scan a barcode, or Quick add.
7. **Seal a chapter:** Legacy → your chapter → Seal. It can't be undone.
8. **Train with a friend:** Their profile → Train With, or Join Workout when they're training.
9. **Use Forge offline:** Workouts save on your phone and sync later. (Only after UX-016 and UX-020 are fixed.)
10. **Manage or cancel my plan:** Settings → Subscription → Manage, which opens the App Store.

Also make Holt's welcome tier-aware (UX-049): "Tap my coin and I'll build you a program or today's session, or show you how anything in here works." Keep "ask" only for Premium AI.

---

## 4. The retired tour: recommendation

**Don't revive the retired tour.** It was 105 spotlight steps across screens, switched off on purpose (`TOUR_RETIRED`), and its definitions now matter on screens it rarely reached: the logger, Workout Complete, Progress, the paywall.

**Do this instead (PO decision, 09-26 auth-14, UX-048):**
1. **Keep "Explore the app" as a short map, and fix it.** Five cards: Home, Workouts, Legacy, Squads, Nutrition; plus one for Holt's coin. The last button says "Done" (or opens the Start a Workout sheet, so "Start training" is true). Skip gets a 44 pt target. Five-second readers rated these cards clear (2 of 2), so the map is worth keeping.
2. **Move the tour's definitions to where the words appear:** the one-time hints and empty states in section 2. About 15 of them carry the jargon load: rank line, Mission, Your Circle, Pinned Legacy, Featured Legacy Moment, Hold to Seal, Under Iron, Prev, Acknowledge, Legacy day 0, Honors hub, Progress hub, the Free program hint.
3. **Add the "What do these words mean?" help topic** (section 3), so any term can be looked up later.
4. **Don't bring back per-screen spotlights.** They block the screen, can't be replayed today, and hints that sit beside the control do the same job without a dimmed screen.
