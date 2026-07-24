<script lang="ts">
  // Fase de adivinar el código. En 'intercept' actúa el equipo RIVAL; en
  // 'decode', el propio equipo (menos su encriptador). Aquí es donde la mesa se
  // equivoca: la pista va PEGADA a cada elección y, antes de registrar, se lee
  // en claro la apuesta entera («apostáis 4-2-1: marea → palabra nº4…»).
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { encoderId, teamOf, teamMembers, other, TEAM_LABEL, TOKENS_TO_WIN } from '../engine';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { DecryptoState } from '../types';
  import CodePicker from './CodePicker.svelte';

  const { game, my }: { game: DecryptoState; my: PlayerDoc } = $props();
  const myTeam = $derived(teamOf(game, my.id));
  const intercepting = $derived(game.phase === 'intercept');
  const enc = $derived(encoderId(game, game.active));
  const encName = $derived(game.names[enc] || '¿?');
  const iEncode = $derived(myTeam === game.active && my.id === enc);
  /** Equipo que decide AHORA (y sus nombres: nadie debe preguntar «¿a quién esperamos?»). */
  const actingTeam = $derived(intercepting ? other(game.active) : game.active);
  const deciders = $derived(
    teamMembers(game, actingTeam).filter((p) => intercepting || p !== enc).map((p) => game.names[p] || '¿?'),
  );
  const listed = $derived(deciders.length > 1 ? `${deciders.slice(0, -1).join(', ')} y ${deciders[deciders.length - 1]}` : deciders[0] || 'su equipo');
  // ¿Le toca a MI equipo actuar en esta subfase? Interceptar → el rival del
  // activo; descifrar → el activo (y no el encriptador).
  const iCanAct = $derived.by(() => {
    if (!myTeam) return false;
    if (intercepting) return myTeam === other(game.active);
    return myTeam === game.active && !iEncode;
  });
  let code = $state<[number, number, number]>([0, 0, 0]);
  // La subfase cambia (interceptar → descifrar) sin desmontar: sin esto una
  // elección a medias del rival se quedaría pegada en pantalla.
  $effect(() => { void game.phase; void game.round; void game.active; code = [0, 0, 0]; });
  const picked = $derived(code.filter((d) => d >= 1).length);
  const ready = $derived(new Set(code).size === 3 && code.every((d) => d >= 1 && d <= 4));
  const ORD = ['1.ª', '2.ª', '3.ª'];
  const clues = $derived(game.clues || []);
  // Quien descifra SU código conoce sus palabras: van en los botones. Quien
  // intercepta solo tiene números (las palabras del rival son secretas).
  const options = $derived(intercepting ? null : game.words[game.active]);
  // La frase en claro que se lee antes de registrar nada.
  const say = $derived(
    code.map((d, i) => `«${clues[i] ?? ''}» → palabra nº ${d}${options?.[d - 1] ? ` (${options[d - 1]})` : ''}`).join(', '),
  );
</script>

<div class="narration">
  {#if intercepting}🕵️ El equipo {TEAM_LABEL[other(game.active)]} intenta INTERCEPTAR el código del {TEAM_LABEL[game.active]}.
  {:else}🔓 El equipo {TEAM_LABEL[game.active]} descifra su propio código (sin {encName}).{/if}
</div>

<div class="card">
  <h3 style="margin:0 0 6px">💬 Las 3 pistas del equipo {TEAM_LABEL[game.active]}</h3>
  <div class="declues">
    {#each clues as c, i (i)}
      <div class="dclue"><span class="dcord">{ORD[i]} pista</span><b>{c}</b></div>
    {/each}
  </div>
  <p class="small-note" style="margin:8px 0 0">⚠️ El orden de las pistas <b>no</b> es el de las palabras: la 1.ª pista puede apuntar a la palabra nº 3. El código es la palabra de cada pista, en este orden.</p>
</div>

{#if iCanAct}
  <div class="actionpanel"><h3>{intercepting ? '🕵️ Vuestra intercepción' : '🔓 Vuestro descifrado'}</h3>
    <p class="hint">
      {#if intercepting}Colocad cada pista en el número al que creéis que apunta. No veis sus palabras: usad la hoja de pistas de arriba (lo que ya dijeron para cada número).
      {:else}Colocad cada pista en la palabra vuestra a la que creéis que apunta.{/if}
    </p>
    <CodePicker value={code} {clues} {options} onchange={(c) => (code = c)} />
    {#if ready}
      <p class="desay" data-a="de-guess-say"><b>{intercepting ? 'Apostáis' : 'Decís'} {code.join('-')}</b>: {say}</p>
    {:else}
      <p class="small-note" style="margin:6px 0 0">Aún falta{picked === 2 ? '' : 'n'} {3 - picked} pista{picked === 2 ? '' : 's'} por colocar: el botón se enciende con las tres.</p>
    {/if}
    <button class="primary block" data-a={intercepting ? 'de-intercept' : 'de-decode'} disabled={!ready}
      onclick={() => guard(() => (intercepting ? A.submitIntercept(code) : A.submitDecode(code)))}>
      {intercepting ? '🕵️ Registrar intercepción' : '🔓 Registrar descifrado'}{ready ? ` ${code.join('-')}` : ''}
    </button>
    {#if picked}
      <button class="ghost block" style="margin-top:6px" data-a="de-guess-clear" onclick={() => (code = [0, 0, 0])}>↩️ Empezar de nuevo</button>
    {/if}
    <details class="deref">
      <summary>📖 Qué os jugáis y cómo vais</summary>
      <p class="small-note" style="margin:6px 0">
        {#if intercepting}🕵️ Si acertáis, os lleváis una ficha de intercepción ({TOKENS_TO_WIN} ganan la partida). Si falláis no perdéis nada: interceptar sale gratis.
        {:else}🔓 Si acertáis no pasa nada. Si falláis, os cae una ficha de error ❌ ({TOKENS_TO_WIN} pierden la partida).{/if}
      </p>
      <p class="small-note" style="margin:6px 0">🔴 {game.tokens.red.intercepts}🕵️ · {game.tokens.red.errors}❌ &nbsp;|&nbsp; 🔵 {game.tokens.blue.intercepts}🕵️ · {game.tokens.blue.errors}❌</p>
    </details>
  </div>
{:else if iEncode}
  <!-- El encriptador veía el mismo cartel que el rival («el equipo rojo
       descifra…») siendo él del rojo: aquí lo que necesita es callarse. -->
  <div class="card"><p class="hint">🤫 Tú diste las pistas: ahora <b>calla</b>.
    {#if intercepting}{listed} ({TEAM_LABEL[actingTeam]}) {deciders.length > 1 ? 'intentan' : 'intenta'} interceptarlas; después las descifrará tu equipo, también sin ti.
    {:else}{listed} {deciders.length > 1 ? 'deciden' : 'decide'} el código sin ti; no puedes corregir ni hacer señas.{/if}
  </p></div>
{:else if myTeam === game.active && intercepting}
  <div class="card"><p class="hint">🤫 Callad: {listed} ({TEAM_LABEL[other(game.active)]}) {deciders.length > 1 ? 'deliberan' : 'delibera'} su intercepción. Después descifraréis vosotros, sin {encName}.</p></div>
{:else}
  <div class="card"><p class="hint">👀 Esperando a {listed} ({TEAM_LABEL[actingTeam]}): {intercepting ? 'deliberan su intercepción' : 'descifran su código'}. Mientras, repasa la hoja de pistas de arriba.</p></div>
{/if}

<style>
  .declues { display: flex; flex-direction: column; gap: 6px; }
  .dclue { display: flex; align-items: baseline; gap: 8px; padding: 7px 10px; border-radius: 10px; border: 1px solid var(--border, #333); background: var(--card2, #222639); }
  .dclue .dcord { flex: 0 0 auto; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; color: var(--moon, #ffd98a); }
  .dclue b { font-size: 1.02rem; overflow-wrap: anywhere; }
  .desay { margin: 8px 0 0; padding: 9px 11px; border-radius: 10px; font-size: 0.88rem; line-height: 1.4; border: 1px solid var(--accent, #c8a24a); background: color-mix(in srgb, var(--accent, #c8a24a) 12%, transparent); }
  .deref { margin-top: 10px; }
  .deref summary { font-size: 0.8rem; color: var(--muted, #a9a6c0); cursor: pointer; }
</style>
