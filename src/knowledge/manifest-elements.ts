export interface ManifestElement { name: string; description: string; parent: string | null; required: boolean; }
const ELEMENTS: ManifestElement[] = [
  { name: "manifest", description: "العنصر الجذر لملف AndroidManifest.xml. يجب أن يحتوي على <application>.", parent: null, required: true },
  { name: "application", description: "يعرّف التطبيق. يحتوي على المكونات (activities, services, receivers, providers).", parent: "manifest", required: true },
  { name: "activity", description: "يعرّف نشاطاً (شاشة) في التطبيق.", parent: "application", required: false },
  { name: "service", description: "يعرّف خدمة تعمل في الخلفية بدون واجهة مستخدم.", parent: "application", required: false },
  { name: "receiver", description: "مستقبل البث الذي يستجيب لرسائل البث.", parent: "application", required: false },
  { name: "provider", description: "مزود المحتوى لإدارة ومشاركة بيانات التطبيق.", parent: "application", required: false },
  { name: "uses-permission", description: "يطلب إذناً معيناً من النظام.", parent: "manifest", required: false },
  { name: "uses-feature", description: "يعلن أن التطبيق يحتاج لميزة أجهزة أو برامج معينة.", parent: "manifest", required: false },
  { name: "intent-filter", description: "يحدد أنواع النوايا التي يمكن للمكون استقبالها.", parent: "activity, service, receiver", required: false },
  { name: "meta-data", description: "بيانات إضافية على شكل أزواج اسم-قيمة.", parent: "application, activity, service, receiver, provider", required: false },
];
export function getManifestElements(): ManifestElement[] { return ELEMENTS; }
