import { describe, expect, it } from 'vitest';
import type { Reading } from './analysis.ts';
import { IntonationLog } from './intonation.ts';
import { ListenTracker } from './listen.ts';
import { LongTone, GRACE } from './longtone.ts';

const r = (midi: number, cents = 0): Reading => ({ midi, cents, hz: 0 });

describe('LongTone', () => {
  const frame = (reading: Reading | null, sounding = true) => ({ dt: 0.1, sounding, reading, mode: 'casual' as const });
  it('counts up while the note is held in tune', () => {
    const lt = new LongTone();
    for (let i = 0; i < 20; i++) lt.update(frame(r(72, 3)));
    expect(lt.duration).toBeCloseTo(2);
  });
  it('forgives a brief wobble but drops after 0.3 s out of tune', () => {
    const lt = new LongTone();
    for (let i = 0; i < 20; i++) lt.update(frame(r(72, 3)));
    expect(lt.update(frame(r(72, 30)))).toBeUndefined();
    expect(lt.update(frame(r(72, 30)))).toBeUndefined();
    for (let i = 0; i < 3; i++) lt.update(frame(r(72, 2))); // back in tune: forgiven
    expect(lt.duration).toBeGreaterThan(2);
    lt.update(frame(r(72, 30)));
    lt.update(frame(r(72, 30)));
    const drop = lt.update(frame(r(72, 30)));
    expect(drop).toMatchObject({ midi: 72, reason: 'sharp' });
    expect(drop!.seconds).toBeGreaterThan(2);
    expect(lt.duration).toBe(0);
  });
  it('says flat or silence as the reason', () => {
    const lt = new LongTone();
    for (let i = 0; i < 10; i++) lt.update(frame(r(70, 0)));
    let drop;
    for (let i = 0; i < 4; i++) drop = lt.update(frame(r(70, -30))) ?? drop;
    expect(drop?.reason).toBe('flat');
    for (let i = 0; i < 10; i++) lt.update(frame(r(70, 0)));
    for (let i = 0; i < 4; i++) drop = lt.update(frame(null, false)) ?? drop;
    expect(drop?.reason).toBe('silence');
  });
  it('starts a new hold when the note changes', () => {
    const lt = new LongTone();
    for (let i = 0; i < 20; i++) lt.update(frame(r(72)));
    const drop = lt.update(frame(r(74)));
    expect(drop).toMatchObject({ midi: 72, reason: 'changed' });
    expect(lt.midi).toBe(74);
  });
  it('uses the grace period of 0.3 s', () => {
    expect(GRACE).toBe(0.3);
  });
  it('is stricter in pro mode', () => {
    const lt = new LongTone();
    for (let i = 0; i < 5; i++) lt.update({ dt: 0.1, sounding: true, reading: r(72, 8), mode: 'pro' });
    expect(lt.duration).toBe(0);
  });
});

describe('ListenTracker', () => {
  // Feed a note steadily for `secs` starting at t.
  const play = (l: ListenTracker, t: number, midi: number | null, secs: number, cents = 0) => {
    const events: ReturnType<ListenTracker['update']> = [];
    for (let k = 0; k <= secs * 30; k++) events.push(...l.update(t + k / 30, midi === null ? null : r(midi, cents)));
    return events;
  };
  it('moves on when each note is played', () => {
    const l = new ListenTracker([72, 74, 76]);
    expect(play(l, 0, 72, 0.4).filter((e) => e.type === 'hit')).toHaveLength(1);
    play(l, 0.5, 74, 0.4);
    play(l, 1, 76, 0.4);
    expect(l.done).toBe(true);
  });
  it('does not tick through several notes on one long held note', () => {
    const l = new ListenTracker([72, 72, 72]);
    const events = play(l, 0, 72, 2);
    expect(events.filter((e) => e.type === 'hit')).toHaveLength(1);
  });
  it('counts a repeated note once there is a gap between', () => {
    const l = new ListenTracker([72, 72]);
    play(l, 0, 72, 0.4);
    play(l, 0.5, null, 0.2);
    expect(play(l, 0.8, 72, 0.4).filter((e) => e.type === 'hit')).toHaveLength(1);
    expect(l.done).toBe(true);
  });
  it('marks the note as fumbled when a wrong note is held, then finds the right one', () => {
    const l = new ListenTracker([72, 74]);
    const events = [...play(l, 0, 73, 0.6), ...play(l, 0.7, 72, 0.4)];
    expect(events.find((e) => e.type === 'wrong')).toMatchObject({ index: 0, heard: 73 });
    expect(events.find((e) => e.type === 'hit')).toMatchObject({ index: 0, clean: false });
    expect(l.position).toBe(1);
  });
  it('plays the next note cleanly after a fumble', () => {
    const l = new ListenTracker([72, 74]);
    play(l, 0, 71, 0.6);
    play(l, 0.7, 72, 0.4);
    const events = play(l, 1.2, 74, 0.4);
    expect(events.find((e) => e.type === 'hit')).toMatchObject({ index: 1, clean: true });
  });
  it('ignores a brief blip of the wrong note', () => {
    const l = new ListenTracker([72]);
    const events = [...play(l, 0, 73, 0.1), ...play(l, 0.2, 72, 0.4)];
    expect(events.some((e) => e.type === 'wrong')).toBe(false);
    expect(events.find((e) => e.type === 'hit')).toMatchObject({ clean: true });
  });
  it('ignores notes that are far out of tune (that is another note, not this one)', () => {
    const l = new ListenTracker([72]);
    expect(play(l, 0, 72, 0.5, 45).filter((e) => e.type === 'hit')).toHaveLength(0);
  });
});

describe('IntonationLog', () => {
  it('averages cents per note and skips the unsteady start of each note', () => {
    const log = new IntonationLog(0.2);
    for (let k = 0; k < 30; k++) log.add(k / 30, r(72, k < 6 ? -40 : 8)); // flat attack, then +8
    const out = log.take();
    expect(out).toHaveLength(1);
    expect(out[0].midi).toBe(72);
    expect(out[0].sum / out[0].n).toBeCloseTo(8, 0);
  });
  it('starts a fresh batch after take()', () => {
    const log = new IntonationLog(0);
    log.add(0, r(70, 5));
    log.add(0.1, r(70, 5));
    expect(log.take()).toHaveLength(1);
    expect(log.take()).toHaveLength(0);
  });
});
