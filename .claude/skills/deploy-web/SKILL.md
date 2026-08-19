---
name: deploy-web
description: Publish Forge Legacy — the web preview at forgelegacy.expo.app (eas deploy) and/or the phone OTA (eas update). Use whenever asked to deploy, publish, push a build, ship a pass, update the preview, or "let the PO test it". Also use before telling anyone a change is live.
---

# Publishing Forge Legacy

Two surfaces, two commands, and they are **not** interchangeable:

| Surface | Command | Reaches |
|---|---|---|
| Web preview | `eas deploy` | forgelegacy.expo.app **only** |
| Phone (TestFlight build) | `eas update` | the installed iOS binary **only** |

`eas deploy` never touches the phone. `eas update` never touches the web preview.
If a change must be testable on both, you run both.

The PO tests the **web preview**. Deploy at the end of every pass.

## 0. The tree must be clean — this is not optional

`expo export` bundles the **working tree**, not `HEAD`. Uncommitted edits ship;
a half-finished file ships silently and looks like a bug in the feature you meant to release.

```
git status --porcelain
```

Empty, or you commit first. A `PreToolUse` hook blocks the publish if it isn't —
if you see that block, commit, don't work around it.

## 1. Fingerprint check (before an OTA, always)

```
npx --yes eas-cli@latest fingerprint:compare --non-interactive
```

If the fingerprint **changed**, the installed binary cannot accept the OTA. `eas update` will
report success and reach nobody. That needs a new native build — say so plainly rather than
publishing an update into the void.

Native config, new native modules, and SDK bumps all change it. JS-only changes do not.

## 2. Web deploy

```
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
npx expo export --platform web
npx --yes eas-cli@latest deploy --prod --export-dir dist --non-interactive
```

Clean `dist` first. A stale `dist` deploys yesterday's bundle over today's work.

## 3. Verify against the live host — never against the deploy's own output

Read the hash the export produced, then read the hash the world is serving:

```powershell
(Get-Content dist/index.html -Raw | Select-String -Pattern 'entry-[a-f0-9]+\.js' -AllMatches).Matches.Value | Select-Object -Unique
$r = Invoke-WebRequest -Uri "https://forgelegacy.expo.app" -UseBasicParsing -TimeoutSec 45
"$($r.StatusCode)  $([regex]::Match($r.Content,'entry-[a-f0-9]+\.js').Value)"
```

It is deployed only when the production alias returns **200** and its `entry-<hash>.js`
**equals** the one in `dist/index.html`.

⚠ The alias can 404 or serve the previous hash for a few seconds after a successful deploy.
Re-check before concluding anything. A `deploy` command that printed success is not evidence.

To prove a specific change is in the live bundle, fetch the entry JS and search it for a string
only the new code contains.

## 4. OTA to the phone

```
npx --yes eas-cli@latest update --channel production --environment production --message "<what changed, in the PO's words>" --non-interactive
```

## 5. Record it

Put the deployed `entry-<hash>` and the date in `Forge-Legacy-Master-Status.md`. That hash is
the only way a later session can tell whether a device is holding grandfathered state.

## What does not count as verified

- The deploy command exiting 0.
- "It worked on my phone" — the device may hold a pre-existing install. Date the binary first.
- Green tests on web. Anything rendered **outside the navigator** has no providers and can
  crash on launch with every gate green.
- A URL with a `--hash` in it. Those are throwaway deploys with their own origin, so they wipe
  `localStorage`. **Only ever hand the PO `https://forgelegacy.expo.app`.**
