"use client";

import Link from "next/link";
import { OnlineDot } from "@/components/live-session";
import { UnreadBadge } from "@/components/unread";

type Dm = { id: string; slug: string; name: string; otherUserId?: string | null };

export function DmNav({ dms }: { dms: Dm[] }) {
  return (
    <nav className="space-y-0.5">
      {dms.map((dm) => (
        <Link
          key={dm.id}
          href={`/chat/${dm.slug}`}
          className="nav-link"
        >
          <span className="flex min-w-0 items-center gap-2">
            <OnlineDot userId={dm.otherUserId} label={dm.name} />
            <span className="truncate">{dm.name}</span>
          </span>
          <UnreadBadge channelId={dm.id} />
        </Link>
      ))}
    </nav>
  );
}
