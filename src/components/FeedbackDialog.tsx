import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ImageUpload } from './ImageUpload';
import type { FeedbackPluginOptions } from '../types';
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
    endpoint,
    headers,
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

    const formData = new FormData();
    formData.append('selectedText', selectedText);
    formData.append('pagePath', window.location.pathname);
    formData.append('content', content.trim());
    images.forEach((file) => formData.append('images', file));

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { ...headers },
        body: formData,
      });

      if (!res.ok) {
        const errMsg = await res
          .json()
          .then((j) => j.message)
          .catch(() => res.statusText);
        throw new Error(errMsg);
      }

      setStatus('success');
      setTimeout(onClose, 1500);
    } catch (err) {
      setStatus('error');
      setErrorMsg(
        err instanceof Error ? err.message : 'Submission failed',
      );
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
