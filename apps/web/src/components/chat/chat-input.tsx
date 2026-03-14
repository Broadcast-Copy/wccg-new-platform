"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { saveMessage, getCooldownRemaining, MAX_MESSAGE_LENGTH } from "@/lib/chat";
import type { ChatMessage } from "@/lib/chat";

interface ChatInputProps {
  onMessageSent: (message: ChatMessage) => void;
}

export function ChatInput({ onMessageSent }: ChatInputProps) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const email = user?.email ?? "";
  const displayName =
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    email.split("@")[0] ||
    "Listener";

  const refreshCooldown = useCallback(() => {
    if (!email) return;
    const remaining = getCooldownRemaining(email);
    setCooldown(remaining);
    if (remaining <= 0 && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [email]);

  useEffect(() => {
    refreshCooldown();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [refreshCooldown]);

  function handleSend() {
    if (!email || !text.trim() || cooldown > 0) return;
    if (text.length > MAX_MESSAGE_LENGTH) return;

    const message: ChatMessage = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      displayName,
      message: text.trim(),
      timestamp: new Date().toISOString(),
      isFeatured: false,
      isOwn: true,
    };

    saveMessage(email, message);
    onMessageSent(message);
    setText("");

    // Start cooldown timer
    setCooldown(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!user) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center">
        <p className="text-sm text-white/50">
          Sign in to join the chat
        </p>
      </div>
    );
  }

  const charsRemaining = MAX_MESSAGE_LENGTH - text.length;
  const isOverLimit = charsRemaining < 0;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={cooldown > 0 ? `Wait ${cooldown}s...` : "Type a message..."}
            disabled={cooldown > 0}
            maxLength={MAX_MESSAGE_LENGTH + 10}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-[#74ddc7] focus:outline-none focus:ring-1 focus:ring-[#74ddc7] disabled:opacity-50"
          />
        </div>
        <Button
          onClick={handleSend}
          disabled={!text.trim() || cooldown > 0 || isOverLimit}
          className="bg-[#7401df] hover:bg-[#7401df]/80 text-white px-6 disabled:opacity-50"
        >
          {cooldown > 0 ? `${cooldown}s` : "Send"}
        </Button>
      </div>
      <div className="flex justify-end">
        <span
          className={`text-xs ${
            isOverLimit
              ? "text-red-400"
              : charsRemaining <= 30
                ? "text-amber-400"
                : "text-white/30"
          }`}
        >
          {charsRemaining}/{MAX_MESSAGE_LENGTH}
        </span>
      </div>
    </div>
  );
}
