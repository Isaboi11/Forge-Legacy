// One-time sign-in as the demo athlete; saves the session for every shot script.
// Usage: node capture/signin.mjs   (password from capture/.auth/password or JORDAN_PASSWORD; never committed)
import { readFileSync, existsSync } from 'node:fs';
import { launch, newPhone, settle, saveAuth, BASE } from './lib.mjs';

// The password lives in capture/.auth/password (git-ignored), written when stage 0 was prepared.
const pwFile = new URL('./.auth/password', import.meta.url);
const pw = process.env.JORDAN_PASSWORD ?? (existsSync(pwFile) ? readFileSync(pwFile, 'utf8').trim() : null);
if (!pw) throw new Error('no password: set JORDAN_PASSWORD or write capture/.auth/password');
const browser = await launch();
const { ctx, page } = await newPhone(browser, { auth: false }); // real clock: the sign-in itself is not filmed
await page.goto(BASE + '/sign-in?step=signin');
await page.getByRole('textbox', { name: 'Email' }).fill('jordan.demo@forgelegacy.app');
await page.getByRole('textbox', { name: 'Password' }).fill(pw);
await page.getByRole('button', { name: 'Sign in', exact: true }).click();
await page.getByRole('tab', { name: 'Legacy' }).waitFor({ timeout: 30000 });
await settle(page, 500);
await saveAuth(ctx);
console.log('signed in; session saved to capture/.auth/jordan.json');
await browser.close();
