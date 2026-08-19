import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function ChatIndexPage() {
  const general = await prisma.channel.findUnique({ where: { slug: "general" } });
  redirect(general ? `/chat/${general.slug}` : "/login");
}
