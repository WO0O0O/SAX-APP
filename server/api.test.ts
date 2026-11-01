import { describe, expect, it } from 'vitest';
import { openDb } from './db.ts';
import { seed } from './seed.ts';
import { api } from './api.ts';

const setup = () => {
  const db = openDb(':memory:');
  seed(db);
  return { db, app: api(db) };
};
const json = (method: string, body: unknown) => ({ method, headers: { 'content-type': 'application/json', host: '127.0.0.1:5757' }, body: JSON.stringify(body) });
const local = { headers: { host: '127.0.0.1:5757' } };

describe('api', () => {
  it('updates a tune milestone, tempo and no-chart flag', async () => {
    const { db, app } = setup();
    const res = await app.request('/tunes/1', json('PATCH', { stage: 2, tempo: 90, no_chart: true }));
    expect(res.status).toBe(200);
    expect(db.prepare('SELECT stage, tempo, no_chart FROM tune_progress WHERE tune_id = 1').get()).toEqual({ stage: 2, tempo: 90, no_chart: 1 });
    expect((await app.request('/tunes/1', json('PATCH', { stage: 9 }))).status).toBe(400);
  });

  it('counts lookups, including notes outside the seeded range', async () => {
    const { db, app } = setup();
    await app.request('/lookup', json('POST', { midi: 67 }));
    await app.request('/lookup', json('POST', { midi: 67 }));
    await app.request('/lookup', json('POST', { midi: 58 }));
    expect(db.prepare("SELECT lookups FROM notes_progress WHERE pitch = 'G4'").get()).toEqual({ lookups: 2 });
    expect(db.prepare("SELECT lookups FROM notes_progress WHERE pitch = 'Bb3'").get()).toEqual({ lookups: 1 });
  });

  it('stores quiz answers and reports accuracy per note', async () => {
    const { app } = setup();
    await app.request('/quiz', json('POST', { midi: 67, mode: 'note-keys', correct: true }));
    await app.request('/quiz', json('POST', { midi: 67, mode: 'keys-note', correct: false }));
    await app.request('/quiz', json('POST', { midi: 70, mode: 'note-keys', correct: true }));
    const stats = (await (await app.request('/quiz/stats', local)).json()) as { midi: number; answered: number; correct: number }[];
    expect(stats.map((r) => [r.midi, r.answered, r.correct])).toEqual([[67, 2, 1], [70, 1, 1]]);
    expect((await app.request('/quiz', json('POST', { midi: 40, mode: 'note-keys', correct: true }))).status).toBe(400);
    expect((await app.request('/quiz', json('POST', { midi: 67, mode: 'nope', correct: true }))).status).toBe(400);
  });

  it('stores ear-training answers and groups them by kind and item', async () => {
    const { app } = setup();
    await app.request('/ear', json('POST', { kind: 'interval', item: 'P5', correct: true }));
    await app.request('/ear', json('POST', { kind: 'interval', item: 'P5', correct: false }));
    await app.request('/ear', json('POST', { kind: 'chord', item: 'min7', correct: true }));
    const rows = (await (await app.request('/ear/stats', local)).json()) as { kind: string; item: string; answered: number; correct: number }[];
    expect(rows.map((r) => [r.kind, r.item, r.answered, r.correct])).toEqual([['chord', 'min7', 1, 1], ['interval', 'P5', 2, 1]]);
    expect((await app.request('/ear', json('POST', { kind: 'nope', item: 'x', correct: true }))).status).toBe(400);
    expect((await app.request('/ear', json('POST', { kind: 'chord', item: '', correct: true }))).status).toBe(400);
  });

  it('rejects chart slugs that try to leave the folder', async () => {
    const { app } = setup();
    expect((await app.request('/charts/..%2Fpackage', local)).status).toBe(404);
  });

  it('refuses other hosts (DNS rebinding) and non-JSON writes (cross-site posts)', async () => {
    const { app } = setup();
    expect((await app.request('/tunes', { headers: { host: 'evil.example:5757' } })).status).toBe(403);
    expect((await app.request('/tunes', local)).status).toBe(200);
    const formPost = { method: 'POST', headers: { host: '127.0.0.1:5757', 'content-type': 'text/plain' }, body: '{"midi":67}' };
    expect((await app.request('/lookup', formPost)).status).toBe(415);
  });
});
