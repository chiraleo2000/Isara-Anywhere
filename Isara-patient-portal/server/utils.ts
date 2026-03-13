/** Safely extract an error message from an unknown catch value. */
export function errMsg(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return '[non-serializable error]';
  }
}
