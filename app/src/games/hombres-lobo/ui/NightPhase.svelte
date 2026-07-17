<script lang="ts">
  // Fase de noche (port de nightPhase() de la v1): narración del paso en curso,
  // repaso de roles (open/confirm-role-refresh), panel de acción del actor y
  // panel neutral de palabras clave para los que no actúan.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { NIGHT_STEPS, stepActors } from '../engine';
  import { narr } from '../texts/corpus';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import RoleCard from './RoleCard.svelte';
  import PlayersGrid from './PlayersGrid.svelte';
  import NightActionPanel from './NightActionPanel.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();

  const game = $derived(group.game!);
  const players = $derived(app.players.filter((p) => p.inGame));

  // Repaso de roles: la noche está en pausa y todos los vivos revisan su carta.
  const refreshConf = $derived(!!(game.roleRefresh?.confirmed || {})[my.id]);
  const refreshPend = $derived(players.filter((p) => p.alive && !(game.roleRefresh?.confirmed || {})[p.id]).map((p) => p.name));

  const stepId = $derived(game.steps[game.stepIdx]);
  const def = $derived(NIGHT_STEPS.find((s) => s.id === stepId));
  const actors = $derived(stepId ? stepActors(stepId, game, players) : null);
  const isActor = $derived(!!(actors && actors.includes(my.id) && my.alive));
  const narrText = $derived.by(() => {
    if (stepId === 'durmiendo') return narr('noche_cae', `${game.seed}:n${game.night}`);
    const t = def && !def.silent ? narr(def.id, `${game.seed}:n${game.night}:s${game.stepIdx}:${def.id}`) : '';
    return t || 'La noche envuelve Castronegro…';
  });
</script>

{#if game.roleRefresh && game.roleRefresh.closing}
  <div class="narration">😴 Todos habéis repasado vuestro rol. Cerrad los ojos de nuevo… la noche continúa donde estaba.</div>
  <PlayersGrid {players} title="🏘️ El pueblo" viewer={my} />
{:else if game.roleRefresh}
  <div class="narration">👁️ Pausa: todo Castronegro abre los ojos y revisa su rol y su palabra clave en secreto. La noche continuará donde estaba.</div>
  <!-- El rol solo se despliega bajo demanda (móviles desbloqueados sobre la mesa). -->
  {#if my.alive && my.inGame && !refreshConf}
    {#if app.ui.refreshOpen}
      <RoleCard player={my} {group} />
      <button class="primary block" data-a="confirm-role-refresh"
        onclick={() => guard(async () => { await A.confirmRoleRefresh(); app.ui.refreshOpen = false; app.ui.roleOpen = false; })}>✅ Revisado, estoy listo</button>
    {:else}
      <div class="card"><p class="small-note">Toca para desplegar tu carta y tu palabra clave, repásalas y confirma.</p>
        <button class="primary block" data-a="open-role-refresh" onclick={() => (app.ui.refreshOpen = true)}>🔑 Confirmar mi rol</button></div>
    {/if}
  {:else}
    <div class="waitlist">Esperando a: {refreshPend.join(', ') || 'nadie, ¡seguimos!'}</div>
  {/if}
  <PlayersGrid {players} title="🏘️ El pueblo" viewer={my} />
{:else}
  <div class="narration">🌙 {stepId === 'amanecer' ? 'Los primeros rayos de sol acarician los tejados…' : narrText}</div>
  <RoleCard player={my} {group} mini={true} />
  {#if isActor}
    <!-- El actor solo ve su panel: la lista de objetivos YA es el pueblo entero
         (ActionGrid), sin parrilla duplicada debajo. -->
    <NightActionPanel stepId={stepId!} {group} {my} {players} />
  {:else}
    {#if stepId === 'enamorados' || stepId === 'encantados' || stepId === 'lobos_reconocen'}
      <!-- Pasos con palabras clave o reconocimiento físico: los que no actúan
           mantienen la vista en su pantalla con esta indicación neutral. -->
      <div class="actionpanel"><h3>👂 Atención al narrador</h3>
        <p class="hint">{#if stepId === 'lobos_reconocen'}Ojos cerrados: los lobos se están reconociendo. No mires.{:else}Ojos cerrados y oídos atentos. Si suena <b>tu palabra clave</b>, ábrelos con disimulo: tendrás un mensaje aquí.{/if}</p></div>
    {/if}
    <PlayersGrid {players} title="🏘️ El pueblo" viewer={my} />
  {/if}
{/if}
