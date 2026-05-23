import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface BuildResult {
  success: boolean;
  apkPath: string | null;
  output: string;
  duration: number;
  errors: string[];
}

function findGradleCommand(projectDir: string): string {
  const gradlew = join(projectDir, "gradlew");
  if (existsSync(gradlew)) return `bash "${gradlew}"`;
  const candidates = [
    "gradle",
    "/usr/bin/gradle",
    "/usr/share/gradle/bin/gradle",
    "/opt/gradle/bin/gradle",
    join(process.env.HOME || "", "gradle", "gradle-8.10.2", "bin", "gradle"),
    "/data/data/com.termux/files/usr/bin/gradle",
  ];
  for (const c of candidates) {
    try { execSync(`${c} --version 2>&1`, { encoding: "utf8" }); return c; } catch {}
  }
  return "gradle";
}

export function buildApk(
  projectDir: string,
  variant: string = "debug",
  clean: boolean = false,
  extraArgs: string[] = []
): BuildResult {
  const startTime = Date.now();
  const gradleCmd = findGradleCommand(projectDir);
  const javaHome = process.env.JAVA_HOME || "/usr/lib/jvm/java-17-openjdk-arm64";
  const task = variant === "release" ? "assembleRelease" : "assembleDebug";
  let cmd = `JAVA_HOME="${javaHome}" ANDROID_HOME="${process.env.ANDROID_HOME || join(process.env.HOME || "", "android-sdk")}" ${gradleCmd} ${task}`;
  if (clean) cmd = `JAVA_HOME="${javaHome}" ANDROID_HOME="${process.env.ANDROID_HOME || ""}" ${gradleCmd} clean ${task}`;
  if (extraArgs.length > 0) cmd += ` ${extraArgs.join(" ")}`;
  cmd += " --no-daemon 2>&1";
  try {
    const output = execSync(cmd, { cwd: projectDir, encoding: "utf8", timeout: 600000 });
    const duration = Date.now() - startTime;
    const apkPaths = findBuiltApks(projectDir, variant);
    const errors = extractErrors(output);
    return { success: apkPaths.length > 0, apkPath: apkPaths[0] || null, output, duration, errors };
  } catch (e: any) {
    const duration = Date.now() - startTime;
    const output = e.stdout || e.stderr || e.message || "Build failed";
    const errors = extractErrors(output);
    if (output.includes("aapt2") && output.includes("Exec format error")) {
      errors.push("aapt2 issue: x86-64 aapt2 detected in Gradle cache. Run fix_aapt2 tool");
    }
    return { success: false, apkPath: null, output, duration, errors };
  }
}

export function findBuiltApks(projectDir: string, variant: string): string[] {
  const variantDir = variant === "release" ? "release" : "debug";
  const possiblePaths = [
    join(projectDir, "app", "build", "outputs", "apk", variantDir),
    join(projectDir, "android", "build", "outputs", "apk", variantDir),
    join(projectDir, "app", "build", "outputs", "apk"),
  ];
  const apks: string[] = [];
  for (const dir of possiblePaths) {
    if (existsSync(dir)) {
      try {
        const files = execSync(`ls "${dir}"/*.apk 2>/dev/null || true`, { encoding: "utf8" });
        apks.push(...files.trim().split("\n").filter(Boolean));
      } catch {}
    }
  }
  return apks;
}

export function extractErrors(output: string): string[] {
  const errors: string[] = [];
  const lines = output.split("\n");
  for (const line of lines) {
    if (line.includes("ERROR") || line.includes("FAILURE")) {
      errors.push(line.trim());
    }
  }
  return errors.slice(0, 20);
}

export function createLocalProperties(sdkDir: string, projectDir: string): void {
  const content = `sdk.dir=${sdkDir}\n`;
  writeFileSync(join(projectDir, "local.properties"), content);
}

export function getGradlePropertyPath(): string {
  return join(process.env.HOME || "", ".gradle", "gradle.properties");
}

export function ensureGradleProperties(): void {
  const path = getGradlePropertyPath();
  const dir = join(process.env.HOME || "", ".gradle");
  if (!existsSync(dir)) {
    execSync(`mkdir -p "${dir}"`, { encoding: "utf8" });
  }
  let content = "";
  if (existsSync(path)) {
    content = readFileSync(path, "utf8");
  }
  if (!content.includes("android.aapt2FromMavenOverride")) {
    const aapt = execSync("which aapt2 2>/dev/null || echo /usr/bin/aapt2", { encoding: "utf8" }).trim();
    content += `\n# Force aapt2 path for arm64\nandroid.aapt2FromMavenOverride=${aapt}\n`;
    writeFileSync(path, content);
  }
  if (!content.includes("org.gradle.jvmargs")) {
    content += "\norg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m\n";
    writeFileSync(path, content);
  }
}
