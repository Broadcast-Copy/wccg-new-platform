"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChatMessage as ChatMessageComponent } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { resolveNowPlaying } from "@/data/schedule";
import { getMockMessages } from "@/data/chat-messages";
import { loadUserMessages } from "@/lib/chat";
import { useAuth } from "@/hooks/use-auth";
import type { ChatMessage } from "@/lib/chat";

interface DisplayMessage {
  id: string;
  displayName: string;
  message: string;
  timestamp: string;
  isFeatured: boolean;
  isOwn?: boolean;
}

// Build the combined (mock + user) message list for an email. Pulled out of the
// component so it can seed lazy state and run on email changes without a
// mount/update effect that sets state synchronously.
function buildMessages(email: string | undefined): DisplayMessage[] {
  const mock = getMockMessages();
  const userMsgs: DisplayMessage[] = email
    ? loadUserMessages(email).map((m) => ({ ...m, isOwn: true }))
    : [];
  return [...mock, ...userMsgs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export function LiveChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DisplayMessage[]>(() =>
    buildMessages(user?.email),
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const nowPlaying = resolveNowPlaying();

  // Reload the list when the signed-in email changes. "Adjust state during
  // render" pattern (React docs) — replaces an effect that set state
  // synchronously (react-hooks/set-state-in-effect). Initial value is seeded by
  // the lazy initializer above.
  const [syncedEmail, setSyncedEmail] = useState(user?.email);
  if (syncedEmail !== user?.email) {
    setSyncedEmail(user?.email);
    setMessages(buildMessages(user?.email));
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleNewMessage(message: ChatMessage) {
    setMessages((prev) => [
      ...prev,
      {
        id: message.id,
        displayName: message.displayName,
        message: message.message,
        timestamp: message.timestamp,
        isFeatured: message.isFeatured,
        isOwn: true,
      },
    ]);
  }

  return (
    <Card className="flex flex-col border-white/10 bg-white/5 h-[calc(100vh-16rem)] min-h-[500px]">
      {/* Now Playing Header */}
      <CardHeader className="flex-shrink-0 border-b border-white/10 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white">Live Chat</CardTitle>
            {nowPlaying && (
              <p className="mt-1 text-xs text-white/50">
                Now Playing: <span className="text-[#74ddc7]">{nowPlaying.showName}</span>
                {nowPlaying.hostNames !== "WCCG" && (
                  <span className="text-white/40"> with {nowPlaying.hostNames}</span>
                )}
              </p>
            )}
          </div>
          <Badge
            variant="secondary"
            className="bg-green-500/20 text-green-400 text-xs animate-pulse"
          >
            LIVE
          </Badge>
        </div>
      </CardHeader>

      {/* Messages Feed */}
      <CardContent
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2 py-4"
      >
        {messages.map((msg) => (
          <ChatMessageComponent
            key={msg.id}
            displayName={msg.displayName}
            message={msg.message}
            timestamp={msg.timestamp}
            isFeatured={msg.isFeatured}
            isOwn={msg.isOwn}
          />
        ))}
      </CardContent>

      {/* Chat Input */}
      <div className="flex-shrink-0 border-t border-white/10 p-4">
        <ChatInput onMessageSent={handleNewMessage} />
      </div>
    </Card>
  );
}
