"use client";

import { LiveChat } from "@/components/chat/live-chat";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#74ddc7] to-[#0d9488]">
          <MessageSquare className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Live Chat</h1>
          <p className="text-sm text-muted-foreground">Chat with DJs and other listeners in real time</p>
        </div>
      </div>
      <LiveChat />
    </div>
  );
}
