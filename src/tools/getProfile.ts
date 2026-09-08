import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getProfile } from "../topmate/apiClient.js";

export function registerGetProfile(server: McpServer) {
  server.tool(
    "get_profile",
    "Fetch the current Topmate profile: name, title, bio, and the full list of existing services. Call this before drafting a new service so tone and style match what's already on the profile.",
    {},
    async () => {
      const profile = await getProfile();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(profile, null, 2) }],
      };
    }
  );
}
