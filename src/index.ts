import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerGetProfile } from "./tools/getProfile.js";
import { registerListServices } from "./tools/listServices.js";
import { registerGetService } from "./tools/getService.js";
import { registerCreateService } from "./tools/createService.js";
import { registerUpdateService } from "./tools/updateService.js";
import { registerUpdateProfile } from "./tools/updateProfile.js";
import { registerDeleteService } from "./tools/deleteService.js";
import { registerUpdateQuestions } from "./tools/updateQuestions.js";

const server = new McpServer({
  name: "topmate-mcp",
  version: "0.1.0",
});

registerGetProfile(server);
registerListServices(server);
registerGetService(server);
registerCreateService(server);
registerUpdateService(server);
registerUpdateProfile(server);
registerDeleteService(server);
registerUpdateQuestions(server);

const transport = new StdioServerTransport();
await server.connect(transport);
