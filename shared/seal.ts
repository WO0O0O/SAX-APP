// Passphrase encryption for the sheet music published with the online copy.
// AES-256-GCM, key from PBKDF2-SHA256. Uses Web Crypto, so the same code runs in Node and the browser.
// A sealed blob is: 12-byte IV, then the ciphertext (which includes GCM's auth tag).

export type Manifest = {
  version: 1;
  salt: string; // base64
  iterations: number;
  check: string; // base64 sealed CHECK_TEXT: proves a passphrase is right before fetching anything
  files: Record<string, { sha256: string; bytes: number }>;
};

export const CHECK_TEXT = 'sax-tutor';
export const ITERATIONS = 250_000;

const enc = new TextEncoder();

export const toBase64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
export const fromBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function deriveKey(passphrase: string, salt: Uint8Array, iterations = ITERATIONS): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  );
}

export async function seal(key: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data as BufferSource));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return out;
}

/** Throws if the key is wrong or the data was tampered with. */
export async function unseal(key: CryptoKey, blob: Uint8Array): Promise<Uint8Array> {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: blob.slice(0, 12) }, key, blob.slice(12));
  return new Uint8Array(plain);
}

/** True if this key opens the manifest's check value. */
export async function keyMatches(key: CryptoKey, manifest: Manifest): Promise<boolean> {
  try {
    const text = new TextDecoder().decode(await unseal(key, fromBase64(manifest.check)));
    return text === CHECK_TEXT;
  } catch {
    return false;
  }
}

export async function sha256(data: Uint8Array): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data as BufferSource));
  return [...hash].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export { enc as textEncoder };
