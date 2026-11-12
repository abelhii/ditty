import { showConfirmation, showNotice, useNoticeStore } from '@/components/use-notice-store';

jest.mock('@/global.css', () => ({}));

const message = () => useNoticeStore.getState().current?.message;

beforeEach(() => useNoticeStore.setState({ current: null }));

describe('Notice replacement', () => {
  it('replaces a plain Notice with another', () => {
    showNotice('one');
    showNotice('two');
    expect(message()).toBe('two');
  });

  it('lets a failure Notice replace an Undo Notice', () => {
    showNotice('Removed', { label: 'Undo', onPress: () => {} });
    showNotice("Couldn't favourite this.");
    expect(message()).toBe("Couldn't favourite this.");
  });

  it('lets a new action Notice replace an older one', () => {
    showNotice('Removed', { label: 'Undo', onPress: () => {} });
    showNotice('Removed again', { label: 'Undo', onPress: () => {} });
    expect(message()).toBe('Removed again');
  });
});

describe('showConfirmation', () => {
  it('shows when nothing carries an action', () => {
    showNotice('one');
    showConfirmation('Added to Queue');
    expect(message()).toBe('Added to Queue');
  });

  it('is dropped while an Undo Notice is showing', () => {
    showNotice('Removed', { label: 'Undo', onPress: () => {} });
    showConfirmation('Added to Queue');
    expect(message()).toBe('Removed');
  });
});
