import { test, expect } from '@playwright/test';
import { join } from 'path';
import {
  selectText,
  selectTextAndOpenDialog,
  waitForContent,
  mockFeedbackEndpoint,
} from './helpers';

const TEST_IMAGE = join(__dirname, 'fixtures', 'test-image.png');

test.describe('Full Flow Integration', () => {
  test('complete feedback flow: select → button → dialog → input → upload → submit → success', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForContent(page);
    const submissions = await mockFeedbackEndpoint(page);

    // Step 1: Select text
    const paragraph = page.locator('.rspress-doc p').first();
    await selectText(page, paragraph);

    // Step 2: Floating button appears
    const feedbackBtn = page.getByRole('button', { name: '反馈' });
    await expect(feedbackBtn).toBeVisible();

    // Step 3: Click button to open dialog
    await feedbackBtn.click();
    await expect(
      page.getByRole('heading', { name: '提交反馈' }),
    ).toBeVisible();

    // Step 4: Input feedback
    const textarea = page.getByPlaceholder('请描述你的反馈...');
    await textarea.fill('This documentation is very helpful!');

    // Step 5: Upload screenshot
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByText('Click to upload').click(),
    ]);
    await fileChooser.setFiles(TEST_IMAGE);
    await expect(page.locator('img[alt="upload-0"]')).toBeVisible();

    // Step 6: Submit
    await page.getByRole('button', { name: 'Submit' }).click();

    // Step 7: Success message appears
    await expect(
      page.getByText('Feedback submitted successfully'),
    ).toBeVisible({ timeout: 10000 });

    // Step 8: Dialog auto-closes
    await expect(
      page.getByRole('heading', { name: '提交反馈' }),
    ).not.toBeVisible({ timeout: 5000 });

    // Verify submission was captured
    expect(submissions.length).toBe(1);
  });

  test('feedback works on guide page', async ({ page }) => {
    await page.goto('/guide');
    await waitForContent(page);
    await mockFeedbackEndpoint(page);

    // Select text and open dialog
    const paragraph = page.locator('.rspress-doc p').first();
    await selectTextAndOpenDialog(page, paragraph);

    // Fill and submit
    await page.getByPlaceholder('请描述你的反馈...').fill('Guide page feedback');
    await page.getByRole('button', { name: 'Submit' }).click();

    // Success
    await expect(
      page.getByText('Feedback submitted successfully'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('can submit feedback multiple times on the same page', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForContent(page);
    const submissions = await mockFeedbackEndpoint(page);

    // First feedback
    const paragraph = page.locator('.rspress-doc p').first();
    await selectTextAndOpenDialog(page, paragraph);
    await page.getByPlaceholder('请描述你的反馈...').fill('First feedback');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(
      page.getByText('Feedback submitted successfully'),
    ).toBeVisible({ timeout: 10000 });

    // Wait for dialog to auto-close
    await expect(
      page.getByRole('heading', { name: '提交反馈' }),
    ).not.toBeVisible({ timeout: 5000 });

    // Second feedback
    const secondParagraph = page.locator('.rspress-doc p').nth(1);
    await selectTextAndOpenDialog(page, secondParagraph);
    await page.getByPlaceholder('请描述你的反馈...').fill('Second feedback');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(
      page.getByText('Feedback submitted successfully'),
    ).toBeVisible({ timeout: 10000 });

    // Verify both submissions were captured
    expect(submissions.length).toBe(2);
  });
});
