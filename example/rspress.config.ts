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
