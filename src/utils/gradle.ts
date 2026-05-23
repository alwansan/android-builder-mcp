import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface BuildResult { success: boolean; apkPath: string | null; output: string; duration: number; errors: string[]; }

export function buildApk(projectDir: string, variant: string = "debug", clean: boolean = false, extraArgs: string[] = []): BuildResult {
  const start = Date.now();
  const gw = join(projectDir, "gradlew");
  if (!existsSync(gw)) return { success: false, apkPath: null, output: "gradlew غير موجود.", duration: 0, errors: ["gradlew not found"] };
  const javaHome = process.env.JAVA_HOME || "/usr/lib/jvm/java-17-openjdk-arm64";
  const task = variant === "release" ? "assembleRelease" : "assembleDebug";
  const cmd = `JAVA_HOME="${javaHome}" ANDROID_HOME="${process.env.ANDROID_HOME || ""}" bash "${gw}" ${clean ? "clean " : ""}${task} --no-daemon 2>&1`;
  try {
    const output = execSync(cmd, { cwd: projectDir, encoding: "utf8", timeout: 600000 });
    const apks = findBuiltApks(projectDir, variant);
    return { success: apks.length > 0, apkPath: apks[0] || null, output, duration: Date.now() - start, errors: [] };
  } catch (e: any) {
    const output = e.stdout || e.stderr || e.message || "Build failed";
    return { success: false, apkPath: null, output, duration: Date.now() - start, errors: [output.substring(0, 500)] };
  }
}

export function findBuiltApks(projectDir: string, variant: string): string[] {
  const dir = join(projectDir, "app", "build", "outputs", "apk", variant === "release" ? "release" : "debug");
  if (!existsSync(dir)) return [];
  try { return execSync(`ls "${dir}"/*.apk 2>/dev/null || true`, { encoding: "utf8" }).trim().split("\n").filter(Boolean); } catch { return []; }
}

export function ensureGradleProperties(): void {
  const path = join(process.env.HOME || "", ".gradle", "gradle.properties");
  const dir = join(process.env.HOME || "", ".gradle");
  if (!existsSync(dir)) execSync(`mkdir -p "${dir}"`);
  let content = "";
  if (existsSync(path)) content = readFileSync(path, "utf8");
  if (!content.includes("android.aapt2FromMavenOverride")) {
    content += `\nandroid.aapt2FromMavenOverride=${execSync("which aapt2 2>/dev/null || echo /usr/bin/aapt2", { encoding: "utf8" }).trim()}\n`;
    writeFileSync(path, content);
  }
  if (!content.includes("org.gradle.jvmargs")) { content += "\norg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m\n"; writeFileSync(path, content); }
}
