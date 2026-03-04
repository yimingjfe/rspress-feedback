import { test, expect } from '@playwright/test';
import {
  selectText,
  selectTextAndOpenDialog,
  waitForContent,
  mockFeedbackEndpoint,
} from './helpers';

test.describe('Feedback Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForContent(page);
    await mockFeedbackEndpoint(page);
  });

  test('dialog opens after clicking floating button', async ({ page }) => {
    const paragraph = page.locator('.rspress-doc p').first();
    await selectTextAndOpenDialog(page, paragraph);

    await expect(
      page.getByRole('heading', { name: '提交反馈' }),
    ).toBeVisible();
  });

  test('dialog shows the selected text', async ({ page }) => {
    const paragraph = page.locator('.rspress-doc p').first();

    // Get the text content before selecting
    await selectText(page, paragraph);
    const selectedText = await page.evaluate(() =>
      window.getSelection()?.toString().trim(),
    );
    expect(selectedText).toBeTruthy();

    // Click feedback button to open dialog
    const feedbackBtn = page.getByRole('button', { name: '反馈' });
    await feedbackBtn.click();
    await page.getByRole('heading', { name: '提交反馈' }).waitFor();

    // Verify selected text is displayed in the dialog
    await expect(page.getByText(selectedText!).first()).toBeVisible();
  });

  test('submit button is disabled when content is empty', async ({ page }) => {
    const paragraph = page.locator('.rspress-doc p').first();
    await selectTextAndOpenDialog(page, paragraph);

    const submitBtn = page.getByRole('button', { name: 'Submit' });
    await expect(submitBtn).toBeDisabled();
  });

  test('submit button is enabled after typing content', async ({ page }) => {
    const paragraph = page.locator('.rspress-doc p').first();
    await selectTextAndOpenDialog(page, paragraph);

    const textarea = page.getByPlaceholder('请描述你的反馈...');
    await textarea.fill('This is my feedback');

    const submitBtn = page.getByRole('button', { name: 'Submit' });
    await expect(submitBtn).toBeEnabled();
  });

  test('dialog closes when clicking overlay', async ({ page }) => {
    const paragraph = page.locator('.rspress-doc p').first();
    await selectTextAndOpenDialog(page, paragraph);

    const heading = page.getByRole('heading', { name: '提交反馈' });
    await expect(heading).toBeVisible();

    // Click at the edge of the viewport (on the overlay, outside the dialog)
    await page.mouse.click(5, 5);
    await expect(heading).not.toBeVisible();
  });

  test('dialog closes when pressing Escape', async ({ page }) => {
    const paragraph = page.locator('.rspress-doc p').first();
    await selectTextAndOpenDialog(page, paragraph);

    const heading = page.getByRole('heading', { name: '提交反馈' });
    await expect(heading).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(heading).not.toBeVisible();
  });

  test('dialog closes when clicking Cancel button', async ({ page }) => {
    const paragraph = page.locator('.rspress-doc p').first();
    await selectTextAndOpenDialog(page, paragraph);

    const heading = page.getByRole('heading', { name: '提交反馈' });
    await expect(heading).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(heading).not.toBeVisible();
  });

  test('shows success message and auto-closes after submission', async ({
    page,
  }) => {
    const paragraph = page.locator('.rspress-doc p').first();
    await selectTextAndOpenDialog(page, paragraph);

    // Fill and submit
    const textarea = page.getByPlaceholder('请描述你的反馈...');
    await textarea.fill('Great documentation!');
    await page.getByRole('button', { name: 'Submit' }).click();

    // Wait for success message
    await expect(
      page.getByText('Feedback submitted successfully'),
    ).toBeVisible({ timeout: 10000 });

    // Dialog auto-closes after 1.5s
    const heading = page.getByRole('heading', { name: '提交反馈' });
    await expect(heading).not.toBeVisible({ timeout: 5000 });
  });
});
