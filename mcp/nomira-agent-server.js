#!/usr/bin/env node
/**
 * Host-side Nomira agent (Codex + nomi MCP).
 * Nomi container calls this so Codex can use host network/auth.
 *
 * POST /chat { userName, message, history? }
 * GET  /health
 */
import http from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const PORT = Number(process.env.NOMIRA_AGENT_PORT || 3015);
const CODEX_BIN = process.env.CODEX_BIN || "/usr/local/bin/codex";
const WORKDIR = process.env.NOMIRA_WORKDIR || "/srv/apps/nomi";
const TIMEOUT_MS = Number(process.env.NOMIRA_TIMEOUT_MS || 180_000);

function buildPrompt({ userName, message, history }) {
  const historyBlock =
    Array.isArray(history) && history.length
      ? history
          .slice(-12)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")
      : "(none)";
  return `You are Nomira, the AI teammate inside Nomi (internal projects + chat workspace for Exora).
You act through the nomi MCP tools (projects, tasks, channels, messages, team).
Be concise, helpful, and action-oriented. Use tools when the user asks about work, tasks, projects, or chat.
Do not invent IDs — look them up with tools. After making changes, briefly confirm what you did.

Current user talking to you: ${userName || "teammate"}

Recent conversation:
${historyBlock}

User message:
${message}

Reply to the user in plain language.`;
}

function extractAgentText(stdout) {
  let last = "";
  let failure = "";
  for (const line of stdout.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("{")) continue;
    try {
      const ev = JSON.parse(t);
      if (
        ev.type === "item.completed" &&
        ev.item?.type === "agent_message" &&
        typeof ev.item.text === "string"
      ) {
        last = ev.item.text;
      }
      if (ev.type === "turn.failed") {
        failure = ev.error?.message || "Codex turn failed";
      }
    } catch {
      /* ignore */
    }
  }
  if (last) return last;
  if (failure) throw new Error(failure);
  return "";
}

function runCodex(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      CODEX_BIN,
      [
        "exec",
        "--skip-git-repo-check",
        "--dangerously-bypass-approvals-and-sandbox",
        "--json",
        prompt,
      ],
      {
        cwd: WORKDIR,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`timed out after ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);
    child.stdout.on("data", (c) => (stdout += String(c)));
    child.stderr.on("data", (c) => (stderr += String(c)));
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const text = extractAgentText(stdout) || stdout.trim();
      if (!text) {
        reject(new Error(`empty output (exit ${code}): ${stderr.slice(0, 400)}`));
        return;
      }
      resolve({ text, code, stderr });
    });
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    if (req.method === "GET" && req.url === "/health") {
      res.end(JSON.stringify({ ok: true, engine: "codex" }));
      return;
    }
    if (req.method === "POST" && req.url === "/chat") {
      const body = await readJson(req);
      const message = String(body.message || "").trim();
      if (!message) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: "message required" }));
        return;
      }
      const result = await runCodex(
        buildPrompt({
          userName: body.userName,
          message,
          history: body.history,
        }),
      );
      res.end(JSON.stringify({ reply: result.text, engine: "codex" }));
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not found" }));
  } catch (err) {
    console.error("[nomira-agent]", err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
  }
});

// Bind all interfaces so Docker bridge (172.17.0.1) can reach host-network service.
server.listen(PORT, "0.0.0.0", () => {
  console.log(`nomira-agent listening on 0.0.0.0:${PORT}`);
});
