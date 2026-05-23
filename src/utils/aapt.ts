import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { detectEnvironment } from "./sdk.js";
import { findBox64, findX64Aapt2, findArm64Aapt2, patchAapt2InGradleCache } from "./gradle.js";

export function fixAapt2(): { success: boolean; message: string } {
  const env = detectEnvironment();
  const hasBox64 = findBox64() !== null;
  const armAapt = findArm64Aapt2();
  const x64Aapt = findX64Aapt2();
  let msg: string[] = [];

  if (hasBox64 && x64Aapt) {
    const patched = patchAapt2InGradleCache();
    if (patched.length > 0) {
      msg.push(`Patched ${patched.length} jars with box64 + x86-64 aapt2`);
    } else {
      msg.push("Box64 available, no jars to patch");
    }
  } else if (armAapt) {
    const patched = patchAapt2InGradleCache();
    if (patched.length > 0) {
      msg.push(`Patched ${patched.length} jars with arm64 aapt2`);
    } else {
      msg.push("Arm64 aapt2 available, no jars to patch");
    }
    if (!hasBox64) {
      msg.push("Tip: install box64 for API 35+ support: apt-get install -y box64");
    }
  } else if (!hasBox64) {
    msg.push("No aapt2 found. Install box64 and download build-tools: apt-get install -y box64");
  }

  return { success: true, message: msg.join(". ") || "OK" };
}
