<script lang="ts">
  // Parrilla de selección para Secret Hitler (una elección; excluye a
  // muertos y a quien se indique). Cada ficha lleva, EN TEXTO VISIBLE, por qué
  // se puede elegir o por qué no (`why`): un chip atenuado y mudo obligaba a
  // recordar los límites de mandato de memoria, y en móvil no hay `title`.
  import { toggleSel, selIds } from '../../../shell/selection';

  const { players, selKey, exclude = [], presidentId = null, lastPresidentId = null, lastChancellorId = null, why = {} }: {
    players: { id: string; name?: string; alive?: boolean }[];
    selKey: string;
    exclude?: string[];
    presidentId?: string | null;
    lastPresidentId?: string | null;
    lastChancellorId?: string | null;
    /** pid → motivo (una línea) de que sea o no elegible. */
    why?: Record<string, string>;
  } = $props();

  const sel = $derived(selIds(selKey));
</script>

<div class="players">
  {#each players as p (p.id)}
    {@const dead = p.alive === false}
    {@const can = !dead && !exclude.includes(p.id)}
    <div
      class="player {dead ? 'dead' : ''} {can ? 'selectable' : 'dim'} {sel.includes(p.id) ? 'selected' : ''}"
      data-a={can ? 'sh-sel' : undefined}
      data-p={p.id}
      data-selkey={can ? selKey : undefined}
      role={can ? 'button' : undefined}
      tabindex={can ? 0 : undefined}
      onclick={() => { if (can) toggleSel(selKey, p.id, 1); }}
      onkeydown={(e) => { if (can && e.key === 'Enter') toggleSel(selKey, p.id, 1); }}
    >
      <div class="prow">
        <span class="pname">{p.name}</span>
        {#if p.id === presidentId}<span class="badge">🪙 Preside</span>{/if}
        {#if !can && p.id === lastChancellorId}<span class="badge">🎩 fue Canciller</span>{/if}
        {#if !can && p.id === lastPresidentId && p.id !== lastChancellorId}<span class="badge">🪙 fue Presidente</span>{/if}
        {#if dead}<span>💀</span>{/if}
        {#if sel.includes(p.id)}<span>✔️</span>{/if}
      </div>
      {#if why[p.id]}<span class="pwhy {can ? '' : 'no'}">{why[p.id]}</span>{/if}
    </div>
  {/each}
</div>

<style>
  /* Nombre e insignias en una fila y el motivo DEBAJO, a todo el ancho: si el
     motivo comparte fila con la insignia, en un móvil queda una columna de
     tres letras por línea. */
  .player { flex-direction: column; align-items: stretch; gap: 3px; }
  .prow { display: flex; align-items: center; gap: 8px; }
  .prow .pname { flex: 1; min-width: 0; }
  .pwhy { font-size: 0.8rem; line-height: 1.3; color: var(--ok); white-space: normal; }
  .pwhy.no { color: var(--muted); }
  /* Se atenúa (o se tacha) el NOMBRE, nunca su explicación: el motivo de que no
     se pueda elegir es justo lo que hay que poder leer. */
  .player.dim, .player.dead { opacity: 1; text-decoration: none; }
  .player.dim .pname { opacity: 0.6; }
  .player.dead .pname { opacity: 0.5; text-decoration: line-through; }
</style>
