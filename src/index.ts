import { RspressPlugin } from '@rspress/shared';
import path from 'path';
import { FeedbackPluginOptions } from './types';

export type { FeedbackPluginOptions } from './types';

export function pluginFeedback(options: FeedbackPluginOptions): RspressPlugin {
  return {
    name: 'rspress-plugin-feedback',
    globalUIComponents: [
      [path.join(__dirname, '../src/components/FeedbackRoot.tsx'), options],
    ],
    globalStyles: path.join(__dirname, '../src/styles/global.css'),
  };
}
