<script lang="ts">
  // «Cómo se juega»: el resto de la explicación (instrucciones, roles activados
  // y ajustes), sin la introducción ambientada (que ya está en el lobby). Cada
  // sección tiene su propio botón de lectura, SOLO en este dispositivo (nunca en
  // el narrador), para poder escuchar únicamente lo que interese.
  import { app } from '../../../../core/sync/store.svelte';
  import { explainSections, explainRoleIds } from '../../texts/explain';
  import { explainAudioState, toggleExplainAudio } from '../../../../shell/explain-audio';

  const g = $derived(app.group);
  // Solo las secciones distintas de la intro: cómo se juega, roles y ajustes.
  const sections = $derived(explainSections(g || {}).filter((s) => s.id !== 'intro'));
  // Ids paralelos a los items de la sección de roles (para el ℹ️ de cada uno).
  const roleIds = $derived(explainRoleIds(g || {}));

  // Detalle completo de un rol; al volver se restaura este modal y su scroll.
  function openDetail(roleId: string) {
    const scroll = (document.querySelector('.modal') as HTMLElement | null)?.scrollTop ?? 0;
    app.ui.modal = { type: 'role-detail', role: roleId, back: 'explain', backScroll: scroll };
  }
</script>

<!-- Sin título propio: se entra desde «📖 Cómo se juega» y la primera sección ya
     se llama así (un dato, un sitio). -->
{#each sections as sec (sec.id)}
  {@const audio = explainAudioState(sec.id)}
  <div style="display:flex;align-items:center;gap:8px;margin-top:14px">
    <h3 style="flex:1;margin:0">{sec.heading}</h3>
    {#if audio === 'playing'}
      <button class="small ghost" data-a="explain-speak-local" aria-label="Detener la lectura" title="Detener" onclick={() => toggleExplainAudio(g || {}, sec.id)}>⏹️</button>
    {:else if audio === 'loading'}
      <button class="small ghost" aria-label="Preparando la voz" disabled><span class="spinner"></span></button>
    {:else}
      <button class="small ghost" data-a="explain-speak-local" aria-label="Leer esta sección en voz alta" title="Leer esta sección" style="font-size:1.1rem;line-height:1" onclick={() => toggleExplainAudio(g || {}, sec.id)}>▶️</button>
    {/if}
  </div>
  {#each sec.items as it, ii (ii)}
    <!-- Los items vienen de nuestro propio módulo de textos (explain.ts), con
         negritas <b> incrustadas como en la v1: no hay entrada de usuario. -->
    <!-- eslint-disable svelte/no-at-html-tags -->
    {#if sec.id === 'roles'}
      <!-- Cada rol resumido lleva su ℹ️ con la ficha completa (pasos incluidos). -->
      <div style="display:flex;align-items:flex-start;gap:6px;margin:7px 0">
        <p class="small-note" style="margin:0;flex:1">{@html it}</p>
        <button class="roleinfo" data-a="role-detail" data-p={roleIds[ii]} aria-label="Cómo se juega" title="Cómo se juega" onclick={() => openDetail(roleIds[ii])}>ℹ️</button>
      </div>
    {:else if sec.kind === 'plain'}
      <p class="small-note" style="margin:7px 0">{@html it}</p>
    {:else}
      <p class="small-note" style="margin:8px 0">• {@html it}</p>
    {/if}
    <!-- eslint-enable svelte/no-at-html-tags -->
  {/each}
{/each}
<button class="primary block" style="margin-top:16px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>✔️ Listo</button>
