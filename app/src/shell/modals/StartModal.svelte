<script lang="ts">
  // Empezar partida: confirmación del orden de mesa (si hay roles de vecinos)
  // y elección de modo con dispositivo narrador (port de startModal v1).
  import { app, me } from '../../core/sync/store.svelte';
  import { guard } from '../../core/sync/guard';
  import * as A from '../../games/hombres-lobo/actions';
  import { ROLES, NEIGHBOR_ROLES, OFFICIAL_MIN_PLAYERS } from '../../games/hombres-lobo/roles';
  import { seatingOrder } from '../ui-helpers';
  import { unlockAudio } from '../../core/audio/engine';
  import { play } from '../../core/audio/player';

  const g = $derived(app.group);
  const needsSeating = $derived((g?.extraRoles || []).some((r) => NEIGHBOR_ROLES.includes(r)));
  const order = $derived(g ? seatingOrder(g, app.players) : []);
  const names = $derived(Object.fromEntries(app.players.map((p) => [p.id, p.name])) as Record<string, string>);
  const neighborNames = $derived((g?.extraRoles || []).filter((r) => NEIGHBOR_ROLES.includes(r)).map((r) => ROLES[r].name).join(', '));

  const n = $derived(app.players.length);
  const meId = $derived(me()?.id);
  const remembered = $derived(app.players.some((p) => p.id === g?.lastNarratorId) ? g!.lastNarratorId : null);
  const narrator = $derived(app.players.some((p) => p.id === app.ui.narratorPick) ? app.ui.narratorPick! : (remembered || meId || null));
  const narratorP = $derived(app.players.find((p) => p.id === narrator));
  const narratorPlays = $derived(!!narratorP && narratorP.isPlayer !== false);

  // Port de moveSeat de main.js: intercambia dos asientos y persiste el orden.
  function moveSeat(pid: string, dir: number) {
    const next = order.slice();
    const i = next.indexOf(pid);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    guard(() => A.setSeating(next));
  }

  function startAuto() {
    const chosen = narrator;
    // El gesto solo desbloquea el audio en el dispositivo que narra.
    if (chosen && chosen === meId) {
      unlockAudio();
      play({ id: 'unlock', segments: [{ kind: 'clip', text: 'El pueblo de Castronegro abre sus puertas.' }] }).catch(() => {});
      app.ui.voiceUnlocked = true;
    }
    guard(() => A.startGame('auto', chosen));
  }
</script>

{#if needsSeating && !app.ui.seatingOk}
  <h3>🪑 Orden de la mesa</h3>
  <p class="small-note">Hay roles que dependen de los vecinos de asiento ({neighborNames}).
    Ordena a los jugadores según estáis sentados, <b>en el sentido de las agujas del reloj</b>. El orden se recuerda para las próximas partidas.</p>
  {#each order as id, i (id)}
    <div class="settingrow"><div class="sinfo"><div class="sname">{i + 1}. {names[id] || '?'}</div></div>
      <div class="btnrow" style="margin:0">
        {#if i > 0}<button class="ghost small" data-a="seat-up" data-p={id} onclick={() => moveSeat(id, -1)}>↑</button>{/if}
        {#if i < order.length - 1}<button class="ghost small" data-a="seat-down" data-p={id} onclick={() => moveSeat(id, +1)}>↓</button>{/if}
      </div></div>
  {/each}
  <button class="primary block" data-a="seating-ok" onclick={() => (app.ui.seatingOk = true)}>✅ El orden es correcto</button>
  <button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
{:else}
  <h3>🎬 Empezar partida</h3>
  <p class="small-note">Dispositivos conectados: <b>{n}</b>. Una vez empiece, nadie podrá entrar ni salir del grupo.</p>
  <div class="card" style="border-color:var(--accent)">
    <h3>🤖 Modo automático</h3>
    <p class="small-note">La app dirige la partida con voz, sin narrador humano. Elige qué dispositivo narrará (no jugará: será el que suene). Ponedlo en el centro con volumen alto.</p>
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label>🔊 Dispositivo narrador</label>
    <div class="players">
      {#each app.players as p (p.id)}
        <div class="player selectable {p.id === narrator ? 'selected' : ''}" data-a="set-narrator" data-p={p.id}
          onclick={() => (app.ui.narratorPick = p.id)}
          role="button" tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter') app.ui.narratorPick = p.id; }}>
          <span class="pname">{p.name}</span>{#if p.id === meId}<span class="badge you">este</span>{/if}{#if p.isPlayer === false}<span class="badge">📺</span>{/if}{#if p.id === narrator}<span>🔊</span>{/if}
        </div>
      {/each}
    </div>
    <p class="small-note">{narratorPlays
      ? '🎮 El narrador está marcado como jugador: narrará y además jugará con rol desde el mismo dispositivo.'
      : '📺 El narrador no juega: solo pondrá la voz (ideal para una tele o un altavoz).'}</p>
    <button class="primary block" data-a="start-auto" onclick={startAuto}>🤖 Empezar en automático</button>
  </div>
  <div class="card">
    <h3>📖 Modo guiado</h3>
    <p class="small-note">Tú (este dispositivo) narras en persona y la app no habla: tu pantalla te guía paso a paso y registras las decisiones. Los jugadores solo ven su carta. Tú no juegas.</p>
    <button class="violet block" data-a="start-guided" onclick={() => guard(() => A.startGame('guiado'))}>📖 Narrar yo (guiado)</button>
  </div>
  <div class="card">
    <h3>🎩 Modo manual</h3>
    <p class="small-note">Tú (este dispositivo) diriges sin guion: la app reparte los roles, te los muestra y marcas muertes, enamorados o el cambio del Ladrón. Tú no juegas.</p>
    <button class="ghost block" data-a="start-manual" onclick={() => guard(() => A.startGame('manual'))}>🎩 Narrar yo (manual)</button>
  </div>
  {#if needsSeating}<p class="small-note">🪑 Orden de mesa confirmado. <button class="small ghost" data-a="seating-edit" onclick={() => (app.ui.seatingOk = false)}>✏️ Cambiarlo</button></p>{/if}
  <p class="small-note">El narrador no recibe rol. Reglas oficiales: de {OFFICIAL_MIN_PLAYERS} a 18 jugadores además del narrador{(g?.settings || {}).casual ? ' (modo casual activo: desde 3)' : ''}.</p>
  <div id="form-error">
    {#if app.ui.formError}<div class="flash error">{app.ui.formError}</div>{/if}
  </div>
  <button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
{/if}
