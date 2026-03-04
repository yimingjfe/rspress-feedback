import { test, expect } from '@playwright/test';
import { selectText, clearSelection, waitForContent } from './helpers';

test.describe('Text Selection & Floating Button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForContent(page);
  });

  test('floating button appears after selecting text in content area', async ({
    page,
  }) => {
    const paragraph = page.locator('.rspress-doc p').first();
    await selectText(page, paragraph);

    const feedbackBtn = page.getByRole('button', { name: '反馈' });
    await expect(feedbackBtn).toBeVisible();
  });

  test('floating button disappears after clearing selection', async ({
    page,
  }) => {
    const paragraph = page.locator('.rspress-doc p').first();
    await selectText(page, paragraph);

    const feedbackBtn = page.getByRole('button', { name: '反馈' });
    await expect(feedbackBtn).toBeVisible();

    await clearSelection(page);
    await expect(feedbackBtn).not.toBeVisible();
  });

  test('floating button does not appear when selecting text outside content area', async ({
    page,
  }) => {
    // Select text in the nav/header area (outside .rspress-doc)
    const navTitle = page.locator('nav').first();
    await selectText(page, navTitle);

    const feedbackBtn = page.getByRole('button', { name: '反馈' });
    await expect(feedbackBtn).not.toBeVisible();
  });

  test('floating button shows configured text', async ({ page }) => {
    const paragraph = page.locator('.rspress-doc p').first();
    await selectText(page, paragraph);

    const feedbackBtn = page.getByRole('button', { name: '反馈' });
    await expect(feedbackBtn).toBeVisible();
    await expect(feedbackBtn).toContainText('反馈');
  });
});
