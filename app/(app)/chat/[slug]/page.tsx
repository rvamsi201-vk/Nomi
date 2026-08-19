import { notFound } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ChatRoom } from "@/components/chat-room";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { user, org } = await requireMembership();
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

  const member = channel.members.find((m) => m.userId === user.id);
  if (!member) {
    notFound();
  }

  const isDm = channel.type === "dm";
  const displayName = isDm
    ? (channel.members.find((m) => m.userId !== user.id)?.user.name ?? "DM")
    : channel.name;

  const messages = await prisma.message.findMany({
    where: { channelId: channel.id },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  return (
    <ChatRoom
      channelId={channel.id}
      channelName={displayName}
      channelType={isDm ? "dm" : "public"}
      currentUserId={user.id}
      initialMessages={messages.map((m) => ({
        id: m.id,
        text: m.text,
        createdAt: m.createdAt.toISOString(),
        user: m.user,
      }))}
    />
  );
}
