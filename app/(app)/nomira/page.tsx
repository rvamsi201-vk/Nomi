import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { NomiraChat } from "@/components/nomira-chat";

export default async function NomiraPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <NomiraChat userName={user.name} />;
}
