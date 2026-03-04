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
