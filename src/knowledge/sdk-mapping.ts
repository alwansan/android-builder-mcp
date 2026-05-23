export interface SdkInfo { apiLevel: number; version: string; codename: string; buildTools?: string; }
const SDK_MAP: SdkInfo[] = [
  { apiLevel: 35, version: "Android 15", codename: "VanillaIceCream", buildTools: "35.0.0" },
  { apiLevel: 34, version: "Android 14", codename: "UpsideDownCake", buildTools: "34.0.4" },
  { apiLevel: 33, version: "Android 13", codename: "Tiramisu", buildTools: "33.0.3" },
  { apiLevel: 32, version: "Android 12L", codename: "SnowConeV2", buildTools: "32.1.0" },
  { apiLevel: 31, version: "Android 12", codename: "SnowCone", buildTools: "31.0.0" },
  { apiLevel: 30, version: "Android 11", codename: "RedVelvetCake", buildTools: "30.0.3" },
  { apiLevel: 29, version: "Android 10", codename: "QueenCake", buildTools: "29.0.3" },
  { apiLevel: 28, version: "Android 9", codename: "Pie", buildTools: "28.0.3" },
  { apiLevel: 27, version: "Android 8.1", codename: "Oreo", buildTools: "27.0.3" },
  { apiLevel: 26, version: "Android 8.0", codename: "Oreo", buildTools: "26.0.3" },
  { apiLevel: 25, version: "Android 7.1", codename: "NougatMR1", buildTools: "25.0.3" },
  { apiLevel: 24, version: "Android 7.0", codename: "Nougat", buildTools: "24.0.3" },
  { apiLevel: 23, version: "Android 6.0", codename: "Marshmallow", buildTools: "23.0.3" },
  { apiLevel: 22, version: "Android 5.1", codename: "LollipopMR1", buildTools: "22.0.1" },
  { apiLevel: 21, version: "Android 5.0", codename: "Lollipop", buildTools: "21.1.2" },
  { apiLevel: 19, version: "Android 4.4", codename: "KitKat", buildTools: "19.1.0" },
  { apiLevel: 16, version: "Android 4.1", codename: "JellyBean", buildTools: "16.0.1" },
];
export function getSdkMapping(): SdkInfo[] { return SDK_MAP; }
