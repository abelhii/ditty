import { isBlockedByWifiOnly } from '@/features/downloads/wifi-only';

describe('isBlockedByWifiOnly', () => {
  it('blocks cellular when Wi-Fi only is on', () => {
    expect(isBlockedByWifiOnly(true, 'CELLULAR')).toBe(true);
  });

  it('allows cellular when Wi-Fi only is off', () => {
    expect(isBlockedByWifiOnly(false, 'CELLULAR')).toBe(false);
  });

  it('allows wifi, ethernet, and unknown or missing readings', () => {
    expect(isBlockedByWifiOnly(true, 'WIFI')).toBe(false);
    expect(isBlockedByWifiOnly(true, 'ETHERNET')).toBe(false);
    expect(isBlockedByWifiOnly(true, 'UNKNOWN')).toBe(false);
    expect(isBlockedByWifiOnly(true, undefined)).toBe(false);
  });
});
