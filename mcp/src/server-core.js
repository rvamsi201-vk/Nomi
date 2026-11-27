import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { clientFromEnv } from "./client.js";
import { createToolHandlers, toMcpToolList } from "./tools.js";

/**
 * Build a fresh MCP Server wired to Nomi tools (stateless-friendly).
 */
export function createNomiMcpServer() {
  const client = clientFromEnv();
  const handlers = createToolHandlers(client);
  const tools = toMcpToolList(handlers);

  const server = new Server(
    { name: "nomi", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments ?? {};
    const def = handlers[name];
    if (!def) {
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
    }
    try {
      const parsed = def.schema.parse(args);
      const result = await def.handler(parsed);
      return {
        content: [
          {
            type: "text",
            text:
              typeof result === "string" ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: err instanceof Error ? err.message : String(err),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
