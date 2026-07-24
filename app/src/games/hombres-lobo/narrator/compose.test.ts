// La flecha del Cazador se anuncia por voz con el rol de la víctima (bug de la
// v1: solo se repetía el rol del cazador y la víctima quedaba muda).
import { expect, test } from 'vitest';
import { shotUtterance } from './compose';
import { hunterKillLine } from '../texts/corpus';
import type { GameState } from '../types';

test('hunterKillLine: nombra a la víctima y su rol (si se revela)', () => {
  const s = hunterKillLine('Beto', 'La Vidente', 'd1');
  expect(s).toMatch(/Beto/);
  expect(s).toMatch(/Era La Vidente\./);
  // Roles ocultos: solo la víctima, sin rol.
  expect(hunterKillLine('Beto', null, 'd1')).not.toMatch(/Era/);
});

const mkGame = (over: Partial<GameState>): GameState => ({
  seed: 42, dayNum: 1, night: 0, steps: [], stepIdx: 0, acts: {}, pending: [], revealDead: true,
  shotNonce: 1, lastShot: [{ name: 'Beto', role: 'vidente', hideRole: false }], ...over,
} as GameState);

test('shotUtterance: una locución por víctima, con su rol si la mesa lo revela', () => {
  const u = shotUtterance(mkGame({}));
  expect(u.segments.length).toBe(1);
  expect(u.display).toMatch(/Beto/);
  expect(u.display).toMatch(/Era La Vidente\./);
});

test('shotUtterance: con roles ocultos, la víctima sin rol', () => {
  const u = shotUtterance(mkGame({ revealDead: false }));
  expect(u.display).toMatch(/Beto/);
  expect(u.display).not.toMatch(/Era/);
});

test('shotUtterance: anuncia toda la cadena de la flecha (p. ej. enamorado que muere de amor)', () => {
  const u = shotUtterance(mkGame({
    lastShot: [
      { name: 'Beto', role: 'aldeano', hideRole: false },
      { name: 'Ana', role: 'vidente', hideRole: false },
    ],
  }));
  expect(u.segments.length).toBe(2);
  expect(u.display).toMatch(/Beto/);
  expect(u.display).toMatch(/Ana/);
});

// ——— Avisos de la llamada de los encantados ———
import { nagUtterance } from './compose';
import type { PlayerDoc } from '../../../core/sync/schema';

test('aviso de los encantados: repite las palabras de TODOS los que faltan, no solo las de los nuevos', () => {
  // Regresión: con acts.gaiteroTargets, un encantado de una noche anterior no
  // volvía a oír su palabra y el paso no avanzaba nunca.
  const players = [
    { id: 'p-old', name: 'Vieja', inGame: true, alive: true, charmed: true, keyword: 'Búho de Niebla' },
    { id: 'p-new', name: 'Nuevo', inGame: true, alive: true, charmed: true, keyword: 'Luna de Plata' },
  ] as unknown as PlayerDoc[];
  const u = nagUtterance(mkGame({ keywordsActive: true, acts: { gaiteroTargets: ['p-new'] } }), players, 'encantados', 0);
  expect(u.display).toContain('Búho de Niebla');
  expect(u.display).toContain('Luna de Plata');

  // Y quien ya confirmó deja de ser nombrado (su palabra ya rotó).
  const u2 = nagUtterance(
    mkGame({ keywordsActive: true, acts: { gaiteroTargets: ['p-new'], encantadosSeen: { 'p-new': true } } }),
    players, 'encantados', 0,
  );
  expect(u2.display).toContain('Búho de Niebla');
  expect(u2.display).not.toContain('Luna de Plata');
});

// ——— Densidad del guion por perfil de ritmo (rápido/normal/teatral) ———
import { bienvenidaUtterance, introUtterance, outroUtterance, nocheCaeUtterance, fillerUtterance } from './compose';
import { DRAMA, IMPROV } from '../texts/corpus';

test('densidad: teatral antepone una dramatización del paso; normal queda intacto', () => {
  const game = mkGame({ night: 1, stepIdx: 2, steps: ['durmiendo', 'lobos_reconocen', 'vidente'] as GameState['steps'] });
  const std = introUtterance(game, 'vidente');
  const max = introUtterance(game, 'vidente', 'max');
  expect(max.display!.endsWith(std.display!)).toBe(true); // solo añade DELANTE
  expect(DRAMA.vidente.some((d) => max.display!.startsWith(d))).toBe(true);
  // La dramatización no depende de quién viva: misma para el mismo paso y sal.
  expect(introUtterance(game, 'vidente', 'max').display).toBe(max.display);
});

test('densidad: rápido deja la despedida esencial (sin coletilla) y sin rellenos', () => {
  const game = mkGame({ night: 1, stepIdx: 2, steps: ['durmiendo', 'lobos_reconocen', 'vidente'] as GameState['steps'] });
  const std = outroUtterance(game, 'vidente')!;
  const min = outroUtterance(game, 'vidente', 'min')!;
  expect(min.segments.length).toBe(1);
  expect(std.display!.startsWith(min.display!)).toBe(true);
  expect(fillerUtterance(game, 'vidente', 'min')).toBeNull();
});

test('densidad: rápido va al grano — bienvenida directa (instrucción + palabras clave) y llamadas sin floritura', () => {
  const game = mkGame({ keywordsActive: true } as Partial<GameState>);
  const std = bienvenidaUtterance(game, []);
  const min = bienvenidaUtterance(game, [], 'min');
  expect(std.segments.length).toBe(4); // 3 piezas + nota de palabras clave
  expect(min.segments.length).toBe(2); // instrucción directa + palabras clave
  expect(std.display!.includes(min.display!.split(' ').slice(0, 4).join(' '))).toBe(true);

  const g2 = mkGame({ night: 1, stepIdx: 2, steps: ['durmiendo', 'lobos_reconocen', 'vidente'] as GameState['steps'] });
  const intro = introUtterance(g2, 'vidente', 'min');
  expect(intro.segments.length).toBe(2); // llamada + instrucción, sin la pieza central
});

test('densidad: teatral añade ambientación a la caída de la noche', () => {
  const game = mkGame({ night: 2 });
  const std = nocheCaeUtterance(game);
  const max = nocheCaeUtterance(game, 'max');
  expect(max.segments.length).toBe(std.segments.length + 1);
  const last = max.segments[max.segments.length - 1];
  expect(last.kind).toBe('clip');
  expect(IMPROV.noche).toContain((last as { kind: 'clip'; text: string }).text);
});
