import { prisma } from "@/lib/db";

const AGENT_URL =
  process.env.NOMIRA_AGENT_URL || "http://172.17.0.1:3015";

export async function getNomiraUser() {
  const byName = await prisma.user.findFirst({ where: { name: "nomira" } });
  if (byName) return byName;
  return prisma.user.findFirst({
    where: { email: { startsWith: "nomi-bot@" } },
  });
}

/**
 * Run Nomira via host-side Codex agent service (MCP tools on the VPS).
 */
export async function runNomiraAgent(input: {
  userName: string;
  userMessage: string;
  history?: { role: string; content: string }[];
}): Promise<{ text: string }> {
  const res = await fetch(`${AGENT_URL.replace(/\/$/, "")}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userName: input.userName,
      message: input.userMessage,
      history: input.history ?? [],
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    reply?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || `Nomira agent HTTP ${res.status}`);
  }
  const text = String(data.reply || "").trim();
  if (!text) throw new Error("Nomira agent returned an empty reply");
  return { text };
}

/**
 * If this channel is a DM with Nomira and the sender is a human, run the agent
 * and post Nomira's reply into the same channel.
 */
export async function maybeNomiraDmReply(input: {
  channelId: string;
  senderId: string;
  senderName: string;
  text: string;
}) {
  if (!input.text.trim()) return;
  const nomira = await getNomiraUser();
  if (!nomira || input.senderId === nomira.id) return;

  const channel = await prisma.channel.findUnique({
    where: { id: input.channelId },
    include: { members: { select: { userId: true } } },
  });
  if (!channel || channel.type !== "dm") return;
  const memberIds = channel.members.map((m) => m.userId);
  if (!memberIds.includes(nomira.id) || !memberIds.includes(input.senderId)) {
    return;
  }

  const recent = await prisma.message.findMany({
    where: { channelId: input.channelId },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { user: { select: { id: true, name: true } } },
  });
  const history = recent
    .reverse()
    .slice(0, -1)
    .map((m) => ({
      role: m.userId === nomira.id ? "assistant" : "user",
      content: m.text,
    }));

  const result = await runNomiraAgent({
    userName: input.senderName,
    userMessage: input.text,
    history,
  });

  await prisma.message.create({
    data: {
      channelId: input.channelId,
      userId: nomira.id,
      text: result.text,
    },
  });
}
