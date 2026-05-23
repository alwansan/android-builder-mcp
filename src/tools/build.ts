import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildApk, ensureGradleProperties } from "../utils/gradle.js";
import { detectEnvironment } from "../utils/sdk.js";
import { fixAapt2 } from "../utils/aapt.js";

export function registerBuildTools(server: McpServer) {
  server.tool(
    "build_apk",
    "Build an Android APK from a Gradle project. Supports debug/release variants with optional clean build.",
    {
      project_dir: z.string().describe("المسار الكامل لمشروع Android"),
      variant: z.enum(["debug", "release"]).default("debug").describe("نوع البناء: debug أو release"),
      clean: z.boolean().default(false).describe("مسح البناء السابق قبل البناء"),
      extra_args: z.string().default("").describe("وسائط إضافية لـ Gradle"),
    },
    async ({ project_dir, variant, clean, extra_args }) => {
      const env = detectEnvironment();
      let warnings: string[] = [];
      if (!env.javaVersion) warnings.push("JDK غير مثبت. قد يفشل البناء.");
      if (env.isArm64) {
        const aaptFix = fixAapt2();
        if (aaptFix.success) warnings.push(aaptFix.message);
        ensureGradleProperties();
      }
      const args = extra_args ? extra_args.split(" ").filter(Boolean) : [];
      const result = buildApk(project_dir, variant, clean, args);
      const lines = [
        `## ${result.success ? "✅ نجح البناء" : "❌ فشل البناء"}`,
        "",
        `**المشروع:** ${project_dir}`,
        `**النوع:** ${variant}`,
        `**المدة:** ${(result.duration / 1000).toFixed(1)} ثانية`,
        "",
      ];
      if (result.success && result.apkPath) {
        try {
          const { statSync } = await import("node:fs");
          const size = statSync(result.apkPath).size;
          lines.push(`**APK:** \`${result.apkPath}\``);
          lines.push(`**الحجم:** ${(size / 1024 / 1024).toFixed(1)} MB`);
        } catch {
          lines.push(`**APK:** \`${result.apkPath}\``);
        }
      }
      if (result.errors.length > 0) {
        lines.push("", "### ❌ الأخطاء:", ...result.errors.slice(0, 10).map((e) => `- \`${e}\``));
      }
      if (warnings.length > 0) {
        lines.push("", "### ⚠️ تحذيرات:", ...warnings.map((w) => `- ${w}`));
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.tool(
    "fix_aapt2",
    "Fix the aapt2 issue on arm64 where Gradle downloads x86-64 aapt2 binaries.",
    {
      check_only: z.boolean().default(false).describe("فحص فقط بدون إصلاح"),
    },
    async ({ check_only }) => {
      const env = detectEnvironment();
      if (check_only) {
        return { content: [{ type: "text", text: `## 🔍 فحص aapt2\n**aapt2 مسار:** ${env.aapt2Path || "غير موجود"}\n**المعمارية:** ${env.isArm64 ? "ARM64 ✅" : "ليست ARM64"}` }] };
      }
      const result = fixAapt2();
      return { content: [{ type: "text", text: result.success ? `✅ ${result.message}` : `❌ ${result.message}` }] };
    }
  );

  server.tool(
    "check_environment",
    "Check the Android build environment: JDK, SDK, Gradle, build tools, and architecture.",
    { verbose: z.boolean().default(false).describe("عرض تفاصيل إضافية") },
    async ({ verbose }) => {
      const env = detectEnvironment();
      const aaptCheck = (await import("../utils/sdk.js")).checkAapt2Fix();
      const lines = [
        "## 🔧 بيئة البناء",
        `**المعمارية:** ${env.isArm64 ? "ARM64 ✅" : "⚠️ غير ARM64"}`,
        `**البيئة:** ${env.inProot ? "proot-distro" : "عادية"}`,
        `**JDK:** ${env.javaVersion || "غير مثبت ❌"}`,
        `**JAVA_HOME:** ${env.javaHome || "غير معرف ❌"}`,
        `**ANDROID_HOME:** ${env.androidHome}`,
        `**Build Tools:** ${env.buildToolsVersion || "غير مثبت ❌"}`,
        `**aapt2:** ${env.aapt2Path ? "موجود ✅" : "غير موجود ❌"}`,
        `**Gradle:** ${env.gradleVersion || "غير مثبت ❌"}`,
        `**aapt2 في Gradle cache:** ${aaptCheck.needsFix ? `${aaptCheck.jars.length} JAR بحاجة للإصلاح` : "سليم ✅"}`,
      ];
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.tool(
    "install_sdk",
    "Install Android SDK and build tools for arm64 using AndroidIDE tools.",
    {
      sdk_version: z.string().default("34.0.4"),
      install_dir: z.string().default("~/android-sdk"),
    },
    async ({ sdk_version, install_dir }) => {
      const arch = (await import("child_process")).execSync("uname -m", { encoding: "utf8" }).trim();
      const isArm = arch === "aarch64" || arch === "arm64";
      if (!isArm) return { content: [{ type: "text", text: "❌ هذا الأمر مخصص للـ ARM64 فقط." }] };
      const sdkArch = arch === "aarch64" ? "aarch64" : "arm";
      const installPath = install_dir.replace(/^~/, process.env.HOME || "");
      const { execSync } = await import("child_process");
      const cmds = [
        `mkdir -p "${installPath}"`,
        `curl -L -o /tmp/bt.tar.xz "https://github.com/AndroidIDEOfficial/androidide-tools/releases/download/v${sdk_version}/build-tools-${sdk_version}-${sdkArch}.tar.xz"`,
        `mkdir -p "${installPath}/build-tools/${sdk_version}"`,
        `tar xf /tmp/bt.tar.xz -C "${installPath}/build-tools/${sdk_version}"`,
        `curl -L -o /tmp/pt.tar.xz "https://github.com/AndroidIDEOfficial/androidide-tools/releases/download/v${sdk_version}/platform-tools-${sdk_version}-${sdkArch}.tar.xz"`,
        `tar xf /tmp/pt.tar.xz -C "${installPath}"`,
        `rm -f /tmp/bt.tar.xz /tmp/pt.tar.xz`,
      ];
      const results = cmds.map(c => { try { execSync(c, { timeout: 120000 }); return `✅ ${c.substring(0, 50)}...`; } catch { return `❌ ${c.substring(0, 50)}...`; } }).join("\n");
      return { content: [{ type: "text", text: `## 📦 تثبيت SDK\n**الموقع:** ${installPath}\n**الإصدار:** ${sdk_version}\n\n${results}` }] };
    }
  );
}
