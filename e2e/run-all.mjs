// Ejecuta las suites e2e EN PARALELO (cada una crea su propia mesa desechable,
// así que no se pisan). Uso:
//   BASE=https://tu-sitio.web.app node run-all.mjs            → todas
//   BASE=… node run-all.mjs e2e-infecto.mjs e2e-gaitero.mjs   → solo esas
// Concurrencia limitada (4) para no ahogar la máquina con navegadores.
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE;
if (!BASE) { console.error('Define BASE=https://tu-sitio.web.app'); process.exit(1); }

const DEFAULT_SUITES = [
  'e2e2.mjs', 'e2e-gaitero.mjs', 'e2e-caballero.mjs', 'e2e-infecto.mjs',
  'e2e-deadpeek.mjs', 'e2e-guiado.mjs', 'e2e-navegacion.mjs', 'e2e-multimesa.mjs',
  'e2e-espia.mjs', 'e2e-una-noche.mjs',
  // Auditoría de roles (23-07): combinaciones problemáticas por juego.
  'e2e-hl-roles.mjs', 'e2e-hl-pueblo.mjs', 'e2e-sirvienta.mjs', 'e2e-ladron.mjs',
  'e2e-una-roles.mjs', 'e2e-una-cazador.mjs', 'e2e-espia-timeup.mjs',
  // Juegos «máster oculto» (23-07): Ávalon y Secret Castronegro.
  'e2e-avalon.mjs', 'e2e-secret-hitler.mjs',
];
const suites = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_SUITES;
const CONCURRENCY = Number(process.env.E2E_JOBS || 4);

function runOne(suite) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const tag = suite.replace(/^e2e-?|\.mjs$/g, '') || '2';
    const child = spawn('node', [join(HERE, suite)], {
      env: { ...process.env, BASE },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const buf = [];
    const onData = (d) => buf.push(d);
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('close', (code) => {
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      // La salida de cada suite se imprime ENTERA al terminar (sin
      // intercalados ilegibles entre suites paralelas).
      console.log(`\n═══ ${suite} · ${code ? '✖ FALLA' : '✔ ok'} · ${secs}s ═══`);
      process.stdout.write(Buffer.concat(buf).toString());
      resolve({ suite, code: code ?? 1, secs });
    });
  });
}

const queue = suites.slice();
const results = [];
const t0 = Date.now();
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
  for (;;) {
    const suite = queue.shift();
    if (!suite) return;
    results.push(await runOne(suite));
  }
}));

const total = ((Date.now() - t0) / 1000).toFixed(0);
console.log('\n══════════ RESUMEN ══════════');
for (const r of results) console.log(` ${r.code ? '✖' : '✔'} ${r.suite} (${r.secs}s)`);
const failed = results.filter((r) => r.code);
console.log(failed.length
  ? `\n✖ ${failed.length}/${results.length} suites con fallos · ${total}s en total`
  : `\n✔ Las ${results.length} suites en verde · ${total}s en total`);
process.exit(failed.length ? 1 : 0);
