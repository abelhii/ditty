import { useEffect, type ReactNode } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';

import { SidebarWidth } from '@/constants/theme';
import { useIsWideLayout } from '@/hooks/use-is-wide-layout';

type PlayerOverlayProps = {
  /** Called on Escape (web). */
  onRequestClose: () => void;
  children: ReactNode;
};

/**
 * Hosts a full-screen player overlay (full player, Queue). On web it renders inside a transparent
 * `Modal`, as TrackActionsMenu does: react-native-web's Modal closes on Escape, keeps Tab focus
 * inside the overlay, marks it `aria-modal`, and stacks a later overlay (the Queue) above an
 * earlier one so only the top one reacts. On native the overlay stays a plain in-tree view above
 * the tabs. On the wide layout it is a plain view over the content pane instead, so the sidebar
 * stays visible and usable; Escape is handled with a key listener since there is no Modal.
 */
export function PlayerOverlay({ onRequestClose, children }: PlayerOverlayProps) {
  const wide = useIsWideLayout();

  useEffect(() => {
    if (!wide) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onRequestClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [wide, onRequestClose]);

  if (wide) return <View style={styles.pane}>{children}</View>;
  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <Modal transparent visible onRequestClose={onRequestClose}>
      {children}
    </Modal>
  );
}

const styles = StyleSheet.create({
  pane: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    left: SidebarWidth,
  },
});
