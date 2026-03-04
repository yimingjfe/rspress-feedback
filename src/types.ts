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
