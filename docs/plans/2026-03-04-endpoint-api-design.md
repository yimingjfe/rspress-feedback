# Endpoint API Design: Replace onSubmit with endpoint

## Problem

Rspress serializes `globalUIComponents` props via `JSON.stringify()`, which drops function values. The current `onSubmit` callback requires a `window.__feedbackOnSubmit__` hack to work at runtime. This is fragile and not idiomatic for the Rspress ecosystem.

## Decision

Replace the `onSubmit: (data) => Promise<void>` callback with a serializable `endpoint: string` + optional `headers: Record<string, string>`. The plugin handles HTTP submission internally.

## Plugin Options

```typescript
interface FeedbackPluginOptions {
  /** POST endpoint URL for feedback submission */
  endpoint: string;
  /** Custom request headers (e.g. Authorization, X-API-Key) */
  headers?: Record<string, string>;
  /** Dialog title. Default: "提交反馈" */
  dialogTitle?: string;
  /** Textarea placeholder */
  placeholder?: string;
  /** Max images. Default: 5 */
  maxImages?: number;
  /** Max single image size in bytes. Default: 5MB */
  maxImageSize?: number;
  /** Floating button text. Default: "反馈" */
  buttonText?: string;
  /** Only enable in .rspress-doc area. Default: true */
  contentOnly?: boolean;
}
```

## Usage

```typescript
pluginFeedback({
  endpoint: '/api/feedback',
  headers: { 'X-API-Key': 'my-secret-key' },
  buttonText: '反馈',
})
```

## Request Format

```
POST {endpoint}
Content-Type: multipart/form-data
{...headers}

FormData fields:
  - selectedText: string
  - pagePath: string
  - content: string
  - images: File (repeated, 0~N files)
```

## Response Handling

- **2xx** → Success. Show success message, auto-close dialog after 1.5s.
- **Non-2xx** → Failure. Read error from `response.json().message`, fallback to `response.statusText`.
- **Network error** → Display "Network error, please try again".

## Internal Implementation (FeedbackDialog.handleSubmit)

```typescript
const formData = new FormData();
formData.append('selectedText', selectedText);
formData.append('pagePath', window.location.pathname);
formData.append('content', content.trim());
images.forEach(file => formData.append('images', file));

const res = await fetch(endpoint, {
  method: 'POST',
  headers: { ...headers },  // Do not set Content-Type; let browser add boundary
  body: formData,
});

if (!res.ok) {
  const errMsg = await res.json().then(j => j.message).catch(() => res.statusText);
  throw new Error(errMsg);
}
```

## Files Affected

| File | Change |
|------|--------|
| `src/types.ts` | Remove `onSubmit`, add `endpoint` + `headers` |
| `src/components/FeedbackDialog.tsx` | Replace `onSubmit(data)` with `fetch()` logic |
| `src/components/FeedbackRoot.tsx` | Remove `window.__feedbackOnSubmit__` fallback, pass `endpoint`/`headers` |
| `example/rspress.config.ts` | Change config to use `endpoint` |
| `e2e/helpers.ts` | Replace `installMockOnSubmit` with mock server or route intercept |
| `e2e/*.spec.ts` | Update tests for new submission flow |
