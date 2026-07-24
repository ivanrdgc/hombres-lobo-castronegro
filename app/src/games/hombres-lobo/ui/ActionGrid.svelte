<script lang="ts">
  // LA lista única de una acción: el pueblo entero, como en PlayersGrid, pero
  // donde los objetivos válidos se tocan para elegirlos y el resto (muertos,
  // excluidos) se ve atenuado con sus insignias. Sustituye al dúo «lista de
  // selección + parrilla del pueblo debajo»: elegir cuesta UN toque y la
  // pantalla no repite a los jugadores.
  // B25/B26: lo que NO se puede tocar dice por qué (`whyNot`), en pantalla y en
  // pequeño — nunca un gris mudo ni un title= que en móvil no existe.
  import { me, viewGroup } from '../../../core/sync/store.svelte';
  import { toggleSel, selIds } from '../../../shell/selection';
  import type { PlayerDoc } from '../../../core/sync/schema';

  const {
    players,
    selKey,
    max = 1,
    canPick = () => true,
    whyNot = () => null,
    showAlguacil = null,
    marked = null,
  }: {
    players: PlayerDoc[];
    selKey: string;
    max?: number;
    /** Elegible además de estar vivo (p. ej. «solo la manada», «no a ti mismo»). */
    canPick?: (p: PlayerDoc) => boolean;
    /** Motivo por el que un VIVO no es elegible («protegido anoche», «ya encantado»). */
    whyNot?: (p: PlayerDoc) => string | null;
    showAlguacil?: string | null;
    /** Señalado por el Cuervo: carga 2 votos extra (información pública). */
    marked?: string | null;
  } = $props();

  const sel = $derived(selIds(selKey));
  const narratorId = $derived(viewGroup()?.masterId ?? null);
  const pickable = (p: PlayerDoc) => !!p.alive && canPick(p);
</script>

<div class="players">
  {#each players as p (p.id)}
    {@const can = pickable(p)}
    {@const why = !can && p.alive ? whyNot(p) : null}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div
      class="player {p.alive === false ? 'dead' : ''} {can ? 'selectable' : 'dim'} {sel.includes(p.id) ? 'selected' : ''}"
      data-a={can ? 'sel' : undefined}
      data-p={p.id}
      data-selkey={can ? selKey : undefined}
      onclick={() => { if (can) toggleSel(selKey, p.id, max); }}
      role={can ? 'button' : undefined}
      tabindex={can ? 0 : undefined}
      onkeydown={(e) => { if (can && e.key === 'Enter') toggleSel(selKey, p.id, max); }}
    >
      <span class="pname">{p.name}
        {#if why}<br /><small class="whynot">{why}</small>{/if}
      </span>
      {#if p.id === narratorId}<span class="badge">🔊</span>{/if}
      {#if showAlguacil === p.id}<span class="badge">⭐ ×2</span>{/if}
      {#if marked === p.id}<span class="badge">🐦‍⬛ +2</span>{/if}
      {#if p.revealedTonto}<span class="badge">🤪</span>{/if}
      {#if p.id === me()?.id}<span class="badge you">Tú</span>{/if}
      {#if p.alive === false}<span>💀</span>{/if}
      {#if sel.includes(p.id)}<span>✔️</span>{/if}
    </div>
  {/each}
</div>

<style>
  /* El motivo cabe dentro de la ficha, legible sin ratón (móvil primero). */
  /* `.player.dim` ya baja la opacidad al 55 %: el motivo usa el color del texto
     para seguir siendo legible en móvil (nada de `title=`, invisible sin ratón). */
  .whynot { color: var(--text); font-size: 0.72rem; line-height: 1.25; white-space: normal; }
</style>
