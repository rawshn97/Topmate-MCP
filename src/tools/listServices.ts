import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listServices } from "../topmate/apiClient.js";

export function registerListServices(server: McpServer) {
  server.tool(
    "list_services",
    "List all services currently live on the Topmate profile, with their IDs, titles, descriptions, pricing, and intake questions.",
    {},
    async () => {
      const services = await listServices();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(services, null, 2) }],
      };
    }
  );
}
