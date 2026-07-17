// Nigerian phone numbers: 11 digits starting with 0, or 13 chars with +234 prefix.
// Normalises to international format (+234XXXXXXXXXX).
const NG_REGEX = /^(?:\+?234|0)([789]\d{9})$/;

export function isValidNGPhone(raw: string): boolean {
  return NG_REGEX.test(raw.replace(/\s+/g, ""));
}

export function normaliseNGPhone(raw: string): string {
  const digits = raw.replace(/\s+/g, "");
  const match = digits.match(NG_REGEX);
  if (!match) throw new Error(`Invalid Nigerian phone number: ${raw}`);
  return `+234${match[1]}`;
}

// SHA-256 hash of normalised phone — used for Meta CAPI matching.
export async function hashPhone(raw: string): Promise<string> {
  const normalised = normaliseNGPhone(raw);
  const encoded = new TextEncoder().encode(normalised);
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
