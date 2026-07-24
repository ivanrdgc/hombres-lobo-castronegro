<script lang="ts">
  // Turno del submarino, en dos pasos y con las reglas SIEMPRE delante (B25):
  //   1) las 5 acciones con su COSTE, su EFECTO en una línea y, si no se pueden
  //      usar, POR QUÉ («os faltan 2 ⚡», «la estela os encierra»);
  //   2) elegida una, se ve en claro qué va a pasar (a qué casilla, cuánta
  //      energía queda, qué oirá la mesa) y solo entonces se confirma con un
  //      botón que NOMBRA la consecuencia («💥 Disparar a E5»). Siempre con
  //      «↩️ Cambiar de acción» para volver.
  //   3) Plegada al fondo, la chuleta de las 5 acciones: nadie debería salir de
  //      la pantalla en la que está decidiendo.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import {
    legalDirs, torpedoTargets, silenceSteps, rival, TEAM_NAME,
    COST_TORPEDO, COST_DRONE, COST_SILENCE, SILENCE_MAX_STEPS, TORPEDO_RANGE, MAX_ENERGY, MAX_HP,
  } from '../engine';
  import {
    DIR_LABEL, DIR_ARROW, cellName, stepTo, inBounds, isIsland, sameCell, manhattan, chebyshev,
    quadrantOf, type Cell, type Dir,
  } from '../map';
  import { ACTION_REF } from '../texts';
  import type { SonarState, Team } from '../types';
  import MapGrid from './MapGrid.svelte';

  const { game, team }: { game: SonarState; team: Team } = $props();
  const sub = $derived(game.subs[team]);
  const foe = $derived(TEAM_NAME[rival(team)]);
  const ORDER: Dir[] = ['N', 'W', 'E', 'S'];
  const dirs = $derived(legalDirs(game, team));
  // Cuántas casillas admite el silencio en cada rumbo (0 = imposible).
  const silSteps = $derived(Object.fromEntries(ORDER.map((d) => [d, silenceSteps(game, team, d)])) as Record<Dir, number>);
  const canSilence = $derived(ORDER.some((d) => silSteps[d] > 0));

  // Paso 1 = qué acción; paso 2 = hacia dónde / a qué casilla; luego confirmar.
  let act = $state<'move' | 'torpedo' | 'drone' | 'silence' | 'surface' | null>(null);
  let dir = $state<Dir | null>(null);
  let cell = $state<Cell | null>(null);
  let hush = $state<{ d: Dir; n: number } | null>(null);
  const reset = () => { dir = null; cell = null; hush = null; };
  const back = () => { act = null; reset(); };
  const pick = (a: typeof act) => { reset(); act = a; };
  const pickDir = (d: Dir) => { reset(); act = 'move'; dir = d; };
  // Confirmar: el valor elegido se captura ANTES de limpiar el panel (si no,
  // la acción salía con el rumbo/casilla ya puestos a null).
  const go = <T,>(v: T, fn: (v: T) => Promise<void>) => { back(); guard(() => fn(v)); };

  /** Por qué NO se puede navegar hacia ahí (espeja el motor: borde, isla, estela). */
  function whyDir(d: Dir): string {
    const to = stepTo(sub.pos, d);
    if (!inBounds(to)) return '🌊 borde del mapa';
    if (isIsland(to)) return '⛰️ isla';
    if (sub.trail.some((t) => sameCell(t, to))) return '〰️ vuestra estela';
    return '';
  }
  const walk = (from: Cell, d: Dir, n: number): Cell => {
    let c = from;
    for (let i = 0; i < n; i++) c = stepTo(c, d);
    return c;
  };
  const lack = (cost: number) => Math.max(0, cost - sub.energy);
  const short = (cost: number) => `⛔ Os faltan ${lack(cost)} ⚡ (tenéis ${sub.energy} de los ${cost}): la energía solo se carga navegando.`;
  const left = (cost: number) => `Cuesta ${cost} ⚡: os quedaríais con ${sub.energy - cost} de ${MAX_ENERGY}.`;

  const SYS = $derived([
    {
      k: 'torpedo' as const, emoji: '🚀', name: 'Torpedo', cost: `${COST_TORPEDO} ⚡`,
      desc: `Elegís una casilla a ${TORPEDO_RANGE} o menos en línea recta. Directo: 2 de daño; en las 8 de alrededor: 1… también a vosotros si disparáis pegados.`,
      why: lack(COST_TORPEDO) ? short(COST_TORPEDO) : '',
    },
    {
      k: 'drone' as const, emoji: '🛰️', name: 'Dron', cost: `${COST_DRONE} ⚡`,
      desc: `La app canta EN ALTO en cuál de los 4 cuadrantes (cuartos de 4×4) está el ${foe}. Vosotros no os movéis.`,
      why: lack(COST_DRONE) ? short(COST_DRONE) : '',
    },
    {
      k: 'silence' as const, emoji: '🤫', name: 'Silencio', cost: `${COST_SILENCE} ⚡`,
      desc: `Os deslizáis 1 o ${SILENCE_MAX_STEPS} casillas en recta SIN cantar el rumbo: lo único que rompe su triangulación. No carga energía.`,
      why: lack(COST_SILENCE) ? short(COST_SILENCE)
        : !canSilence ? '⛔ No hay hueco por ningún rumbo (islas, bordes o vuestra estela). Toca ⏫ emerger.' : '',
    },
    {
      k: 'surface' as const, emoji: '⏫', name: 'Emerger', cost: 'gratis',
      desc: `Borra vuestra estela (${sub.trail.length} casilla${sub.trail.length === 1 ? '' : 's'}) y volvéis a maniobrar… pero cantáis vuestro cuadrante. Siempre legal.`,
      why: '',
    },
  ]);

  const dest = $derived(dir ? stepTo(sub.pos, dir) : null);
  const hushTo = $derived(hush ? walk(sub.pos, hush.d, hush.n) : null);
  const selfHit = $derived(!!cell && chebyshev(sub.pos, cell) === 1);
</script>

<div class="actionpanel">
  <h3>🎬 Vuestro turno</h3>
  <p class="hint" style="margin-top:0">
    📍 Estáis en <b>{cellName(sub.pos)}</b> · ❤️ {sub.hp} de {MAX_HP} · ⚡ {sub.energy} de {MAX_ENERGY}.
    UNA acción y el turno pasa al {foe}.
  </p>

  {#if act === null}
    <!-- Navegar va desplegado: la dirección ES la elección y es la acción de
         casi cada turno (no debería costar tres toques). -->
    <div class="snact">
      <div class="snhead"><span class="snemo">🧭</span><span class="snname">Navegar</span><span class="sncost">gratis · +1 ⚡</span></div>
      <div class="sndesc">Una casilla. El rumbo SE CANTA a toda la mesa (el rival lo apunta) y es la ÚNICA forma de cargar energía.</div>
      <div class="sndirs">
        {#each ORDER as d (d)}
          {@const why = whyDir(d)}
          <button class="sndir {why ? 'off' : ''}" data-a="sn-move" data-p={d} disabled={!!why} onclick={() => pickDir(d)}>
            <b>{DIR_ARROW[d]} {DIR_LABEL[d]}</b>
            <span>{why || `a ${cellName(stepTo(sub.pos, d))}`}</span>
          </button>
        {/each}
      </div>
      {#if !dirs.length}
        <p class="snwhy">⛔ Ningún rumbo legal: vuestra propia estela os encierra. Solo podéis ⏫ emerger (borra la estela).</p>
      {/if}
    </div>

    {#each SYS as s (s.k)}
      <button class="snact snbtn {s.why ? 'off' : ''}" data-a="sn-act" data-p={s.k} disabled={!!s.why} onclick={() => pick(s.k)}>
        <div class="snhead"><span class="snemo">{s.emoji}</span><span class="snname">{s.name}</span><span class="sncost">{s.cost}</span></div>
        <div class="sndesc">{s.desc}</div>
      </button>
      {#if s.why}<p class="snwhy">{s.why}</p>{/if}
    {/each}

  {:else if act === 'move' && dir && dest}
    <div class="snplan">
      <div class="snhead"><span class="snemo">🧭</span><span class="snname">Navegar al {DIR_LABEL[dir]}</span></div>
      <div class="sndesc">
        Pasáis de {cellName(sub.pos)} a <b>{cellName(dest)}</b> y ganáis +1 ⚡ (tendríais {Math.min(MAX_ENERGY, sub.energy + 1)} de {MAX_ENERGY}).
        La mesa oirá «el {TEAM_NAME[team]} navega al {DIR_LABEL[dir]}» y el rival lo apuntará. {cellName(sub.pos)} os queda como estela.
      </div>
    </div>
    <button class="primary block" data-a="sn-go" onclick={() => go(dir!, A.move)}>🧭 Navegar al {DIR_LABEL[dir]} (a {cellName(dest)})</button>
    <button class="ghost block small" data-a="sn-back" onclick={back}>↩️ Cambiar de acción</button>

  {:else if act === 'torpedo'}
    <div class="snplan">
      <div class="snhead"><span class="snemo">🚀</span><span class="snname">Torpedo</span><span class="sncost">{COST_TORPEDO} ⚡</span></div>
      <div class="sndesc">Tocad la casilla del disparo. {left(COST_TORPEDO)}</div>
    </div>
    <MapGrid {sub} {team} targets={torpedoTargets(game, team)} sel={cell} onPick={(c) => (cell = c)} />
    {#if cell}
      <p class="snsel">
        🎯 Apuntáis a <b>{cellName(cell)}</b>, a {manhattan(sub.pos, cell)} casilla{manhattan(sub.pos, cell) === 1 ? '' : 's'} de recorrido.
        Si el {foe} está justo ahí, 2 de daño; si está en una de las 8 de alrededor, 1. Si no hay nadie es agua… y el rival sabrá dónde le buscáis.
        {#if selfHit}<br /><b class="snwarn">⚠️ Estáis pegados: la onda os quitará 1 ❤️ (os quedaríais con {sub.hp - 1}).</b>{/if}
      </p>
      <button class="danger block" data-a="sn-fire" onclick={() => go(cell!, A.torpedo)}>💥 Disparar a {cellName(cell)}</button>
    {:else}
      <p class="snsel">Aún no habéis elegido casilla: tocad una 🎯 del mapa (o una 💥, si aceptáis que la onda os alcance).</p>
    {/if}
    <button class="ghost block small" data-a="sn-back" onclick={back}>↩️ Cambiar de acción</button>

  {:else if act === 'silence'}
    <div class="snplan">
      <div class="snhead"><span class="snemo">🤫</span><span class="snname">Silencio</span><span class="sncost">{COST_SILENCE} ⚡</span></div>
      <div class="sndesc">¿Hacia dónde y cuántas casillas? La mesa solo sabrá que os movisteis: ni rumbo ni distancia. {left(COST_SILENCE)}</div>
    </div>
    <div class="sndirs">
      {#each ORDER as d (d)}
        {#each Array.from({ length: silSteps[d] }, (_, i) => i + 1) as n (n)}
          <button class="sndir {hush && hush.d === d && hush.n === n ? 'on' : ''}" data-a="sn-silence" data-p={n === 1 ? d : `${d}${n}`}
            onclick={() => (hush = { d, n })}>
            <b>{DIR_ARROW[d]} {DIR_LABEL[d]} ×{n}</b>
            <span>a {cellName(walk(sub.pos, d, n))}</span>
          </button>
        {/each}
      {/each}
    </div>
    {#if hush && hushTo}
      <p class="snsel">
        🤫 Os deslizaréis {hush.n} casilla{hush.n === 1 ? '' : 's'} al {DIR_LABEL[hush.d]}, hasta <b>{cellName(hushTo)}</b>, sin cantar nada.
        Las casillas atravesadas quedan como estela y NO cargáis energía.
      </p>
      <button class="primary block" data-a="sn-hush" onclick={() => go(hush!, (h) => A.silence(h.d, h.n))}>🤫 Deslizarse {hush.n} al {DIR_LABEL[hush.d]} (a {cellName(hushTo)})</button>
    {:else}
      <p class="snsel">Elegid rumbo y distancia. Mover 2 es lo que hace que valga su precio: por 1 casilla, navegar es gratis y encima carga ⚡.</p>
    {/if}
    <button class="ghost block small" data-a="sn-back" onclick={back}>↩️ Cambiar de acción</button>

  {:else if act === 'drone'}
    <div class="snplan">
      <div class="snhead"><span class="snemo">🛰️</span><span class="snname">Dron</span><span class="sncost">{COST_DRONE} ⚡</span></div>
      <div class="sndesc">
        La app dirá EN ALTO en cuál de los 4 cuadrantes está el {foe} —y el rival también lo oirá: sabrá que le buscáis—.
        No os movéis ni cargáis energía. {left(COST_DRONE)}
      </div>
    </div>
    <button class="primary block" data-a="sn-drone" onclick={() => go(null, A.drone)}>🛰️ Soltar el dron ({COST_DRONE} ⚡)</button>
    <button class="ghost block small" data-a="sn-back" onclick={back}>↩️ Cambiar de acción</button>

  {:else if act === 'surface'}
    <div class="snplan">
      <div class="snhead"><span class="snemo">⏫</span><span class="snname">Emerger</span><span class="sncost">gratis</span></div>
      <div class="sndesc">
        Borráis vuestra estela ({sub.trail.length} casilla{sub.trail.length === 1 ? '' : 's'}) y volvéis a poder pasar por donde ya pasasteis…
        pero cantaréis EN ALTO vuestro cuadrante: <b>{quadrantOf(sub.pos)}</b>. Os quedáis en {cellName(sub.pos)} y no gastáis energía.
      </div>
    </div>
    <button class="primary block" data-a="sn-surface" onclick={() => go(null, A.surface)}>⏫ Emerger y cantar el {quadrantOf(sub.pos)}</button>
    <button class="ghost block small" data-a="sn-back" onclick={back}>↩️ Cambiar de acción</button>
  {/if}

  <details class="snref">
    <summary data-a="sn-ref">📖 Las 5 acciones, sus costes y sus reglas</summary>
    {#each ACTION_REF as r (r.name)}
      <div class="settingrow">
        <div class="sinfo">
          <div class="sname">{r.emoji} {r.name}<span style="opacity:.65;font-weight:400"> · {r.note}</span></div>
          <div class="sdesc">{r.desc}</div>
        </div>
      </div>
    {/each}
    <p class="small-note" style="margin-top:8px">Tope de energía: {MAX_ENERGY} ⚡ (lo que sobre se pierde). Cada casco aguanta {MAX_HP} de daño.</p>
  </details>
</div>

<style>
  .snact { display: block; width: 100%; text-align: left; padding: 11px 12px; margin-top: 8px; border-radius: var(--r-2); border: 1px solid var(--line-2); background: var(--card2); }
  .snbtn { font-family: inherit; color: var(--text); }
  .snact.off { opacity: 0.55; border-style: dashed; }
  .snhead { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .snemo { font-size: 1.35rem; }
  .snname { font-size: 1rem; font-weight: 700; color: var(--moon); }
  .sncost { font-size: 0.78rem; color: var(--muted); margin-left: auto; }
  .sndesc { font-size: 0.83rem; color: var(--text); margin-top: 5px; white-space: normal; line-height: 1.45; }
  .snwhy { font-size: 0.78rem; color: var(--moon); margin: 4px 2px 0; }
  .sndirs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-top: 8px; }
  .sndir { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; min-height: 46px; padding: 7px 10px; font-size: 0.88rem; border: 1px solid var(--line-2); background: var(--bg2); color: var(--text); }
  .sndir span { font-size: 0.72rem; color: var(--muted); font-weight: 400; }
  .sndir.off { opacity: 0.5; border-style: dashed; }
  .sndir.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 18%, var(--bg-1)); }
  .snplan { padding: 11px 12px; border-radius: var(--r-2); border: 1px solid var(--accent); background: color-mix(in srgb, var(--accent) 12%, var(--card2)); }
  .snsel { font-size: 0.83rem; color: var(--text); margin: 10px 0 2px; line-height: 1.45; }
  .snwarn { color: var(--danger); }
  .snref { margin-top: 14px; border-top: 1px solid var(--border); padding-top: 8px; }
  .snref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); padding: 4px 0; }
</style>
