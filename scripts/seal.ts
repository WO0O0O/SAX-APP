// `npm run seal`: encrypts sheet-music/ (PDFs + *.tune.json) into public/sealed/ for the online copy.
// Only changed files are re-encrypted, so git diffs stay small. Passphrase from SAX_PASSPHRASE or a prompt.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHECK_TEXT, deriveKey, fromBase64, ITERATIONS, keyMatches, seal, sha256, textEncoder, toBase64, type Manifest } from '../shared/seal.ts';

const ROOT = join(import.meta.dirname, '..');
const SOURCE = join(ROOT, 'sheet-music');
const OUT = join(ROOT, 'public', 'sealed');
const MANIFEST = join(OUT, 'manifest.json');

/** Reads a line without echoing it. */
function askHidden(question: string): Promise<string> {
  process.stdout.write(question);
  const stdin = process.stdin;
  stdin.setRawMode?.(true);
  stdin.resume();
  let value = '';
  return new Promise((resolve) => {
    const onData = (buf: Buffer) => {
      for (const ch of buf.toString('utf8')) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') process.exit(1); // Ctrl+C
        value = ch === '\u007f' ? value.slice(0, -1) : value + ch;
      }
    };
    stdin.on('data', onData);
  });
}

const existing: Manifest | null = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : null;

let passphrase = process.env.SAX_PASSPHRASE ?? (await askHidden('Passphrase: '));
if (!existing && !process.env.SAX_PASSPHRASE && (await askHidden('Again, to confirm: ')) !== passphrase) {
  console.error('Passphrases did not match.');
  process.exit(1);
}
if (passphrase.length < 8) {
  console.error('Use at least 8 characters.');
  process.exit(1);
}

const salt = existing ? fromBase64(existing.salt) : crypto.getRandomValues(new Uint8Array(16));
const iterations = existing?.iterations ?? ITERATIONS;
const key = await deriveKey(passphrase, salt, iterations);
passphrase = '';

if (existing && !(await keyMatches(key, existing))) {
  console.error('That passphrase does not match the files already sealed. Use the same one, or delete public/sealed/ to start over.');
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const manifest: Manifest = {
  version: 1,
  salt: toBase64(salt),
  iterations,
  check: existing?.check ?? toBase64(await seal(key, textEncoder.encode(CHECK_TEXT))),
  files: {},
};

const sources = readdirSync(SOURCE).filter((f) => /\.(pdf|tune\.json)$/.test(f)).sort();
let changed = 0;
for (const name of sources) {
  const data = new Uint8Array(readFileSync(join(SOURCE, name)));
  const hash = await sha256(data);
  const out = join(OUT, `${name}.bin`);
  if (existing?.files[name]?.sha256 !== hash || !existsSync(out)) {
    writeFileSync(out, await seal(key, data));
    changed++;
    console.log(`sealed  ${name}`);
  }
  manifest.files[name] = { sha256: hash, bytes: data.length };
}

// Drop sealed copies of files that no longer exist.
for (const f of readdirSync(OUT)) {
  if (f.endsWith('.bin') && !manifest.files[f.slice(0, -4)]) {
    rmSync(join(OUT, f));
    console.log(`removed ${f}`);
  }
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log(`${sources.length} files, ${changed} re-sealed. Commit public/sealed/ and push to update the online copy.`);
