<script lang="ts">
  // Parrilla de selección de jugadores para Ávalon (una o varias, con clave de
  // contexto). Cada ficha puede llevar DEBAJO su historial público (en qué
  // misiones estuvo, qué votó): elegir equipo o buscar a Merlín se hace con esa
  // información delante, no de memoria.
  import { toggleSel, selIds } from '../../../shell/selection';

  const { players, selKey, max = 1, exclude = [], leaderId = null, meId = null, noteOf = null }: {
    players: { id: string; name?: string }[];
    selKey: string;
    max?: number;
    exclude?: string[];
    leaderId?: string | null;
    meId?: string | null;
    noteOf?: ((pid: string) => string) | null;
  } = $props();

  const sel = $derived(selIds(selKey));
</script>

<div class="players">
  {#each players as p (p.id)}
    {@const can = !exclude.includes(p.id)}
    {@const note = noteOf ? noteOf(p.id) : ''}
    <div
      class="player avp {can ? 'selectable' : 'dim'} {sel.includes(p.id) ? 'selected' : ''}"
      data-a={can ? 'av-sel' : undefined}
      data-p={p.id}
      data-selkey={can ? selKey : undefined}
      role={can ? 'button' : undefined}
      tabindex={can ? 0 : undefined}
      onclick={() => { if (can) toggleSel(selKey, p.id, max); }}
      onkeydown={(e) => { if (can && e.key === 'Enter') toggleSel(selKey, p.id, max); }}
    >
      <div class="pstack">
        <span class="pname">{p.name}{#if p.id === meId}<span class="pyou">&nbsp;(tú)</span>{/if}</span>
        {#if note}<span class="pnote">{note}</span>{/if}
      </div>
      {#if p.id === leaderId}<span class="badge">🧭</span>{/if}
      <span class="pmark">{sel.includes(p.id) ? '✔️' : ''}</span>
    </div>
  {/each}
</div>

<style>
  /* Con dos líneas la ficha crece: alineamos arriba y damos aire al toque. */
  .player.avp { align-items: flex-start; padding: 10px 11px; min-height: 48px; }
  .pstack { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .pstack .pname { flex: none; font-weight: 600; }
  .pyou { font-weight: 400; opacity: 0.7; }
  .pnote { font-size: 0.74rem; line-height: 1.25; color: var(--muted); white-space: normal; }
  .pmark { font-size: 1.05rem; min-width: 1.1em; text-align: right; }
</style>
