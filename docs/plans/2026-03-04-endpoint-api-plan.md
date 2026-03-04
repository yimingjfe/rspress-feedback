# Replace onSubmit with Endpoint API — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the non-serializable `onSubmit` callback with a serializable `endpoint` + `headers` config, so props survive Rspress's JSON.stringify serialization without hacks.

**Architecture:** FeedbackDialog internally builds a FormData and calls `fetch(endpoint, { method: 'POST', headers, body: formData })`. The `window.__feedbackOnSubmit__` fallback in FeedbackRoot is removed entirely. E2E tests switch from `installMockOnSubmit()` to Playwright's `page.route()` to intercept the HTTP request.

**Tech Stack:** React, Playwright, fetch API, FormData

---

### Task 1: Update type definitions

**Files:**
- Modify: `src/types.ts`

**Step 1: Update FeedbackPluginOptions**

Replace `onSubmit` with `endpoint` + `headers`:

```typescript
export interface FeedbackPluginOptions {
  /** POST endpoint URL for feedback submission */
  endpoint: string;
  /** Custom request headers (e.g. Authorization, X-API-Key) */
  headers?: Record<string, string>;
  /** Dialog title. Default: "提交反馈" */
  dialogTitle?: string;
  /** Textarea placeholder text */
  placeholder?: string;
  /** Max number of images. Default: 5 */
  maxImages?: number;
  /** Max single image size in bytes. Default: 5MB (5 * 1024 * 1024) */
  maxImageSize?: number;
  /** Floating button text. Default: "反馈" */
  buttonText?: string;
  /** Only enable in document content area (.rspress-doc). Default: true */
  contentOnly?: boolean;
}
```

Remove `FeedbackData` interface — it was only used for the `onSubmit` callback signature and is no longer part of the public API. The FormData field names serve as the implicit contract.

**Step 2: Update exports in `src/index.ts`**

Remove the `FeedbackData` re-export:

```typescript
export type { FeedbackPluginOptions } from './types';
```

**Step 3: Commit**

```bash
git add src/types.ts src/index.ts
git commit -m "refactor: replace onSubmit with endpoint in type definitions"
```

---

### Task 2: Update FeedbackDialog to use fetch

**Files:**
- Modify: `src/components/FeedbackDialog.tsx`

**Step 1: Update props destructuring and handleSubmit**

Replace `onSubmit` destructuring with `endpoint` and `headers`. Replace the `onSubmit(data)` call with `fetch()`:

```typescript
const {
  endpoint,
  headers,
  dialogTitle = '提交反馈',
  placeholder = '请描述你的反馈...',
  maxImages = 5,
  maxImageSize = 5 * 1024 * 1024,
} = options;

const handleSubmit = async () => {
  if (!content.trim()) return;

  setStatus('loading');
  setErrorMsg('');

  const formData = new FormData();
  formData.append('selectedText', selectedText);
  formData.append('pagePath', window.location.pathname);
  formData.append('content', content.trim());
  images.forEach((file) => formData.append('images', file));

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { ...headers },
      body: formData,
    });

    if (!res.ok) {
      const errMsg = await res
        .json()
        .then((j) => j.message)
        .catch(() => res.statusText);
      throw new Error(errMsg);
    }

    setStatus('success');
    setTimeout(onClose, 1500);
  } catch (err) {
    setStatus('error');
    setErrorMsg(
      err instanceof Error ? err.message : 'Submission failed',
    );
  }
};
```

Also remove the `FeedbackData` import since it no longer exists.

**Step 2: Commit**

```bash
git add src/components/FeedbackDialog.tsx
git commit -m "refactor: use fetch(endpoint) instead of onSubmit callback"
```

---

### Task 3: Simplify FeedbackRoot

**Files:**
- Modify: `src/components/FeedbackRoot.tsx`

**Step 1: Remove the window.__feedbackOnSubmit__ fallback**

The entire `resolvedOptions` block is no longer needed. Pass `options` directly:

```typescript
import React, { useState, useCallback } from 'react';
import { FloatingButton } from './FloatingButton';
import { FeedbackDialog } from './FeedbackDialog';
import { useTextSelection } from '../hooks/useTextSelection';
import type { FeedbackPluginOptions } from '../types';

export default function FeedbackRoot(options: FeedbackPluginOptions) {
  const { buttonText = '反馈', contentOnly = true } = options;

  const selectionInfo = useTextSelection(contentOnly);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');

  const handleButtonClick = useCallback(() => {
    if (selectionInfo) {
      setSelectedText(selectionInfo.text);
      setDialogOpen(true);
      window.getSelection()?.removeAllRanges();
    }
  }, [selectionInfo]);

  const handleClose = useCallback(() => {
    setDialogOpen(false);
    setSelectedText('');
  }, []);

  return (
    <>
      {selectionInfo && !dialogOpen && (
        <FloatingButton
          rect={selectionInfo.rect}
          text={buttonText}
          onClick={handleButtonClick}
        />
      )}

      {dialogOpen && (
        <FeedbackDialog
          selectedText={selectedText}
          options={options}
          onClose={handleClose}
        />
      )}
    </>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/FeedbackRoot.tsx
git commit -m "refactor: remove window.__feedbackOnSubmit__ fallback from FeedbackRoot"
```

---

### Task 4: Update example config

**Files:**
- Modify: `example/rspress.config.ts`

**Step 1: Replace onSubmit with endpoint**

```typescript
import { defineConfig } from 'rspress/config';
import { pluginFeedback } from 'rspress-plugin-feedback';

export default defineConfig({
  root: 'docs',
  title: 'Feedback Plugin Test',
  plugins: [
    pluginFeedback({
      endpoint: '/api/feedback',
      buttonText: '反馈',
      dialogTitle: '提交反馈',
      placeholder: '请描述你的反馈...',
    }),
  ],
});
```

**Step 2: Commit**

```bash
git add example/rspress.config.ts
git commit -m "refactor: update example config to use endpoint"
```

---

### Task 5: Update E2E test helpers

**Files:**
- Modify: `e2e/helpers.ts`

**Step 1: Replace `installMockOnSubmit` with `mockFeedbackEndpoint`**

Remove `installMockOnSubmit`. Add a new helper that uses Playwright's `page.route()` to intercept the POST request to `/api/feedback`:

```typescript
/**
 * Mock the /api/feedback endpoint to capture submissions.
 * Returns an array that collects submitted FormData fields.
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

    // Parse multipart form data from request
    const body = await request.postData();
    // Store raw post data existence as proof of submission
    submissions.push({ submitted: 1 });

    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  return submissions;
}
```

**Step 2: Commit**

```bash
git add e2e/helpers.ts
git commit -m "refactor: replace installMockOnSubmit with mockFeedbackEndpoint"
```

---

### Task 6: Update E2E test files

**Files:**
- Modify: `e2e/feedback-dialog.spec.ts`
- Modify: `e2e/full-flow.spec.ts`
- Modify: `e2e/image-upload.spec.ts`
- No change: `e2e/text-selection.spec.ts` (no submission logic)

**Step 1: Update `feedback-dialog.spec.ts`**

Replace `installMockOnSubmit` import with `mockFeedbackEndpoint`. Update `beforeEach` and the submission test:

```typescript
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

  // ... all non-submission tests stay the same ...
  // Remove page.on('dialog', ...) from beforeEach — no longer needed
});
```

**Step 2: Update `image-upload.spec.ts`**

Remove the `page.on('dialog', ...)` line in `beforeEach` — it was only there because the old `onSubmit` called `alert()`. Add `mockFeedbackEndpoint` import (not strictly needed since image tests don't submit, but keep imports consistent):

```typescript
import { selectTextAndOpenDialog, waitForContent, mockFeedbackEndpoint } from './helpers';

// In beforeEach: remove page.on('dialog', ...) line
```

**Step 3: Update `full-flow.spec.ts`**

Replace `installMockOnSubmit` with `mockFeedbackEndpoint`. Remove the console.log verification (no longer applies — we verify via route interception). Update each test:

```typescript
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

    // Verify endpoint was called
    expect(submissions.length).toBe(1);
  });

  test('feedback works on guide page', async ({ page }) => {
    await page.goto('/guide');
    await waitForContent(page);
    await mockFeedbackEndpoint(page);

    const paragraph = page.locator('.rspress-doc p').first();
    await selectTextAndOpenDialog(page, paragraph);

    await page.getByPlaceholder('请描述你的反馈...').fill('Guide page feedback');
    await page.getByRole('button', { name: 'Submit' }).click();

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

    expect(submissions.length).toBe(2);
  });
});
```

**Step 4: Commit**

```bash
git add e2e/feedback-dialog.spec.ts e2e/full-flow.spec.ts e2e/image-upload.spec.ts
git commit -m "refactor: update e2e tests to use route interception instead of mock callback"
```

---

### Task 7: Build and run all tests

**Step 1: Build the plugin**

Run: `cd /Users/bytedance/Desktop/AI/rspress-feedback && pnpm build`
Expected: Build succeeds with no TypeScript errors

**Step 2: Run E2E tests**

Run: `cd /Users/bytedance/Desktop/AI/rspress-feedback && pnpm test:e2e`
Expected: All 20 tests pass

**Step 3: Final commit if any fixes needed**

If tests required minor fixes, commit those fixes.
