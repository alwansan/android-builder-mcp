export interface PermissionInfo {
  name: string;
  fullName: string;
  protectionLevel: string;
  group: string | null;
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
  { name: "READ_CALENDAR", fullName: "android.permission.READ_CALENDAR", protectionLevel: "dangerous", group: "CALENDAR", description: "يسمح للتطبيق بقراءة أحداث التقويم المخزنة على الجهاز." },
  { name: "WRITE_CALENDAR", fullName: "android.permission.WRITE_CALENDAR", protectionLevel: "dangerous", group: "CALENDAR", description: "يسمح للتطبيق بإضافة أو تعديل أحداث التقويم." },
  { name: "CAMERA", fullName: "android.permission.CAMERA", protectionLevel: "dangerous", group: "CAMERA", description: "يسمح بالوصول إلى الكاميرا لالتقاط الصور والفيديو." },
  { name: "READ_CONTACTS", fullName: "android.permission.READ_CONTACTS", protectionLevel: "dangerous", group: "CONTACTS", description: "يسمح بقراءة جهات الاتصال المخزنة." },
  { name: "WRITE_CONTACTS", fullName: "android.permission.WRITE_CONTACTS", protectionLevel: "dangerous", group: "CONTACTS", description: "يسمح بإنشاء أو تعديل جهات الاتصال." },
  { name: "GET_ACCOUNTS", fullName: "android.permission.GET_ACCOUNTS", protectionLevel: "dangerous", group: "CONTACTS", description: "يسمح بالوصول إلى قائمة الحسابات في Account Manager." },
  { name: "ACCESS_FINE_LOCATION", fullName: "android.permission.ACCESS_FINE_LOCATION", protectionLevel: "dangerous", group: "LOCATION", description: "يسمح بالوصول إلى الموقع الدقيق عبر GPS." },
  { name: "ACCESS_COARSE_LOCATION", fullName: "android.permission.ACCESS_COARSE_LOCATION", protectionLevel: "dangerous", group: "LOCATION", description: "يسمح بالوصول إلى الموقع التقريبي عبر الشبكة." },
  { name: "ACCESS_BACKGROUND_LOCATION", fullName: "android.permission.ACCESS_BACKGROUND_LOCATION", protectionLevel: "dangerous", group: "LOCATION", description: "يسمح بالوصول إلى الموقع في الخلفية.", minSdk: 29 },
  { name: "RECORD_AUDIO", fullName: "android.permission.RECORD_AUDIO", protectionLevel: "dangerous", group: "MICROPHONE", description: "يسمح للتطبيق بتسجيل الصوت." },
  { name: "READ_PHONE_STATE", fullName: "android.permission.READ_PHONE_STATE", protectionLevel: "dangerous", group: "PHONE", description: "يسمح بقراءة حالة الهاتف." },
  { name: "CALL_PHONE", fullName: "android.permission.CALL_PHONE", protectionLevel: "dangerous", group: "PHONE", description: "يسمح بإجراء مكالمات هاتفية." },
  { name: "READ_CALL_LOG", fullName: "android.permission.READ_CALL_LOG", protectionLevel: "dangerous", group: "PHONE", description: "يسمح بقراءة سجل المكالمات.", minSdk: 16 },
  { name: "SEND_SMS", fullName: "android.permission.SEND_SMS", protectionLevel: "dangerous", group: "SMS", description: "يسمح بإرسال الرسائل النصية (SMS)." },
  { name: "RECEIVE_SMS", fullName: "android.permission.RECEIVE_SMS", protectionLevel: "dangerous", group: "SMS", description: "يسمح باستقبال الرسائل النصية (SMS)." },
  { name: "READ_SMS", fullName: "android.permission.READ_SMS", protectionLevel: "dangerous", group: "SMS", description: "يسمح بقراءة الرسائل النصية (SMS)." },
  { name: "READ_EXTERNAL_STORAGE", fullName: "android.permission.READ_EXTERNAL_STORAGE", protectionLevel: "dangerous", group: "STORAGE", description: "يسمح بقراءة الملفات من التخزين الخارجي." },
  { name: "WRITE_EXTERNAL_STORAGE", fullName: "android.permission.WRITE_EXTERNAL_STORAGE", protectionLevel: "dangerous", group: "STORAGE", description: "يسمح بكتابة الملفات على التخزين الخارجي." },
  { name: "READ_MEDIA_IMAGES", fullName: "android.permission.READ_MEDIA_IMAGES", protectionLevel: "dangerous", group: "STORAGE", description: "يسمح بقراءة الصور (Android 13+).", minSdk: 33 },
  { name: "READ_MEDIA_VIDEO", fullName: "android.permission.READ_MEDIA_VIDEO", protectionLevel: "dangerous", group: "STORAGE", description: "يسمح بقراءة الفيديو (Android 13+).", minSdk: 33 },
  { name: "READ_MEDIA_AUDIO", fullName: "android.permission.READ_MEDIA_AUDIO", protectionLevel: "dangerous", group: "STORAGE", description: "يسمح بقراءة الملفات الصوتية (Android 13+).", minSdk: 33 },
  { name: "POST_NOTIFICATIONS", fullName: "android.permission.POST_NOTIFICATIONS", protectionLevel: "dangerous", group: "NOTIFICATIONS", description: "يسمح بنشر الإشعارات (Android 13+).", minSdk: 33 },
  { name: "BLUETOOTH_SCAN", fullName: "android.permission.BLUETOOTH_SCAN", protectionLevel: "dangerous", group: "NEARBY_DEVICES", description: "يسمح بمسح Bluetooth (Android 12+).", minSdk: 31 },
  { name: "BLUETOOTH_CONNECT", fullName: "android.permission.BLUETOOTH_CONNECT", protectionLevel: "dangerous", group: "NEARBY_DEVICES", description: "يسمح بالاتصال Bluetooth (Android 12+).", minSdk: 31 },
  { name: "BODY_SENSORS", fullName: "android.permission.BODY_SENSORS", protectionLevel: "dangerous", group: "SENSORS", description: "يسمح بالوصول إلى بيانات المستشعرات الحيوية.", minSdk: 20 },
  { name: "ACTIVITY_RECOGNITION", fullName: "android.permission.ACTIVITY_RECOGNITION", protectionLevel: "dangerous", group: "ACTIVITY_RECOGNITION", description: "يسمح بالتعرف على النشاط البدني.", minSdk: 29 },
  { name: "INTERNET", fullName: "android.permission.INTERNET", protectionLevel: "normal", description: "يسمح بالاتصال بالإنترنت." },
  { name: "ACCESS_NETWORK_STATE", fullName: "android.permission.ACCESS_NETWORK_STATE", protectionLevel: "normal", description: "يسمح بالوصول إلى معلومات حالة الشبكة." },
  { name: "ACCESS_WIFI_STATE", fullName: "android.permission.ACCESS_WIFI_STATE", protectionLevel: "normal", description: "يسمح بالوصول إلى معلومات حالة Wi-Fi." },
  { name: "NFC", fullName: "android.permission.NFC", protectionLevel: "normal", description: "يسمح بعمليات NFC.", minSdk: 9 },
  { name: "VIBRATE", fullName: "android.permission.VIBRATE", protectionLevel: "normal", description: "يسمح بالتحكم في الاهتزاز." },
  { name: "WAKE_LOCK", fullName: "android.permission.WAKE_LOCK", protectionLevel: "normal", description: "يسمح بمنع الجهاز من الدخول في وضع السكون." },
  { name: "FOREGROUND_SERVICE", fullName: "android.permission.FOREGROUND_SERVICE", protectionLevel: "normal", description: "يسمح بتشغيل خدمة أمامية.", minSdk: 28 },
  { name: "SCHEDULE_EXACT_ALARM", fullName: "android.permission.SCHEDULE_EXACT_ALARM", protectionLevel: "normal", description: "يسمح بجدولة إنذار دقيق.", minSdk: 31 },
  { name: "USE_BIOMETRIC", fullName: "android.permission.USE_BIOMETRIC", protectionLevel: "normal", description: "يسمح باستخدام المصادقة البيومترية.", minSdk: 28 },
  { name: "BIND_ACCESSIBILITY_SERVICE", fullName: "android.permission.BIND_ACCESSIBILITY_SERVICE", protectionLevel: "signature", description: "يسمح بربط خدمة إمكانية الوصول." },
  { name: "REQUEST_INSTALL_PACKAGES", fullName: "android.permission.REQUEST_INSTALL_PACKAGES", protectionLevel: "signature", description: "يسمح بطلب تثبيت حزم.", minSdk: 23 },
  { name: "SYSTEM_ALERT_WINDOW", fullName: "android.permission.SYSTEM_ALERT_WINDOW", protectionLevel: "signature", description: "يسمح بعرض نوافذ منبثقة فوق التطبيقات." },
  { name: "WRITE_SETTINGS", fullName: "android.permission.WRITE_SETTINGS", protectionLevel: "signature", description: "يسمح بتعديل إعدادات النظام." },
  { name: "MANAGE_EXTERNAL_STORAGE", fullName: "android.permission.MANAGE_EXTERNAL_STORAGE", protectionLevel: "signature", description: "يسمح بإدارة جميع الملفات (Android 11+).", minSdk: 30 },
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
