import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "node:child_process";

function findAdb(): string | null {
  const paths = ["adb", "/system/bin/adb", `${process.env.ANDROID_HOME || ""}/platform-tools/adb`, `${process.env.HOME || ""}/android-sdk/platform-tools/adb`];
  for (const p of paths) { try { execSync(`${p} --version 2>&1`); return p; } catch {} }
  return null;
}

export function registerDeviceTools(server: McpServer) {
  server.tool(
    "install_apk",
    "Install an APK on the device via ADB.",
    { apk_path: z.string().describe("مسار APK"), reinstall: z.boolean().default(false) },
    async ({ apk_path, reinstall }) => {
      const adb = findAdb();
      if (!adb) return { content: [{ type: "text", text: "❌ ADB غير موجود." }] };
      try {
        const out = execSync(`${adb} install ${reinstall ? "-r" : ""} "${apk_path}" 2>&1`, { timeout: 60000, encoding: "utf8" });
        return { content: [{ type: "text", text: out.includes("Success") ? `✅ تم التثبيت: ${apk_path}` : `❌ فشل:\n${out}` }] };
      } catch (e: any) { return { content: [{ type: "text", text: `❌ ${e.message}` }] }; }
    }
  );

  server.tool(
    "read_logcat",
    "Read Android logs (logcat) filtered by app or keyword.",
    { package_name: z.string().optional(), filter: z.string().optional(), lines: z.number().default(100) },
    async ({ package_name, filter, lines }) => {
      const adb = findAdb();
      if (!adb) return { content: [{ type: "text", text: "❌ ADB غير موجود." }] };
      let cmd = `${adb} logcat -t ${lines} *:I`;
      if (package_name) cmd = `${adb} logcat -t ${lines} | grep -i "${package_name}" || true`;
      else if (filter) cmd = `${adb} logcat -t ${lines} | grep -i "${filter}" || true`;
      try {
        const out = execSync(cmd, { timeout: 15000, encoding: "utf8" });
        return { content: [{ type: "text", text: out.trim() ? `## 📋 Logcat\n\`\`\`\n${out}\n\`\`\`` : "📭 لا توجد نتائج." }] };
      } catch (e: any) { return { content: [{ type: "text", text: `❌ ${e.message}` }] }; }
    }
  );

  server.tool(
    "list_devices",
    "List connected Android devices via ADB.",
    {},
    async () => {
      const adb = findAdb();
      if (!adb) return { content: [{ type: "text", text: "❌ ADB غير موجود." }] };
      try {
        const out = execSync(`${adb} devices -l 2>&1`, { encoding: "utf8" });
        const devices = out.split("\n").slice(1).filter(l => l.trim() && !l.includes("unauthorized"));
        return { content: [{ type: "text", text: `## 📱 الأجهزة\n${devices.length ? devices.map(d => `- ${d}`).join("\n") : "لا توجد أجهزة."}` }] };
      } catch (e: any) { return { content: [{ type: "text", text: `❌ ${e.message}` }] }; }
    }
  );
}
