import { notFound } from "next/navigation";
import { userCanAccessChannel } from "@/lib/access";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ChatRoom } from "@/components/chat-room";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { user, org, membership } = await requireMembership();
  const { slug } = await params;

  const channel = await prisma.channel.findUnique({
    where: {
      organizationId_slug: { organizationId: org.id, slug },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true } } },
      },
    },
  });

  if (!channel) {
    notFound();
  }

  const allowed = await userCanAccessChannel(
    channel.id,
    user.id,
    org.id,
    membership.role,
  );
  if (!allowed) {
    notFound();
  }

  const isDm = channel.type === "dm";
  const other = isDm
    ? channel.members.find((m) => m.userId !== user.id)?.user
    : null;
  const displayName = isDm ? (other?.name ?? "DM") : channel.name;

  const messages = await prisma.message.findMany({
    where: {
      channelId: channel.id,
      ...(membership.role === "admin"
        ? {}
        : { NOT: { text: { startsWith: "📋" } } }),
    },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return (
    <ChatRoom
      channelId={channel.id}
      channelName={displayName}
      channelType={
        isDm ? "dm" : channel.type === "private" ? "private" : "public"
      }
      currentUserId={user.id}
      otherUserId={other?.id}
      initialMessages={messages.map((m) => ({
        id: m.id,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
        fileName: m.fileName,
        mimeType: m.mimeType,
        sizeBytes: m.sizeBytes,
        user: m.user,
      }))}
    />
  );
}
