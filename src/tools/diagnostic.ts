import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { detectEnvironment, checkAapt2Fix, getRecommendedFix } from "../utils/sdk.js";

export function registerDiagnosticTools(server: McpServer) {
  server.tool(
    "diagnose_build",
    "Analyze build errors and suggest solutions for Android build issues on arm64.",
    { build_log: z.string().describe("نص log البناء") },
    async ({ build_log }) => {
      const env = detectEnvironment();
      const aaptCheck = checkAapt2Fix();
      const diagnoses: string[] = [];
      const suggestions: string[] = [];
      const log = build_log.toLowerCase();

      if (log.includes("exec format error") || (log.includes("aapt2") && log.includes("cannot execute"))) {
        diagnoses.push("🔴 **aapt2 architecture mismatch**");
        suggestions.push("شغّل fix_aapt2 tool لاستبدال aapt2 في Gradle cache");
        suggestions.push("أو اضف android.aapt2FromMavenOverride=/usr/bin/aapt2 في gradle.properties");
      }
      if (log.includes("java_home") || log.includes("jdk") || log.includes("java not found")) {
        diagnoses.push("🔴 **JDK issue**");
        suggestions.push("export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-arm64");
      }
      if (log.includes("out of memory") || log.includes("oom")) {
        diagnoses.push("🟡 **Out of memory**");
        suggestions.push("زد الذاكرة في gradle.properties: org.gradle.jvmargs=-Xmx2048m");
      }
      if (log.includes("plugin") && log.includes("version")) {
        diagnoses.push("🟡 **AGP version**");
        suggestions.push("استخدم AGP 8.2.0 أو أحدث للتوافق مع arm64");
      }

      if (diagnoses.length === 0) diagnoses.push("✅ لم يتم التعرف على مشكلة");
      return { content: [{ type: "text", text: `## 🔍 تشخيص\n\n${diagnoses.join("\n")}\n\n### 💡 الحلول\n${suggestions.map((s, i) => `${i+1}. ${s}`).join("\n")}\n\n**JDK:** ${env.javaVersion || "غير مثبت"}\n**aapt2:** ${env.aapt2Path || "غير موجود"}` }] };
    }
  );

  server.tool(
    "doctor",
    "Full environment health check.",
    {},
    async () => {
      const env = detectEnvironment();
      const aaptCheck = checkAapt2Fix();
      const checks = [
        { n: "JDK", ok: !!env.javaVersion },
        { n: "JAVA_HOME", ok: !!env.javaHome },
        { n: "ANDROID_HOME", ok: !!env.androidHome },
        { n: "Build Tools", ok: !!env.buildToolsVersion },
        { n: "aapt2", ok: !!env.aapt2Path },
        { n: "aapt2 in cache", ok: !aaptCheck.needsFix },
        { n: "Gradle", ok: !!env.gradleVersion },
        { n: "ARM64", ok: env.isArm64 },
      ];
      const ok = checks.filter(c => c.ok).length;
      return { content: [{ type: "text", text: `## 🏥 Doctor\n\n**${ok}/${checks.length}** سليم\n\n${checks.map(c => `| ${c.n} | ${c.ok ? "✅" : "❌"} |`).join("\n")}` }] };
    }
  );
}
