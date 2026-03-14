/**
 * Live Chat — localStorage-backed chat message management
 * 30-second cooldown between messages, 280 character limit.
 */

export interface ChatMessage {
  id: string;
  displayName: string;
  message: string;
  timestamp: string; // ISO string
  isFeatured: boolean;
  isOwn?: boolean;
}

const COOLDOWN_MS = 30 * 1000; // 30 seconds
export const MAX_MESSAGE_LENGTH = 280;

function storageKey(email: string): string {
  return `wccg_chat_${email}`;
}

function cooldownKey(email: string): string {
  return `wccg_chat_cooldown_${email}`;
}

interface StoredChat {
  messages: ChatMessage[];
}

export function loadUserMessages(email: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (raw) {
      const data = JSON.parse(raw) as StoredChat;
      return data.messages.map((m) => ({ ...m, isOwn: true }));
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveMessage(email: string, message: ChatMessage): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadUserMessages(email).map((m) => {
      const { isOwn, ...rest } = m;
      return rest;
    });
    existing.push({
      id: message.id,
      displayName: message.displayName,
      message: message.message,
      timestamp: message.timestamp,
      isFeatured: message.isFeatured,
    });
    // Keep last 50 messages
    const trimmed = existing.slice(-50);
    localStorage.setItem(
      storageKey(email),
      JSON.stringify({ messages: trimmed }),
    );
    // Set cooldown
    localStorage.setItem(cooldownKey(email), String(Date.now()));
  } catch {
    // ignore
  }
}

/**
 * Returns remaining cooldown in seconds, or 0 if ready to send.
 */
export function getCooldownRemaining(email: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(cooldownKey(email));
    if (!raw) return 0;
    const lastSent = parseInt(raw, 10);
    const elapsed = Date.now() - lastSent;
    if (elapsed >= COOLDOWN_MS) return 0;
    return Math.ceil((COOLDOWN_MS - elapsed) / 1000);
  } catch {
    return 0;
  }
}
