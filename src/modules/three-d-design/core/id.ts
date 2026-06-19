/**
 * Stable id generation. Uses crypto.randomUUID where available (all modern
 * browsers), falls back to a counter+timestamp for older targets.
 */

let counter = 0;

export function newId(prefix: string = 'e'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  counter = (counter + 1) | 0;
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`;
}
