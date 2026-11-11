/** True when a download should be refused: Wi-Fi-only is on and the device is on cellular.
 *  `type` is expo-network's `NetworkStateType` string value ('CELLULAR', 'WIFI', ...); an unknown or
 *  missing type is not blocked — only an explicit cellular reading is. */
export function isBlockedByWifiOnly(wifiOnly: boolean, type: string | undefined): boolean {
  return wifiOnly && type === 'CELLULAR';
}
