# Forge Legacy — Account Creation Wireframe Specification
## O-1 | Phase 2B | Version 1.0 — June 2026

**Status:** Locked
**Authority:** Forge Legacy Master PRD Section 5 (MVP), Product DNA
**PRD Authority:** Section 5 (MVP Scope), Section 1 (Mission)

---

## Preamble: What O-1 Is For

O-1 is where the athlete's legacy begins.

Before O-1, Forge Legacy does not exist in the athlete's life. After O-1, it always has. The account creation moment is the "Forging Since" date — permanently set, permanently visible, part of the legacy record from the first day.

O-1 answers: "Who are you, and how do we keep your legacy safe?"

**What O-1 is:**
- The first experience a new athlete has with Forge Legacy
- The trust-establishing gateway to the product
- The minimum viable identity record: credentials + a name
- The transition point into O-2 (profile completion and chapter invitation)

**What O-1 is not:**
- A features showcase or benefits carousel
- A pricing or premium screen
- A social discovery or permissions screen
- A profile-building screen
- A habit tracker or challenge app signup experience

**The welcome screen philosophy:**
The athlete who arrives at O-1 should immediately understand: this is not another fitness app. Forge Legacy does not greet athletes with feature carousels, social proof screenshots, or gamification language. It presents a single, significant image, a wordmark, and a quiet invitation to begin.

**O-1 contains four sub-screens:**
1. **O-1a — Welcome:** Brand impression, entry point selection
2. **O-1b — Create Account:** Authentication credentials (email + password or social auth)
3. **O-1c — Display Name:** Identity anchor — the name Forge Legacy will use
4. **O-1d — Sign In:** Returning athlete authentication

**Forgot Password** is an ancillary flow accessible from O-1d.

---

## Architecture Decisions

Seven decisions were required to complete this specification. Each is justified against the Product DNA and existing locked architecture.

---

### Decision 1 — Authentication Model

**Recommendation: Email + Password (primary) + Apple Sign-In + Google Sign-In. No guest mode.**

**Email + Password:**
The foundation of the authentication model. An athlete who creates a Forge Legacy account with email and password owns that account permanently — no dependency on a third-party platform, no risk of account loss if a social platform changes policies or the athlete closes their social account. Long-term account ownership is non-negotiable for a legacy-building product.

**Apple Sign-In:**
Required by App Store guidelines when any third-party sign-in is offered on iOS. Apple Sign-In also aligns with the premium, privacy-respecting brand — Apple's "hide my email" feature is appropriate for athletes who prefer minimal data exposure. Apple is displayed first among social auth options per App Store requirements.

**Google Sign-In:**
Practical for Android athletes and those who prefer Google account management. Consistent with the cross-platform nature of Expo/React Native.

**No guest mode:**
Guest mode is incompatible with the core product mission. A legacy cannot be built anonymously. The "Forging Since" date is the founding moment of the athlete's history in Forge Legacy — guest mode either requires conversion (losing the founding date) or never generates a meaningful record. Guest mode also attracts browse-and-leave behavior that is antithetical to the long-term commitment framing of the product.

**No other social platforms (Facebook, Twitter/X, etc.):**
Explicitly excluded. These platforms' logos and auth patterns have no place in the O-1 experience and contradict the product's "not a social platform" positioning.

---

### Decision 2 — Information Collection Boundaries

**Recommendation: O-1 collects authentication credentials and display name only.**

**Collected in O-1:**
- Email (required for email auth path; provided by Apple/Google for social auth path)
- Password (required for email auth path only)
- Display Name (required in O-1c — the identity anchor used throughout the app from the first session)

**Deferred to O-2:**
- Athlete Type (Strength, Bodybuilding, Hybrid, Running, Cycling, Combat, General)
- Profile Photo
- Chapter creation invitation

**Not collected at any point in MVP onboarding:**
- Birthdate / age
- Phone number
- Location or gym affiliation
- Physical stats (weight, height) — not part of the product model
- Fitness goals (handled by Goal system post-onboarding)
- Contact list / social graph access (squad discovery does not use contacts)

**Why display name belongs in O-1, not O-2:**
The app cannot present a meaningful post-account-creation experience without a name. The empty states of Legacy Hub, chapter creation, and onboarding completion all reference the athlete by name. Display name is the minimum viable identity record. It belongs with the account creation act. O-2 handles richer identity work (athlete type, photo, chapter invitation).

**Note on username vs. display name:**
The Master PRD references "usernames are searchable" for Workout With Friend non-squad tagging. Whether the searchable identifier is the display name or a separate username field must be confirmed in the O-2 spec or Workout With Friend architecture. O-1 collects only a display name; the searchable identity model is an O-2 or later dependency.

---

### Decision 3 — Sign-In Architecture

**Three distinct flows, all entering from the Welcome Screen:**

1. **Create Account** (new athlete): O-1a → O-1b → O-1c → O-2
2. **Sign In** (returning athlete): O-1a → O-1d → Home
3. **Forgot Password** (recovery from Sign In): O-1d → Email Entry → Confirmation → Reset → O-1d

The Create Account and Sign In screens are separate screens — not tabs or toggles on a single screen. The athlete who arrives from "Begin Your Legacy" sees Create Account fields. The athlete who arrives from "Sign In" sees Sign In fields. Mixing both on one screen creates ambiguity about which action is being performed.

---

### Decision 4 — Email Verification

**Recommendation: Soft verification. Athletes proceed without verifying email. A persistent nudge appears until verified.**

**Email + Password athletes:** A verification email is sent automatically on account creation. The athlete proceeds to O-1c and into the app. A low-prominence persistent nudge (not a blocking modal) appears in Profile until the email is verified. The nudge disappears permanently on verification.

**Apple / Google Sign-In athletes:** Email is pre-verified by the auth provider. No additional verification step.

**Why not blocking verification:**
Blocking account access on email verification is a common abandonment point. For a product whose value requires long-term use, abandonment at the critical first-session moment is costly. Soft verification captures valid emails without forcing that loss.

**The "Forging Since" date is set at account creation** — not at email verification completion. The legacy begins when the account is created.

---

### Decision 5 — Premium Exposure

**Recommendation: Premium is not mentioned anywhere in O-1.**

The free tier is genuinely valuable: unlimited workouts, chapters, history, accomplishments, honors, 3 programs, 50 photos, 1 squad, 1 lifetime import. There is nothing to upsell at account creation — the athlete has not yet encountered any limit.

Premium surfaces contextually after the athlete has built something worth protecting (photo limit, program limit, squad limit, import limit), governed by Monetization Architecture Amendment 001. Introducing premium during O-1 would frame the product as a freemium gate-blocker, not a legacy platform.

---

### Decision 6 — Trust & Legal

**Recommendation: Implicit acceptance with inline copy and tappable links. No dedicated legal screen.**

**Placement:** Below the Continue button in O-1b, before tapping.

**Copy:** "By creating an account, you agree to our [Terms of Service] and [Privacy Policy]."

**Format:**
- 13sp, muted secondary color
- "Terms of Service" and "Privacy Policy" tappable → in-app web view
- Not a checkbox. Not a dedicated screen.
- Present on O-1b only (Create Account), not on O-1d (Sign In)

A dedicated legal agreement screen introduces friction at the most sensitive abandonment point. Inline copy with tappable links is legally sufficient in most jurisdictions when the terms are clearly linked and the creating action is explicitly connected to acceptance.

---

### Decision 7 — Abandoned Onboarding Recovery

**Recommendation: Resume from last completed step. App is accessible. Profile completion is nudged, not gated.**

**If athlete completes O-1 (account created + name set) but exits before O-2:**
- Account is valid and accessible
- On next launch: O-2 surfaces before Home (not a full restart from Welcome)
- O-2 is skippable — athlete can dismiss and go directly to the app
- The skip prompt surfaces on the next 2 launches (3 total maximum), then stops surfacing
- Profile is accessible via P-1 at any time to complete incomplete fields

**If athlete quits mid-O-2:**
- App is accessible
- O-2 resumes from the last completed step on next launch
- Same skip behavior applies

**"Forging Since" date:** Set at account creation (O-1b completion). Does not change regardless of when O-2 is completed.

---

## Section 1 — Purpose

O-1 establishes the athlete's permanent identity in Forge Legacy.

It answers three questions:
1. **Who are you?** (display name — the identity anchor)
2. **How do we keep your legacy safe?** (authentication credentials)
3. **What is this place?** (brand impression — legacy platform, not workout tracker)

**O-1 is the founding moment.** The "Forging Since" date, permanently visible in the athlete's profile, is set the moment O-1b is completed. The welcome screen, account creation, and display name step collectively communicate: you are not downloading an app. You are beginning something.

---

## Section 2 — Screen Goals

**O-1 succeeds when:**
1. The athlete immediately understands what Forge Legacy is — a legacy platform, not a tracker, not a social network
2. An account is created with minimal friction (3 steps: Welcome → Create Account → Name)
3. The athlete is addressed by name from their first post-onboarding moment
4. The athlete feels the product's tone: intentional, premium, personal
5. The legal and trust baseline is established without friction

**O-1 fails when:**
- The athlete sees social platform framing (followers, leaderboards, public profiles)
- The athlete encounters feature carousels, benefit lists, or screenshots
- The athlete is blocked from the app by email verification
- The athlete is asked for information they cannot understand the purpose of
- The athlete encounters premium language before experiencing any value

---

## Section 3 — Information Hierarchy

O-1 is a four-screen sequential flow. The hierarchy:

**O-1a — Welcome (TIER 1):** Brand identity and path selection. One image. One wordmark. One tagline. Two actions. Nothing else.

**O-1b — Create Account (TIER 2):** Authentication. Social auth (fast path) above email + password (full-ownership path). Legal copy anchored below Continue.

**O-1c — Display Name (TIER 3):** Identity anchor. One question. One field. The act of naming yourself in this system.

**O-1d — Sign In (TIER 2, returning athlete path):** Credential retrieval. Identical authentication options to O-1b but for retrieval, not creation.

---

## Section 4 — O-1a: Welcome Screen

The first experience. No tab bar. No navigation header. Status bar only.

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR (light text on dark)                 │
│                                                         │
│  [Full-bleed background photography:                    │
│   real athlete, real training environment —             │
│   dark, moody, warm-toned. Static. Not a slideshow.]   │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│  FORGE LEGACY                          [28sp, light]    │
│  [Tagline — 17sp, secondary weight, light]              │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  Begin Your Legacy  ]      ← Primary, full-width    │
│                                                         │
│  [  Sign In  ]                ← Secondary, full-width  │
│                                                         │
│  ─────────────────────────────────────────────────────  │
└─────────────────────────────────────────────────────────┘
```

**Background Photography:**
Full-bleed. Real athlete in a real training environment (powerlifting platform, track, boxing gym, etc.). Dark tone, warm undertones. Photography over illustration per Product DNA. Static — no auto-playing carousel or slideshow. The image is not a rotating sequence.

**Wordmark: "FORGE LEGACY"**
28sp, primary weight, light-on-dark. Full product name — not abbreviated.

**Tagline:**
One line. Establishes the product's nature — not a feature description, not a call to action. A statement of identity.

Requirements for tagline copy (final copy is a design/marketing decision, not locked by this spec):
- Must NOT contain: track, streak, habit, challenge, compete, social, share, followers, workouts
- Must communicate permanence, story, or legacy
- Must be 7 words or fewer

**"Begin Your Legacy" CTA:**
- Full-width, 52dp minimum height, primary button
- Tapping navigates to O-1b (Create Account)

**"Sign In" CTA:**
- Full-width, 52dp minimum height, secondary button (outlined or muted fill — not primary weight)
- Tapping navigates to O-1d (Sign In)

**What the Welcome Screen does NOT contain:** Feature screenshots, benefit lists, testimonials, social proof, App Store rating badge, "Learn more" link, squad or program preview, progress indicators, or any premium or pricing language.

---

## Section 5 — O-1b: Create Account Screen

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ✕                                                      │  ← Back to O-1a; 44×44dp
│                                                         │
│  Create your account           [17sp, primary weight]   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  🍎  Continue with Apple   ]  ← Full-width, 52dp    │
│                                                         │
│  [  G   Continue with Google  ]  ← Full-width, 52dp    │
│                                                         │
│  ────────────────── or ───────────────────────────────  │
│                                                         │
│  Email                              [13sp, muted]       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  your@email.com                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Password                           [13sp, muted]       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ••••••••••••                          [Show]    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [  Continue  ]                   ← Primary, 52dp      │
│                                                         │
│  By creating an account, you agree to our              │
│  [Terms of Service] and [Privacy Policy].              │  ← 13sp, muted; links tappable
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**✕ dismiss:** Returns to O-1a. 44×44dp minimum.

**Screen title: "Create your account"** — 17sp, primary weight. Not "Sign Up." Not "Register." "Create" is active, identity-forming.

**Social Auth Buttons:**
- Apple Sign-In first (App Store requirement: Apple Sign-In must be at least as prominent as other social options when offered on iOS)
- Google Sign-In second
- Full-width, 52dp, with system-standard icons (required by Apple and Google brand guidelines)
- Tapping Apple → native Apple Sign-In system sheet
- Tapping Google → native Google Sign-In system sheet
- On social auth success → skip directly to O-1c (account is created; email/password fields are bypassed)

**"or" divider:** Horizontal rule with centered "or" label. 13sp, muted. Not "or continue with email" — just "or."

**Email field:**
- Label: "Email" — 13sp, muted, above field
- Placeholder: "your@email.com"
- Keyboard type: email (shows @ and .com keys, disables auto-correct)
- Auto-focus on screen open

**Password field:**
- Label: "Password" — 13sp, muted, above field
- Secure text entry (bullets displayed)
- "Show" toggle: right side of field — reveals/hides password text. Accessibility label updates on state change.
- Minimum: 8 characters (enforced via inline validation on Continue tap)
- No special character requirements in MVP — complexity rules add friction without meaningful security improvement for this threat model

**Continue button:**
- Full-width, 52dp, primary
- Disabled until email field has a value AND password has ≥ 8 characters
- On tap (email path): creates account server-side, sends verification email, navigates to O-1c
- On error: inline validation displayed (see Section 11)

**Legal copy:**
"By creating an account, you agree to our Terms of Service and Privacy Policy."
- 13sp, muted secondary
- Both links tappable → in-app web view with "Done" to close and return
- Positioned immediately below Continue button
- Present on O-1b only — not on O-1d

---

## Section 6 — O-1c: Display Name Screen

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │  ← No back navigation
│  What do we call you?         [22sp, primary weight]    │
│                                                         │
│  This is how you'll appear    [15sp, secondary weight]  │
│  in Forge Legacy.                                       │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Name                               [13sp, muted]       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  e.g. Isaiah, Coach T, The Forge                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                                                         │
│  [  Continue  ]                   ← Primary, 52dp      │
│                                                         │
│  [  Skip for now  ]               ← Tertiary text link │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Screen title: "What do we call you?"** — 22sp, primary weight. Larger and warmer than the Create Account title — this is a personal, identity-forming moment. Not "Enter your name."

**Subtitle:** "This is how you'll appear in Forge Legacy." — 15sp, secondary weight. Clarifies usage without making it feel like a data collection form.

**Name field:**
- Label: "Name" — 13sp, muted
- Placeholder: "e.g. Isaiah, Coach T, The Forge" — real examples showing the full range of acceptable formats (given name, nickname, handle-style identity). Not "First name" — this is a display name, not a legal name.
- Keyboard: default text, auto-capitalize words
- Auto-focus: yes, keyboard appears on screen open
- Maximum 50 characters
- Character counter appears at ≤ 10 remaining (showing "10 remaining" through "0 remaining")
- Input blocked at 50 characters

**Continue button:**
- Disabled until name has ≥ 1 non-whitespace character
- On tap: saves display name, navigates to O-2
- 52dp minimum height

**"Skip for now" link:**
- Tertiary text link, below Continue
- 14sp, muted, minimum 44dp touch area
- On tap: proceeds to O-2 without a display name set
- App uses a system placeholder ("Athlete") until name is set via P-2

**No back navigation on O-1c:**
By the time O-1c is shown, the account has been created — regardless of email+password or social auth path. There is nothing meaningful to go back to. The ✕ on O-1b is the cancel point before account creation. O-1c has no ✕ and no ‹. The athlete can proceed (Continue) or defer the name (Skip for now).

---

## Section 7 — O-1d: Sign In Screen

```
┌─────────────────────────────────────────────────────────┐
│  SYSTEM STATUS BAR                                      │
├─────────────────────────────────────────────────────────┤
│  ✕                                                      │  ← Back to O-1a; 44×44dp
│                                                         │
│  Welcome back                  [17sp, primary weight]   │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  [  🍎  Continue with Apple   ]  ← Full-width, 52dp    │
│                                                         │
│  [  G   Continue with Google  ]  ← Full-width, 52dp    │
│                                                         │
│  ────────────────── or ───────────────────────────────  │
│                                                         │
│  Email                              [13sp, muted]       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  your@email.com                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Password                           [13sp, muted]       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ••••••••••••                          [Show]    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                           [Forgot password?]           │  ← Right-aligned text link
│                                                         │
│  [  Sign In  ]                    ← Primary, 52dp      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Screen title: "Welcome back"** — 17sp, primary weight. Warm and minimal. Not "Log In." The returning athlete belongs here — the framing reflects that.

**Authentication options:** Identical to O-1b (Apple, Google, email + password).

**"Forgot password?" link:** Right-aligned, 14sp, tappable. Navigates to Forgot Password flow. Minimum 44dp touch area.

**Sign In button:**
- Full-width, 52dp, primary
- Always enabled (no field-based disabling — failed attempts surface inline errors after tap)
- On success: navigates to Home (main app — onboarding not shown for returning athletes)

**No "Don't have an account?" link:**
The Welcome Screen is the entry point selector. Athletes who tapped "Sign In" have an account. If they don't, they can ✕ to return to Welcome and choose "Begin Your Legacy." A signup prompt within Sign In creates hierarchy confusion about which action is primary.

---

## Section 8 — Forgot Password Flow

Accessible from O-1d via "Forgot password?" link.

### Step 1 — Enter Email

```
┌─────────────────────────────────────────────────────────┐
│  ‹  Reset password                                      │
│                                                         │
│  Enter the email address for your account.             │
│  We'll send a reset link.                               │
│                                                         │
│  Email                                                  │
│  ┌─────────────────────────────────────────────────┐   │
│  │  your@email.com                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [  Send Reset Link  ]              ← Primary, 52dp    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Step 2 — Confirmation

```
┌─────────────────────────────────────────────────────────┐
│  ‹                                                      │
│                                                         │
│  Check your email              [22sp, primary weight]   │
│                                                         │
│  We sent a reset link to                               │
│  [email@example.com]           [15sp, shown plainly]   │
│                                                         │
│  Check your inbox — and your spam folder.               │
│                                                         │
│  [  Back to Sign In  ]              ← Primary, 52dp    │
│                                                         │
│  [  Resend email  ]                 ← Secondary text   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Security note:** Step 2 shows the same message regardless of whether the email is registered — to prevent email enumeration. The server silently no-ops if the email is not found. The UI always shows a positive confirmation.

### Step 3 — Reset Password (deep link from email)

```
┌─────────────────────────────────────────────────────────┐
│  Reset password                [17sp, primary weight]   │
│                                                         │
│  New password                       [13sp, muted]       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ••••••••••••                          [Show]    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Confirm new password               [13sp, muted]       │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ••••••••••••                          [Show]    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [  Reset Password  ]               ← Primary, 52dp    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Step 4 — Success

"Password updated." confirmation text displayed. Auto-navigates to O-1d (Sign In) after 2 seconds.

---

## Section 9 — Trust & Legal

**Terms of Service and Privacy Policy are accessible from:**
1. O-1b (Create Account) — inline legal copy below Continue button
2. Settings → Legal (post-onboarding, always accessible)

**O-1 does not include:**
- Marketing email opt-in (deferred to Settings or handled separately if legally required)
- Cookie consent (handled at app level per jurisdiction if required)
- Age verification (no age-gated content in MVP; no birthdate collected)
- A dedicated legal agreement screen or modal

**In-app web view behavior:**
Tapping "Terms of Service" or "Privacy Policy" opens a full-screen in-app web view with a "Done" button to close and return to O-1b. This does not interrupt or reset the account creation flow.

---

## Section 10 — Premium Exposure

Premium is not referenced anywhere in O-1. The words "premium," "free tier," "upgrade," "subscription," "Pro," or "paid" do not appear on any O-1 screen.

First premium exposure: contextual, in-app, when the athlete encounters a limit. Governed by Monetization Architecture Amendment 001. Outside the scope of O-1.

---

## Section 11 — Error States

### 11.1 Create Account Errors (O-1b)

| Error | Trigger | Display |
|-------|---------|---------|
| Invalid email format | Continue tapped; email malformed | "Please enter a valid email address." below email field |
| Email already registered | Continue tapped; email exists in system | "An account with this email already exists. [Sign in instead?]" below email field. "Sign in instead?" tappable → O-1d with email pre-populated, password empty |
| Password too short | Continue tapped; password < 8 chars | "Password must be at least 8 characters." below password field |
| Network error | Continue tapped; no connection | Toast: "No internet connection. Check your connection and try again." |
| Server error | Continue tapped; 5xx response | Toast: "Something went wrong. Please try again." |
| Apple Sign-In cancelled | Athlete dismisses native Apple sheet | No error shown — return to O-1b |
| Apple Sign-In failed | Apple auth error | Toast: "Couldn't connect with Apple. Please try again or use email." |
| Google Sign-In cancelled | Athlete dismisses Google sheet | No error shown — return to O-1b |
| Google Sign-In failed | Google auth error | Toast: "Couldn't connect with Google. Please try again or use email." |

### 11.2 Sign In Errors (O-1d)

| Error | Trigger | Display |
|-------|---------|---------|
| Wrong credentials | Sign In tapped; credentials invalid | "Incorrect email or password." below password field. Single message — does not reveal which field is wrong. |
| No account found via social auth | Social auth succeeds; email not in Forge Legacy | Toast: "No Forge Legacy account found for that [Apple/Google] account. [Create one?]" — tappable link navigates to O-1b |
| Account locked | 5 failed attempts within 15 minutes | "Too many failed attempts. Please reset your password or try again in 15 minutes." + tappable "Reset password" link |
| Network error | Sign In tapped; no connection | Toast: "No internet connection." |

### 11.3 Forgot Password Errors

| Error | Trigger | Display |
|-------|---------|---------|
| Invalid email format | Send Reset Link tapped; email malformed | "Please enter a valid email address." below email field |
| Expired reset link | Deep link from email; link > 1 hour old | Full-screen message: "This reset link has expired." + tappable "[Request a new one]" returns to Step 1 |
| Passwords don't match | Reset tapped; fields differ | "Passwords don't match." below confirm field |
| Password too short | Reset tapped; password < 8 chars | "Password must be at least 8 characters." |

### 11.4 Display Name Errors (O-1c)

| Error | Trigger | Display |
|-------|---------|---------|
| Name whitespace-only | Continue tapped; whitespace only | Continue remains disabled — no message needed (button state communicates) |
| Name at max length | Character count hits 50 | Counter: "0 remaining" (shifts to accent color) |

---

## Section 12 — Navigation

### 12.1 New Athlete Flow

```
O-1a (Welcome)
    ↓ "Begin Your Legacy"
O-1b (Create Account)
    ↓ Social auth success OR email+password Continue
O-1c (Display Name)
    ↓ Continue OR "Skip for now"
O-2 (Athlete Type → Photo → Chapter Invitation)
```

### 12.2 Returning Athlete Flow

```
O-1a (Welcome)
    ↓ "Sign In"
O-1d (Sign In)
    ↓ Authentication success
Home (main app — onboarding not shown)
```

### 12.3 Forgot Password Branch

```
O-1d (Sign In)
    ↓ "Forgot password?"
Forgot Password — Step 1 (Enter Email)
    ↓ "Send Reset Link"
Forgot Password — Step 2 (Confirmation)
    ↓ (email deep link opens app)
Forgot Password — Step 3 (Reset Password)
    ↓ "Reset Password"
Forgot Password — Step 4 (Success — auto-redirect after 2s)
O-1d (Sign In)
```

### 12.4 Navigation Rules

- O-1a: No back navigation. The first screen of the app.
- O-1b: ✕ returns to O-1a (before account is created)
- O-1c: No back navigation. No ✕. No ‹. Account already exists by this step.
- O-1d: ✕ returns to O-1a
- Forgot Password (each step): ‹ returns to previous step; Step 4 auto-redirects to O-1d
- O-1 does not navigate to any other part of the main app. O-1c Continue or Skip → O-2 is the only forward exit.

---

## Section 13 — Mobile UX

### 13.1 Screen Types

- **O-1a (Welcome):** Full-screen, no navigation chrome
- **O-1b (Create Account):** Standard navigation screen, modal presentation from Welcome
- **O-1c (Display Name):** Standard navigation screen, pushed from O-1b
- **O-1d (Sign In):** Standard navigation screen, independent modal from Welcome (separate stack from O-1b/O-1c)

### 13.2 Keyboard Behavior

- Email fields: email keyboard type
- Password fields: secure text entry, default keyboard
- Name field (O-1c): default keyboard, auto-capitalize words
- All forms: keyboard avoidance — form scrolls to keep active field visible above keyboard
- Return key from email field → focus advances to password field
- Return key from password field → triggers Continue/Sign In if button is enabled

### 13.3 Tap Targets

| Element | Minimum Size |
|---------|-------------|
| "Begin Your Legacy" | Full-width × 52dp |
| "Sign In" (Welcome) | Full-width × 52dp |
| ✕ dismiss | 44×44dp |
| Apple Sign-In button | Full-width × 52dp |
| Google Sign-In button | Full-width × 52dp |
| Continue button | Full-width × 52dp |
| Sign In button | Full-width × 52dp |
| "Forgot password?" link | 44dp touch area minimum |
| "Skip for now" link | 44dp touch area minimum |
| "Terms of Service" link | 44dp touch area minimum |
| "Privacy Policy" link | 44dp touch area minimum |
| "Send Reset Link" | Full-width × 52dp |
| "Back to Sign In" | Full-width × 52dp |
| "Resend email" | 44dp touch area minimum |
| "Reset Password" | Full-width × 52dp |

### 13.4 Portrait Orientation

All O-1 screens are portrait only.

### 13.5 Password Manager Support

Password fields must support standard iOS and Android password manager integration (Keychain, 1Password, etc.). Requires using platform-standard password field components — no custom implementations that block autofill.

### 13.6 Biometric Auth

Face ID / Touch ID for returning athletes is a V1.1 feature. Not in MVP scope. In MVP, returning athletes enter credentials manually, or benefit from OS-level autofill from a password manager (system behavior, not app-managed).

---

## Section 14 — Accessibility

**O-1a (Welcome):**
- Background photography: `accessibilityElementsHidden = true` (decorative)
- Wordmark: `accessibilityLabel` = "Forge Legacy"
- Tagline: included in accessibility tree
- "Begin Your Legacy": `accessibilityLabel` = "Begin Your Legacy — create a new account"
- "Sign In": `accessibilityLabel` = "Sign In — I already have an account"

**O-1b (Create Account):**
- Screen title announced on load: "Create your account"
- Apple button: `accessibilityLabel` = "Continue with Apple Sign-In"
- Google button: `accessibilityLabel` = "Continue with Google Sign-In"
- Email field: `accessibilityLabel` = "Email address, required"
- Password field: `accessibilityLabel` = "Password, required, minimum 8 characters"
- Show/Hide toggle: `accessibilityLabel` = "Show password" / "Hide password" (updates on state change)
- Continue button: `accessibilityLabel` = "Continue, create account"
- Continue disabled: `accessibilityHint` = "Enter your email and a password to continue"
- Legal copy: included in accessibility tree; links are accessible

**O-1c (Display Name):**
- Screen title announced on load: "What do we call you?"
- Name field: `accessibilityLabel` = "Display name"
- Continue: `accessibilityLabel` = "Continue to Forge Legacy"
- Skip: `accessibilityLabel` = "Skip display name for now"

**O-1d (Sign In):**
- Screen title announced on load: "Welcome back"
- Email: `accessibilityLabel` = "Email address"
- Password: `accessibilityLabel` = "Password"
- "Forgot password?": `accessibilityLabel` = "Forgot password, reset via email"
- Sign In: `accessibilityLabel` = "Sign In"

---

## Section 15 — Edge Cases

### 15.1 Apple Sign-In — "Hide My Email"

When an athlete uses Apple Sign-In with "Hide My Email," Apple provides a relay email address (e.g., `randomstring@privaterelay.appleid.com`). This relay address is the athlete's account identifier in Forge Legacy. It is stored, immutable from the app's perspective. It cannot be merged with a separate email+password account. Account linking (connecting auth methods post-creation) is a V1.1 Settings feature.

### 15.2 Email Already Exists

If the athlete enters an email that already exists and taps Continue on O-1b: inline message "An account with this email already exists. [Sign in instead?]" — tappable link navigates to O-1d with the email pre-populated (password field empty for security).

### 15.3 No Back Navigation After Account Creation

By the time O-1c is displayed, the account has been created regardless of auth path. O-1c has no ✕ and no ‹. The athlete can proceed (Continue) or skip the name (Skip for now). They cannot undo account creation from within O-1c.

### 15.4 App Killed During O-1b (Before Account Created)

If the app is force-quit or crashes before Continue is tapped on O-1b: no account exists. On relaunch, the Welcome Screen is shown. Partially-entered credentials are not restored.

### 15.5 App Killed After Account Created, Before O-1c

If the app is killed after O-1b Continue success but before O-1c is shown: the account was created. On relaunch, the athlete is authenticated and lands on O-1c. Onboarding completion state is server-side, not device-local.

### 15.6 Return After O-1 Complete, Before O-2 Complete

On relaunch: O-2 is shown before Home. O-2 is skippable. After 3 skip-dismissals, the athlete goes directly to Home and accesses profile completion through P-2.

### 15.7 Forgot Password — Email Not in System

Confirmation screen (Step 2) shows the same positive message regardless. Server silently no-ops if the email is not found. Prevents email enumeration.

### 15.8 Forgot Password — Expired Reset Link

Athlete taps a reset link older than 1 hour: full-screen message "This reset link has expired." with tappable "Request a new one" returning to Step 1.

### 15.9 Display Name With Only Emoji

Valid. Emoji satisfies the "1 non-whitespace character" minimum. Display names are not legal identifiers. Restrictions on emoji-only names, if needed, are a content policy decision post-MVP.

### 15.10 Duplicate Display Names

No restriction. Display names are not unique identifiers in Forge Legacy — athlete identity is account-ID-based, not name-based. Two athletes can share a display name. No warning is shown.

### 15.11 Account Lock Behavior

After 5 failed Sign In attempts within 15 minutes: account is temporarily locked. Athlete sees error message with "Reset password" link. Lock clears automatically after 15 minutes or upon successful password reset. Lock is account-level, not device-level.

### 15.12 Device Switch After O-1 Complete, O-2 Incomplete

On a new device: O-2 surfaces before Home (onboarding completion is account-level state). If O-2 was already completed, the new device skips onboarding and goes to Home.

---

## Section 16 — Architecture Risks

### Risk 1 — O-2 Scope Undefined

**Issue:** O-1c navigates to O-2, but the O-2 spec has not been written. The exact structure of O-2 — whether Athlete Type is step 1, whether Chapter Creation is offered in O-2 or later, whether O-2 is sequential screens or a single screen — is undefined.

**Recommendation:** O-1 specifies only that O-1c exits to O-2. The O-2 spec defines O-2's internal structure. O-1 makes no assumptions about O-2 beyond: (1) O-2 collects Athlete Type and optionally Profile Photo, and (2) O-2 includes a Chapter Creation invitation. No O-1 architectural changes are needed regardless of O-2's structure.

**Risk level:** Low for O-1. Medium for the O-1 → O-2 handoff.

---

### Risk 2 — Soft Email Verification and Account Abuse

**Issue:** The soft verification model creates a risk of spam or throwaway account creation, which could affect squad discovery and Workout With Friend flows.

**Recommendation:** Rate limiting on account creation (per-IP, per-session) and CAPTCHA after N failed attempts are the appropriate mitigations. These are implementation-layer concerns, not UX spec concerns. The soft verification UX is correct; server-side anti-abuse protections are required alongside it.

**Risk level:** Low for UX. Medium for infrastructure.

---

### Risk 3 — Apple/Google Sign-In Account Merging

**Issue:** An athlete who creates an account via email+password and later wants to use Apple Sign-In with the same identity (or vice versa) has no merge path in MVP. Two separate accounts would result.

**Recommendation:** Account linking (connecting auth methods post-creation) is a Settings/P-2 feature in V1.1. In MVP, accounts are created via one auth method; method changes go through Support. Document this limitation in app Help.

**Risk level:** Low for MVP. Medium for athlete convenience post-MVP.

---

### Risk 4 — Username vs. Display Name Ambiguity

**Issue:** The Master PRD references "usernames are searchable" for Workout With Friend non-squad tagging. It is unclear whether "username" is the display name collected in O-1c, or a separate identifier (handle/username) not yet specified.

**Recommendation:** The O-2 spec or the Workout With Friend architecture must clarify whether: (a) display name IS the searchable identifier, or (b) a separate username field is required. If (b), O-1c may require revision to collect a username instead of (or in addition to) a display name. This dependency must be resolved before O-1 implementation begins.

**Risk level:** Medium. If username ≠ display name, O-1c field collection changes.

---

## Section 17 — Validation Checklist

### Welcome Screen (O-1a)
- [ ] Full-bleed photography — real athlete, real environment, dark/warm tone, static (no slideshow)
- [ ] Forge Legacy wordmark — 28sp, light-on-dark
- [ ] Tagline — ≤ 7 words, no feature/social/tracker language
- [ ] "Begin Your Legacy" — full-width, 52dp, primary — navigates to O-1b
- [ ] "Sign In" — full-width, 52dp, secondary — navigates to O-1d
- [ ] No feature screenshots, testimonials, carousels, or social proof
- [ ] No premium or pricing language
- [ ] No navigation chrome (no tab bar, no header)
- [ ] Background image marked accessibility-hidden (decorative)

### Create Account (O-1b)
- [ ] ✕ dismiss — 44×44dp — returns to O-1a
- [ ] Screen title: "Create your account" — 17sp, primary weight
- [ ] Apple Sign-In button — full-width, 52dp — listed first; system-standard icon
- [ ] Google Sign-In button — full-width, 52dp — listed second; system-standard icon
- [ ] "or" divider between social auth and email sections
- [ ] Email field — email keyboard type — placeholder "your@email.com"
- [ ] Password field — secure text entry — Show/Hide toggle
- [ ] Continue button — disabled until email has value AND password has ≥ 8 chars — 52dp
- [ ] Legal copy below Continue: "By creating an account, you agree to our Terms of Service and Privacy Policy."
- [ ] Both legal links tappable — open in-app web view with "Done" to return
- [ ] Social auth success → navigates to O-1c (bypasses email/password fields)
- [ ] Email+password Continue success → navigates to O-1c
- [ ] "Email already registered" inline error with "Sign in instead?" tappable link
- [ ] "Password must be at least 8 characters." inline error
- [ ] Social auth cancelled → return to O-1b, no error shown
- [ ] Network error → toast notification

### Display Name (O-1c)
- [ ] No back navigation (no ✕, no ‹)
- [ ] Screen title: "What do we call you?" — 22sp, primary weight
- [ ] Subtitle: "This is how you'll appear in Forge Legacy." — 15sp
- [ ] Name field — default keyboard, auto-capitalize words, auto-focus on screen open
- [ ] Placeholder shows varied name formats (given name, nickname, handle-style)
- [ ] Maximum 50 characters — input blocked at 50 — counter appears at ≤ 10 remaining
- [ ] Continue disabled when name is empty or whitespace-only — 52dp
- [ ] "Skip for now" — tertiary text link — 44dp touch area — proceeds to O-2 without name
- [ ] Continue → O-2 with name saved
- [ ] Skip → O-2 with no name (system placeholder until set)

### Sign In (O-1d)
- [ ] ✕ dismiss — 44×44dp — returns to O-1a
- [ ] Screen title: "Welcome back" — 17sp, primary weight
- [ ] Apple Sign-In button — full-width, 52dp
- [ ] Google Sign-In button — full-width, 52dp
- [ ] Email and Password fields present
- [ ] "Forgot password?" — right-aligned text link — navigates to Forgot Password flow
- [ ] Sign In button — full-width, 52dp — always enabled
- [ ] Wrong credentials error — inline — single message does not reveal which field is wrong
- [ ] Account lock after 5 failed attempts — message with "Reset password" link
- [ ] Social auth success for unknown account → toast with "Create one?" link to O-1b
- [ ] Sign In success → Home (no onboarding)

### Forgot Password Flow
- [ ] Step 1: email field — "Send Reset Link" CTA — 52dp
- [ ] Step 2: confirmation shows email address entered; same message regardless of whether email is registered
- [ ] "Resend email" option on Step 2 — 44dp touch area
- [ ] Step 3: two password fields (new + confirm) — "Reset Password" CTA — 52dp
- [ ] Step 3 validation: passwords must match; each ≥ 8 characters
- [ ] Step 4: "Password updated." confirmation — auto-redirect to O-1d after 2 seconds
- [ ] Expired reset link: full-screen error with "Request a new one" tappable link

### Trust & Legal
- [ ] Legal copy present on O-1b only (not on O-1d)
- [ ] Both links (Terms + Privacy Policy) open in-app web view
- [ ] No marketing opt-in checkbox in O-1
- [ ] No dedicated legal agreement screen

### Premium
- [ ] Zero mentions of premium, free tier, subscription, pricing, or upgrade anywhere in O-1

### Abandoned Onboarding
- [ ] Account accessible after O-1 completion even if O-2 not started
- [ ] On return before O-2 complete: O-2 presented before Home
- [ ] O-2 is skippable (not a hard gate)
- [ ] Skip prompt surfaces on maximum 3 launches total, then stops
- [ ] "Forging Since" date set at O-1b completion, not O-2 completion
- [ ] Onboarding completion state is server-side (persists across devices and relaunches)

### Error States
- [ ] Invalid email format: inline message below email field
- [ ] Email already registered: inline with "Sign in instead?" tappable link
- [ ] Password too short: inline message below password field
- [ ] Wrong credentials (Sign In): inline single message, does not specify which field
- [ ] Network error: toast notification
- [ ] Server error: toast notification
- [ ] Social auth cancelled: no error, return to form
- [ ] Account locked: message with reset link
- [ ] Forgot password — expired link: full-screen error with re-request option

### Navigation
- [ ] O-1a has no back navigation
- [ ] O-1b ✕ returns to O-1a (before account created)
- [ ] O-1c has no back navigation (account already created)
- [ ] O-1d ✕ returns to O-1a
- [ ] Forgot Password ‹ returns to previous step at each step
- [ ] O-1 does not navigate to any main app screen
- [ ] O-1c Continue or Skip → O-2

### Mobile UX
- [ ] All screens portrait only
- [ ] All tap targets meet minimums (Section 13.3)
- [ ] Keyboard avoidance on all forms
- [ ] Return key from email → focuses password field
- [ ] Return key from password (if enabled) → triggers primary CTA
- [ ] Password manager autofill supported (platform-standard fields only)

### Accessibility
- [ ] Background photography on O-1a: accessibility hidden (decorative)
- [ ] All interactive elements have accessibility labels
- [ ] Disabled Continue: accessibilityHint explains requirement
- [ ] Screen titles announced on VoiceOver/TalkBack screen load
- [ ] Show/Hide password toggle: accessibility label updates on state change
- [ ] Social auth buttons use platform-required accessibility labeling

---

## Section 18 — Downstream Dependencies

| Dependency | What O-1 Requires | Priority |
|------------|------------------|----------|
| O-2 spec | Must define Athlete Type collection, Photo, Chapter Invitation, and handling of empty display name | High — blocks implementation |
| Authentication service | Email+password creation/auth, Apple/Google token verification, password reset, verification email, account lock (5 attempts / 15 min) | High — blocks implementation |
| "Forging Since" data model | Set atomically at account creation (O-1b completion), immutable, never exposed to edit | High |
| Username vs. Display Name clarification | Must confirm whether searchable "username" = display name or a separate field (Risk 4) | Medium — may require O-1c revision |
| P-1 / P-2 Profile | Display name set in O-1c populates P-1 identity block; changes post-onboarding flow through P-2 | Medium |
| Legal copy (Terms + Privacy Policy) | URLs for in-app web view | Low |

---

## Change Log

### v1.0 — June 2026

Initial specification. O-1 Account Creation established as the entry point for Forge Legacy onboarding. Defines four sub-screens: Welcome (O-1a), Create Account (O-1b), Display Name (O-1c), Sign In (O-1d). Establishes authentication model: Email + Password (primary) + Apple Sign-In + Google Sign-In. No guest mode. No Facebook or other social platform auth. Soft email verification — accounts accessible immediately after creation, verification nudged not gated. Premium not mentioned anywhere in O-1. Display name included in O-1 (not deferred to O-2) as the minimum viable identity anchor. "Forging Since" date set at O-1b completion, permanently immutable. Trust and legal: implicit acceptance model with inline tappable links on O-1b only — no dedicated legal screen. Onboarding state server-side (device-agnostic). Seven architecture decisions resolved. Four architecture risks identified: O-2 scope undefined, email verification abuse, auth method merging, username/display name ambiguity.

---

*Forge Legacy Account Creation Wireframe Specification — O-1*
*v1.0 — June 2026*
*Authority: Forge Legacy Master PRD Section 5 (MVP), Product DNA*
