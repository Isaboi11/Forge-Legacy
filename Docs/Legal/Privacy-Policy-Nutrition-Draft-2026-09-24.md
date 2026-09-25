# Privacy Policy — nutrition section and two corrections (DRAFT, 2026-09-24)

**Status:** draft for the PO, then the lawyer. Not yet on `site/privacy.html`.
**Owed by:** `P-6-Amendment-002-Nutrition-Data.md` §6 row 2, a must-do before Nutrition opens.
**Checked against the code:** every nutrition table deletes with the account (`on delete cascade` off
`profiles`, 0205/0210/0211/0213). Food lookups send only the search words or barcode. Holt reads the
diary only on a food question (Nutrition Amendment 001).

---

## A. New section, to go under "2 · What we collect", after "Training and health-related data"

### Food and nutrition

If you use Nutrition, the app stores:

- The foods you log, with portions, the meal, and the day.
- Your calorie and macro targets. If you ask Forge to calculate them, it also stores the details used
  to do that: age, sex, height, weight, activity level and goal.
- Your meal-plan preferences: diet, food allergies, foods you dislike, cooking time, household size
  and grocery budget.
- Foods, meals and recipes you create, and your grocery list.

Food allergies are health information. We use them for one thing: keeping recipes that contain them
out of your meal plan.

**Your nutrition data is visible to you only.** There is no setting that shares it, and it never
appears to your squads, your friends, in search or in notifications. If you post a meal or a recipe to
a squad, the post never includes calories, macros, your weight, your targets or your eating history.

**Looking up a food.** When you search for a food or scan a barcode, the words you typed or the barcode
number are sent, through our own servers, to food databases: USDA FoodData Central, FatSecret and Open
Food Facts. They never receive your name, email or account. The foods found are kept in a shared
reference list inside Forge, so the next search is faster. That list records the food, never who
searched for it.

**Targets are estimates.** Calorie and macro targets are calculated from general formulas. They are not
medical advice. Forge does not recommend targets to anyone under 18, and it will not set a target below
a safe minimum.

---

## B. Additions to "4 · Who we share it with" (service providers)

Add to the list:

- **Anthropic.** Powers the Coach Holt AI features, for accounts that have them. When you ask Holt
  something, the question and the training (or, for a food question, nutrition) details needed to answer
  it are sent to Anthropic. They never include your name, email or photos. Anthropic does not use them
  to train its models.
- **USDA FoodData Central, FatSecret and Open Food Facts.** Food databases. They receive only a search
  term or barcode (see Food and nutrition).
- **RevenueCat.** *(Only once subscriptions ship in build 9.)* Processes App Store purchases so the app
  knows your plan. It receives an anonymous account identifier and your purchase records. Payment details
  stay with Apple.

---

## C. ⚠ Corrections the live policy needs, nutrition or not

1. **Route trimming: the live page says something that is no longer true.** It says the first and last
   200 metres of every run are removed before the route is saved. The PO vetoed that on 2026-08-26
   (Route-Sharing-Amendment-001), and the code no longer trims. A policy that promises a protection the
   app doesn't give is the worst kind of error. Suggested replacement:

   > **Routes.** Your full route is saved so your distance, pace and map are accurate. It is visible to
   > you only. A map is shown to others only on a post where you choose to include it, one post at a
   > time. It is off by default.

   And in the "Who can see what" table, the Route maps row becomes: *You only, unless you add the map
   to a specific post.*

2. **The service-provider list is missing Anthropic,** which is already live for AI features (see B).

---

## D. Also update

- **"6 · Deleting your account":** add *"your food log, targets, preferences, foods, meals and
  recipes"* to the list of what is removed. (True today; checked against the schema.)
- **"Last updated"** date when this goes live.
- **App Store privacy label:** add *Health & Fitness*, linked to the user, not used for tracking
  (P-6 Amendment 002 §6 row 3).
