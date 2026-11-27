import { z } from "zod";

/** @typedef {import('./client.js').NomiClient} NomiClient */

/**
 * Shared tool definitions for MCP + CLI dispatch.
 * @param {NomiClient} client
 */
export function createToolHandlers(client) {
  return {
    nomi_list_projects: {
      description: "List projects in the Nomi workspace",
      schema: z.object({}),
      handler: async () => client.listProjects(),
    },
    nomi_create_project: {
      description: "Create a project (admin). Optionally creates a linked #proj-* channel.",
      schema: z.object({
        name: z.string().min(1),
        description: z.string().optional().default(""),
        createChannel: z.boolean().optional().default(true),
      }),
      handler: async (args) =>
        client.createProject({
          name: args.name,
          description: args.description ?? "",
          createChannel: args.createChannel ?? true,
        }),
    },
    nomi_get_project_members: {
      description: "List members of a project",
      schema: z.object({ projectId: z.string().min(1) }),
      handler: async (args) => client.getProjectMembers(args.projectId),
    },
    nomi_set_project_members: {
      description: "Replace project members with the given user IDs",
      schema: z.object({
        projectId: z.string().min(1),
        memberIds: z.array(z.string().min(1)).min(1),
      }),
      handler: async (args) => client.setProjectMembers(args.projectId, args.memberIds),
    },
    nomi_list_tasks: {
      description: "List tasks visible to nomira (admin sees all)",
      schema: z.object({}),
      handler: async () => client.listTasks(),
    },
    nomi_create_task: {
      description: "Create a task on a project",
      schema: z.object({
        projectId: z.string().min(1),
        title: z.string().min(1),
        status: z
          .enum(["backlog", "todo", "in_progress", "done"])
          .optional()
          .default("todo"),
        assigneeId: z.string().optional().nullable(),
      }),
      handler: async (args) =>
        client.createTask({
          projectId: args.projectId,
          title: args.title,
          status: args.status ?? "todo",
          assigneeId: args.assigneeId ?? null,
        }),
    },
    nomi_update_task: {
      description: "Update a task title, status, or assignee",
      schema: z.object({
        id: z.string().min(1),
        title: z.string().optional(),
        status: z.enum(["backlog", "todo", "in_progress", "done"]).optional(),
        assigneeId: z.string().nullable().optional(),
      }),
      handler: async (args) => {
        const { id, ...body } = args;
        return client.updateTask(id, body);
      },
    },
    nomi_delete_task: {
      description: "Delete a task by id",
      schema: z.object({ id: z.string().min(1) }),
      handler: async (args) => client.deleteTask(args.id),
    },
    nomi_bulk_tasks: {
      description: "Bulk-create tasks from a list of titles",
      schema: z.object({
        projectId: z.string().min(1),
        titles: z.array(z.string().min(1)).min(1),
        status: z
          .enum(["backlog", "todo", "in_progress", "done"])
          .optional()
          .default("todo"),
      }),
      handler: async (args) =>
        client.bulkTasks({
          projectId: args.projectId,
          titles: args.titles,
          status: args.status ?? "todo",
        }),
    },
    nomi_list_channels: {
      description: "List public/project channels",
      schema: z.object({}),
      handler: async () => client.listChannels(),
    },
    nomi_create_channel: {
      description: "Create a public channel (admin)",
      schema: z.object({ name: z.string().min(1) }),
      handler: async (args) => client.createChannel({ name: args.name }),
    },
    nomi_list_messages: {
      description: "List messages in a channel (optional after ISO timestamp)",
      schema: z.object({
        channelId: z.string().min(1),
        after: z.string().optional(),
      }),
      handler: async (args) => client.listMessages(args.channelId, args.after),
    },
    nomi_post_message: {
      description: "Post a text message to a channel as nomira",
      schema: z.object({
        channelId: z.string().min(1),
        text: z.string().min(1),
      }),
      handler: async (args) => client.postMessage(args.channelId, args.text),
    },
    nomi_mark_read: {
      description: "Mark a channel as read",
      schema: z.object({ channelId: z.string().min(1) }),
      handler: async (args) => client.markRead(args.channelId),
    },
    nomi_list_dms: {
      description: "List direct-message threads for nomira",
      schema: z.object({}),
      handler: async () => client.listDms(),
    },
    nomi_start_dm: {
      description: "Start or open a DM with a teammate by user id",
      schema: z.object({ userId: z.string().min(1) }),
      handler: async (args) => client.startDm(args.userId),
    },
    nomi_list_team: {
      description: "List workspace org + members",
      schema: z.object({}),
      handler: async () => client.listTeam(),
    },
    nomi_list_users: {
      description: "List users available for DMs / assignment",
      schema: z.object({}),
      handler: async () => client.listUsers(),
    },
    nomi_unread: {
      description: "Get unread channel counts",
      schema: z.object({}),
      handler: async () => client.unread(),
    },
    nomi_presence: {
      description: "Get team presence / last-seen",
      schema: z.object({}),
      handler: async () => client.presence(),
    },
  };
}

/**
 * MCP tools/list payload from handler map.
 * @param {ReturnType<typeof createToolHandlers>} handlers
 */
export function toMcpToolList(handlers) {
  return Object.entries(handlers).map(([name, def]) => ({
    name,
    description: def.description,
    inputSchema: zodToJsonSchema(def.schema),
  }));
}

/** Minimal Zod object → JSON Schema (enough for MCP clients). */
function zodToJsonSchema(schema) {
  const shape = schema._def?.shape?.() || schema.shape || {};
  const properties = {};
  const required = [];
  for (const [key, field] of Object.entries(shape)) {
    properties[key] = zodFieldToJson(field);
    if (!isOptional(field)) required.push(key);
  }
  return {
    type: "object",
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false,
  };
}

function unwrap(field) {
  let f = field;
  while (f?._def) {
    const typeName = f._def.typeName;
    if (
      typeName === "ZodOptional" ||
      typeName === "ZodDefault" ||
      typeName === "ZodNullable"
    ) {
      f = f._def.innerType;
      continue;
    }
    break;
  }
  return f;
}

function isOptional(field) {
  let f = field;
  while (f?._def) {
    const typeName = f._def.typeName;
    if (typeName === "ZodOptional" || typeName === "ZodDefault") return true;
    if (typeName === "ZodNullable") {
      f = f._def.innerType;
      continue;
    }
    break;
  }
  return false;
}

function zodFieldToJson(field) {
  const f = unwrap(field);
  const typeName = f?._def?.typeName;
  if (typeName === "ZodString") return { type: "string" };
  if (typeName === "ZodBoolean") return { type: "boolean" };
  if (typeName === "ZodNumber") return { type: "number" };
  if (typeName === "ZodEnum") {
    return { type: "string", enum: [...(f._def.values || [])] };
  }
  if (typeName === "ZodArray") {
    return { type: "array", items: zodFieldToJson(f._def.type) };
  }
  if (typeName === "ZodObject") {
    return zodToJsonSchema(f);
  }
  // Nullable string etc.
  if (field?._def?.typeName === "ZodNullable") {
    const inner = zodFieldToJson(field._def.innerType);
    return { ...inner, nullable: true };
  }
  return {};
}
