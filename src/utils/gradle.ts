import { execSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join, basename, dirname, resolve } from "node:path";
import { detectJavaHome } from "./sdk.js";

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

export function ensureSdkComponents(): void {
  const androidHome = process.env.ANDROID_HOME || join(process.env.HOME || "", "android-sdk");
  const needed: string[] = [];

  const platforms = ["android-35", "android-36"];
  for (const plat of platforms) {
    if (!existsSync(join(androidHome, "platforms", plat, "android.jar"))) {
      needed.push(`platforms;${plat}`);
    }
  }

  const buildToolsVersions = ["34.0.0", "35.0.0", "36.0.0"];
  for (const bt of buildToolsVersions) {
    if (!existsSync(join(androidHome, "build-tools", bt, "aapt2"))) {
      needed.push(`build-tools;${bt}`);
    }
  }

  // Install NDK if not present (needed for native .so compilation via Chaquopy/externalNativeBuild)
  if (!existsSync(join(androidHome, "ndk"))) {
    try {
      const ndkList = execSync("ls /root/android-sdk/ndk/ 2>/dev/null || true", { encoding: "utf8" }).trim();
      if (!ndkList) {
        needed.push("ndk;27.3.13750724");
      }
    } catch {
      needed.push("ndk;27.3.13750724");
    }
  }

  if (needed.length === 0) return;

  const sdkmanagerCandidates = [
    "sdkmanager",
    join(androidHome, "cmdline-tools", "latest", "bin", "sdkmanager"),
    join(androidHome, "tools", "bin", "sdkmanager"),
  ];
  let sdkmanager: string | null = null;
  for (const c of sdkmanagerCandidates) {
    if (existsSync(c)) { sdkmanager = c; break; }
    try {
      const out = execSync(`which ${c} 2>/dev/null`, { encoding: "utf8" }).trim();
      if (out) { sdkmanager = out; break; }
    } catch {}
  }

  if (sdkmanager) {
    for (const component of needed) {
      try {
        execSync(`yes | "${sdkmanager}" --sdk_root="${androidHome}" "${component}" 2>&1`, {
          encoding: "utf8", timeout: 120000,
        });
      } catch {}
    }
  }
}

export function supportsSymlinks(dir: string): boolean {
  const testFile = join(dir, ".symlink_test_" + Date.now());
  const testLink = testFile + "_link";
  try {
    writeFileSync(testFile, "test");
    try {
      execSync(`ln -sf "${testFile}" "${testLink}" 2>/dev/null`, { encoding: "utf8" });
      if (existsSync(testLink)) {
        rmSync(testLink);
        rmSync(testFile);
        return true;
      }
    } catch {}
    rmSync(testFile);
    return false;
  } catch {
    return true;
  }
}

export function copyToTemp(projectDir: string): string {
  const baseName = basename(projectDir);
  const tmpDir = join("/tmp", baseName + "-" + Date.now());
  mkdirSync(tmpDir, { recursive: true });
  execSync(`cp -a "${projectDir}/." "${tmpDir}/"`, { encoding: "utf8" });
  return tmpDir;
}

export function buildApk(
  projectDir: string,
  variant: string = "debug",
  clean: boolean = false,
  extraArgs: string[] = []
): BuildResult {
  const startTime = Date.now();
  const arch = execSync("uname -m", { encoding: "utf8" }).trim();
  const isArm64 = arch === "aarch64" || arch === "arm64";

  const hasBox64 = findBox64() !== null;

  ensureSdkComponents();

  if (isArm64) {
    ensureGradleProperties();
    patchAapt2InGradleCache();
  }

  const symlinksOk = supportsSymlinks(projectDir);
  let buildDir = projectDir;
  let needsCleanup = false;

  if (!symlinksOk) {
    buildDir = copyToTemp(projectDir);
    needsCleanup = true;
    createLocalProperties(process.env.ANDROID_HOME || join(process.env.HOME || "", "android-sdk"), buildDir);
  } else if (projectDir.startsWith("/mnt/sdcard") || projectDir.startsWith("/storage/emulated")) {
    buildDir = copyToTemp(projectDir);
    needsCleanup = true;
    createLocalProperties(process.env.ANDROID_HOME || join(process.env.HOME || "", "android-sdk"), buildDir);
  }

  const gradleCmd = findGradleCommand(buildDir);
  const javaHome = process.env.JAVA_HOME || detectJavaHome() || execSync("dirname $(dirname $(readlink -f $(which java))) 2>/dev/null || echo ''", { encoding: "utf8" }).trim() || "/usr/lib/jvm/java-17-openjdk-arm64";
  const task = variant === "release" ? "assembleRelease" : "assembleDebug";
  const androidHome = process.env.ANDROID_HOME || join(process.env.HOME || "", "android-sdk");
  let cmd = `JAVA_HOME="${javaHome}" ANDROID_HOME="${androidHome}" ${gradleCmd} ${task}`;
  if (clean) cmd = `JAVA_HOME="${javaHome}" ANDROID_HOME="${androidHome}" ${gradleCmd} clean ${task}`;
  if (extraArgs.length > 0) cmd += ` ${extraArgs.join(" ")}`;
  cmd += " 2>&1";

  const done = (result: BuildResult): BuildResult => {
    if (needsCleanup) {
      try {
        const outDir = join(projectDir, "app", "build", "outputs", "apk");
        mkdirSync(outDir, { recursive: true });
        const tmpOutDir = join(buildDir, "app", "build", "outputs", "apk");
        if (existsSync(tmpOutDir)) {
          execSync(`cp -a "${tmpOutDir}/." "${outDir}/" 2>/dev/null || true`, { encoding: "utf8" });
        }
        const projectApks = findBuiltApks(projectDir, variant);
        return {
          ...result,
          apkPath: projectApks[0] || result.apkPath,
        };
      } catch {}
      try { rmSync(buildDir, { recursive: true, force: true }); } catch {}
    }
    return result;
  };

  try {
    const output = execSync(cmd, { cwd: buildDir, encoding: "utf8", timeout: 600000 });
    const duration = Date.now() - startTime;
    const apkPaths = findBuiltApks(buildDir, variant);
    return done({ success: apkPaths.length > 0, apkPath: apkPaths[0] || null, output, duration, errors: extractErrors(output) });
  } catch (e: any) {
    const duration = Date.now() - startTime;
    const output = e.stdout || e.stderr || e.message || "Build failed";
    const errors = extractErrors(output);

    if (!errors.some(e => e.includes("AAPT2") || e.includes("aapt2"))) {
      if (isArm64 && output.includes("aapt2") && (output.includes("Daemon startup failed") || output.includes("Exec format error"))) {
        const patched = patchAapt2InGradleCache();
        if (patched.length > 0) {
          try {
            const retryOutput = execSync(cmd, { cwd: buildDir, encoding: "utf8", timeout: 600000 });
            const retryDuration = Date.now() - startTime;
            const apkPaths = findBuiltApks(buildDir, variant);
            return done({ success: apkPaths.length > 0, apkPath: apkPaths[0] || null, output: retryOutput, duration: retryDuration, errors: extractErrors(retryOutput) });
          } catch (retryErr: any) {
            const retryOutput = retryErr.stdout || retryErr.stderr || retryErr.message || "";
            errors.push(...extractErrors(retryOutput));
          }
        }
      }
      if (output.includes("aapt2") && (output.includes("failed to load include path") || output.includes("Daemon startup failed"))) {
        if (hasBox64) {
          errors.push("aapt2 issue: Box64 wrapper may not be working. Ensure box64 is installed and the x86-64 aapt2 exists in build-tools. Run: apt-get install -y box64");
        } else {
          errors.push("aapt2 issue: arm64 aapt2 is incompatible with compileSdk >= 35. Install box64 for x86-64 translation: apt-get install -y box64");
        }
      }
    }
    return done({ success: false, apkPath: null, output, duration, errors });
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
  if (!content.includes("org.gradle.jvmargs")) {
    content += "\norg.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m\n";
    writeFileSync(path, content);
  }
}

export function findBox64(): string | null {
  try {
    const out = execSync("box64 --version 2>/dev/null", { encoding: "utf8" }).trim();
    if (out) return out;
  } catch {}
  try {
    const p = execSync("which box64 2>/dev/null", { encoding: "utf8" }).trim();
    if (p) return p;
  } catch {}
  return null;
}

export function findX64Aapt2(): string | null {
  const androidHome = process.env.ANDROID_HOME || join(process.env.HOME || "", "android-sdk");
  const btDir = join(androidHome, "build-tools");
  if (!existsSync(btDir)) return null;
  try {
    const dirs = execSync(`ls "${btDir}" 2>/dev/null`, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
    for (const dir of dirs) {
      const p = join(btDir, dir, "aapt2");
      if (existsSync(p)) {
        try {
          const info = execSync(`readelf -h "${p}" 2>/dev/null`, { encoding: "utf8" });
          if (info.includes("X86-64") || info.includes("Advanced Micro Devices")) return p;
        } catch {}
        return p;
      }
    }
  } catch {}
  return null;
}

export function findArm64Aapt2(): string | null {
  const androidHome = process.env.ANDROID_HOME || join(process.env.HOME || "", "android-sdk");
  const btDir = join(androidHome, "build-tools");
  if (!existsSync(btDir)) return null;
  try {
    const dirs = execSync(`ls "${btDir}" 2>/dev/null`, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
    for (const dir of dirs) {
      const p = join(btDir, dir, "aapt2");
      if (existsSync(p)) {
        try {
          const info = execSync(`readelf -h "${p}" 2>/dev/null`, { encoding: "utf8" });
          if (info.includes("AArch64")) return p;
        } catch {}
        return p;
      }
    }
  } catch {}
  return null;
}

function updateJarBinary(jarPath: string, binaryPath: string): boolean {
  const workDir = join("/tmp", "aapt2-patch-" + Date.now());
  mkdirSync(workDir, { recursive: true });
  try {
    execSync(`cd "${workDir}" && unzip -qo "${jarPath}" 2>/dev/null`, { encoding: "utf8" });
    const destPath = join(workDir, "aapt2");
    if (!existsSync(destPath)) return false;
    copyFileSync(binaryPath, destPath);
    execSync(`cd "${workDir}" && jar uf "${jarPath}" aapt2 2>/dev/null || python3 -c "
import zipfile
with zipfile.ZipFile('${jarPath}', 'a') as z:
    z.write('${workDir}/aapt2', 'aapt2')
" 2>/dev/null || true`, { encoding: "utf8" });
    return true;
  } finally {
    execSync(`rm -rf "${workDir}"`, { encoding: "utf8" });
  }
}

function createBox64WrapperScript(): string | null {
  const box64Path = execSync("which box64", { encoding: "utf8" }).trim();
  const x64Aapt2 = findX64Aapt2();
  if (!box64Path || !x64Aapt2) return null;
  const wrapperPath = join("/tmp", "aapt2-box64-wrapper");
  const content = `#!/bin/sh\nexec ${box64Path} ${x64Aapt2} "$@"\n`;
  writeFileSync(wrapperPath, content);
  execSync(`chmod +x "${wrapperPath}"`, { encoding: "utf8" });
  return wrapperPath;
}

export function patchAapt2InGradleCache(): string[] {
  const fixes: string[] = [];
  const hasBox64 = findBox64() !== null;
  let replacementPath: string | null = null;

  if (hasBox64) {
    replacementPath = createBox64WrapperScript();
    if (!replacementPath) {
      const armAapt = findArm64Aapt2();
      if (armAapt) replacementPath = armAapt;
    }
  } else {
    replacementPath = findArm64Aapt2();
  }

  if (!replacementPath) return fixes;

  const gradleCache = join(process.env.HOME || "", ".gradle", "caches");
  const termuxCache = "/data/data/com.termux/files/home/.gradle/caches";
  const caches = [gradleCache];
  if (existsSync(termuxCache)) caches.push(termuxCache);
  // Also search in /tmp for project-local Gradle caches (AGP 9.x + Gradle 9.x)
  try {
    const tmpCaches = execSync(
      `find /tmp -maxdepth 3 -name '.gradle' -type d 2>/dev/null | while read d; do echo "$d/caches"; done`,
      { encoding: "utf8" }
    ).trim().split("\n").filter(Boolean);
    for (const tc of tmpCaches) {
      if (!caches.includes(tc)) caches.push(tc);
    }
  } catch {}

  for (const cache of caches) {
    if (!existsSync(cache)) continue;
    try {
      const jars = execSync(
        `find "${cache}" -name 'aapt2-*-linux.jar' -type f 2>/dev/null || true`,
        { encoding: "utf8" }
      ).trim().split("\n").filter(Boolean);
      for (const jarPath of jars) {
        if (updateJarBinary(jarPath, replacementPath)) {
          fixes.push(`Patched: ${jarPath}${hasBox64 ? " (box64 wrapper)" : ""}`);
        }
      }
    } catch {}
  }
  return fixes;
}
