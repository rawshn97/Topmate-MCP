import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getService } from "../topmate/apiClient.js";
import { deleteService } from "../topmate/actions.js";

export function registerDeleteService(server: McpServer) {
  server.tool(
    "delete_service",
    "Delete a service from the Topmate profile. Destructive and irreversible — set confirm=true only after you've told the user exactly which service (by title) you're about to delete and they've agreed.",
    {
      serviceId: z.string().describe("The Topmate service ID to delete"),
      confirm: z
        .boolean()
        .describe("Must be explicitly true to actually perform the deletion"),
    },
    async ({ serviceId, confirm }) => {
      if (!confirm) {
        const current = await getService(serviceId).catch(() => null);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: false,
                  message: current
                    ? `Not deleted. Confirm you want to permanently delete "${current.title}" (id: ${serviceId}) by calling this again with confirm=true.`
                    : `Not deleted. Call again with confirm=true to proceed.`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      const result = await deleteService(serviceId);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        isError: !result.success,
      };
    }
  );
}
