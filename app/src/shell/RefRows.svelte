<script lang="ts">
  // Lista de referencia de un juego (B21): cada carta/rol/acción con su efecto,
  // consultable en cualquier momento desde el modal del botón «🎴».
  export interface RefRow { emoji: string; name: string; note?: string; desc: string }
  const { title = '🃏 Cartas del juego', rows }: { title?: string; rows: RefRow[] } = $props();
</script>

<h3 style="margin:16px 0 2px">{title}</h3>
{#each rows as r, i (i)}
  <div class="settingrow">
    <div class="sinfo">
      <div class="sname">{r.emoji} {r.name}{#if r.note}<span style="opacity:.65;font-weight:400">&nbsp;· {r.note}</span>{/if}</div>
      <div class="sdesc">{r.desc}</div>
    </div>
  </div>
{/each}
