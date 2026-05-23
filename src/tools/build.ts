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
      project_dir: z.string().describe("Full path to Android project"),
      variant: z.enum(["debug", "release"]).default("debug").describe("debug or release build"),
      clean: z.boolean().default(false).describe("Clean before building"),
      extra_args: z.string().default("").describe("Extra Gradle arguments (space-separated)"),
    },
    async ({ project_dir, variant, clean, extra_args }) => {
      const env = detectEnvironment();
      let warnings: string[] = [];
      if (!env.javaVersion) warnings.push("JDK not installed. Build may fail.");
      if (env.isArm64) {
        const aaptFix = fixAapt2();
        if (aaptFix.success) warnings.push(aaptFix.message);
        ensureGradleProperties();
      }
      const args = extra_args ? extra_args.split(" ").filter(Boolean) : [];
      const result = buildApk(project_dir, variant, clean, args);
      const lines = [
        `## ${result.success ? "Build Succeeded" : "Build Failed"}`,
        "",
        `**Project:** ${project_dir}`,
        `**Variant:** ${variant}`,
        `**Duration:** ${(result.duration / 1000).toFixed(1)}s`,
        "",
      ];
      if (result.success && result.apkPath) {
        try {
          const size = (await import("node:fs")).statSync(result.apkPath).size;
          lines.push(`**APK:** \`${result.apkPath}\``);
          lines.push(`**Size:** ${(size / 1024 / 1024).toFixed(1)} MB`);
        } catch {
          lines.push(`**APK:** \`${result.apkPath}\``);
        }
      }
      if (result.errors.length > 0) {
        lines.push("", "### Errors:", ...result.errors.slice(0, 10).map((e) => `- \`${e}\``));
      }
      if (warnings.length > 0) {
        lines.push("", "### Warnings:", ...warnings.map((w) => `- ${w}`));
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.tool(
    "fix_aapt2",
    "Fix the aapt2 issue on arm64 where Gradle downloads x86-64 aapt2 binaries. Replaces them with the arm64 version.",
    {
      check_only: z.boolean().default(false).describe("Check only, no fix"),
    },
    async ({ check_only }) => {
      const env = detectEnvironment();
      if (check_only) {
        const text = [
          `## aapt2 Check`,
          `**aapt2 path:** ${env.aapt2Path || "not found"}`,
          `**Architecture:** ${env.isArm64 ? "ARM64" : "not ARM64"}`,
        ].join("\n");
        return { content: [{ type: "text", text }] };
      }
      const result = fixAapt2();
      return { content: [{ type: "text", text: result.success ? result.message : `Failed: ${result.message}` }] };
    }
  );

  server.tool(
    "check_environment",
    "Check the Android build environment: JDK, SDK, Gradle, build tools, and architecture.",
    { verbose: z.boolean().default(false).describe("Show additional details") },
    async ({ verbose }) => {
      const env = detectEnvironment();
      const { checkAapt2Fix } = await import("../utils/sdk.js");
      const aaptCheck = checkAapt2Fix();
      const lines = [
        "## Build Environment",
        "",
        `**Architecture:** ${env.isArm64 ? "ARM64" : "Not ARM64"}`,
        `**Environment:** ${env.inProot ? "proot-distro" : "standard"}`,
        `**JDK:** ${env.javaVersion || "Not installed"}`,
        `**JAVA_HOME:** ${env.javaHome || "Not set"}`,
        `**ANDROID_HOME:** ${env.androidHome}`,
        `**Build Tools:** ${env.buildToolsVersion || "Not installed"}`,
        `**aapt2:** ${env.aapt2Path ? "Found" : "Not found"}`,
        `**Gradle:** ${env.gradleVersion || "Not installed"}`,
        "",
        `**aapt2 in Gradle cache:** ${aaptCheck.needsFix ? `${aaptCheck.jars.length} JAR(s) need fix` : "OK"}`,
      ];
      if (verbose && env.buildToolsVersion) {
        const fs = await import("node:fs");
        const btDir = `${env.androidHome}/build-tools/${env.buildToolsVersion}`;
        try {
          const files = fs.readdirSync(btDir);
          lines.push("", "**build-tools files:**", files.map((f: string) => `- ${f}`).join("\n"));
        } catch {}
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
  );

  server.tool(
    "install_sdk",
    "Install or update Android SDK and build tools for arm64 using AndroidIDE tools.",
    {
      sdk_version: z.string().default("34.0.4").describe("Build tools version (e.g., 34.0.4)"),
      install_dir: z.string().default("~/android-sdk").describe("Installation path"),
    },
    async ({ sdk_version, install_dir }) => {
      const arch = (await import("child_process")).execSync("uname -m", { encoding: "utf8" }).trim();
      const isArm = arch === "aarch64" || arch === "arm64" || arch === "armv7l";
      if (!isArm) {
        return { content: [{ type: "text", text: "This command is for ARM64 only." }] };
      }
      const sdkArch = arch === "aarch64" ? "aarch64" : "arm";
      const installPath = install_dir.replace(/^~/, process.env.HOME || "");
      const cmds = [
        `mkdir -p "${installPath}"`,
        `curl -fsSL -o /tmp/build-tools.tar.xz "https://github.com/AndroidIDEOfficial/androidide-tools/releases/download/v${sdk_version}/build-tools-${sdk_version}-${sdkArch}.tar.xz"`,
        `mkdir -p "${installPath}/build-tools/${sdk_version}"`,
        `tar xf /tmp/build-tools.tar.xz -C "${installPath}/build-tools/${sdk_version}" 2>/dev/null`,
        `[ -d "${installPath}/build-tools/${sdk_version}/build-tools" ] && mv "${installPath}/build-tools/${sdk_version}/build-tools/${sdk_version}/"* "${installPath}/build-tools/${sdk_version}/" && rm -rf "${installPath}/build-tools/${sdk_version}/build-tools" || true`,
        `curl -fsSL -o /tmp/platform-tools.tar.xz "https://github.com/AndroidIDEOfficial/androidide-tools/releases/download/v${sdk_version}/platform-tools-${sdk_version}-${sdkArch}.tar.xz"`,
        `tar xf /tmp/platform-tools.tar.xz -C "${installPath}" 2>/dev/null`,
        `rm -f /tmp/build-tools.tar.xz /tmp/platform-tools.tar.xz`,
        `echo "export ANDROID_HOME=${installPath}" >> ~/.bashrc`,
        `echo 'export PATH=\\$ANDROID_HOME/build-tools/${sdk_version}:\\$ANDROID_HOME/platform-tools:\\$PATH' >> ~/.bashrc`,
      ];
      const results: string[] = [];
      for (const cmd of cmds) {
        try {
          (await import("child_process")).execSync(cmd, { encoding: "utf8", timeout: 120000 });
          results.push(`OK: ${cmd.split("\n")[0].substring(0, 60)}...`);
        } catch (e: any) {
          results.push(`FAIL: ${cmd.substring(0, 60)}...`);
        }
      }
      return {
        content: [{
          type: "text",
          text: [
            "## SDK Installation",
            `**Path:** ${installPath}`,
            `**Version:** ${sdk_version}`,
            "",
            ...results,
            "",
            "Restart shell or run: `source ~/.bashrc`",
          ].join("\n"),
        }],
      };
    }
  );
}
