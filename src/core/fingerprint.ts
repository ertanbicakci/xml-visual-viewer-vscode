// A deterministic comparison key, not a cryptographic/authentication hash.
export function fingerprint(parts: Iterable<string>): string {
  let a = 2166136261,
    b = 5381;
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) {
      const code = part.charCodeAt(i);
      a = Math.imul(a ^ code, 16777619);
      b = Math.imul(b, 33) ^ code;
    }
    a = Math.imul(a ^ 0xffff, 16777619);
    b = Math.imul(b, 33) ^ 0xffff;
  }
  return (a >>> 0).toString(36) + "-" + (b >>> 0).toString(36);
}
