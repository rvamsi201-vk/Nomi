#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { clientFromEnv } from "./client.js";
import { createToolHandlers } from "./tools.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

function usage() {
  return `nomi — CLI for the Nomi workspace (acts as nomira)

Usage:
  nomi <group> <action> [flags]
  nomi tool <tool_name> [--json '{...}']

Groups:
  projects list
  projects create --name NAME [--description TEXT] [--no-channel]
  projects members --project ID
  projects set-members --project ID --users ID,ID

  tasks list
  tasks create --project ID --title TEXT [--status todo] [--assignee ID]
  tasks update --id ID [--title TEXT] [--status STATUS] [--assignee ID|none]
  tasks delete --id ID
  tasks bulk --project ID --titles '["a","b"]' [--status todo]

  channels list
  channels create --name NAME

  chat messages --channel ID [--after ISO]
  chat post --channel ID --text MESSAGE
  chat read --channel ID

  dms list
  dms start --user ID

  team list
  users list
  unread
  presence

  tools                 List MCP tool names
  tool <name> [--json]  Call any MCP tool by name

Env: NOMI_BASE_URL (default http://127.0.0.1:3002), NOMI_API_TOKEN
`;
}

function parseArgs(argv) {
  const out = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") continue;
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        out.flags[key] = true;
      } else {
        out.flags[key] = next;
        i++;
      }
    } else {
      out._.push(a);
    }
  }
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    process.stdout.write(usage());
    return;
  }

  const client = clientFromEnv();
  const handlers = createToolHandlers(client);
  const { _, flags } = parseArgs(argv);
  const [group, action, ...rest] = _;

  const print = (data) => {
    process.stdout.write(JSON.stringify(data, null, 2) + "\n");
  };

  if (group === "tools") {
    print(Object.keys(handlers));
    return;
  }

  if (group === "tool") {
    const name = action;
    const def = handlers[name];
    if (!def) throw new Error(`Unknown tool ${name}`);
    const args = flags.json ? JSON.parse(String(flags.json)) : {};
    print(await def.handler(def.schema.parse(args)));
    return;
  }

  if (group === "projects") {
    if (action === "list") return print(await client.listProjects());
    if (action === "create") {
      return print(
        await client.createProject({
          name: flags.name || rest[0],
          description: flags.description || "",
          createChannel: !flags["no-channel"],
        }),
      );
    }
    if (action === "members") {
      return print(await client.getProjectMembers(flags.project));
    }
    if (action === "set-members") {
      const memberIds = String(flags.users || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return print(await client.setProjectMembers(flags.project, memberIds));
    }
  }

  if (group === "tasks") {
    if (action === "list") return print(await client.listTasks());
    if (action === "create") {
      return print(
        await client.createTask({
          projectId: flags.project,
          title: flags.title,
          status: flags.status || "todo",
          assigneeId: flags.assignee || null,
        }),
      );
    }
    if (action === "update") {
      const body = {};
      if (flags.title !== undefined) body.title = flags.title;
      if (flags.status !== undefined) body.status = flags.status;
      if (flags.assignee !== undefined) {
        body.assigneeId = flags.assignee === "none" ? null : flags.assignee;
      }
      return print(await client.updateTask(flags.id, body));
    }
    if (action === "delete") return print(await client.deleteTask(flags.id));
    if (action === "bulk") {
      const titles = JSON.parse(String(flags.titles || flags.json || "[]"));
      return print(
        await client.bulkTasks({
          projectId: flags.project,
          titles,
          status: flags.status || "todo",
        }),
      );
    }
  }

  if (group === "channels") {
    if (action === "list") return print(await client.listChannels());
    if (action === "create") return print(await client.createChannel({ name: flags.name }));
  }

  if (group === "chat") {
    if (action === "messages") {
      return print(await client.listMessages(flags.channel, flags.after));
    }
    if (action === "post") {
      return print(await client.postMessage(flags.channel, flags.text));
    }
    if (action === "read") return print(await client.markRead(flags.channel));
  }

  if (group === "dms") {
    if (action === "list") return print(await client.listDms());
    if (action === "start") return print(await client.startDm(flags.user));
  }

  if (group === "team" && action === "list") return print(await client.listTeam());
  if (group === "users" && action === "list") return print(await client.listUsers());
  if (group === "unread") return print(await client.unread());
  if (group === "presence") return print(await client.presence());

  throw new Error(`Unknown command: ${_.join(" ")}\n\n${usage()}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
