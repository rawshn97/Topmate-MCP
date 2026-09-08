import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { updateProfile } from "../topmate/actions.js";

export function registerUpdateProfile(server: McpServer) {
  server.tool(
    "update_profile",
    "Update the creator's Topmate profile title (tagline) and/or bio. Only pass the fields that should change — omitted fields are left as-is. Pass final, polished content, not rough notes.",
    {
      title: z.string().optional().describe("The profile tagline/title shown near the creator's name"),
      description: z.string().optional().describe("The profile bio/about text"),
    },
    async (input) => {
      const result = await updateProfile(input);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        isError: !result.success,
      };
    }
  );
}
