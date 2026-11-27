#!/usr/bin/env node
/**
 * Public Streamable HTTP MCP for Claude.ai / Chrome custom connectors.
 * URL (via nginx): https://nomi.exora.solutions/mcp
 *
 * Auth: Authorization: Bearer <MCP_AUTH_TOKEN or NOMI_API_TOKEN>
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createNomiMcpServer } from "./server-core.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const PORT = Number(process.env.MCP_HTTP_PORT || 3016);
const HOST = process.env.MCP_HTTP_HOST || "127.0.0.1";
const AUTH_TOKEN =
  process.env.MCP_AUTH_TOKEN || process.env.NOMI_API_TOKEN || "";

function requireBearer(req, res, next) {
  if (!AUTH_TOKEN) {
    res.status(500).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "MCP_AUTH_TOKEN not configured" },
      id: null,
    });
    return;
  }
  const hdr = req.headers.authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(hdr);
  if (!m || m[1].trim() !== AUTH_TOKEN) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    });
    return;
  }
  next();
}

const app = express();
app.set("trust proxy", 1);
app.use(express.json({ limit: "4mb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    transport: "streamable-http",
    path: "/mcp",
  });
});

async function handleMcp(req, res) {
  const server = createNomiMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("[mcp-http]", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  } finally {
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
  }
}

app.post("/mcp", requireBearer, (req, res) => {
  void handleMcp(req, res);
});

// Some clients probe with GET; Streamable HTTP may use GET for SSE streams.
app.get("/mcp", requireBearer, (req, res) => {
  void handleMcp(req, res);
});

app.delete("/mcp", requireBearer, (req, res) => {
  void handleMcp(req, res);
});

app.listen(PORT, HOST, () => {
  console.log(`nomi MCP HTTP listening on http://${HOST}:${PORT}/mcp`);
});
