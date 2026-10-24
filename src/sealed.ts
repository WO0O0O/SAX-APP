import { deriveKey, fromBase64, keyMatches, toBase64, unseal, type Manifest } from '../shared/seal.ts';

// Opens the encrypted sheet music in the online copy. The derived key (not the passphrase)
// is remembered in this browser so you only unlock once per device.
const STORE = 'sax.key.v1';
const BASE = `${import.meta.env.BASE_URL}sealed/`;

export class LockedError extends Error {}

let manifest: Promise<Manifest | null> | null = null;
const getManifest = () =>
  (manifest ??= fetch(`${BASE}manifest.json`)
    .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null))
    .catch(() => null));

async function storedKey(): Promise<CryptoKey | null> {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? await crypto.subtle.importKey('raw', fromBase64(raw), 'AES-GCM', true, ['decrypt']) : null;
  } catch {
    return null;
  }
}

export async function isUnlocked(): Promise<boolean> {
  const [m, key] = await Promise.all([getManifest(), storedKey()]);
  return Boolean(m && key && (await keyMatches(key, m)));
}

/** Returns false if the passphrase is wrong. */
export async function unlock(passphrase: string): Promise<boolean> {
  const m = await getManifest();
  if (!m) return false;
  const key = await deriveKey(passphrase, fromBase64(m.salt), m.iterations);
  if (!(await keyMatches(key, m))) return false;
  try {
    localStorage.setItem(STORE, toBase64(new Uint8Array(await crypto.subtle.exportKey('raw', key))));
  } catch {
    // storage blocked: works for this visit only
  }
  unlockedKey = key;
  return true;
}

let unlockedKey: CryptoKey | null = null;

/** Decrypts sheet-music/<name>. Throws LockedError until unlocked, or if the file isn't published. */
export async function openSealed(name: string): Promise<Uint8Array> {
  const m = await getManifest();
  if (!m?.files[name]) throw new Error(`Not published: ${name}`);
  const key = unlockedKey ?? (await storedKey());
  if (!key) throw new LockedError();
  const res = await fetch(`${BASE}${encodeURIComponent(name)}.bin`);
  if (!res.ok) throw new Error(`Missing: ${name}`);
  return unseal(key, new Uint8Array(await res.arrayBuffer()));
}
