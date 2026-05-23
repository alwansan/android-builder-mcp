import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { detectEnvironment } from "./sdk.js";

export function fixAapt2(): { success: boolean; message: string } {
  const env = detectEnvironment();
  if (!env.aapt2Path) return { success: false, message: "aapt2 غير موجود." };
  try {
    const f = execSync(`file "${env.aapt2Path}" 2>&1`, { encoding: "utf8" });
    if (!f.includes("ARM aarch64") && !f.includes("ARM64")) return { success: false, message: `aapt2 ليس ARM64: ${f.trim()}` };
  } catch { return { success: false, message: "لا يمكن التحقق من aapt2" }; }

  const cache = join(homedir(), ".gradle", "caches");
  if (!existsSync(cache)) return { success: true, message: "لا يوجد Gradle cache. aapt2 سليم." };

  let fixed = 0;
  try {
    const jars = execSync(`find "${cache}" -name 'aapt2-*-linux.jar' -type f 2>/dev/null || true`, { encoding: "utf8" }).trim().split("\n").filter(Boolean);
    for (const jar of jars) {
      try { execSync(`jar -u -f "${jar}" -C "${env.aapt2Path}" aapt2 2>&1`); fixed++; } catch {}
    }
  } catch {}
  return { success: fixed > 0, message: fixed > 0 ? `✅ تم إصلاح ${fixed} JAR.` : "لا توجد JAR بحاجة للإصلاح." };
}
