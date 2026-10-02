// One-time sign-in as the demo athlete; saves the session for every shot script.
// Usage: JORDAN_PASSWORD=... node capture/signin.mjs   (the password is the one set in seed stage 0; never committed)
import { launch, newPhone, settle, saveAuth, BASE } from './lib.mjs';

const pw = process.env.JORDAN_PASSWORD;
if (!pw) throw new Error('set JORDAN_PASSWORD');
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
