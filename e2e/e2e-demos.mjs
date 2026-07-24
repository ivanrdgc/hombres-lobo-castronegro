// E2E de los tutoriales (demo de un solo dispositivo): en el lobby de CADA
// juego hay un botón «🎓 Tutorial interactivo», el modal recorre todos los
// pasos (visual, pregunta interactiva con respuesta, ▶️ de lectura) y termina
// con «¡Listo, a jugar!». Un solo dispositivo, sin partida.
import { chromium } from 'playwright';
const BASE = process.env.BASE; if (!BASE) { console.error('Define BASE=https://tu-sitio.web.app'); process.exit(1); }
let fail = 0;
const ok = (m) => console.log('  ✔', m);
const bad = (m) => { fail++; console.log('  ✖', m); };
const check = (c, m) => (c ? ok(m) : bad(m));

// LOS 17: el tutorial es la puerta de entrada de una mesa que no conoce el
// juego, así que se recorre entero en todos (antes solo se probaban 9 y los
// tutoriales nuevos podían romperse sin que saltara nada).
const GAMES = [
  'hombres_lobo', 'una_noche', 'avalon', 'secret_hitler', 'chameleon',
  'insider', 'coup', 'two_rooms', 'codenames', 'decrypto', 'good_cop',
  'shadow_hunters', 'sonar', 'wavelength', 'skull', 'love_letter', 'espia',
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ locale: 'es-ES' });
await ctx.addInitScript(() => { window.__hlcTest = true; });
const page = await ctx.newPage();
page.on('pageerror', (e) => bad(`[demo] ${e.message}`));

try {
  const GROUP = 'Demo ' + Date.now().toString(36).slice(-5);
  await page.goto(BASE + '/');
  await page.fill('#inp-name', 'Ana');
  await page.fill('#inp-group', GROUP);
  await page.click('[data-a=create-group]');
  await page.waitForURL('**/g/**');
  const url = page.url();

  for (const gid of GAMES) {
    console.log(`— ${gid} —`);
    await page.goto(url);
    await page.waitForSelector('text=/Dispositivos/');
    await page.click(`button[data-a=select-game][data-p=${gid}]`);
    await page.waitForSelector('[data-a=open-demo]', { timeout: 15000 });
    ok('el lobby ofrece el tutorial');
    await page.click('[data-a=open-demo]');
    await page.waitForSelector('text=/Tutorial de/', { timeout: 8000 });

    // Recorre todos los pasos con «Siguiente»; en el que tenga pregunta, toca
    // una opción y comprueba que aparece la respuesta (✅/💡). Cuenta también
    // los banners 🎬 de «quién actúa ahora» (deben acompañar el recorrido).
    let steps = 0;
    let asked = false;
    let whoSeen = 0;
    for (let guard = 0; guard < 30; guard++) {
      steps++;
      if (await page.locator('[data-a=demo-who]').count()) whoSeen++;
      const choice = page.locator('[data-a=demo-choice]').first();
      if (!asked && await choice.count()) {
        await choice.click();
        await page.waitForSelector('[data-a=demo-reply]', { timeout: 4000 });
        asked = true;
      }
      const next = page.locator('[data-a=demo-next]');
      if (await next.count()) { await next.click(); continue; }
      break;
    }
    check(steps >= 5, `recorre sus ${steps} pasos`);
    check(asked, 'la pregunta interactiva responde al tocar una opción');
    check(whoSeen >= 4, `el «quién actúa ahora» 🎬 acompaña el tutorial (${whoSeen} pasos)`);
    check(await page.locator('[data-a=demo-play]').count() >= 1, 'el paso final tiene ▶️ de lectura');
    await page.click('[data-a=demo-done]');
    await page.waitForSelector('[data-a=open-demo]', { timeout: 8000 });
    ok('«¡Listo, a jugar!» devuelve al lobby');
  }

  // El botón «‹ Anterior» y el bloqueo de scroll del fondo (muestra: un juego).
  await page.click('[data-a=open-demo]');
  await page.waitForSelector('[data-a=demo-next]');
  const locked = await page.evaluate(() => getComputedStyle(document.body).position === 'fixed' && document.body.classList.contains('modal-open'));
  check(locked, 'con el tutorial abierto, el fondo queda fijo (no hace scroll)');
  await page.click('[data-a=demo-next]');
  await page.click('[data-a=demo-prev]');
  check(await page.locator('text=Paso 1 de').count() === 1, '«Anterior» vuelve al paso 1');
  await page.click('button[data-a=close-modal]');
  await page.waitForSelector('[data-a=open-demo]');
  const unlocked = await page.evaluate(() => getComputedStyle(document.body).position !== 'fixed' && !document.body.classList.contains('modal-open'));
  check(unlocked, 'al cerrar, el fondo se desbloquea');

  // Limpieza: Ana abandona (la mesa se borra sola al ser la última).
  await page.goto(url);
  const me = await page.waitForSelector('.player[data-a=player-menu]:has(.badge.you)', { timeout: 9000 }).catch(() => null);
  if (me) {
    await me.click();
    await page.click('[data-a=leave]');
    await page.click('[data-a=leave-confirm]');
    await page.waitForURL(BASE + '/', { timeout: 12000 }).catch(() => {});
  }
  ok('limpieza de la mesa');
} catch (e) {
  fail++;
  console.log('✖ EXCEPCIÓN:', e.message);
  try { await page.screenshot({ path: 'faildemo.png' }); } catch { /* cerrada */ }
}
await browser.close();
console.log(fail ? `\n✖ E2E-demos con ${fail} fallos` : '\n✔ E2E-demos OK');
process.exit(fail ? 1 : 0);
