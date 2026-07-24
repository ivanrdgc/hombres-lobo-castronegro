<script lang="ts">
  // «🎴 Mi carta + referencia» (B19/B21): la REFERENCIA completa del juego —
  // personajes y acciones con las copias que ya están boca arriba (dato público
  // que decide si un farol cuela). Tu mano ya no se «consulta» aquí: en Coup
  // (juego de mano, B28) vive fija en la pantalla de partida; se repite arriba
  // solo para no tener que cerrar el modal para mirarla.
  import { app, viewGroup, me } from '../../../../core/sync/store.svelte';
  import { coupGame } from '../../actions';
  import { CHARACTERS, CHAR_ORDER, ACTIONS, COPIES, claimLine, blockLine } from '../../chars';
  import RefRows from '../../../../shell/RefRows.svelte';
  import MyHand from '../MyHand.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? coupGame(g) : null);
  const my = $derived(me());
  const inGame = $derived(!!game && !!my && game.playerIds.includes(my.id));

  // Copias descubiertas (públicas) por personaje.
  const shown = $derived.by(() => {
    const n = { duque: 0, asesino: 0, capitan: 0, embajador: 0, condesa: 0 };
    if (game) for (const pid of game.playerIds) for (const h of game.hands[pid] || []) if (h.lost) n[h.char] += 1;
    return n;
  });
  const charRows = $derived(CHAR_ORDER.map((c) => ({
    emoji: CHARACTERS[c].emoji,
    name: CHARACTERS[c].name,
    note: `${COPIES} copias${shown[c] ? ` · ${shown[c]} boca arriba` : ''}`,
    desc: CHARACTERS[c].power,
  })));
  const actionRows = (['renta', 'ayuda', 'impuestos', 'robar', 'asesinar', 'intercambiar', 'golpe'] as const).map((a) => ({
    emoji: ACTIONS[a].emoji,
    name: ACTIONS[a].name + (ACTIONS[a].cost ? ` · cuesta 🪙${ACTIONS[a].cost}` : ''),
    note: a === 'golpe' ? 'obligatorio con 10+ monedas' : undefined,
    desc: `${ACTIONS[a].short} ${claimLine(a)}. ${blockLine(a)}.`,
  }));
</script>

{#if game && my}
  {#if inGame}
    <MyHand {game} pid={my.id} />
  {:else}
    <p class="small-note">👀 Miras de espectador: sin cartas propias.</p>
  {/if}
  <RefRows title="🎭 Los 5 personajes (corte de 15 cartas)" rows={charRows} />
  <RefRows title="🎬 Las 7 jugadas: coste, qué dices tener y quién las corta" rows={actionRows} />
  <p class="small-note">Quien se queda sin influencias, fuera. Gana el último en pie.</p>
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
