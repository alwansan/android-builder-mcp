export interface PermissionInfo {
  name: string;
  fullName: string;
  protectionLevel: string;
  group?: string | null;
  description: string;
  minSdk?: number;
  deprecatedIn?: number;
}

export interface PermissionSearchOptions {
  query?: string;
  protectionLevel?: string;
  group?: string;
}

const PERMISSIONS: PermissionInfo[] = [
  { name: "READ_CALENDAR", fullName: "android.permission.READ_CALENDAR", protectionLevel: "dangerous", group: "CALENDAR", description: "Allows an app to read the user's calendar data." },
  { name: "WRITE_CALENDAR", fullName: "android.permission.WRITE_CALENDAR", protectionLevel: "dangerous", group: "CALENDAR", description: "Allows an app to add or modify calendar events." },
  { name: "CAMERA", fullName: "android.permission.CAMERA", protectionLevel: "dangerous", group: "CAMERA", description: "Required to be able to access the camera device." },
  { name: "READ_CONTACTS", fullName: "android.permission.READ_CONTACTS", protectionLevel: "dangerous", group: "CONTACTS", description: "Allows an app to read the user's contacts data." },
  { name: "WRITE_CONTACTS", fullName: "android.permission.WRITE_CONTACTS", protectionLevel: "dangerous", group: "CONTACTS", description: "Allows an app to write the user's contacts data." },
  { name: "GET_ACCOUNTS", fullName: "android.permission.GET_ACCOUNTS", protectionLevel: "dangerous", group: "CONTACTS", description: "Allows access to the list of accounts in the Account Manager." },
  { name: "ACCESS_FINE_LOCATION", fullName: "android.permission.ACCESS_FINE_LOCATION", protectionLevel: "dangerous", group: "LOCATION", description: "Allows an app to access precise location from GPS." },
  { name: "ACCESS_COARSE_LOCATION", fullName: "android.permission.ACCESS_COARSE_LOCATION", protectionLevel: "dangerous", group: "LOCATION", description: "Allows an app to access approximate location from network." },
  { name: "ACCESS_BACKGROUND_LOCATION", fullName: "android.permission.ACCESS_BACKGROUND_LOCATION", protectionLevel: "dangerous", group: "LOCATION", description: "Allows access to location in the background.", minSdk: 29 },
  { name: "RECORD_AUDIO", fullName: "android.permission.RECORD_AUDIO", protectionLevel: "dangerous", group: "MICROPHONE", description: "Allows an app to record audio." },
  { name: "READ_PHONE_STATE", fullName: "android.permission.READ_PHONE_STATE", protectionLevel: "dangerous", group: "PHONE", description: "Allows read only access to phone state." },
  { name: "CALL_PHONE", fullName: "android.permission.CALL_PHONE", protectionLevel: "dangerous", group: "PHONE", description: "Allows an app to initiate a phone call." },
  { name: "READ_CALL_LOG", fullName: "android.permission.READ_CALL_LOG", protectionLevel: "dangerous", group: "PHONE", description: "Allows an app to read the device's call log.", minSdk: 16 },
  { name: "SEND_SMS", fullName: "android.permission.SEND_SMS", protectionLevel: "dangerous", group: "SMS", description: "Allows an app to send SMS messages." },
  { name: "RECEIVE_SMS", fullName: "android.permission.RECEIVE_SMS", protectionLevel: "dangerous", group: "SMS", description: "Allows an app to receive SMS messages." },
  { name: "READ_SMS", fullName: "android.permission.READ_SMS", protectionLevel: "dangerous", group: "SMS", description: "Allows an app to read SMS messages." },
  { name: "READ_EXTERNAL_STORAGE", fullName: "android.permission.READ_EXTERNAL_STORAGE", protectionLevel: "dangerous", group: "STORAGE", description: "Allows an app to read from external storage." },
  { name: "WRITE_EXTERNAL_STORAGE", fullName: "android.permission.WRITE_EXTERNAL_STORAGE", protectionLevel: "dangerous", group: "STORAGE", description: "Allows an app to write to external storage." },
  { name: "READ_MEDIA_IMAGES", fullName: "android.permission.READ_MEDIA_IMAGES", protectionLevel: "dangerous", group: "STORAGE", description: "Allows an app to read images (Android 13+).", minSdk: 33 },
  { name: "READ_MEDIA_VIDEO", fullName: "android.permission.READ_MEDIA_VIDEO", protectionLevel: "dangerous", group: "STORAGE", description: "Allows an app to read video (Android 13+).", minSdk: 33 },
  { name: "READ_MEDIA_AUDIO", fullName: "android.permission.READ_MEDIA_AUDIO", protectionLevel: "dangerous", group: "STORAGE", description: "Allows an app to read audio files (Android 13+).", minSdk: 33 },
  { name: "POST_NOTIFICATIONS", fullName: "android.permission.POST_NOTIFICATIONS", protectionLevel: "dangerous", group: "NOTIFICATIONS", description: "Allows an app to post notifications (Android 13+).", minSdk: 33 },
  { name: "BLUETOOTH_SCAN", fullName: "android.permission.BLUETOOTH_SCAN", protectionLevel: "dangerous", group: "NEARBY_DEVICES", description: "Allows the app to discover and pair nearby Bluetooth devices (Android 12+).", minSdk: 31 },
  { name: "BLUETOOTH_CONNECT", fullName: "android.permission.BLUETOOTH_CONNECT", protectionLevel: "dangerous", group: "NEARBY_DEVICES", description: "Allows the app to connect to paired Bluetooth devices (Android 12+).", minSdk: 31 },
  { name: "BODY_SENSORS", fullName: "android.permission.BODY_SENSORS", protectionLevel: "dangerous", group: "SENSORS", description: "Allows access to data from sensors that monitor the user's vital signs.", minSdk: 20 },
  { name: "ACTIVITY_RECOGNITION", fullName: "android.permission.ACTIVITY_RECOGNITION", protectionLevel: "dangerous", group: "ACTIVITY_RECOGNITION", description: "Allows an app to recognize physical activity.", minSdk: 29 },
  { name: "INTERNET", fullName: "android.permission.INTERNET", protectionLevel: "normal", description: "Allows an app to open network sockets." },
  { name: "ACCESS_NETWORK_STATE", fullName: "android.permission.ACCESS_NETWORK_STATE", protectionLevel: "normal", description: "Allows apps to access information about network state." },
  { name: "ACCESS_WIFI_STATE", fullName: "android.permission.ACCESS_WIFI_STATE", protectionLevel: "normal", description: "Allows apps to access information about Wi-Fi state." },
  { name: "NFC", fullName: "android.permission.NFC", protectionLevel: "normal", description: "Allows applications to perform I/O operations over NFC.", minSdk: 9 },
  { name: "VIBRATE", fullName: "android.permission.VIBRATE", protectionLevel: "normal", description: "Allows access to the vibrator." },
  { name: "WAKE_LOCK", fullName: "android.permission.WAKE_LOCK", protectionLevel: "normal", description: "Allows using PowerManager WakeLocks to keep processor from sleeping." },
  { name: "FOREGROUND_SERVICE", fullName: "android.permission.FOREGROUND_SERVICE", protectionLevel: "normal", description: "Allows a regular application to use Service.startForeground.", minSdk: 28 },
  { name: "SCHEDULE_EXACT_ALARM", fullName: "android.permission.SCHEDULE_EXACT_ALARM", protectionLevel: "normal", description: "Allows an app to schedule exact alarms.", minSdk: 31 },
  { name: "USE_BIOMETRIC", fullName: "android.permission.USE_BIOMETRIC", protectionLevel: "normal", description: "Allows an app to use biometric authentication.", minSdk: 28 },
  { name: "BIND_ACCESSIBILITY_SERVICE", fullName: "android.permission.BIND_ACCESSIBILITY_SERVICE", protectionLevel: "signature", description: "Must be required by an AccessibilityService." },
  { name: "REQUEST_INSTALL_PACKAGES", fullName: "android.permission.REQUEST_INSTALL_PACKAGES", protectionLevel: "signature", description: "Allows an app to request installing packages.", minSdk: 23 },
  { name: "SYSTEM_ALERT_WINDOW", fullName: "android.permission.SYSTEM_ALERT_WINDOW", protectionLevel: "signature", description: "Allows an app to display system-alert windows." },
  { name: "WRITE_SETTINGS", fullName: "android.permission.WRITE_SETTINGS", protectionLevel: "signature", description: "Allows an app to modify system settings." },
  { name: "MANAGE_EXTERNAL_STORAGE", fullName: "android.permission.MANAGE_EXTERNAL_STORAGE", protectionLevel: "signature", description: "Allows an app to manage all files (Android 11+).", minSdk: 30 },
];

export function searchPermissions(options: PermissionSearchOptions): PermissionInfo[] {
  let results = [...PERMISSIONS];
  if (options.query) {
    const q = options.query.toLowerCase();
    results = results.filter(p => p.name.toLowerCase().includes(q) || p.fullName.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }
  if (options.protectionLevel) results = results.filter(p => p.protectionLevel === options.protectionLevel);
  if (options.group) {
    const g = options.group;
    results = results.filter(p => p.group?.toLowerCase() === g.toLowerCase());
  }
  return results;
}
