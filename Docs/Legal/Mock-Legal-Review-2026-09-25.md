# Mock legal review: Privacy Policy, Terms, and the under-eating care line (2026-09-25)

**Not legal advice.** Claude read the documents the way a US privacy and consumer-protection lawyer would, and
checked every claim against the code. A real lawyer still has to sign off (checklist §4).

**Reviewed:** the live `site/privacy.html` (forgelegacy.app, "Last updated 15 August 2026"), the draft
`Docs/Legal/Privacy-Policy-Nutrition-Draft-2026-09-24.md`, the live `site/terms.html`, and the care-line
wording (checklist §5).

## Verdict

| Document | Passes as is? | Passes after the fixes below? |
|---|---|---|
| Privacy Policy (live) | ❌ No: two statements are false | ✅ Yes, apart from item 3 (Washington), which needs a real lawyer |
| Nutrition draft | ❌ No: one sentence is false | ✅ Yes |
| Terms of Service | ❌ No: says "no subscription" | ✅ Yes, once subscription terms are added |
| Care line wording | ✅ Yes | — |

---

## Must fix before submitting

1. **The route-trimming promise is false.** The live policy says the first and last 200 m of every route
   are removed before it is saved, "always trimmed". The trim was vetoed on 08-26 and the code saves the
   full route. A policy promising a protection the app does not give is the textbook FTC Act §5 deception
   case. Use the replacement text in the nutrition draft, §C1.

2. **Photos and video DO go to Anthropic. The draft says they never do.** The draft's sentence *"They
   never include your name, email or photos"* is false:
   - `program-photo-read` sends the photo of a program to Anthropic.
   - `coach-form-check` sends frames of the athlete's form video (a person's body) to Anthropic.
   - `coach-ask` read tools send training and nutrition data.

   Replace it with: *"When you use an AI feature, what that feature needs is sent to Anthropic: your
   question, the training or nutrition details needed to answer it, and, for photo import or form check,
   the photo or video frames you chose. Your name and email are never sent. Under its commercial terms,
   Anthropic does not train its models on this data."*

3. **Washington's My Health My Data Act (and Nevada SB 370): the real exposure.** "United States only"
   still includes Washington. Food logs, allergies, body weight, and health-related fitness data count as
   "consumer health data". The Act requires:
   - a separate Consumer Health Data Privacy Policy, linked from the homepage;
   - opt-in consent before collecting that data;
   - separate consent before sharing it (the Anthropic calls count as sharing).

   It also gives people a private right to sue. The policy's wording cannot fix this alone: it needs a
   consent step in the app. The cheapest likely fix is a consent screen on first use of Nutrition and the
   AI features, plus a short separate health-data page. **This is the first question for the real
   lawyer.**

4. **The Terms say "Forge Legacy is free while we are testing. There is no subscription."** A paid launch
   needs subscription terms:
   - auto-renewal;
   - the 7-day free trial on yearly plans;
   - how to cancel (in iOS Settings);
   - that Apple handles refunds;
   - Early Bird pricing lasts while the subscription stays active.

   Apple (Guideline 3.1.2) also requires working links to the Terms and the Privacy Policy **on the
   paywall** and in the App Store description.

5. **Missing service providers.** The live list names Supabase, Expo and Apple only. Add:
   - Anthropic (AI features);
   - RevenueCat (purchases; anonymous account id and purchase records);
   - USDA FoodData Central, FatSecret and Open Food Facts (search words or a barcode only);
   - Apple's speech recognition (the mic: `useDictation` does not force on-device recognition, so audio
     may be sent to Apple for transcription);
   - Cloudflare (hosts forgelegacy.app).

## Should fix (low risk, cheap)

6. **The website collects emails** (the TestFlight invite list, `testflight_requests`). Add a line saying
   what the email is for, how long it's kept, and that it isn't used for anything else.
7. **Holt remembers chats** (`0218` Holt chat memory). Add "your conversations with Coach Holt" to what is
   collected and to what account deletion removes.
8. **"Never in notifications"** in the nutrition draft is true today. The planned push version of the
   gap line would break it, so reword the policy before that ships.
9. **The Terms' "not medical advice" clause covers training only.** Add nutrition: *"calorie and macro
   targets, meal plans and food data are estimates, not medical or dietary advice."*
10. **Health Breach Notification Rule (FTC, 2024).** This is not policy text. If health data ever leaks,
    you must notify users and the FTC. Know that it applies to you.

## Passes (no change needed)
- Under-13 (COPPA) language, together with no recommended targets under 18.
- No sale and no ad tracking: true in the code, and it matches the App Store labels.
- The account-deletion claims for nutrition, checked against the `on delete cascade` in the schema.
- CCPA/CPRA: under its thresholds today (less than $25M revenue and fewer than 100k California consumers).
  Revisit when you grow.

## The care line wording

> **A quick check-in**
> Most days this week, what you've logged has been well under what a body needs to train on. If you've
> only been logging some of your meals, you can ignore this. If you've been eating this little, it's worth
> talking to a doctor or a registered dietitian.
> [I only log some meals] [Got it]

**Passes.** It makes no diagnosis, never says "disorder", shows no calorie number, and gives no medical
instruction. It points to licensed professionals. It lists no hotline number that could go stale (the
NEDA helpline closed in 2023, which shows why). It is shown to everyone, including under-18s, and it
never blocks the app.

What would fail: naming a condition, telling someone how much to eat, or saying Forge "monitors" eating.
That last one is a promise of supervision you could be held to.
