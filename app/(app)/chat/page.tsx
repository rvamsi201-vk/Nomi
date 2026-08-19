import { redirect } from "next/navigation";
import { requireMembership } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function ChatIndexPage() {
  const { org } = await requireMembership();
  const general = await prisma.channel.findUnique({
    where: {
      organizationId_slug: { organizationId: org.id, slug: "general" },
    },
  });
  redirect(general ? `/chat/${general.slug}` : "/team");
}
