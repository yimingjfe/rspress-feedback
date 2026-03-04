import type { Locator, Page } from '@playwright/test';

/**
 * Select text within a locator element using mouse drag.
 */
export async function selectText(page: Page, locator: Locator) {
  await locator.waitFor({ state: 'visible' });
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element not found for text selection');

  const startX = box.x + 5;
  const endX = box.x + Math.min(box.width - 5, 300);
  const y = box.y + box.height / 2;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y);
  await page.mouse.up();

  // Wait for useTextSelection hook to process (10ms setTimeout + React re-render)
  await page.waitForTimeout(300);
}

/**
 * Select text in content area and open the feedback dialog.
 */
export async function selectTextAndOpenDialog(page: Page, locator: Locator) {
  await selectText(page, locator);

  const feedbackBtn = page.getByRole('button', { name: '反馈' });
  await feedbackBtn.waitFor({ state: 'visible' });
  await feedbackBtn.click();

  // Wait for dialog to appear
  await page.getByRole('heading', { name: '提交反馈' }).waitFor({ state: 'visible' });
}

/**
 * Clear text selection.
 */
export async function clearSelection(page: Page) {
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await page.waitForTimeout(300);
}

/**
 * Wait for Rspress content area to be ready.
 */
export async function waitForContent(page: Page) {
  await page.locator('.rspress-doc').waitFor({ state: 'visible' });
}

/**
 * Mock the /api/feedback endpoint to capture submissions.
 * Returns an array that collects submitted entries.
 */
export async function mockFeedbackEndpoint(
  page: Page,
  options?: { status?: number; delay?: number },
) {
  const { status = 200, delay = 100 } = options ?? {};
  const submissions: Record<string, string | number>[] = [];

  await page.route('**/api/feedback', async (route) => {
    const request = route.request();
    if (request.method() !== 'POST') {
      await route.fallback();
      return;
    }

    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    submissions.push({ submitted: 1 });

    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  return submissions;
}
