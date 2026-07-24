<script lang="ts">
  // 👥 CONSOLA DE LA TRIPULACIÓN — postura de EQUIPO (B28).
  //
  // Hacia dentro se diseña como una mano de cartas compartida: alrededor de este
  // móvil delibera un corro entero, así que todo lo secreto vive AQUÍ, junto,
  // grande y sin gestos (mapa, estela, rumbos del rival y cuaderno se miran a la
  // vez). Nada de «👁 ver»: esconder, aquí, estorba.
  //
  // Hacia fuera manda lo contrario, porque la tripulación rival está a dos metros:
  //  1) la consola se anuncia como secreta y se TAPA de un toque — y se tapa sola
  //     si el móvil se bloquea o se va a otra app, para que al dejarlo apoyado no
  //     quede el mapa boca arriba;
  //  2) ningún paso del turno cambia la SILUETA de la pantalla. El mapa es
  //     siempre el mismo y está siempre en el mismo sitio (apuntar NO añade una
  //     segunda rejilla, pinta sobre esta), las marcas de puntería son discretas
  //     y las cinco acciones se confirman con el mismo botón en el mismo lugar.
  //     Si el rival distingue de lejos «van a disparar», la caza se acabó.
  import { guard } from '../../../core/sync/guard';
  import { e2eTestMode } from '../../../core/test-hooks';
  import * as A from '../actions';
  import {
    legalDirs, torpedoTargets, silenceSteps, rival, TEAM_NAME,
    COST_TORPEDO, COST_DRONE, COST_SILENCE, SILENCE_MAX_STEPS, TORPEDO_RANGE, MAX_ENERGY,
  } from '../engine';
  import {
    DIR_LABEL, DIR_ARROW, cellName, stepTo, inBounds, isIsland, sameCell, manhattan, chebyshev,
    quadrantOf, type Cell, type Dir,
  } from '../map';
  import { ACTION_REF, ACTIONS_TITLE } from '../texts';
  import type { SonarState, Team } from '../types';
  import MapGrid from './MapGrid.svelte';
  import Notebook from './Notebook.svelte';

  const { game, team, active }: { game: SonarState; team: Team; active: boolean } = $props();
  const sub = $derived(game.subs[team]);
  const mine = $derived(TEAM_NAME[team]);
  const foe = $derived(TEAM_NAME[rival(team)]);
  const ORDER: Dir[] = ['N', 'W', 'E', 'S'];
  const dirs = $derived(legalDirs(game, team));

  // ——— Tapadera: lo único que se esconde, y se esconde del RIVAL, no de los tuyos ———
  let covered = $state(false);
  $effect(() => {
    if (e2eTestMode()) return;
    const onHide = () => { if (document.visibilityState === 'hidden') covered = true; };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  });

  // ——— Turno en dos pasos: qué acción y, sobre el mapa, a dónde ———
  let act = $state<'move' | 'torpedo' | 'drone' | 'silence' | 'surface' | null>(null);
  let dir = $state<Dir | null>(null);
  let cell = $state<Cell | null>(null);
  let hush = $state<{ d: Dir; n: number } | null>(null);
  const reset = () => { dir = null; cell = null; hush = null; };
  const back = () => { act = null; reset(); };
  const pick = (a: typeof act) => { reset(); act = a; };
  const pickDir = (d: Dir) => { reset(); act = 'move'; dir = d; };
  // Confirmar: el valor elegido se captura ANTES de limpiar el panel (si no, la
  // acción salía con el rumbo/casilla ya puestos a null).
  const go = <T,>(v: T, fn: (v: T) => Promise<void>) => { back(); guard(() => fn(v)); };
  $effect(() => { if (!active) back(); });

  /** Por qué NO se puede navegar hacia ahí (espeja el motor: borde, isla, estela). */
  function whyDir(d: Dir): string {
    const to = stepTo(sub.pos, d);
    if (!inBounds(to)) return '🌊 borde del mapa';
    if (isIsland(to)) return '⛰️ isla';
    if (sub.trail.some((t) => sameCell(t, to))) return '〰️ vuestra estela';
    return '';
  }
  const lack = (cost: number) => Math.max(0, cost - sub.energy);
  const short = (cost: number) => `⛔ Os faltan ${lack(cost)} ⚡ (tenéis ${sub.energy} de los ${cost}).`;
  const left = (cost: number) => `Cuesta ${cost} ⚡: os quedaríais con ${sub.energy - cost}.`;

  /** Adónde llega un deslizamiento en silencio: 1 o 2 casillas por rumbo. */
  const slips = $derived.by(() => {
    const out: { c: Cell; d: Dir; n: number }[] = [];
    for (const d of ORDER) {
      let c = sub.pos;
      const max = silenceSteps(game, team, d);
      for (let n = 1; n <= max; n++) { c = stepTo(c, d); out.push({ c: { ...c }, d, n }); }
    }
    return out;
  });

  // UN SOLO NOMBRE por acción (B34): el mismo en el menú, en el paso 2, en la
  // referencia 📖, en el «cómo se juega» y en lo que canta la voz («Torpedo del
  // submarino Rojo…»). Los VERBOS se reservan para el botón de confirmar, que
  // es el que nombra la consecuencia («💥 Disparar a D4»).
  const SYS = $derived([
    {
      k: 'torpedo' as const, emoji: '🚀', name: 'Torpedo', cost: `${COST_TORPEDO} ⚡`,
      desc: `A una casilla a ${TORPEDO_RANGE} o menos en línea recta: 2 de daño en el blanco y 1 en las 8 de alrededor… también a vosotros si disparáis pegados.`,
      why: lack(COST_TORPEDO) ? short(COST_TORPEDO) : '',
    },
    {
      k: 'drone' as const, emoji: '🛰️', name: 'Dron', cost: `${COST_DRONE} ⚡`,
      desc: `La app canta EN ALTO en cuál de los 4 cuadrantes está el ${foe}. Vosotros no os movéis.`,
      why: lack(COST_DRONE) ? short(COST_DRONE) : '',
    },
    {
      k: 'silence' as const, emoji: '🤫', name: 'Silencio', cost: `${COST_SILENCE} ⚡`,
      desc: `1 o ${SILENCE_MAX_STEPS} casillas en recta SIN cantar el rumbo: lo único que rompe su triangulación. No carga energía.`,
      why: lack(COST_SILENCE) ? short(COST_SILENCE)
        : !slips.length ? '⛔ No hay hueco por ningún rumbo (islas, bordes o vuestra estela). Solo os queda ⏫ Emerger.' : '',
    },
    {
      k: 'surface' as const, emoji: '⏫', name: 'Emerger', cost: 'gratis',
      desc: `Borra vuestra estela (${sub.trail.length} casilla${sub.trail.length === 1 ? '' : 's'}) y volvéis a maniobrar… pero cantáis vuestro cuadrante.`,
      why: '',
    },
  ]);

  // ——— El paso 2, idéntico para las cinco acciones ———
  // Mismo esqueleto (plan · consecuencia · confirmar · volver) y el mismo botón
  // en el mismo sitio: desde fuera no se distingue un torpedo de una navegación.
  interface Step {
    emoji: string; name: string; cost: string; plan: string; note: string;
    ready: boolean; a: string; label: string; run: () => void;
  }
  const dest = $derived(dir ? stepTo(sub.pos, dir) : null);
  const hushTo = $derived.by(() => slips.find((s) => hush && s.d === hush.d && s.n === hush.n)?.c ?? null);
  const selfHit = $derived(!!cell && chebyshev(sub.pos, cell) === 1);
  const step: Step | null = $derived.by(() => {
    if (act === 'move' && dir && dest) return {
      emoji: '🧭', name: `Navegar al ${DIR_LABEL[dir]}`, cost: 'gratis · +1 ⚡',
      plan: `De ${cellName(sub.pos)} a ${cellName(dest)} (marcada en el mapa). ${cellName(sub.pos)} os queda como estela.`,
      note: `📣 La mesa oirá «el ${TEAM_NAME[team]} navega al ${DIR_LABEL[dir]}» y el rival lo apuntará. Ganáis +1 ⚡: tendríais ${Math.min(MAX_ENERGY, sub.energy + 1)}.`,
      ready: true, a: 'sn-go', label: `🧭 Navegar al ${DIR_LABEL[dir]} (a ${cellName(dest)})`,
      run: () => go(dir!, A.move),
    };
    if (act === 'torpedo') return {
      emoji: '🚀', name: 'Torpedo', cost: `${COST_TORPEDO} ⚡`,
      plan: `Tocad en el mapa la casilla del disparo (las que podéis elegir salen con un +). ${left(COST_TORPEDO)}`,
      note: !cell
        ? '⛔ Aún no habéis elegido casilla.'
        : `🎯 ${cellName(cell)}, a ${manhattan(sub.pos, cell)} casilla${manhattan(sub.pos, cell) === 1 ? '' : 's'} de recorrido: 2 de daño si está justo ahí, 1 si está en las 8 de alrededor. Si es agua, el rival sabrá dónde le buscáis.${selfHit ? ` ⚠️ Estáis pegados: la onda os quitará 1 ❤️ (os quedaríais con ${sub.hp - 1}).` : ''}`,
      ready: !!cell, a: 'sn-fire', label: cell ? `💥 Disparar a ${cellName(cell)}` : '💥 Disparar',
      run: () => go(cell!, A.torpedo),
    };
    if (act === 'silence') return {
      emoji: '🤫', name: 'Silencio', cost: `${COST_SILENCE} ⚡`,
      plan: `Tocad en el mapa hasta dónde os deslizáis (1 o ${SILENCE_MAX_STEPS} casillas en recta). ${left(COST_SILENCE)}`,
      note: !hush || !hushTo
        ? `⛔ Aún no habéis elegido destino. Deslizarse 2 es lo que hace que valga su precio: por 1 casilla, navegar es gratis y encima carga ⚡.`
        : `🤫 ${hush.n} casilla${hush.n === 1 ? '' : 's'} al ${DIR_LABEL[hush.d]}, hasta ${cellName(hushTo)}. La mesa solo sabrá que os movisteis: ni rumbo ni distancia. Lo atravesado queda como estela y no cargáis energía.`,
      ready: !!hush, a: 'sn-hush', label: hushTo ? `🤫 Deslizarse hasta ${cellName(hushTo)}` : '🤫 Deslizarse',
      run: () => go(hush!, (h) => A.silence(h.d, h.n)),
    };
    if (act === 'drone') return {
      emoji: '🛰️', name: 'Dron', cost: `${COST_DRONE} ⚡`,
      plan: `La app dirá EN ALTO en cuál de los 4 cuadrantes está el ${foe}. No os movéis ni cargáis energía. ${left(COST_DRONE)}`,
      note: '📣 El rival también lo oirá: sabrá que le buscáis y que os quedan menos ⚡.',
      ready: true, a: 'sn-drone', label: `🛰️ Soltar el dron (${COST_DRONE} ⚡)`,
      run: () => go(null, A.drone),
    };
    if (act === 'surface') return {
      emoji: '⏫', name: 'Emerger', cost: 'gratis',
      plan: `Borráis vuestra estela (${sub.trail.length} casilla${sub.trail.length === 1 ? '' : 's'}) y volvéis a poder pasar por donde ya pasasteis. Os quedáis en ${cellName(sub.pos)}.`,
      note: `📣 Cantaréis EN ALTO vuestro cuadrante: ${quadrantOf(sub.pos)}. Es un cuarto del mapa entero, pero es la mejor pista que le vais a dar.`,
      ready: true, a: 'sn-surface', label: `⏫ Emerger y cantar el ${quadrantOf(sub.pos)}`,
      run: () => go(null, A.surface),
    };
    return null;
  });

  // El mapa es UNO y siempre el mismo: aquí solo cambia qué se puede tocar.
  // Como el mapa vive ARRIBA (es lo que mira el corro) y las acciones abajo, al
  // entrar en un paso que se resuelve tocando el mapa hay que subir hasta él: si
  // no, el panel pide «tocad una casilla» y la rejilla se ha quedado fuera.
  let mapEl: HTMLElement | null = $state(null);
  $effect(() => {
    if (act === 'torpedo' || act === 'silence') mapEl?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });
  const targets = $derived(act === 'torpedo' ? torpedoTargets(game, team) : act === 'silence' ? slips.map((s) => s.c) : []);
  const marked = $derived(act === 'torpedo' ? cell : act === 'silence' ? hushTo : act === 'move' ? dest : null);
  const onPick = $derived.by(() => {
    if (act === 'torpedo') return (c: Cell) => (cell = c);
    if (act === 'silence') return (c: Cell) => { const s = slips.find((x) => sameCell(x.c, c)); if (s) hush = { d: s.d, n: s.n }; };
    return null;
  });
</script>

<div class="snsecret" data-a="sn-secret">
  <span>🔒 <b>Secreto del {mine}</b> — el {foe} está en esta sala.</span>
  {#if !covered}
    <button class="small ghost" data-a="sn-cover" onclick={() => (covered = true)}>🙈 Tapar</button>
  {/if}
</div>

{#if covered}
  <!-- Cortina de PRIVACIDAD, no «ver mi carta» (B34 · 2): se rotula por lo que
       hace —tapar y destapar la consola— y no promete nada más. -->
  <button class="sncover" data-a="sn-uncover" onclick={() => (covered = false)}>
    <span class="snlock">🔒</span>
    <b>Consola tapada</b>
    <span class="small-note" style="margin:0">Debajo están vuestra posición, vuestra estela y vuestro cuaderno de sonar: no giréis la pantalla ni la dejéis boca arriba.</span>
    <span class="snopen">👉 Tocad para abrir la consola{active ? ' — os toca jugar' : ''}</span>
  </button>
{:else}
  <div class="card snconsole" bind:this={mapEl}>
    <h3>🗺️ Vuestro mapa · 📍 {cellName(sub.pos)}</h3>
    <MapGrid {sub} {team} {targets} sel={marked} {onPick} aim={act === 'silence' ? 'slip' : 'fire'} />
  </div>

  {#if active}
    <div class="actionpanel">
      <!-- «Os toca» ya lo dice la barra de arriba: aquí se dice qué HACER. -->
      <h3>🎬 Vuestra jugada</h3>
      {#if step}
        <p class="hint" style="margin-top:0">Repasad y confirmad, o cambiad de acción.</p>
        <div class="snplan">
          <div class="snhead"><span class="snemo">{step.emoji}</span><span class="snname">{step.name}</span><span class="sncost">{step.cost}</span></div>
          <div class="sndesc">{step.plan}</div>
        </div>
        <p class="snsel">{step.note}</p>
        <button class="primary block" data-a={step.a} disabled={!step.ready} onclick={step.run}>{step.label}</button>
        <button class="ghost block small" data-a="sn-back" onclick={back}>↩️ Elegir otra acción</button>
      {:else}
        <p class="hint" style="margin-top:0">Elegid UNA acción: al confirmarla, el turno pasa al {foe}.</p>
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
            <p class="snwhy">⛔ Ningún rumbo legal: vuestra propia estela os encierra. Solo os queda ⏫ Emerger, que la borra.</p>
          {/if}
        </div>

        {#each SYS as s (s.k)}
          <button class="snact snbtn {s.why ? 'off' : ''}" data-a="sn-act" data-p={s.k} disabled={!!s.why} onclick={() => pick(s.k)}>
            <div class="snhead"><span class="snemo">{s.emoji}</span><span class="snname">{s.name}</span><span class="sncost">{s.cost}</span></div>
            <div class="sndesc">{s.desc}</div>
          </button>
          {#if s.why}<p class="snwhy">{s.why}</p>{/if}
        {/each}
        {#if SYS.some((s) => s.why.startsWith('⛔ Os faltan'))}
          <!-- El «por qué» va en cada acción; el remedio, una sola vez. -->
          <p class="snwhy">⚡ La energía solo se carga navegando: +1 por casilla, hasta {MAX_ENERGY}.</p>
        {/if}
      {/if}

      <!-- La MISMA lista y el MISMO rótulo que abre la pastilla «📖 Reglas»
           (B34 · un nombre por cosa): aquí a mano, para no salir del panel. -->
      <details class="snref">
        <summary data-a="sn-ref">{ACTIONS_TITLE}</summary>
        {#each ACTION_REF as r (r.name)}
          <div class="settingrow">
            <div class="sinfo">
              <div class="sname">{r.emoji} {r.name}<span style="opacity:.65;font-weight:400"> · {r.note}</span></div>
              <div class="sdesc">{r.desc}</div>
            </div>
          </div>
        {/each}
      </details>
    </div>
  {:else if !game.paused}
    <!-- Si está en pausa, ya lo dice la tarjeta de arriba: aquí no se repite.
         Nunca una pantalla sin salida (B25 · 8): mientras decide el rival, se
         dice qué se puede ir haciendo… y si le llega para un torpedo. -->
    <div class="narration">
      🎧 Decide el {foe}. Vosotros, a triangular: apuntad su último rumbo en el cuaderno de sonar.
      {#if game.subs[rival(team)].energy >= COST_TORPEDO}
        <br />⚠️ Le llega para un torpedo 🚀: no os quedéis donde os oyó por última vez.
      {/if}
    </div>
  {/if}

  <Notebook {game} {team} />
{/if}

<style>
  /* El aviso «esto es secreto» abre la zona privada y es lo primero que se lee:
     si el móvil se queda apoyado, lo que asoma es esta banda, no el mapa. */
  .snsecret { display: flex; align-items: center; gap: 10px; margin: 12px 0 0; padding: 9px 12px; border-radius: var(--r-2); border: 1px dashed var(--accent); background: color-mix(in srgb, var(--accent) 10%, var(--bg-1)); }
  .snsecret span { flex: 1; font-size: 0.78rem; color: var(--muted); line-height: 1.45; }
  .snsecret b { color: var(--moon); }
  .snsecret button { flex: 0 0 auto; }
  .sncover { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%; min-height: 220px; justify-content: center; margin: 12px 0; padding: 24px 18px; border-radius: var(--r-2); border: 1px dashed var(--line-2); background: var(--bg2); color: var(--text); text-align: center; font-family: inherit; }
  .sncover b { font-size: 1.1rem; color: var(--moon); }
  .snopen { margin-top: 6px; font-size: 0.85rem; font-weight: 700; color: var(--accent); }
  .snlock { font-size: 2.6rem; }
  /* La barra de estado es pegajosa: al subir al mapa hay que dejarle su sitio. */
  .snconsole { scroll-margin-top: 150px; }
  .snact { display: block; width: 100%; text-align: left; padding: 11px 12px; margin-top: 8px; border-radius: var(--r-2); border: 1px solid var(--line-2); background: var(--card2); }
  .snbtn { font-family: inherit; color: var(--text); }
  .snact.off { opacity: 0.55; border-style: dashed; }
  .snhead { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
  .snemo { font-size: 1.35rem; }
  .snname { font-size: 1rem; font-weight: 700; color: var(--moon); }
  .sncost { font-size: 0.78rem; color: var(--muted); margin-left: auto; }
  .sndesc { font-size: 0.85rem; color: var(--text); margin-top: 5px; white-space: normal; line-height: 1.45; }
  .snwhy { font-size: 0.78rem; color: var(--moon); margin: 4px 2px 0; }
  .sndirs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-top: 8px; }
  .sndir { display: flex; flex-direction: column; align-items: flex-start; gap: 1px; min-height: 48px; padding: 7px 10px; font-size: 0.9rem; border: 1px solid var(--line-2); background: var(--bg2); color: var(--text); }
  .sndir span { font-size: 0.74rem; color: var(--muted); font-weight: 400; }
  .sndir.off { opacity: 0.5; border-style: dashed; }
  .snplan { padding: 11px 12px; border-radius: var(--r-2); border: 1px solid var(--accent); background: color-mix(in srgb, var(--accent) 12%, var(--card2)); }
  .snsel { font-size: 0.85rem; color: var(--text); margin: 10px 0 2px; line-height: 1.45; min-height: 2.6em; }
  .snref { margin-top: 14px; border-top: 1px solid var(--border); padding-top: 8px; }
  .snref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); padding: 4px 0; }
</style>
