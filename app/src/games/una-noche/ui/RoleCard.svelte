<script lang="ts">
  // Carta de un rol de Una Noche: emoji, nombre, bando, descripción y —como en
  // Los Hombres Lobo— «Qué harás» paso a paso. Se usa en el reparto (tu carta
  // inicial), como referencia de día y en el final.
  import { ROLES } from '../roles';
  import { ROLE_HELP } from '../role-help';
  import type { RoleId } from '../types';

  const { role, mini = false, note = '' }: { role: RoleId; mini?: boolean; note?: string } = $props();
  const r = $derived(ROLES[role]);
  const help = $derived(ROLE_HELP[role]);
  const teamLabel = $derived(r.team === 'lobos' ? '🐺 Hombres Lobo' : r.team === 'tanner' ? '🪢 En solitario' : '🏡 El Pueblo');
</script>

<div class="rolecard" style={mini ? 'padding:10px' : ''}>
  <span class="remoji">{r.emoji}</span>
  <span class="rname">{r.name}</span>
  <div class="rteam">Bando: {teamLabel}</div>
  {#if !mini}
    <div class="rdesc">{r.desc}</div>
    {#if help}
      <div class="rhow"><b>🧭 Qué harás</b>
        <ol>{#each help.steps as s, i (i)}<li>{s}</li>{/each}</ol>
      </div>
    {/if}
  {/if}
  {#if note}<div class="rextra">{note}</div>{/if}
</div>
