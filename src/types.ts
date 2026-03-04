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
