/**
 * Password rules for setting a NEW password on platform.broadcastcopy.ai.
 * 8 characters minimum, the same rule the station site uses for sign-up,
 * reset and change (apps/web). 72 is bcrypt's input limit, which Supabase Auth
 * enforces; anything longer would be silently truncated, so it is refused.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

/** A human-readable problem with this new password, or null when it is fine. */
export function newPasswordProblem(password: string, confirmation: string): string | null {
  if (password.trim().length === 0) return "Enter a new password.";
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (new TextEncoder().encode(password).length > PASSWORD_MAX) {
    return `Use at most ${PASSWORD_MAX} characters.`;
  }
  if (password !== confirmation) return "The two passwords do not match.";
  return null;
}
