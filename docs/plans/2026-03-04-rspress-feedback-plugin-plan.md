# Rspress Feedback Plugin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Rspress plugin that shows a floating feedback button when users select document text, opening a dialog for feedback submission with image upload support.

**Architecture:** Pure GlobalUI component approach — the plugin registers a global React component via Rspress's `globalUIComponents` API. This component monitors text selection, renders a floating button via Portal, and manages a feedback dialog with image upload. All feedback data flows through an `onSubmit` callback.

**Tech Stack:** React, TypeScript, CSS Modules, tsup, pnpm

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsup.config.ts`
- Create: `src/types.ts`

**Step 1: Initialize package.json**

```json
{
  "name": "rspress-plugin-feedback",
  "version": "0.1.0",
  "description": "Rspress plugin for document feedback with text selection",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "src/components",
    "src/hooks",
    "src/styles",
    "src/types.ts"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0",
    "@rspress/shared": ">=1.0.0"
  },
  "devDependencies": {
    "@rspress/shared": "^1.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  },
  "license": "MIT"
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationDir": "dist",
    "outDir": "dist",
    "rootDir": "src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create tsup.config.ts**

Only compiles the Node-side plugin entry. Client components are left as TSX source for Rspress's Rsbuild to compile.

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom', '@rspress/shared'],
});
```

**Step 4: Create src/types.ts**

```ts
export interface FeedbackData {
  /** The text the user selected */
  selectedText: string;
  /** The page path where the selection was made */
  pagePath: string;
  /** The feedback content the user typed */
  content: string;
  /** Uploaded image files */
  images: File[];
}

export interface FeedbackPluginOptions {
  /** Callback when feedback is submitted */
  onSubmit: (data: FeedbackData) => void | Promise<void>;
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

**Step 5: Install dependencies**

Run: `pnpm install`

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold project with package.json, tsconfig, tsup, and types"
```

---

### Task 2: Plugin Entry

**Files:**
- Create: `src/index.ts`

**Step 1: Create the plugin entry**

```ts
import { RspressPlugin } from '@rspress/shared';
import path from 'path';
import { FeedbackPluginOptions } from './types';

export type { FeedbackData, FeedbackPluginOptions } from './types';

export function pluginFeedback(options: FeedbackPluginOptions): RspressPlugin {
  return {
    name: 'rspress-plugin-feedback',
    globalUIComponents: [
      [path.join(__dirname, '../src/components/FeedbackRoot.tsx'), options],
    ],
    globalStyles: path.join(__dirname, '../src/styles/global.css'),
  };
}
```

Note: `__dirname` in the compiled `dist/index.js` points to `dist/`, so `../src/components/` resolves to the source components directory that Rspress will compile.

**Step 2: Create a placeholder global.css**

Create `src/styles/global.css`:

```css
/* Global styles for rspress-plugin-feedback */
```

**Step 3: Build to verify**

Run: `pnpm build`
Expected: Compiles successfully, `dist/index.js` and `dist/index.d.ts` are generated.

**Step 4: Commit**

```bash
git add src/index.ts src/styles/global.css
git commit -m "feat: add plugin entry with globalUIComponents registration"
```

---

### Task 3: useTextSelection Hook

**Files:**
- Create: `src/hooks/useTextSelection.ts`

**Step 1: Implement the hook**

```ts
import { useState, useEffect, useCallback } from 'react';

export interface SelectionInfo {
  text: string;
  rect: DOMRect;
}

export function useTextSelection(contentOnly: boolean): SelectionInfo | null {
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);

  const isInContentArea = useCallback(
    (node: Node): boolean => {
      if (!contentOnly) return true;
      let current: Node | null = node;
      while (current) {
        if (
          current instanceof HTMLElement &&
          current.classList.contains('rspress-doc')
        ) {
          return true;
        }
        current = current.parentNode;
      }
      return false;
    },
    [contentOnly],
  );

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      setSelectionInfo(null);
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      setSelectionInfo(null);
      return;
    }

    if (!isInContentArea(selection.anchorNode!)) {
      setSelectionInfo(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectionInfo({ text, rect });
  }, [isInContentArea]);

  useEffect(() => {
    const handleMouseUp = () => {
      // Delay to let the browser finalize selection
      setTimeout(handleSelectionChange, 10);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  return selectionInfo;
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/hooks/useTextSelection.ts
git commit -m "feat: add useTextSelection hook for text selection detection"
```

---

### Task 4: FloatingButton Component

**Files:**
- Create: `src/components/FloatingButton.tsx`
- Create: `src/styles/floating-button.module.css`

**Step 1: Create CSS Module**

`src/styles/floating-button.module.css`:

```css
.floatingButton {
  position: fixed;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #1677ff;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: background 0.2s;
  transform: translateX(-50%);
  user-select: none;
  white-space: nowrap;
}

.floatingButton:hover {
  background: #4096ff;
}

.icon {
  width: 14px;
  height: 14px;
  fill: currentColor;
}
```

**Step 2: Create FloatingButton component**

`src/components/FloatingButton.tsx`:

```tsx
import React from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles/floating-button.module.css';

interface FloatingButtonProps {
  rect: DOMRect;
  text: string;
  onClick: () => void;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  rect,
  text,
  onClick,
}) => {
  const top = rect.top + window.scrollY - 40;
  const left = rect.left + window.scrollX + rect.width / 2;

  return createPortal(
    <button
      className={styles.floatingButton}
      style={{ top, left }}
      onClick={onClick}
      type="button"
    >
      <svg className={styles.icon} viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm0 15.17L18.83 16H4V4h16v13.17zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
      </svg>
      {text}
    </button>,
    document.body,
  );
};
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/components/FloatingButton.tsx src/styles/floating-button.module.css
git commit -m "feat: add FloatingButton component with Portal rendering"
```

---

### Task 5: ImageUpload Component

**Files:**
- Create: `src/components/ImageUpload.tsx`
- Create: `src/styles/image-upload.module.css`

**Step 1: Create CSS Module**

`src/styles/image-upload.module.css`:

```css
.uploadArea {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
  margin-top: 8px;
}

.uploadArea:hover {
  border-color: #1677ff;
}

.uploadHint {
  color: #999;
  font-size: 13px;
}

.previewList {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.previewItem {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #d9d9d9;
}

.previewImage {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.removeButton {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.removeButton:hover {
  background: rgba(0, 0, 0, 0.7);
}

.errorText {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 4px;
}
```

**Step 2: Create ImageUpload component**

`src/components/ImageUpload.tsx`:

```tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import styles from '../styles/image-upload.module.css';

interface ImageUploadProps {
  images: File[];
  onChange: (images: File[]) => void;
  maxImages: number;
  maxImageSize: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onChange,
  maxImages,
  maxImageSize,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  const validateAndAddFiles = useCallback(
    (files: File[]) => {
      setError('');
      const imageFiles = files.filter((f) => f.type.startsWith('image/'));

      if (imageFiles.length === 0) {
        setError('Please select image files');
        return;
      }

      const oversized = imageFiles.find((f) => f.size > maxImageSize);
      if (oversized) {
        const maxMB = Math.round(maxImageSize / 1024 / 1024);
        setError(`Image size exceeds ${maxMB}MB limit`);
        return;
      }

      const remaining = maxImages - images.length;
      if (remaining <= 0) {
        setError(`Maximum ${maxImages} images allowed`);
        return;
      }

      const toAdd = imageFiles.slice(0, remaining);
      onChange([...images, ...toAdd]);
    },
    [images, onChange, maxImages, maxImageSize],
  );

  const handleClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateAndAddFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        validateAndAddFiles(pastedFiles);
      }
    },
    [validateAndAddFiles],
  );

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div>
      {images.length < maxImages && (
        <div className={styles.uploadArea} onClick={handleClick}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div className={styles.uploadHint}>
            Click to upload or paste screenshot (Ctrl+V)
          </div>
        </div>
      )}

      {error && <div className={styles.errorText}>{error}</div>}

      {previews.length > 0 && (
        <div className={styles.previewList}>
          {previews.map((url, index) => (
            <div key={url} className={styles.previewItem}>
              <img
                src={url}
                alt={`upload-${index}`}
                className={styles.previewImage}
              />
              <button
                className={styles.removeButton}
                onClick={() => handleRemove(index)}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/components/ImageUpload.tsx src/styles/image-upload.module.css
git commit -m "feat: add ImageUpload component with paste and file picker support"
```

---

### Task 6: FeedbackDialog Component

**Files:**
- Create: `src/components/FeedbackDialog.tsx`
- Create: `src/styles/feedback-dialog.module.css`

**Step 1: Create CSS Module**

`src/styles/feedback-dialog.module.css`:

```css
.overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  width: 480px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
}

.title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
  color: #1a1a1a;
}

.selectedText {
  background: #f5f5f5;
  border-left: 3px solid #1677ff;
  padding: 8px 12px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #666;
  max-height: 100px;
  overflow-y: auto;
  border-radius: 0 4px 4px 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 6px;
  display: block;
}

.textarea {
  width: 100%;
  min-height: 100px;
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.textarea:focus {
  outline: none;
  border-color: #1677ff;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.cancelButton {
  padding: 6px 16px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background: #fff;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s;
}

.cancelButton:hover {
  border-color: #1677ff;
  color: #1677ff;
}

.submitButton {
  padding: 6px 16px;
  border: none;
  border-radius: 6px;
  background: #1677ff;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.submitButton:hover {
  background: #4096ff;
}

.submitButton:disabled {
  background: #d9d9d9;
  cursor: not-allowed;
}

.successMessage {
  text-align: center;
  padding: 24px 0;
  color: #52c41a;
  font-size: 15px;
}

.errorMessage {
  color: #ff4d4f;
  font-size: 13px;
  margin-top: 8px;
}
```

**Step 2: Create FeedbackDialog component**

`src/components/FeedbackDialog.tsx`:

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ImageUpload } from './ImageUpload';
import type { FeedbackData, FeedbackPluginOptions } from '../types';
import styles from '../styles/feedback-dialog.module.css';

interface FeedbackDialogProps {
  selectedText: string;
  options: FeedbackPluginOptions;
  onClose: () => void;
}

export const FeedbackDialog: React.FC<FeedbackDialogProps> = ({
  selectedText,
  options,
  onClose,
}) => {
  const {
    onSubmit,
    dialogTitle = '提交反馈',
    placeholder = '请描述你的反馈...',
    maxImages = 5,
    maxImageSize = 5 * 1024 * 1024,
  } = options;

  const [content, setContent] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setStatus('loading');
    setErrorMsg('');

    const data: FeedbackData = {
      selectedText,
      pagePath: window.location.pathname,
      content: content.trim(),
      images,
    };

    try {
      await onSubmit(data);
      setStatus('success');
      setTimeout(onClose, 1500);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Submission failed');
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.dialog}>
        <h3 className={styles.title}>{dialogTitle}</h3>

        <div className={styles.selectedText}>{selectedText}</div>

        {status === 'success' ? (
          <div className={styles.successMessage}>✓ Feedback submitted successfully</div>
        ) : (
          <>
            <label className={styles.label}>Feedback</label>
            <textarea
              className={styles.textarea}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              disabled={status === 'loading'}
            />

            <label className={styles.label} style={{ marginTop: 12 }}>
              Screenshots (optional)
            </label>
            <ImageUpload
              images={images}
              onChange={setImages}
              maxImages={maxImages}
              maxImageSize={maxImageSize}
            />

            {errorMsg && <div className={styles.errorMessage}>{errorMsg}</div>}

            <div className={styles.footer}>
              <button
                className={styles.cancelButton}
                onClick={onClose}
                type="button"
                disabled={status === 'loading'}
              >
                Cancel
              </button>
              <button
                className={styles.submitButton}
                onClick={handleSubmit}
                type="button"
                disabled={!content.trim() || status === 'loading'}
              >
                {status === 'loading' ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
};
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/components/FeedbackDialog.tsx src/styles/feedback-dialog.module.css
git commit -m "feat: add FeedbackDialog component with form and submit handling"
```

---

### Task 7: FeedbackRoot Component

**Files:**
- Create: `src/components/FeedbackRoot.tsx`

**Step 1: Create the root component**

`src/components/FeedbackRoot.tsx`:

```tsx
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
      // Clear selection after capturing
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

Note: The component is a **default export** because Rspress's `globalUIComponents` expects a default export from the component file. Props are passed from the plugin options tuple `[path, options]`.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/FeedbackRoot.tsx
git commit -m "feat: add FeedbackRoot component orchestrating selection, button, and dialog"
```

---

### Task 8: Build & Integration Test

**Files:**
- None new. Verify existing code works end-to-end.

**Step 1: Full build**

Run: `pnpm build`
Expected: `dist/index.js`, `dist/index.mjs`, `dist/index.d.ts` are generated without errors.

**Step 2: Verify dist output exports**

Run: `node -e "const m = require('./dist/index.js'); console.log(typeof m.pluginFeedback)"`
Expected: `function`

**Step 3: Verify all source files exist for publishing**

Run: `ls src/components/ src/hooks/ src/styles/ src/types.ts`
Expected: All files listed:
- `src/components/FeedbackRoot.tsx`, `FloatingButton.tsx`, `FeedbackDialog.tsx`, `ImageUpload.tsx`
- `src/hooks/useTextSelection.ts`
- `src/styles/floating-button.module.css`, `feedback-dialog.module.css`, `image-upload.module.css`, `global.css`
- `src/types.ts`

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify build and integration"
```

---

### Task 9: Dark Mode Support

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/styles/feedback-dialog.module.css`

**Step 1: Add dark mode CSS variables to global.css**

Update `src/styles/global.css`:

```css
:root {
  --feedback-bg: #fff;
  --feedback-text: #1a1a1a;
  --feedback-text-secondary: #666;
  --feedback-border: #d9d9d9;
  --feedback-selected-bg: #f5f5f5;
  --feedback-primary: #1677ff;
  --feedback-primary-hover: #4096ff;
}

.dark {
  --feedback-bg: #1f1f1f;
  --feedback-text: #e5e5e5;
  --feedback-text-secondary: #999;
  --feedback-border: #424242;
  --feedback-selected-bg: #2a2a2a;
  --feedback-primary: #1677ff;
  --feedback-primary-hover: #4096ff;
}
```

**Step 2: Update feedback-dialog.module.css to use CSS variables**

Replace hardcoded colors with `var(--feedback-*)` references in `.dialog`, `.title`, `.selectedText`, `.textarea`, `.cancelButton` and other classes as needed.

**Step 3: Verify the styles render correctly**

Run: `pnpm build`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/styles/global.css src/styles/feedback-dialog.module.css
git commit -m "feat: add dark mode support via CSS variables"
```

---

### Task 10: Create Local Test Rspress Project

**Files:**
- Create: `example/package.json`
- Create: `example/rspress.config.ts`
- Create: `example/docs/index.md`
- Create: `example/docs/guide.md`
- Modify: `package.json` (root, add workspace scripts)

**Step 1: Convert root project to pnpm workspace**

Create `pnpm-workspace.yaml` in the project root:

```yaml
packages:
  - '.'
  - 'example'
```

This allows the `example` project to reference the plugin via `workspace:*`.

**Step 2: Create example/package.json**

```json
{
  "name": "rspress-plugin-feedback-example",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "rspress dev",
    "build": "rspress build",
    "preview": "rspress preview"
  },
  "dependencies": {
    "rspress": "^1.39.2",
    "rspress-plugin-feedback": "workspace:*"
  }
}
```

**Step 3: Create example/rspress.config.ts**

```ts
import { defineConfig } from 'rspress/config';
import { pluginFeedback } from 'rspress-plugin-feedback';

export default defineConfig({
  root: 'docs',
  title: 'Feedback Plugin Test',
  plugins: [
    pluginFeedback({
      onSubmit: async (data) => {
        console.log('Feedback submitted:', {
          selectedText: data.selectedText,
          pagePath: data.pagePath,
          content: data.content,
          imageCount: data.images.length,
        });
        // Simulate async submission
        await new Promise((resolve) => setTimeout(resolve, 1000));
        alert('Feedback submitted! Check console for details.');
      },
      buttonText: '反馈',
      dialogTitle: '提交反馈',
      placeholder: '请描述你的反馈...',
    }),
  ],
});
```

**Step 4: Create example/docs/index.md**

```md
# Welcome to Feedback Plugin Test

This is a test site for the `rspress-plugin-feedback` plugin.

## How to Test

1. Select any text on this page with your mouse
2. A floating "反馈" button should appear above the selection
3. Click the button to open the feedback dialog
4. Type your feedback and optionally upload images
5. Click Submit — check the browser console for output

## Sample Content

Rspress is a static site generator based on Rsbuild. It provides a rich set of features
for building documentation sites, including MDX support, full-text search, and an extensible
plugin system. The plugin architecture allows developers to customize the build process,
inject global components, and modify the document rendering pipeline.

### More Text to Select

Here is some additional content that you can select to test the feedback plugin. Try selecting
different paragraphs, headings, or even code blocks to see how the floating button positions
itself relative to the selected text.

> This is a blockquote. Try selecting text within this blockquote to verify the feedback
> button works correctly in nested elements.
```

**Step 5: Create example/docs/guide.md**

```md
# Guide Page

This is a second page to test navigation and page path tracking.

## Section One

Select this text to verify that the `pagePath` field in the feedback data correctly
reflects the current page URL (`/guide`).

## Section Two

- List item one — try selecting list items
- List item two — the button should appear above the selection
- List item three — verify multi-line selections work

## Code Example

\`\`\`ts
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`

Try selecting text around and within code blocks.
```

**Step 6: Create example/tsconfig.json**

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "jsx": "react-jsx"
  }
}
```

**Step 7: Add convenience scripts to root package.json**

Add the following scripts to the root `package.json`:

```json
{
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "example:dev": "pnpm build && cd example && pnpm dev",
    "example:build": "pnpm build && cd example && pnpm build"
  }
}
```

**Step 8: Install all dependencies**

Run: `pnpm install`
Expected: All dependencies installed, `example` project links to local plugin via workspace protocol.

**Step 9: Build plugin and start example dev server**

Run: `pnpm example:dev`
Expected: Plugin builds successfully, Rspress dev server starts at `http://localhost:5173` (or similar port). Open the browser and verify:
1. Select text on the page → floating "反馈" button appears above selection
2. Click "反馈" → feedback dialog opens with selected text displayed
3. Type feedback, paste/upload an image → preview shows correctly
4. Click Submit → console logs the feedback data, success message appears
5. Press Esc or click outside → dialog closes
6. Navigate to `/guide` → verify `pagePath` updates correctly

**Step 10: Commit**

```bash
git add pnpm-workspace.yaml example/ package.json
git commit -m "chore: add example Rspress project for local testing"
```
