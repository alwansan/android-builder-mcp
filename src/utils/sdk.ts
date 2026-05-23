import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface SdkEnvironment {
  javaHome: string;
  javaVersion: string;
  androidHome: string;
  gradleHome: string | null;
  gradleVersion: string | null;
  buildToolsVersion: string | null;
  aapt2Path: string | null;
  isArm64: boolean;
  inProot: boolean;
}

export function detectJavaHome(): string {
  if (process.env.JAVA_HOME) return process.env.JAVA_HOME;
  try {
    const javaBin = execSync("readlink -f $(which java) 2>/dev/null || which java", { encoding: "utf8" }).trim();
    if (javaBin) {
      const dir = execSync(`dirname $(dirname "${javaBin}") 2>/dev/null || echo ""`, { encoding: "utf8" }).trim();
      if (dir && existsSync(join(dir, "bin", "java"))) return dir;
      const knownPaths = [
        "/usr/lib/jvm/java-17-openjdk-arm64",
        "/usr/lib/jvm/java-17-openjdk",
        "/usr/lib/jvm/java-1.17.0-openjdk",
        "/data/data/com.termux/files/usr/lib/jvm/java-17-openjdk",
      ];
      for (const p of knownPaths) {
        if (existsSync(join(p, "bin", "java"))) return p;
      }
    }
  } catch {}
  return "";
}

export function detectEnvironment(): SdkEnvironment {
  const arch = execSync("uname -m", { encoding: "utf8" }).trim();
  const isArm64 = arch === "aarch64" || arch === "arm64";
  const inProot = process.env.PROOT_L2S_DIR !== undefined || process.env.PROOT_TMP_DIR !== undefined || process.env.PROOT !== undefined;
  const javaHome = detectJavaHome();
  let javaVersion = "";
  try {
    const j = execSync("java -version 2>&1", { encoding: "utf8" });
    const m = j.match(/(\d+\.\d+\.\d+)/);
    if (m) javaVersion = m[1];
  } catch {}
  let androidHome = process.env.ANDROID_HOME || join(homedir(), "android-sdk");
  let buildToolsVersion: string | null = null;
  let aapt2Path: string | null = null;
  const bt = join(androidHome, "build-tools");
  if (existsSync(bt)) {
    try {
      const v = execSync(`ls "${bt}" 2>/dev/null || true`, { encoding: "utf8" }).trim().split("\n")[0];
      if (v) {
        buildToolsVersion = v;
        const p1 = join(bt, v, "aapt2");
        const p2 = join(bt, v, "build-tools", v, "aapt2");
        if (existsSync(p1)) aapt2Path = p1;
        else if (existsSync(p2)) aapt2Path = p2;
      }
    } catch {}
  }
  let gradleVersion: string | null = null;
  try { const g = execSync("gradle --version 2>&1 || true", { encoding: "utf8" }); const m = g.match(/Gradle (\d+\.\d+)/); if (m) gradleVersion = m[1]; } catch {}
  return { javaHome, javaVersion, androidHome, gradleHome: null, gradleVersion, buildToolsVersion, aapt2Path, isArm64, inProot };
}

export function getRecommendedFix(env: SdkEnvironment): string[] {
  const fixes: string[] = [];
  if (!env.javaVersion) fixes.push("JDK not installed. Run: apt install openjdk-17-jdk");
  if (!env.aapt2Path) fixes.push("aapt2 not found. Install arm64 build tools");
  if (env.javaVersion && env.javaVersion.startsWith("11")) fixes.push("JDK 11 is too old. Use JDK 17+");
  if (!env.gradleVersion) fixes.push("Gradle not installed. Run: apt install gradle");
  return fixes;
}

export function checkAapt2Fix(): { needsFix: boolean; jars: string[] } {
  const gradleCache = join(homedir(), ".gradle", "caches");
  if (!existsSync(gradleCache)) return { needsFix: false, jars: [] };
  try {
    const result = execSync(
      `find "${gradleCache}" -name 'aapt2-*-linux.jar' -type f 2>/dev/null || true`,
      { encoding: "utf8" }
    );
    const jars = result.trim().split("\n").filter(Boolean);
    return { needsFix: jars.length > 0, jars };
  } catch {
    return { needsFix: false, jars: [] };
  }
}
