import React from 'react';
import { createPortal } from 'react-dom';
import styles from '../styles/floating-button.module.css';

interface FloatingButtonProps {
  rect: DOMRect;
  text: string;
  onClick: () => void;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  rect,
  text,
  onClick,
}) => {
  const top = rect.top + window.scrollY - 40;
  const left = rect.left + window.scrollX + rect.width / 2;

  return createPortal(
    <button
      className={styles.floatingButton}
      style={{ top, left }}
      onClick={onClick}
      type="button"
    >
      <svg className={styles.icon} viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm0 15.17L18.83 16H4V4h16v13.17zM7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z" />
      </svg>
      {text}
    </button>,
    document.body,
  );
};
