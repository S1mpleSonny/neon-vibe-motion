import { useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';

export function useKeyboardShortcuts() {
  const {
    currentMotion,
    isPlaying,
    setIsPlaying,
    openSettings,
    openExportDialog,
  } = useAppStore();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      switch (event.code) {
        case 'Space':
          // Space: Play/Pause
          if (currentMotion) {
            event.preventDefault();
            setIsPlaying(!isPlaying);
          }
          break;

        case 'KeyE':
          // E: Export (with Cmd/Ctrl)
          if ((event.metaKey || event.ctrlKey) && currentMotion) {
            event.preventDefault();
            openExportDialog();
          }
          break;

        case 'Comma':
          // Cmd/Ctrl + ,: Settings
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            openSettings();
          }
          break;

        default:
          break;
      }
    },
    [currentMotion, isPlaying, setIsPlaying, openSettings, openExportDialog]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
