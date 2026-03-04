# rspress-plugin-feedback

An [Rspress](https://rspress.dev) plugin that adds interactive document feedback functionality. When users select text in your documentation, a floating button appears. Clicking it opens a feedback dialog where users can describe issues and attach screenshots.

## Features

- Text selection detection with floating feedback button
- Feedback dialog with selected text context display
- Image upload via file picker or clipboard paste (Ctrl+V)
- Submit feedback to your own API endpoint via HTTP POST
- Dark mode support
- Configurable UI text (i18n friendly)
- Scoped to content area only (`.rspress-doc`)

## Installation

```bash
# npm
npm install rspress-plugin-feedback

# pnpm
pnpm add rspress-plugin-feedback
```

## Usage

```ts
// rspress.config.ts
import { defineConfig } from 'rspress/config';
import { pluginFeedback } from 'rspress-plugin-feedback';

export default defineConfig({
  plugins: [
    pluginFeedback({
      endpoint: '/api/feedback',
    }),
  ],
});
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoint` | `string` | **(required)** | API endpoint to receive feedback (POST) |
| `headers` | `Record<string, string>` | `{}` | Custom HTTP headers (e.g. auth tokens) |
| `buttonText` | `string` | `'反馈'` | Floating button label |
| `dialogTitle` | `string` | `'提交反馈'` | Dialog title |
| `placeholder` | `string` | `'请描述你的反馈...'` | Textarea placeholder |
| `maxImages` | `number` | `5` | Max number of images allowed |
| `maxImageSize` | `number` | `5242880` (5 MB) | Max size per image in bytes |
| `contentOnly` | `boolean` | `true` | Only enable in `.rspress-doc` content area |

## API Endpoint

The plugin sends a `POST` request with `multipart/form-data`:

| Field | Type | Description |
|-------|------|-------------|
| `selectedText` | `string` | The text the user selected |
| `pagePath` | `string` | Current page path (e.g. `/guide`) |
| `content` | `string` | User's feedback message |
| `images` | `File[]` | Attached screenshot files |

**Example response:**

```json
// Success (2xx)
{ "ok": true }

// Error (4xx/5xx)
{ "message": "Error description" }
```

## Development

```bash
# Install dependencies
pnpm install

# Build the plugin
pnpm build

# Watch mode
pnpm dev

# Run the example site
pnpm example:dev

# Run E2E tests
pnpm test
```
