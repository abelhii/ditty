import { showNotice, useNoticeStore } from '@/components/use-notice-store';

jest.mock('@/global.css', () => ({}));

beforeEach(() => useNoticeStore.setState({ current: null }));

describe('showNotice replacement', () => {
  it('replaces a plain Notice with another', () => {
    showNotice('one');
    showNotice('two');
    expect(useNoticeStore.getState().current?.message).toBe('two');
  });

  it('does not let an action-less Notice replace one with an action', () => {
    showNotice('Removed', { label: 'Undo', onPress: () => {} });
    showNotice('Added to Queue');
    expect(useNoticeStore.getState().current?.message).toBe('Removed');
  });

  it('lets a new action Notice replace an older one', () => {
    showNotice('Removed', { label: 'Undo', onPress: () => {} });
    showNotice('Removed again', { label: 'Undo', onPress: () => {} });
    expect(useNoticeStore.getState().current?.message).toBe('Removed again');
  });
});
