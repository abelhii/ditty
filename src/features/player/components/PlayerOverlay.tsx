import type { ReactNode } from 'react';
import { Modal, Platform } from 'react-native';

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
 * the tabs.
 */
export function PlayerOverlay({ onRequestClose, children }: PlayerOverlayProps) {
  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <Modal transparent visible onRequestClose={onRequestClose}>
      {children}
    </Modal>
  );
}
