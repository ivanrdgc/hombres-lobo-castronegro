<script lang="ts">
  // Modo guiado: máster humano con guion en pantalla (la app no habla).
  // Port de guidedScreen() + guidedMasterScreen() + guidedPendingPanel() de la
  // v1 (public/js/ui.js), con las mismas sales de narr() para el guion.
  import { app, isMaster, setFlash } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { stepActors } from '../engine';
  import { narr } from '../texts/corpus';
  import { STEP_LABELS } from './labels';
  import { sel1 } from '../../../shell/selection';
  import type { GroupDoc, PlayerDoc } from '../../../core/sync/schema';
  import type { PendingEntry } from '../types';
  import Flash from '../../../shell/Flash.svelte';
  import PhaseChip from './PhaseChip.svelte';
  import LogPanel from './LogPanel.svelte';
  import PlayersGrid from './PlayersGrid.svelte';
  import ActionGrid from './ActionGrid.svelte';
  import NightActionPanel from './NightActionPanel.svelte';
  import RevealGate from './RevealGate.svelte';
  import RoleCard from './RoleCard.svelte';
  import EndPhase from './EndPhase.svelte';
  import GameMenu from './GameMenu.svelte';

  const { group, my }: { group: GroupDoc; my: PlayerDoc } = $props();

  const game = $derived(group.game!);
  const master = $derived(isMaster());
  const players = $derived(app.players.filter((p) => p.inGame));

  // Pasos en los que el máster solo confirma que el grupo ya se ha reconocido.
  const GUIDED_CONFIRM_STEPS = ['enamorados', 'dos_hermanas', 'tres_hermanos', 'lobos_reconocen', 'encantados'];

  const needSel = () => setFlash('Toca primero a un jugador de la lista.');
  // Nombre del seleccionado bajo una clave (para confirmaciones con nombre).
  const selName = (key: string) => players.find((p) => p.id === sel1(key))?.name ?? null;

  function voteNow() {
    const pid = sel1('gvote');
    if (!pid) return needSel();
    void guard(() => A.castVote(pid));
  }
  function cazadorShoot(key: string) {
    const pid = sel1(key);
    if (!pid) return needSel();
    void guard(() => A.hunterShoot(pid));
  }
  function alguacilPick(key: string) {
    const pid = sel1(key);
    if (!pid) return needSel();
    void guard(() => A.pickAlguacil(pid));
  }
  function cabezaPick(key: string) {
    const pid = sel1(key);
    if (!pid) return needSel();
    void guard(() => A.cabezaPick(pid));
  }
</script>

{#snippet pendingPanel(head: PendingEntry)}
  {@const key = 'gpend:' + head.type}
  {@const actorP = players.find((p) => p.id === head.pid)}
  {#if head.type === 'cazador'}
    <div class="actionpanel"><h3>🏹 El Cazador dispara</h3>
      <p class="hint">{actorP?.name || 'El Cazador'} ha caído: pregúntale a quién se lleva.</p>
      <ActionGrid players={players} selKey={key} canPick={(p) => p.id !== head.pid} />
      <button class="danger block" data-a="cazador-shoot" disabled={!selName(key)} onclick={() => cazadorShoot(key)}>🏹 {selName(key) ? `Disparar a ${selName(key)}` : 'Disparar'}</button>
      <button class="ghost block" data-a="cazador-skip" onclick={() => guard(() => A.hunterShoot(null))}>No dispara</button>
    </div>
  {:else if head.type === 'sirvienta'}
    <div class="actionpanel"><h3>🧹 La Sirvienta</h3>
      <p class="hint">Pregúntale con discreción si toma el rol del condenado.</p>
      <div class="btnrow">
        <button class="violet" data-a="sirvienta-yes" onclick={() => guard(() => A.resolveSirvienta(true))}>🧹 Interviene</button>
        <button class="ghost" data-a="sirvienta-no" onclick={() => guard(() => A.resolveSirvienta(false))}>No interviene</button>
      </div>
    </div>
  {:else if head.type === 'alguacil_elect'}
    <div class="actionpanel"><h3>⭐ Elección del Alguacil</h3>
      <ActionGrid players={players} selKey={key} />
      <button class="primary block" data-a="alguacil-pick" disabled={!selName(key)} onclick={() => alguacilPick(key)}>⭐ {selName(key) ? `Nombrar a ${selName(key)}` : 'Nombrar'}</button>
    </div>
  {:else if head.type === 'alguacil_pick'}
    <div class="actionpanel"><h3>⭐ Sucesión del Alguacil</h3>
      <p class="hint">{actorP?.name || ''} señala a su sucesor.</p>
      <ActionGrid players={players} selKey={key} canPick={(p) => p.id !== head.pid} />
      <button class="primary block" data-a="alguacil-pick" disabled={!selName(key)} onclick={() => alguacilPick(key)}>⭐ {selName(key) ? `Sucesor: ${selName(key)}` : 'Nombrar sucesor'}</button>
    </div>
  {:else if head.type === 'cabeza_pick'}
    <div class="actionpanel"><h3>🐐 El Cabeza de Turco decide</h3>
      <ActionGrid players={players} selKey={key} canPick={(p) => p.id !== head.pid} />
      <button class="primary block" data-a="cabeza-pick" disabled={!selName(key)} onclick={() => cabezaPick(key)}>👉 {selName(key) ? `Elegir a ${selName(key)}` : 'Elegir'}</button>
      <button class="ghost block" data-a="cabeza-skip" onclick={() => guard(() => A.cabezaPick(null))}>Que voten todos</button>
    </div>
  {/if}
{/snippet}

{#if game.phase === 'end'}
  <div class="topbar"><h2>{group.name}</h2><PhaseChip game={game} /></div>
  <EndPhase group={group} my={my} />
  <LogPanel game={game} />
{:else if master}
  <!-- Narrador guiado: guion en pantalla y registro de decisiones. -->
  <div class="topbar"><h2>{group.name}</h2><PhaseChip game={game} /><GameMenu group={group} /></div>
  <Flash />
  <div class="card"><h3>📖 Narrador guiado</h3>
    <p class="small-note">La app no habla: te va marcando los pasos y tú registras las decisiones. Los jugadores solo ven su carta. Herramientas (roles, cartas, terminar) en el menú ⋯ de arriba.</p>
  </div>
  {#if game.phase === 'reveal'}
    {@const pend = players.filter((p) => !p.roleSeen).map((p) => p.name)}
    <div class="card"><h3>🎴 Reparto</h3>
      <p class="small-note">Cada jugador mira su carta en su móvil y confirma.</p>
      {#if pend.length}
        <div class="waitlist">Faltan por confirmar: {pend.join(', ')}</div>
      {:else}
        <button class="primary block" data-a="guided-first-night" onclick={() => guard(() => A.startFirstNight())}>🌙 Empezar la primera noche</button>
      {/if}
    </div>
  {:else if game.phase === 'night'}
    {@const stepId = game.steps[game.stepIdx]}
    {#if stepId === 'amanecer'}
      <div class="card"><h3>🌅 Fin de la noche</h3>
        <p class="small-note">Cuando hayas despertado al pueblo, resuelve el amanecer: la app calculará las muertes y te dará el parte.</p>
        <button class="primary block" data-a="guided-dawn" onclick={() => guard(() => A.runDawn())}>🌅 Resolver el amanecer</button>
      </div>
    {:else if stepId === 'durmiendo'}
      <div class="narration">📖 <b>Noche {game.night}.</b> Lee en voz alta:<br /><i>«{narr('noche_cae', `${game.seed}:n${game.night}`)}»</i></div>
      <div class="card"><p class="small-note">Espera a que todos cierren los ojos.</p>
        <button class="primary block" data-a="guided-skip" onclick={() => guard(() => A.forceAdvance())}>😴 Todos dormidos, continuar</button>
      </div>
    {:else}
      {@const salt = `${game.seed}:n${game.night}:s${game.stepIdx}:${stepId}`}
      {@const actors = stepActors(stepId, game, players)}
      {@const label = STEP_LABELS[stepId] || stepId}
      <div class="narration">📖 <b>Noche {game.night} · {label}.</b> Lee en voz alta:<br /><i>«{narr(stepId, salt) || '…'}»</i></div>
      {#if actors && actors.length}
        {#if GUIDED_CONFIRM_STEPS.includes(stepId)}
          <div class="card"><p class="small-note">Despierta a quien corresponda con un toque en el hombro. Cuando se hayan reconocido, continúa.</p>
            <button class="primary block" data-a="guided-skip" onclick={() => guard(() => A.forceAdvance())}>✅ Hecho, continuar</button>
          </div>
        {:else}
          {@const actorP = players.find((p) => p.id === actors[0])}
          <div class="card"><p class="small-note">👤 Actúa <b>{actorP?.name || ''}</b>. Registra aquí su decisión:</p></div>
          {#if actorP}
            <NightActionPanel stepId={stepId} group={group} my={actorP} players={players} />
          {/if}
        {/if}
      {:else}
        <div class="card"><p class="small-note">🌫️ Nadie debe actuar (rol muerto, sin poder o ya resuelto). Lee la llamada igualmente y espera unos segundos para disimular.</p>
          <button class="primary block" data-a="guided-skip" onclick={() => guard(() => A.forceAdvance())}>⏭️ Continuar</button>
        </div>
      {/if}
    {/if}
  {:else if game.phase === 'day'}
    {@const head = (game.pending || [])[0]}
    <div class="narration">☀️ Día {game.dayNum}. Guía el debate en persona.</div>
    {#if head}
      {@render pendingPanel(head)}
    {:else if (game.votesLeft || 0) > 0 && !game.vote}
      <div class="actionpanel"><h3>⚖️ El juicio del pueblo</h3>
        <p class="hint">Dirige el debate, toca al condenado y registra la decisión (es definitiva).</p>
        <ActionGrid players={players} selKey="gvote" showAlguacil={game.alguacilId || null} />
        <button class="danger block" data-a="vote-confirm" disabled={!selName('gvote')} onclick={voteNow}>⚖️ {selName('gvote') ? `Condenar a ${selName('gvote')}` : 'Condenar al elegido'}</button>
        <div class="btnrow">
          <button class="ghost" data-a="vote-nadie" onclick={() => guard(() => A.castVote('nadie'))}>🕊️ El pueblo perdona</button>
          <button class="ghost" data-a="vote-empate" onclick={() => guard(() => A.castVote('empate'))}>🤝 Hubo empate</button>
        </div>
      </div>
    {:else}
      <div class="card"><p class="small-note">🌆 El día ha terminado.</p>
        <button class="primary block" data-a="guided-next-night" onclick={() => guard(() => A.startNextNight())}>🌙 Comenzar la noche</button>
      </div>
    {/if}
  {/if}
  <PlayersGrid players={players} title="🏘️ El pueblo" showAlguacil={game.alguacilId} />
  <LogPanel game={game} />
{:else if !my.inGame}
  <!-- Espectador: sigue la partida y puede terminarla desde el menú ⋯ si hace falta. -->
  <div class="topbar"><h2>{group.name}</h2><PhaseChip game={game} /><GameMenu group={group} /></div>
  <Flash />
  <div class="card" style="text-align:center">
    <span class="moon">👀</span>
    <h3>Hay una partida en curso</h3>
    <p class="small-note">Este dispositivo no juega esta partida: puedes seguirla desde aquí. Si hiciera falta, cualquiera puede terminarla desde el menú ⋯.</p>
  </div>
  <PlayersGrid players={players} title="🏘️ El pueblo" showAlguacil={game.alguacilId} />
  <LogPanel game={game} />
{:else}
  <!-- Jugador: solo su carta (oculta por defecto); el narrador dirige en persona. -->
  <div class="topbar"><h2>{group.name}</h2><PhaseChip game={game} /><GameMenu group={group} /></div>
  {#if !my.alive && my.inGame && game.phase !== 'reveal'}<div class="flash">💀 Has muerto. Sigue mirando en silencio…</div>{/if}
  <Flash />
  {#if game.phase === 'reveal' && my.inGame && !my.roleSeen}
    <RevealGate group={group} my={my} />
  {:else}
    <div class="narration">📖 El narrador dirige la partida. Atiende a su voz… humana.</div>
    {#if my.inGame}<RoleCard player={my} group={group} mini={true} />{/if}
  {/if}
  <PlayersGrid players={players} title="🏘️ El pueblo" showAlguacil={game.alguacilId} viewer={my} />
  <LogPanel game={game} />
{/if}
