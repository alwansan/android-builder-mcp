import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
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

export function detectEnvironment(): SdkEnvironment {
  const arch = execSync("uname -m", { encoding: "utf8" }).trim();
  const isArm64 = arch === "aarch64" || arch === "arm64";
  const inProot = existsSync("/.proot") || process.env.PROOT !== undefined;
  let javaHome = process.env.JAVA_HOME || "";
  let javaVersion = "";
  try {
    const j = execSync("java -version 2>&1", { encoding: "utf8" });
    const m = j.match(/(\d+\.\d+\.\d+)/);
    if (m) javaVersion = m[1];
    if (!javaHome) { const w = execSync("which java 2>/dev/null || true", { encoding: "utf8" }).trim(); if (w) javaHome = execSync(`dirname $(dirname ${w}) 2>/dev/null || echo "${w}"`, { encoding: "utf8" }).trim(); }
  } catch {}
  let androidHome = process.env.ANDROID_HOME || join(homedir(), "android-sdk");
  let buildToolsVersion: string | null = null;
  let aapt2Path: string | null = null;
  const bt = join(androidHome, "build-tools");
  if (existsSync(bt)) {
    try {
      const v = execSync(`ls "${bt}" 2>/dev/null || true`, { encoding: "utf8" }).trim().split("\n")[0];
      if (v) { buildToolsVersion = v; const p = join(bt, v, "aapt2"); if (existsSync(p)) aapt2Path = p; }
    } catch {}
  }
  let gradleVersion: string | null = null;
  try { const g = execSync("gradle --version 2>&1 || true", { encoding: "utf8" }); const m = g.match(/Gradle (\d+\.\d+)/); if (m) gradleVersion = m[1]; } catch {}
  return { javaHome, javaVersion, androidHome, gradleHome: null, gradleVersion, buildToolsVersion, aapt2Path, isArm64, inProot };
}

export function getRecommendedFix(env: SdkEnvironment): string[] {
  const f: string[] = [];
  if (!env.javaVersion) f.push("JDK غير مثبت: apt install openjdk-17-jdk");
  if (!env.aapt2Path) f.push("aapt2 غير موجود: ثبّت build tools لـ arm64");
  if (!env.gradleVersion) f.push("Gradle غير مثبت: apt install gradle");
  return f;
}

export function checkAapt2Fix(): { needsFix: boolean; jars: string[] } {
  const c = join(homedir(), ".gradle", "caches");
  if (!existsSync(c)) return { needsFix: false, jars: [] };
  try {
    const r = execSync(`find "${c}" -name 'aapt2-*-linux.jar' -type f 2>/dev/null || true`, { encoding: "utf8" });
    const j = r.trim().split("\n").filter(Boolean);
    return { needsFix: j.length > 0, jars: j };
  } catch { return { needsFix: false, jars: [] }; }
}
