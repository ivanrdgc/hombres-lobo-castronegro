<script lang="ts">
  // Turno de Coup en DOS pasos, con las reglas siempre delante: nadie debería
  // tener que saberse los 5 personajes de memoria.
  //   1) Cada jugada como tarjeta: coste, efecto, QUÉ PERSONAJE DICES TENER
  //      (que es lo que te pueden desafiar) y quién puede bloquearla. Las que no
  //      puedes pagar salen abajo, bloqueadas y diciendo POR QUÉ.
  //   2) Elegida una: «qué va a pasar», luego la víctima (con sus monedas y sus
  //      influencias), y un botón final que nombra la consecuencia. Reversible
  //      con «↩️ Cambiar de jugada».
  //   Al fondo, plegada, la chuleta de la corte con lo que ya está boca arriba.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { ACTIONS, ACTION_ORDER, claimLine, blockLine } from '../chars';
  import { legalActionTypes, targetsFor, mustCoup, isAlive, influenceCount } from '../engine';
  import CharRef from './CharRef.svelte';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { CoupState } from '../types';
  import type { ActionType } from '../types';

  const { game, my }: { game: CoupState; my: PlayerDoc } = $props();
  const turnPid = $derived(game.playerIds[game.turnIdx]);
  const myTurn = $derived(turnPid === my.id && isAlive(game, my.id) && game.playerIds.includes(my.id));
  const turnName = $derived(game.names[turnPid] || '¿?');
  const actions = $derived(myTurn ? legalActionTypes(game, my.id) : []);
  const forced = $derived(myTurn && mustCoup(game, my.id));
  const myCoins = $derived(game.coins[my.id] || 0);
  const turnCoins = $derived(game.coins[turnPid] || 0);

  // Las jugadas que HOY no puedes hacer no se esconden: se listan apagadas y con
  // el motivo al lado (un botón gris mudo no enseña el juego a nadie).
  const locked = $derived(myTurn && !forced ? ACTION_ORDER.filter((t) => !actions.includes(t)) : []);
  function lockReason(t: ActionType): string {
    const need = ACTIONS[t].cost - myCoins;
    if (t === 'robar') return 'Nadie tiene monedas que robar ahora mismo.';
    return `Te falta${need === 1 ? '' : 'n'} ${need} 🪙 (cuesta ${ACTIONS[t].cost} y tienes ${myCoins}).`;
  }

  let chosen = $state<ActionType | null>(null);
  let target = $state<string | null>(null);
  const chosenInfo = $derived(chosen ? ACTIONS[chosen] : null);
  const targets = $derived(chosen ? targetsFor(game, my.id, chosen) : []);
  const nm = (pid: string) => game.names[pid] || '¿?';

  // Lo que dirá el botón final: siempre nombra la consecuencia.
  const confirmLabel = $derived.by(() => {
    if (!chosen) return '';
    const to = target ? ` a ${nm(target)}` : '';
    if (chosen === 'renta') return '🪙 Coger 1 moneda';
    if (chosen === 'ayuda') return '🤝 Pedir ayuda exterior (+2 🪙)';
    if (chosen === 'golpe') return `💥 Dar el golpe${to} · pagas 7 🪙`;
    if (chosen === 'impuestos') return '🎩 Declarar Duque y cobrar 3 🪙';
    if (chosen === 'asesinar') return `🗡️ Declarar Asesino y matar${to} · pagas 3 🪙`;
    if (chosen === 'robar') return `⚓ Declarar Capitán y robar${to}`;
    return '🎭 Declarar Embajador e intercambiar';
  });

  // Con las monedas a la vista, la mesa sabe qué se puede permitir quien juega.
  const purse = $derived.by(() => {
    if (turnCoins >= 10) return 'Está obligado a dar un golpe de Estado.';
    if (turnCoins >= 7) return 'Le llega para 💥 golpe (7) y para 🗡️ asesinar (3).';
    if (turnCoins >= 3) return 'Le llega para 🗡️ asesinar (3), no para el 💥 golpe (7).';
    return 'No le llega ni para asesinar (3): irá a por monedas.';
  });

  function pick(t: ActionType) { chosen = t; target = null; }
  function go() {
    if (!chosen) return;
    if (chosenInfo!.needsTarget && !target) return;
    const t = chosen; const tg = target;
    guard(async () => { await A.act(t, tg); chosen = null; target = null; });
  }
</script>

{#if myTurn}
  <div class="narration">🎯 Es tu turno. Declara tu jugada… di la verdad o farolea.</div>

  <div class="actionpanel">
    {#if chosen === null}
      <h3 style="margin-top:0">🎬 Tu jugada · 🪙 {myCoins} monedas</h3>
      {#if forced}
        <p class="small-note" style="margin-top:0">💰 Tienes 10 o más monedas: estás obligado a dar un golpe de Estado. El resto de jugadas quedan bloqueadas este turno.</p>
      {:else}
        <p class="hint">Elige qué haces. Las jugadas de personaje se <b>declaran</b>: dices tener esa carta, la tengas o no… y te la pueden desafiar.</p>
      {/if}

      <div class="acts">
        {#each actions as t (t)}
          <button class="act" data-a="coup-action" data-p={t} onclick={() => pick(t)}>
            <span class="ae">{ACTIONS[t].emoji}</span>
            <span class="an">{ACTIONS[t].name}{ACTIONS[t].cost ? ` · cuesta 🪙${ACTIONS[t].cost}` : ''}</span>
            <span class="ad">{ACTIONS[t].short}</span>
            <span class="atag">{claimLine(t)}</span>
            <span class="atag">{blockLine(t)}</span>
          </button>
        {/each}
      </div>

      {#if locked.length}
        <p class="small-note" style="margin-bottom:2px">Ahora mismo no puedes:</p>
        <div class="acts">
          {#each locked as t (t)}
            <div class="act lock">
              <span class="ae">{ACTIONS[t].emoji}</span>
              <span class="an">{ACTIONS[t].name}</span>
              <span class="ad">🔒 {lockReason(t)}</span>
            </div>
          {/each}
        </div>
      {/if}
    {:else if chosenInfo}
      <h3 style="margin-top:0">{chosenInfo.emoji} {chosenInfo.name}{chosenInfo.cost ? ` · pagas 🪙${chosenInfo.cost}` : ''}</h3>
      <div class="plan">
        <p class="planline">{chosenInfo.plan}</p>
        <p class="atag">{claimLine(chosen)}</p>
        <p class="atag">{blockLine(chosen)}</p>
      </div>
      <button class="ghost block small" style="margin:8px 0" data-a="coup-back" onclick={() => { chosen = null; target = null; }}>↩️ Cambiar de jugada</button>

      {#if chosenInfo.needsTarget}
        <p class="small-note" style="margin:10px 0 2px"><b>{chosenInfo.ask}</b></p>
        <div class="players">
          <!-- Monedas e influencias en cada fila: elegir a quién robar o a quién
               rematar sin ellas obligaba a mirar el tablero de arriba. -->
          {#each targets as pid (pid)}
            <div class="player selectable {target === pid ? 'selected' : ''}" data-a="coup-target" data-p={pid}
              role="button" tabindex="0" onclick={() => (target = pid)} onkeydown={(e) => { if (e.key === 'Enter') target = pid; }}>
              <span class="pname">{nm(pid)}</span>
              <span class="tstat">🪙 {game.coins[pid] || 0} · 🂠 {influenceCount(game, pid)}</span>
              {#if target === pid}<span>✔️</span>{/if}
            </div>
          {/each}
        </div>
        {#if chosen === 'asesinar' || chosen === 'golpe'}
          <p class="small-note">🂠 = influencias que le quedan. Con 🂠 1, esta jugada lo elimina de la partida.</p>
        {/if}
      {:else}
        <p class="small-note" style="margin-top:10px">Esta jugada no elige víctima: solo confirma.</p>
      {/if}

      <button class="primary block" data-a="coup-do" disabled={chosenInfo.needsTarget && !target} onclick={go}>{confirmLabel}</button>
      {#if chosenInfo.needsTarget && !target}
        <p class="small-note">Elige antes a quién apuntas.</p>
      {/if}
    {/if}

    <CharRef {game} />
  </div>
{:else}
  <div class="narration">⏳ Es el turno de <b>{turnName}</b>. A ver qué se atreve a declarar…</div>
  <div class="card">
    <h3 style="margin-top:0">⏳ Le toca a {turnName}</h3>
    <p class="small-note" style="margin-top:0">🪙 Tiene {turnCoins} monedas. {purse}</p>
    <p class="small-note">Tú no tienes nada que tocar todavía: en cuanto declare, aquí mismo te saldrán los botones para <b>desafiar su farol</b> o <b>bloquearlo</b>. Ve repasando quién ha enseñado qué.</p>
    <CharRef {game} />
  </div>
{/if}

<style>
  .acts { display: flex; flex-direction: column; gap: 8px; }
  .act {
    display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto auto auto; column-gap: 10px; row-gap: 1px;
    text-align: left; padding: 11px 12px; border-radius: var(--r-2); border: 1px solid var(--line-2);
    background: var(--card2); color: inherit; cursor: pointer; width: 100%; min-height: 44px;
  }
  .act.lock { opacity: 0.6; border-style: dashed; cursor: default; grid-template-rows: auto auto; }
  .tstat { font-size: 0.8rem; color: var(--muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .ae { grid-row: 1 / -1; font-size: 1.6rem; align-self: start; }
  .an { font-weight: 700; color: var(--moon); }
  .ad { font-size: 0.84rem; color: var(--text); margin-top: 2px; }
  .atag { font-size: 0.8rem; color: var(--muted); margin: 0; }
  .plan { padding: 12px; border-radius: var(--r-2); border: 1px solid var(--accent); background: color-mix(in srgb, var(--accent) 12%, var(--card2)); }
  .planline { margin: 0 0 6px; font-size: 0.9rem; }
</style>
