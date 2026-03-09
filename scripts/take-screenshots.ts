/**
 * Screenshot script for README documentation.
 * Run with: npx tsx scripts/take-screenshots.ts
 *
 * Requires the example server to be running:
 *   pnpm example:dev
 */

import { chromium } from '@playwright/test';
import { join, dirname } from 'path';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE_URL = 'http://localhost:3456';
const OUTPUT_DIR = join(__dirname, '../docs/screenshots');

mkdirSync(OUTPUT_DIR, { recursive: true });

async function selectText(page: import('@playwright/test').Page, selector: string) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: 'visible' });
  const box = await locator.boundingBox();
  if (!box) throw new Error(`Element not found: ${selector}`);

  const startX = box.x + 5;
  const endX = box.x + Math.min(box.width - 5, 300);
  const y = box.y + box.height / 2;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y);
  await page.mouse.up();
  await page.waitForTimeout(400);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Mock the feedback API so submit works without a real backend
  await page.route('**/api/feedback', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto(BASE_URL);
  await page.locator('.rspress-doc').waitFor({ state: 'visible' });
  await page.waitForTimeout(500);

  // Screenshot 1: Initial page state
  await page.screenshot({
    path: join(OUTPUT_DIR, '1-initial-page.png'),
    fullPage: false,
  });
  console.log('✓ 1-initial-page.png');

  // Screenshot 2: Text selection with floating feedback button
  await selectText(page, '.rspress-doc p');
  const feedbackBtn = page.getByRole('button', { name: '反馈' });
  await feedbackBtn.waitFor({ state: 'visible' });
  await page.screenshot({
    path: join(OUTPUT_DIR, '2-text-selection-button.png'),
    fullPage: false,
  });
  console.log('✓ 2-text-selection-button.png');

  // Screenshot 3: Feedback dialog open (empty)
  await feedbackBtn.click();
  await page.getByRole('heading', { name: '提交反馈' }).waitFor({ state: 'visible' });
  await page.waitForTimeout(200);
  await page.screenshot({
    path: join(OUTPUT_DIR, '3-dialog-open.png'),
    fullPage: false,
  });
  console.log('✓ 3-dialog-open.png');

  // Screenshot 4: Dialog with content filled in
  await page.getByPlaceholder('请描述你的反馈...').fill('这段文档的描述不够清晰，建议补充更多示例代码。');
  await page.waitForTimeout(200);
  await page.screenshot({
    path: join(OUTPUT_DIR, '4-dialog-filled.png'),
    fullPage: false,
  });
  console.log('✓ 4-dialog-filled.png');

  // Screenshot 5: Submit and success state
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByText('Feedback submitted successfully').waitFor({ state: 'visible', timeout: 10000 });
  await page.screenshot({
    path: join(OUTPUT_DIR, '5-submit-success.png'),
    fullPage: false,
  });
  console.log('✓ 5-submit-success.png');

  await browser.close();
  console.log(`\nAll screenshots saved to: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
