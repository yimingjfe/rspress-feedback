import { test, expect } from '@playwright/test';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { selectTextAndOpenDialog, waitForContent } from './helpers';

const TEST_IMAGE = join(__dirname, 'fixtures', 'test-image.png');

test.describe('Image Upload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForContent(page);

    // Open feedback dialog
    const paragraph = page.locator('.rspress-doc p').first();
    await selectTextAndOpenDialog(page, paragraph);
  });

  test('upload image via file chooser and show preview', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByText('Click to upload').click(),
    ]);
    await fileChooser.setFiles(TEST_IMAGE);

    // Preview image should appear
    const previewImg = page.locator('img[alt="upload-0"]');
    await expect(previewImg).toBeVisible();
  });

  test('remove uploaded image by clicking remove button', async ({ page }) => {
    // Upload an image first
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByText('Click to upload').click(),
    ]);
    await fileChooser.setFiles(TEST_IMAGE);

    const previewImg = page.locator('img[alt="upload-0"]');
    await expect(previewImg).toBeVisible();

    // Click the remove button (×)
    await page.getByRole('button', { name: '×' }).click();
    await expect(previewImg).not.toBeVisible();
  });

  test('show error for non-image file', async ({ page }) => {
    const notAnImage = join(__dirname, 'fixtures', 'not-an-image.txt');

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByText('Click to upload').click(),
    ]);
    await fileChooser.setFiles(notAnImage);

    await expect(page.getByText('Please select image files')).toBeVisible();
  });

  test('show error for oversized image', async ({ page }) => {
    // Create a temporary file larger than 5MB with .png extension
    const largePngPath = join(tmpdir(), 'large-test-image.png');
    writeFileSync(largePngPath, Buffer.alloc(6 * 1024 * 1024));

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByText('Click to upload').click(),
    ]);
    await fileChooser.setFiles(largePngPath);

    await expect(page.getByText('exceeds')).toBeVisible();
    await expect(page.getByText('5MB limit')).toBeVisible();
  });

  test('upload multiple images', async ({ page }) => {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.getByText('Click to upload').click(),
    ]);
    await fileChooser.setFiles([TEST_IMAGE, TEST_IMAGE]);

    // Both preview images should appear
    await expect(page.locator('img[alt="upload-0"]')).toBeVisible();
    await expect(page.locator('img[alt="upload-1"]')).toBeVisible();
  });
});
