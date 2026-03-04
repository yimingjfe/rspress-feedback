import { useState, useEffect, useCallback } from 'react';

export interface SelectionInfo {
  text: string;
  rect: DOMRect;
}

export function useTextSelection(contentOnly: boolean): SelectionInfo | null {
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);

  const isInContentArea = useCallback(
    (node: Node): boolean => {
      if (!contentOnly) return true;
      let current: Node | null = node;
      while (current) {
        if (
          current instanceof HTMLElement &&
          current.classList.contains('rspress-doc')
        ) {
          return true;
        }
        current = current.parentNode;
      }
      return false;
    },
    [contentOnly],
  );

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      setSelectionInfo(null);
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      setSelectionInfo(null);
      return;
    }

    if (!isInContentArea(selection.anchorNode!)) {
      setSelectionInfo(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectionInfo({ text, rect });
  }, [isInContentArea]);

  useEffect(() => {
    const handleMouseUp = () => {
      // Delay to let the browser finalize selection
      setTimeout(handleSelectionChange, 10);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  return selectionInfo;
}
