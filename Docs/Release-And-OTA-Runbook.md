# Release & OTA Runbook

**Created:** 2026-08-06, after an over-the-air update was published that could reach nobody.

---

## The three things "shipping" can mean, and they are not interchangeable

| Command | Goes to | Reaches testers? |
|---|---|---|
| `npx eas-cli deploy --prod` | **Web hosting** — forgelegacy.expo.app | **No.** This is the web preview only |
| `npx eas-cli update --branch production --environment production` | **Existing native builds** whose runtime version matches | **Only if the fingerprint matches** — see below |
| `npx eas-cli build -p ios --profile production` + `submit` | A **new** TestFlight build | Yes, after Apple review for external testers |

`eas deploy` and `eas update` are different products with similar names. Deploying the web app does
nothing for the phone in a tester's pocket.

---

## ⚠ THE TRAP: a submission-only edit can cut every build off from OTA

`runtimeVersion.policy` is **`fingerprint`** (app.json). An update is delivered only to builds whose
fingerprint matches the update's. That policy is correct — it is what stops a JS bundle landing on a
binary that cannot run it.

**But `@expo/fingerprint` hashes the WHOLE of `eas.json`, including the `submit` block, which has no
effect on the binary at all.**

On 2026-08-06 the current project fingerprinted to `356ebf69…` while the TestFlight build (build 2,
commit `8ac7a8c`) was `d2cdb7b5…`. `eas fingerprint:compare` reported the entire native-affecting delta
as:

```
📁 Paths with native dependencies:
    modified file:  eas.json
```

…and the only change in that file was `submit.production.ios` gaining `ascAppId` and `appleTeamId`
(commit `456bcf4`, *"pin ascAppId and appleTeamId so submission works unattended"*). Two fields that
exist purely so `eas submit` can run without prompting.

**Reverting that block returned the fingerprint to `d2cdb7b5` exactly**, verified with
`eas fingerprint:compare`. So a convenience edit to submission config had silently made every future
OTA undeliverable to the only build anyone is running.

### The values, so they are never lost

```json
"submit": { "production": { "ios": { "ascAppId": "6798436104", "appleTeamId": "G722GV8H8C" } } }
```

Pass them to `eas submit` directly, or re-add the block **in the same commit as the next build** — a
new build re-baselines the fingerprint, so at that moment the edit costs nothing.

> **Re-added 2026-08-07, with the push-notifications pass.** `expo-notifications` and its config plugin
> are a native change, so that pass already required a new build and could never have shipped over the
> air. That made it the free moment described above: the block is back in `eas.json`, `buildNumber` is
> `3`, and the fingerprint is re-baselined by the build itself. **The fingerprint of build 2
> (`d2cdb7b5…`) is now permanently unreachable** — that is expected and correct, not the trap. Every OTA
> from here compares against build 3's fingerprint, which must be read from `eas build:list` once the
> build completes; do not assume it.

---

## Before publishing an OTA, always

```bash
npx eas-cli build:list --platform ios --limit 3        # note the live build's Fingerprint
npx eas-cli fingerprint:compare <that-fingerprint> --environment production
```

If it reports `🔄 differs`, **stop.** Publishing anyway produces a green "✔ Published!" for an update
that will reach zero devices, which is exactly what happened on 2026-08-06. Read the reported paths: if
the delta is genuinely native (a new dependency, a config plugin, a permission) the answer is a new
build. If it is not — `eas.json`'s submit block, a stray asset — the answer is to make it match and
publish again.

**"✔ Published!" is not evidence anybody received it.** The runtime version in the output is; compare it
to the build's.

---

## Two builds exist, and only one is current

| Build | Fingerprint | Commit |
|---|---|---|
| **3** (8/7) | `791bacda3a99ae050f5ce879b32fe57ba2e4a4a2` | `a0bc2b8` **+ uncommitted push work** ← **the tester build** |
| 2 (8/5 20:26) | `d2cdb7b5…` | `8ac7a8c` |
| 1 (8/5 16:36) | `75e9448e…` | `35e33b9` |

> **⚠ Build 3's commit field is misleading, and the reason matters.** EAS reports `a0bc2b8`, which predates
> the entire push-notifications pass — that work was still uncommitted when the build ran. **EAS archives
> the WORKING TREE, not the HEAD commit**, so the push code is in the binary even though the commit says
> otherwise. Confirmed, not assumed: `eas fingerprint:compare 791bacda… --environment production` reported
> *"matches fingerprint … from local directory"*.
>
> The lesson generalises: **the `Commit:` line in the build list does not tell you what is in the build.**
> The fingerprint does. Commit before building anyway — a build whose source exists only in one machine's
> working tree cannot be reproduced, and `a0bc2b8` will never rebuild into `791bacda…`.

⚠ The update published on 2026-08-05 (*"Fix SVG gradient stops rendering opaque on device"*) went to
runtime **`75e9448e` — build 1**. Build 2 already existed. **That fix may never have reached the
testers on build 2**, which is worth checking before assuming any recent JS fix is live on a phone.

---

## What is native and therefore needs a new build

Changing any of these cannot be delivered over the air:

- `app.json`'s splash config (`expo-splash-screen` `backgroundColor`, `image`) — **the splash is
  compiled in**
- icons, bundle identifiers, permissions, `plugins`, native dependencies
- anything in `eas.json`'s `build` profiles (channel, distribution, environment)

Everything else — screens, program content, domain logic, the JS splash overlay — is JS and ships over
the air.

---

*Forge Legacy — Release & OTA Runbook — 2026-08-06*
