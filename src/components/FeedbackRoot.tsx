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
