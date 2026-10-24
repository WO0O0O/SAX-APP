import { describe, expect, it } from 'vitest';
import { CHECK_TEXT, deriveKey, keyMatches, seal, toBase64, unseal, type Manifest } from './seal.ts';

const salt = new Uint8Array(16).fill(7);
const text = new TextEncoder();

describe('seal', () => {
  it('round-trips with the right passphrase', async () => {
    const key = await deriveKey('blue in green', salt, 1000);
    const blob = await seal(key, text.encode('Autumn Leaves'));
    expect(new TextDecoder().decode(await unseal(key, blob))).toBe('Autumn Leaves');
  });

  it('fails with the wrong passphrase, and the check spots it', async () => {
    const right = await deriveKey('blue in green', salt, 1000);
    const wrong = await deriveKey('giant steps', salt, 1000);
    const blob = await seal(right, text.encode('secret'));
    await expect(unseal(wrong, blob)).rejects.toThrow();

    const manifest: Manifest = { version: 1, salt: toBase64(salt), iterations: 1000, check: toBase64(await seal(right, text.encode(CHECK_TEXT))), files: {} };
    expect(await keyMatches(right, manifest)).toBe(true);
    expect(await keyMatches(wrong, manifest)).toBe(false);
  });

  it('never produces the same ciphertext twice', async () => {
    const key = await deriveKey('x', salt, 1000);
    const a = await seal(key, text.encode('same'));
    const b = await seal(key, text.encode('same'));
    expect(toBase64(a)).not.toBe(toBase64(b));
  });
});
