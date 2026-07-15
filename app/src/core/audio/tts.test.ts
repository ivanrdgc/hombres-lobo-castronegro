// Tests de la parte pura del audio: SSML y claves de caché.
import { expect, test } from 'vitest';
import { buildSsml, ttsCacheKey } from './tts';

test('buildSsml: pausas entre oraciones y prosody con el rate', () => {
  const s = buildSsml('Cae la noche. El pueblo duerme… ¿Quién vigila? ¡Nadie!', 95);
  expect(s.startsWith('<speak><prosody rate="95%">')).toBe(true);
  expect(s.endsWith('</prosody></speak>')).toBe(true);
  expect(s.match(/<break time="450ms"\/>/g)?.length).toBe(3);
});

test('buildSsml: una sola frase no lleva breaks pero sí prosody', () => {
  const s = buildSsml('Castronegro, abrid todos los ojos.', 100);
  expect(s).toBe('<speak><prosody rate="100%">Castronegro, abrid todos los ojos.</prosody></speak>');
});

test('buildSsml: escapa entidades XML', () => {
  const s = buildSsml('Pan & lobos <de> Castronegro.', 95);
  expect(s).toContain('Pan &amp; lobos &lt;de&gt; Castronegro.');
});

test('ttsCacheKey: determinista, sensible a voz, rate y texto COMPLETO', async () => {
  const a = await ttsCacheKey('es-ES-Chirp3-HD-Charon', 95, 'Hola Castronegro.');
  const b = await ttsCacheKey('es-ES-Chirp3-HD-Charon', 95, 'Hola Castronegro.');
  expect(a).toBe(b);
  expect(a).toMatch(/^[0-9a-f]{64}$/);
  expect(await ttsCacheKey('es-ES-Studio-F', 95, 'Hola Castronegro.')).not.toBe(a);
  expect(await ttsCacheKey('es-ES-Chirp3-HD-Charon', 100, 'Hola Castronegro.')).not.toBe(a);
  // El bug de la v1 (truncado a 1500 chars) no puede repetirse: textos largos
  // que comparten prefijo dan claves distintas.
  const long = 'x'.repeat(2000);
  const k1 = await ttsCacheKey('v', 95, long + 'FINAL-A');
  const k2 = await ttsCacheKey('v', 95, long + 'FINAL-B');
  expect(k1).not.toBe(k2);
});
