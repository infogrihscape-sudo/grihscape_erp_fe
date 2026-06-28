/**
 * Generates a unique, server-safe file name for FormData uploads.
 * Preserves the original extension. Prevents name collisions on the server.
 *
 * Usage: fd.append('file', file, uniqueFileName(file))
 *
 * For human-readable display names use makeUniqueFileName() from utils/validators.ts
 */
export function uniqueFileName(file: File): string {
  const lastDot = file.name.lastIndexOf('.');
  const ext = lastDot !== -1 ? file.name.slice(lastDot).toLowerCase() : '';
  const ts  = Date.now();
  const rand = Math.random().toString(36).slice(2, 7);
  return `${ts}_${rand}${ext}`;
}
