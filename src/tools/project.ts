import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function createBasicProject(dir: string, pkg: string, appName: string, minSdk: number) {
  const p = pkg.replace(/\./g, "/");
  const src = join(dir, "app", "src", "main");
  const java = join(src, "java", p);
  const layout = join(src, "res", "layout");
  const values = join(src, "res", "values");
  mkdirSync(java, { recursive: true });
  mkdirSync(layout, { recursive: true });
  mkdirSync(values, { recursive: true });

  writeFileSync(join(dir, "settings.gradle.kts"), `rootProject.name = "${appName.replace(/\s+/g, "-")}"\ninclude(":app")\n`);
  writeFileSync(join(dir, "build.gradle.kts"), `plugins {\n    id("com.android.application") version "8.2.0" apply false\n    id("org.jetbrains.kotlin.android") version "1.9.20" apply false\n}\n`);
  writeFileSync(join(src, "AndroidManifest.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android"\n    package="${pkg}">\n    <application android:label="${appName}" android:theme="@style/Theme.AppCompat.Light.DarkActionBar">\n        <activity android:name=".MainActivity" android:exported="true">\n            <intent-filter><action android:name="android.intent.action.MAIN" /><category android:name="android.intent.category.LAUNCHER" /></intent-filter>\n        </activity>\n    </application>\n</manifest>`);
  writeFileSync(join(java, "MainActivity.java"), `package ${pkg};\n\nimport android.os.Bundle;\nimport androidx.appcompat.app.AppCompatActivity;\n\npublic class MainActivity extends AppCompatActivity {\n    @Override\n    protected void onCreate(Bundle savedInstanceState) {\n        super.onCreate(savedInstanceState);\n        setContentView(R.layout.activity_main);\n    }\n}`);
  writeFileSync(join(layout, "activity_main.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"\n    android:layout_width="match_parent" android:layout_height="match_parent"\n    android:gravity="center" android:orientation="vertical">\n    <TextView android:layout_width="wrap_content" android:layout_height="wrap_content"\n        android:text="Hello Android!" android:textSize="24sp" />\n</LinearLayout>`);
  writeFileSync(join(values, "strings.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<resources><string name="app_name">${appName}</string></resources>`);
  writeFileSync(join(values, "themes.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<resources><style name="Theme.AppCompat.Light.DarkActionBar" parent="Theme.AppCompat.Light.DarkActionBar"/></resources>`);
  writeFileSync(join(dir, "gradle.properties"), "org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m\nandroid.useAndroidX=true\n");
  writeFileSync(join(dir, "app", "build.gradle.kts"), `plugins { id("com.android.application") id("org.jetbrains.kotlin.android") version "1.9.20" }\nandroid {\n    namespace = "${pkg}"\n    compileSdk = 34\n    defaultConfig { applicationId = "${pkg}" minSdk = ${minSdk} targetSdk = 34 versionCode = 1 versionName = "1.0" }\n    buildTypes { release { isMinifyEnabled = false proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro") } }\n    compileOptions { sourceCompatibility = JavaVersion.VERSION_17 targetCompatibility = JavaVersion.VERSION_17 }\n}\ndependencies { implementation("androidx.appcompat:appcompat:1.6.1") implementation("com.google.android.material:material:1.11.0") }\n`);
  writeFileSync(join(dir, "app", "proguard-rules.pro"), "# ProGuard\n");
}

export function registerProjectTools(server: McpServer) {
  server.tool(
    "create_android_project",
    "Create a new Android project from a basic template.",
    {
      project_dir: z.string().describe("المسار الكامل لإنشاء المشروع فيه"),
      package_name: z.string().describe("اسم الحزمة مثل com.example.myapp"),
      app_name: z.string().describe("اسم التطبيق"),
      min_sdk: z.number().min(21).max(35).default(26).describe("الحد الأدنى SDK"),
    },
    async ({ project_dir, package_name, app_name, min_sdk }) => {
      if (existsSync(project_dir)) return { content: [{ type: "text", text: "❌ المسار موجود بالفعل." }] };
      mkdirSync(project_dir, { recursive: true });
      createBasicProject(project_dir, package_name, app_name, min_sdk);
      return { content: [{ type: "text", text: `## ✅ تم إنشاء المشروع\n**المسار:** ${project_dir}\n**الحزمة:** ${package_name}\n**Min SDK:** ${min_sdk}` }] };
    }
  );
}
