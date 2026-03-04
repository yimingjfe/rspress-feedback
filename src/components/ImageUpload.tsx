import React, { useRef, useState, useCallback, useEffect } from 'react';
import styles from '../styles/image-upload.module.css';

interface ImageUploadProps {
  images: File[];
  onChange: (images: File[]) => void;
  maxImages: number;
  maxImageSize: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onChange,
  maxImages,
  maxImageSize,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  const validateAndAddFiles = useCallback(
    (files: File[]) => {
      setError('');
      const imageFiles = files.filter((f) => f.type.startsWith('image/'));

      if (imageFiles.length === 0) {
        setError('Please select image files');
        return;
      }

      const oversized = imageFiles.find((f) => f.size > maxImageSize);
      if (oversized) {
        const maxMB = Math.round(maxImageSize / 1024 / 1024);
        setError(`Image size exceeds ${maxMB}MB limit`);
        return;
      }

      const remaining = maxImages - images.length;
      if (remaining <= 0) {
        setError(`Maximum ${maxImages} images allowed`);
        return;
      }

      const toAdd = imageFiles.slice(0, remaining);
      onChange([...images, ...toAdd]);
    },
    [images, onChange, maxImages, maxImageSize],
  );

  const handleClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateAndAddFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        validateAndAddFiles(pastedFiles);
      }
    },
    [validateAndAddFiles],
  );

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleRemove = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div>
      {images.length < maxImages && (
        <div className={styles.uploadArea} onClick={handleClick}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div className={styles.uploadHint}>
            Click to upload or paste screenshot (Ctrl+V)
          </div>
        </div>
      )}

      {error && <div className={styles.errorText}>{error}</div>}

      {previews.length > 0 && (
        <div className={styles.previewList}>
          {previews.map((url, index) => (
            <div key={url} className={styles.previewItem}>
              <img
                src={url}
                alt={`upload-${index}`}
                className={styles.previewImage}
              />
              <button
                className={styles.removeButton}
                onClick={() => handleRemove(index)}
                type="button"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
