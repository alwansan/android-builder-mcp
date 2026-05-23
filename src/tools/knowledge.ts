import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchPermissions } from "../knowledge/permissions.js";
import { getSdkMapping } from "../knowledge/sdk-mapping.js";
import { getManifestElements } from "../knowledge/manifest-elements.js";

export function registerKnowledgeTools(server: McpServer) {
  server.tool(
    "search_permissions",
    "Search the Android permissions database by name, protection level, or group.",
    {
      query: z.string().optional(),
      protection_level: z.enum(["normal", "dangerous", "signature"]).optional(),
      group: z.string().optional(),
    },
    async ({ query, protection_level, group }) => {
      const results = searchPermissions({ query, protectionLevel: protection_level, group });
      if (results.length === 0) return { content: [{ type: "text", text: "❌ لا توجد نتائج." }] };
      const lines = results.slice(0, 30).map(p => `### ${p.fullName}\n**protectionLevel:** ${p.protectionLevel}\n**group:** ${p.group || "-"}\n${p.description}`).join("\n\n");
      return { content: [{ type: "text", text: `## 📋 الأذونات (${results.length})\n\n${lines}` }] };
    }
  );

  server.tool(
    "sdk_mapping",
    "Get Android SDK version to API level mapping.",
    { api_level: z.number().optional() },
    async ({ api_level }) => {
      const mapping = getSdkMapping();
      const rows = mapping.map(m => `| ${m.version} | ${m.apiLevel} | ${m.codename} | ${m.buildTools || "-"} |`).join("\n");
      return { content: [{ type: "text", text: `## 🔢 SDK / API Mapping\n\n| Android | API | Codename | Build Tools |\n|--------|-----|----------|-------------|\n${rows}` }] };
    }
  );

  server.tool(
    "android_doc_search",
    "Search developer.android.com for Android documentation.",
    { query: z.string().describe("ما الذي تبحث عنه؟") },
    async ({ query }) => {
      try {
        const res = await fetch(`https://developer.android.com/s/results?q=${encodeURIComponent(query)}`, { headers: { "User-Agent": "AndroidBuilderMCP/1.0" } });
        const html = await res.text();
        const matches = [...html.matchAll(/<a[^>]*href="(https:\/\/developer\.android\.com[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)].slice(0, 10);
        if (matches.length === 0) return { content: [{ type: "text", text: "❌ لا توجد نتائج." }] };
        const results = matches.map((m, i) => `${i+1}. [${m[2].replace(/<[^>]*>/g, "").trim()}](${m[1]})`).join("\n");
        return { content: [{ type: "text", text: `## 🔍 نتائج: ${query}\n\n${results}\n\nالمصدر: developer.android.com` }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `❌ فشل البحث: ${e.message}` }] };
      }
    }
  );
}
