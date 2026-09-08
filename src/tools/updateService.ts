import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updateService } from "../topmate/actions.js";

export function registerUpdateService(server: McpServer) {
  server.tool(
    "update_service",
    "Update an existing Topmate service. Only pass the fields that should change — omitted fields are left as-is. Pass final, polished content, not rough notes.",
    {
      serviceId: z.string().describe("The Topmate service ID to update"),
      title: z.string().optional(),
      description: z.string().optional(),
      price: z.number().optional(),
      durationMinutes: z.number().optional(),
      questions: z
        .array(z.string())
        .optional()
        .describe("Replaces the full set of intake questions if provided"),
    },
    async (input) => {
      const result = await updateService(input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        isError: !result.success,
      };
    }
  );
}
