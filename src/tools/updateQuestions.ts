import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updateQuestions } from "../topmate/actions.js";

export function registerUpdateQuestions(server: McpServer) {
  server.tool(
    "update_questions",
    "Replace the intake questions asked to buyers of a specific Topmate service.",
    {
      serviceId: z.string().describe("The Topmate service ID"),
      questions: z.array(z.string()).describe("The full new list of intake questions"),
    },
    async ({ serviceId, questions }) => {
      const result = await updateQuestions(serviceId, questions);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        isError: !result.success,
      };
    }
  );
}
