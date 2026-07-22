<script lang="ts">
  // Carta de un rol de Una Noche: emoji, nombre, bando y descripción. Se usa en
  // el reparto (tu carta inicial), como referencia de día y en el final.
  import { ROLES } from '../roles';
  import type { RoleId } from '../types';

  const { role, mini = false, note = '' }: { role: RoleId; mini?: boolean; note?: string } = $props();
  const r = $derived(ROLES[role]);
  const teamLabel = $derived(r.team === 'lobos' ? '🐺 Hombres Lobo' : r.team === 'tanner' ? '🪢 En solitario' : '🏡 El Pueblo');
</script>

<div class="rolecard" style={mini ? 'padding:10px' : ''}>
  <span class="remoji">{r.emoji}</span>
  <span class="rname">{r.name}</span>
  <div class="rteam">Bando: {teamLabel}</div>
  {#if !mini}<div class="rdesc">{r.desc}</div>{/if}
  {#if note}<div class="rextra">{note}</div>{/if}
</div>
