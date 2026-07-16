<script lang="ts">
  // Detalle de un rol: qué es, cuándo actúa y CÓMO se juega paso a paso.
  // Se abre desde la tira de cartas en partida, el ℹ️ de «Elegir roles» y
  // cualquier sitio que quiera explicar un rol. `back` devuelve al modal origen.
  import { app } from '../../../../core/sync/store.svelte';
  import { ROLES, TEAMS } from '../../roles';
  import type { RoleId } from '../../roles';
  import { ROLE_HELP, ALGUACIL_HELP } from '../../texts/role-help';

  const roleId = $derived(String(app.ui.modal?.role ?? ''));
  const back = $derived(app.ui.modal?.back as string | undefined);
  const isAlguacil = $derived(roleId === 'alguacil');
  const r = $derived(!isAlguacil && roleId in ROLES ? ROLES[roleId as RoleId] : null);
  const help = $derived(isAlguacil ? ALGUACIL_HELP.help : (roleId in ROLE_HELP ? ROLE_HELP[roleId as RoleId] : null));
  const team = $derived(r ? TEAMS[r.team] : null);

  function close() {
    // Devuelve también el scroll que tenía el modal de origen.
    const scroll = app.ui.modal?.backScroll;
    app.ui.modal = back ? { type: back, scroll } : null;
  }
</script>

{#if r || isAlguacil}
  <div style="text-align:center">
    <span style="font-size:3rem;display:block">{isAlguacil ? ALGUACIL_HELP.emoji : r!.emoji}</span>
    <h3 style="font-family:var(--font-display);color:var(--moon);font-size:1.3rem">{isAlguacil ? ALGUACIL_HELP.name : r!.name}</h3>
    <div class="chips" style="justify-content:center;margin-top:8px">
      {#if team}<span class="chip">{team.emoji} Bando: {team.name}</span>{/if}
      {#if help}<span class="chip">🕐 {help.when}</span>{/if}
    </div>
  </div>
  <p class="small-note" style="font-size:0.92rem;margin-top:12px">{isAlguacil ? ALGUACIL_HELP.desc : r!.desc}</p>
  {#if help}
    <h3 style="margin-top:14px">🧭 Cómo se juega</h3>
    <ol class="howlist">
      {#each help.steps as s, i (i)}<li>{s}</li>{/each}
    </ol>
    {#if help.tip}<p class="small-note">💡 {help.tip}</p>{/if}
  {/if}
  <button class="primary block" data-a={back ? 'role-detail-back' : 'close-modal'} onclick={close}>{back ? '↩️ Volver' : '✔️ Listo'}</button>
{/if}
