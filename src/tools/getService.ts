import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getService } from "../topmate/apiClient.js";

export function registerGetService(server: McpServer) {
  server.tool(
    "get_service",
    "Fetch full details for one Topmate service by its ID.",
    { serviceId: z.string().describe("The Topmate service ID") },
    async ({ serviceId }) => {
      const service = await getService(serviceId);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(service, null, 2) }],
      };
    }
  );
}
