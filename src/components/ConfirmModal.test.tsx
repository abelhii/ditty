import { fireEvent, render, screen } from '@testing-library/react-native';

import { ConfirmModal } from '@/components/ConfirmModal';

jest.mock('@/global.css', () => ({}));

function setup(visible = true) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  return {
    onConfirm,
    onCancel,
    ui: (
      <ConfirmModal
        visible={visible}
        title="Delete playlist?"
        message="Gone for good."
        confirmLabel="Delete"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    ),
  };
}

describe('ConfirmModal', () => {
  it('shows the title and message and fires nothing until a button is pressed', async () => {
    const { ui, onConfirm, onCancel } = setup();
    await render(ui);

    expect(screen.getByText('Delete playlist?')).toBeTruthy();
    expect(screen.getByText('Gone for good.')).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('confirms with the confirm label', async () => {
    const { ui, onConfirm, onCancel } = setup();
    await render(ui);

    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('cancels with Cancel', async () => {
    const { ui, onConfirm, onCancel } = setup();
    await render(ui);

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders nothing when not visible', async () => {
    const { ui } = setup(false);
    await render(ui);

    expect(screen.queryByText('Delete playlist?')).toBeNull();
  });
});
