# Rspress Feedback Plugin Design

## Overview

An Rspress plugin that enables document feedback by showing a floating button when users select text. Clicking the button opens a dialog where users can write feedback and attach images. Feedback data is passed to a user-provided callback function.

## Architecture

**Approach: Pure GlobalUI Component**

The plugin uses Rspress's `globalUIComponents` API to inject a single global React component. This component handles text selection detection, floating button positioning, and the feedback dialog — all within one React component tree.

Key reasons for this approach:
- `globalUIComponents` is designed for exactly this kind of global UI injection
- All logic stays in one React tree, simple to develop and maintain
- No modification to document AST or Rspress internals
- React Portal handles z-index and overflow concerns

## Project Structure

```
rspress-plugin-feedback/
├── src/
│   ├── index.ts                    # Plugin entry, exports pluginFeedback()
│   ├── components/
│   │   ├── FeedbackRoot.tsx        # Global root component (injected via globalUIComponents)
│   │   ├── FloatingButton.tsx      # Floating button above selected text
│   │   ├── FeedbackDialog.tsx      # Feedback dialog with form
│   │   └── ImageUpload.tsx         # Image upload (paste + file picker)
│   ├── hooks/
│   │   └── useTextSelection.ts     # Text selection detection hook
│   ├── styles/
│   │   ├── floating-button.module.css
│   │   ├── feedback-dialog.module.css
│   │   └── image-upload.module.css
│   └── types.ts                    # Type definitions
├── package.json
├── tsconfig.json
└── tsup.config.ts                  # Build config (Node entry only)
```

## API Design

### Plugin Options

```ts
interface FeedbackPluginOptions {
  onSubmit: (data: FeedbackData) => void | Promise<void>;
  dialogTitle?: string;       // Default: "提交反馈"
  placeholder?: string;
  maxImages?: number;          // Default: 5
  maxImageSize?: number;       // Default: 5MB
  buttonText?: string;         // Default: "反馈"
  contentOnly?: boolean;       // Default: true
}
```

### Feedback Data

```ts
interface FeedbackData {
  selectedText: string;
  pagePath: string;
  content: string;
  images: File[];
}
```

### Usage Example

```ts
import { pluginFeedback } from 'rspress-plugin-feedback';

export default defineConfig({
  plugins: [
    pluginFeedback({
      onSubmit: async (data) => {
        await fetch('/api/feedback', {
          method: 'POST',
          body: JSON.stringify({
            text: data.selectedText,
            content: data.content,
            page: data.pagePath,
          }),
        });
      },
    }),
  ],
});
```

## Interaction Flow

1. User selects text within the document content area (`.rspress-doc`)
2. A floating "反馈" button appears centered above the selection
3. User clicks the button → feedback dialog opens
4. Dialog shows the selected text (read-only) and provides:
   - Text area for feedback content
   - Image upload area (paste from clipboard + file picker)
5. User submits → `onSubmit` callback is called with `FeedbackData`
6. Dialog shows loading/success/error state
7. Close via: clicking outside, pressing Esc, or clicking cancel

## Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| `FeedbackRoot` | Global root, manages state (button visibility, dialog open), coordinates children |
| `FloatingButton` | Renders floating button via Portal, positioned using selection `getBoundingClientRect()` |
| `FeedbackDialog` | Dialog with selected text display, feedback textarea, image upload, submit/cancel buttons |
| `ImageUpload` | File picker + clipboard paste + drag-and-drop, image preview with delete |
| `useTextSelection` | Custom hook: listens to mouseup/selectionchange, returns selected text + position |

## Key Implementation Details

- **Portal rendering**: FloatingButton and FeedbackDialog render via `ReactDOM.createPortal` to `document.body`
- **Content area restriction**: Default only listens to selections within `.rspress-doc` container (`contentOnly: true`)
- **Clipboard paste**: Listen to `paste` event on feedback textarea, extract images from `clipboardData.items`
- **Image preview**: Use `URL.createObjectURL()` for local preview URLs
- **SSR compatibility**: All DOM API calls inside `useEffect` to avoid SSR errors
- **Image upload**: Pass raw `File[]` objects through `onSubmit` callback

## Build Strategy

- **Package manager**: pnpm
- **Node entry** (`src/index.ts`): Compiled to CJS via tsup, runs in Rspress build process
- **Client components** (`src/components/`): Kept as TSX source, compiled by Rspress's Rsbuild at build time
- **Published files**: `dist/` (compiled entry) + `src/components/`, `src/hooks/`, `src/styles/`, `src/types.ts` (source)

## Tech Stack

- React + TypeScript + CSS Modules
- tsup for Node-side compilation
- pnpm as package manager
