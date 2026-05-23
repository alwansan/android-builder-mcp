import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { searchPermissions, type PermissionInfo } from "../knowledge/permissions.js";
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
      if (results.length === 0) return { content: [{ type: "text", text: "No results found." }] };
      const lines = results.slice(0, 30).map(p => `### ${p.fullName}\n**protectionLevel:** ${p.protectionLevel}\n**group:** ${p.group || "-"}\n${p.description}`).join("\n\n");
      return { content: [{ type: "text", text: `## Permissions (${results.length})\n\n${lines}` }] };
    }
  );

  server.tool(
    "get_manifest_element",
    "Get information about Android manifest elements (activity, service, receiver, etc.).",
    { element_name: z.string().optional().describe("Element name (e.g., activity, service, permission)") },
    async ({ element_name }) => {
      const elements = getManifestElements();
      if (element_name) {
        const el = elements.find(e => e.name === element_name.toLowerCase());
        if (!el) return { content: [{ type: "text", text: `Element "${element_name}" not found.` }] };
        return { content: [{ type: "text", text: `## ${el.name}\n**Description:** ${el.description}\n**Parent:** ${el.parent || "none"}\n**Required:** ${el.required ? "yes" : "no"}` }] };
      }
      const rows = elements.map(e => `| \`${e.name}\` | ${e.description} | ${e.required ? "Required" : "Optional"} |`).join("\n");
      return { content: [{ type: "text", text: `## AndroidManifest Elements\n\n| Element | Description | Status |\n|-------|------|-------|\n${rows}` }] };
    }
  );

  server.tool(
    "sdk_mapping",
    "Get Android SDK version to API level mapping.",
    { api_level: z.number().optional() },
    async ({ api_level }) => {
      const mapping = getSdkMapping();
      const rows = mapping.map(m => `| ${m.version} | ${m.apiLevel} | ${m.codename} | ${m.buildTools || "-"} |`).join("\n");
      return { content: [{ type: "text", text: `## SDK / API Mapping\n\n| Android | API | Codename | Build Tools |\n|--------|-----|----------|-------------|\n${rows}` }] };
    }
  );

  server.tool(
    "android_doc_search",
    "Search developer.android.com for Android documentation.",
    { query: z.string().describe("Search query") },
    async ({ query }) => {
      try {
        const res = await fetch(`https://developer.android.com/s/results?q=${encodeURIComponent(query)}`, { headers: { "User-Agent": "AndroidBuilderMCP/1.0" } });
        const html = await res.text();
        const matches = [...html.matchAll(/<a[^>]*href="(https:\/\/developer\.android\.com[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)].slice(0, 10);
        if (matches.length === 0) return { content: [{ type: "text", text: "No results found." }] };
        const results = matches.map((m, i) => `${i+1}. [${m[2].replace(/<[^>]*>/g, "").trim()}](${m[1]})`).join("\n");
        return { content: [{ type: "text", text: `## Search: ${query}\n\n${results}\n\nSource: developer.android.com` }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Search failed: ${e.message}` }] };
      }
    }
  );
}
