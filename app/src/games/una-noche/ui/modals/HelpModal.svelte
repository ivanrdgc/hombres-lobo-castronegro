<script lang="ts">
  // Cómo se juega Una Noche + lista de roles (orden de la noche).
  import { app } from '../../../../core/sync/store.svelte';
  import { ROLES, ACTION_ROLES } from '../../roles';
  import type { RoleId } from '../../types';

  const NIGHT = ACTION_ROLES;
  const PASSIVE: RoleId[] = ['aldeano', 'cazador', 'tanner'];
</script>

<h3>🌘 Cómo se juega</h3>
<p class="small-note">Se reparte una carta a cada jugador y quedan <b>3 en el centro</b>. De noche, la voz llama a cada rol en orden: miran y, algunos, <b>roban o intercambian cartas</b>. Al amanecer nadie ha muerto… pero puede que ya no seas quien empezaste. Se debate una vez y todos <b>votan a la vez</b>. Gana el Pueblo si cae un lobo; los Lobos si ninguno cae; el Curtidor si lo linchan a él.</p>

<h3 style="margin-top:14px">🌙 Orden de la noche</h3>
{#each NIGHT as r (r)}
  <div class="settingrow"><div class="sinfo"><div class="sname">{ROLES[r].emoji} {ROLES[r].name}</div><div class="sdesc">{ROLES[r].desc}</div></div></div>
{/each}

<h3 style="margin-top:14px">🛌 Sin acción de noche</h3>
{#each PASSIVE as r (r)}
  <div class="settingrow"><div class="sinfo"><div class="sname">{ROLES[r].emoji} {ROLES[r].name}</div><div class="sdesc">{ROLES[r].desc}</div></div></div>
{/each}

<button class="primary block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Entendido</button>
