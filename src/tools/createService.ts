import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createService } from "../topmate/actions.js";

export function registerCreateService(server: McpServer) {
  server.tool(
    "create_service",
    "Create a new service on the Topmate profile. Pass fully-drafted, final content — write a polished title and description and good intake questions yourself first (using get_profile/list_services as style reference), then call this with the finished result.",
    {
      title: z.string().describe("Final, polished service title"),
      description: z.string().describe("Final, polished service description"),
      price: z.number().optional().describe("Price for the service, if applicable"),
      currency: z.string().optional().describe('Currency code, e.g. "INR" or "USD"'),
      durationMinutes: z.number().optional().describe("Session duration in minutes, if applicable"),
      questions: z
        .array(z.string())
        .optional()
        .describe("Intake questions to ask the buyer at booking time"),
    },
    async (input) => {
      const result = await createService(input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        isError: !result.success,
      };
    }
  );
}
