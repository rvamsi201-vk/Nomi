import { redirect } from "next/navigation";
import { GENERAL_CHANNEL_SLUG, listVisibleChannels } from "@/lib/access";
import { requireMembership } from "@/lib/auth";

export default async function ChatIndexPage() {
  const { user, org, membership } = await requireMembership();
  const channels = await listVisibleChannels(org.id, user.id, membership.role);
  const general = channels.find((channel) => channel.slug === GENERAL_CHANNEL_SLUG);
  const first = general ?? channels[0];
  if (!first) redirect("/home");
  redirect(`/chat/${first.slug}`);
}
