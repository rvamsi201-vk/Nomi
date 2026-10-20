"use client";

import Link from "next/link";
import { UnreadBadge } from "@/components/unread";

type Channel = { id: string; slug: string; name: string };

export function ChannelNav({ channels }: { channels: Channel[] }) {
  return (
    <nav className="space-y-0.5">
      {channels.map((channel) => (
        <Link key={channel.id} href={`/chat/${channel.slug}`} className="nav-link">
          <span className="min-w-0 truncate"># {channel.name}</span>
          <UnreadBadge channelId={channel.id} />
        </Link>
      ))}
    </nav>
  );
}
