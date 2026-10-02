// Look-around, part 2: continue the open conversation — pick the session, see the proposal, Do it, open the program.
// ⚠ Spends ~1–2 real AI calls. Reuses the chat already open for Jordan (chat history persists).
import { launch, newPhone, settle, BASE } from './lib.mjs';
const shot = (page, name) => page.screenshot({ path: `capture/frames/look/holt-c-${name}.png` });
const browser = await launch();
const { page } = await newPhone(browser, { time: '2026-02-10T07:47:00-06:00' });
await page.goto(BASE + '/');
await settle(page, 6000);
await page.getByRole('button', { name: 'Open Coach Holt' }).click();
await settle(page, 2500);
await page.getByRole('textbox', { name: 'Message Holt' }).fill('Bench has been stuck at 225 for three weeks. Can you change my program to get it moving?');
await page.getByLabel('Send', { exact: true }).click();
for (let i = 0; i < 120; i++) { await settle(page, 500); if (await page.getByText('Week 6, Upper B', { exact: true }).isVisible().catch(() => false)) break; }
await shot(page, '0-open');
const chip = page.getByText('Week 6, Upper B', { exact: true });
if (!(await chip.isVisible().catch(() => false))) { console.log('chip not visible — conversation not restored'); await browser.close(); process.exit(0); }
await chip.click();
const any = async (names) => { for (const n of names) if (await page.getByText(n, { exact: true }).first().isVisible().catch(() => false)) return n; return null; };
let hit = null;
for (let i = 0; i < 120 && !hit; i++) { await settle(page, 500); hit = await any(['Do it', 'Just this week', 'The rest of the block']); }
await settle(page, 1000);
await shot(page, '1-proposal');
console.log('proposal chip:', hit);
if (hit) {
  await page.getByText(hit === 'Do it' ? 'Do it' : 'The rest of the block', { exact: true }).first().click();
  let done = null;
  for (let i = 0; i < 60 && !done; i++) { await settle(page, 500); done = await any(['Show me the program', 'Undo']); }
  await settle(page, 1000);
  await shot(page, '2-applied');
  if (await page.getByText('Show me the program', { exact: true }).isVisible().catch(() => false)) {
    await page.getByText('Show me the program', { exact: true }).click();
    await settle(page, 4000);
    await shot(page, '3-program');
  }
}
await browser.close();
