import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerBuildTools } from "./tools/build.js";
import { registerProjectTools } from "./tools/project.js";
import { registerKnowledgeTools } from "./tools/knowledge.js";
import { registerDeviceTools } from "./tools/device.js";
import { registerDiagnosticTools } from "./tools/diagnostic.js";

const server = new McpServer({
  name: "android-builder-mcp",
  version: "0.1.0",
  description: "Android APK Builder MCP for arm64 - Build, debug, and manage Android apps on device",
});

registerBuildTools(server);
registerProjectTools(server);
registerKnowledgeTools(server);
registerDeviceTools(server);
registerDiagnosticTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Android Builder MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
