<script lang="ts">
  // La pastilla flotante de Coup es «📖 Reglas», y NADA MÁS (B34). Coup es un
  // juego de MANO: tus dos influencias viven fijas en la pantalla de partida, así
  // que aquí no se vuelven a enseñar —el flotante no repite lo que ya se ve—.
  // Lo que se viene a consultar es la referencia completa: los 5 personajes con
  // las copias que ya están boca arriba (dato público que decide si un farol
  // cuela) y las 7 jugadas con su coste, qué personaje declaran y quién las
  // corta. Se abre en cualquier fase, también de espectador.
  import { app, viewGroup } from '../../../../core/sync/store.svelte';
  import { coupGame } from '../../actions';
  import { CHARACTERS, CHAR_ORDER, ACTIONS, ACTION_ORDER, COPIES, claimLine, blockLine } from '../../chars';
  import RefRows from '../../../../shell/RefRows.svelte';

  const g = $derived(viewGroup());
  const game = $derived(g ? coupGame(g) : null);

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
  const actionRows = ACTION_ORDER.map((a) => ({
    emoji: ACTIONS[a].emoji,
    name: ACTIONS[a].name + (ACTIONS[a].cost ? ` · cuesta 🪙${ACTIONS[a].cost}` : ''),
    note: a === 'golpe' ? 'obligatorio con 10+ monedas' : undefined,
    desc: `${ACTIONS[a].short} ${claimLine(a)}. ${blockLine(a)}.`,
  }));
</script>

{#if game}
  <h3 style="margin:0 0 6px">📖 Las reglas de Coup</h3>
  <p class="lead">Quien descubre sus dos influencias queda fuera; gana el último en pie. Tu mano no está aquí: la tienes fija arriba en la partida.</p>
  <div class="refwrap">
    <RefRows title="🎭 Los 5 personajes (corte de 15 cartas)" rows={charRows} />
    <RefRows title="🎬 Las 7 jugadas: coste, qué dices tener y quién las corta" rows={actionRows} />
  </div>
{/if}
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>

<style>
  /* Nada esencial por debajo de 0,8 rem (B26·9): el efecto de cada carta es lo
     más leído de este modal. */
  .lead { font-size: 0.88rem; color: var(--muted); margin: 8px 0; line-height: 1.45; }
  .refwrap :global(.sdesc) { font-size: 0.85rem; }
</style>
