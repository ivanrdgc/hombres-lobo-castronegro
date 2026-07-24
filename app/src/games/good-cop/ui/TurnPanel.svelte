<script lang="ts">
  // Turno: eliges UNA acción de cuatro. Cada una se ofrece con SU EFECTO y SU
  // REQUISITO escritos (y, si está bloqueada, con el porqué a la vista: nunca un
  // botón gris mudo). Elegida la acción se ve «qué va a pasar», después el
  // objetivo, y siempre se confirma con un botón que NOMBRA la consecuencia:
  // las cuatro gastan tu turno entero, así que ninguna se dispara de un toque.
  import { app } from '../../../core/sync/store.svelte';
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { isAlive, aimersOf } from '../engine';
  import { cardLabel } from '../cards';
  import { refRows } from '../texts';
  import RefRows from '../../../shell/RefRows.svelte';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { GoodCopState } from '../types';

  const { game, my }: { game: GoodCopState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const others = $derived(game.playerIds.filter((pid) => pid !== my.id && isAlive(game, pid)));
  const aimingAtMe = $derived(aimersOf(game, my.id).map(nm));
  const armed = $derived(!!game.armed[my.id]);
  const myTarget = $derived(game.aimAt[my.id]);
  const aimedOk = $derived(!!myTarget && isAlive(game, myTarget));
  const canShoot = $derived(armed && aimedOk);
  // El porqué de cada bloqueo, en la propia opción (el `title=` no existe en móvil).
  const armWhy = $derived(armed ? 'Ya llevas pistola: cogerla otra vez no haría nada.' : '');
  // Apuntar a quien YA apuntas no hace nada: si no queda nadie más, se bloquea.
  const aimables = $derived(others.filter((pid) => pid !== myTarget));
  const aimWhy = $derived(!armed
    ? 'Necesitas ir armado: gasta un turno en «🔫 Armarte».'
    : aimables.length ? '' : `Ya apuntas a ${myTarget ? nm(myTarget) : 'la única persona en pie'} y no queda nadie más a quien cambiar la mira.`);
  const shootWhy = $derived(canShoot ? '' : !armed
    ? 'Necesitas ir armado Y tener a alguien apuntado: te faltan dos turnos antes de este.'
    : 'No apuntas a nadie: gasta un turno en «🎯 Apuntar».');

  // QUÉ cartas has mirado ya (no lo que viste): sin esto se gastaba un turno en
  // mirar dos veces la misma. Es información PÚBLICA — el diario dice quién
  // investiga qué carta de quién —, así que puede estar en esta pantalla; el
  // RESULTADO no aparece aquí jamás: vive en «🎴 Mi carta», su única puerta.
  const myPeeks = $derived(game.peeks?.[my.id] || []);
  const seenOf = (pid: string) => myPeeks.filter((p) => p.target === pid).map((p) => p.idx);

  let mode = $state<'menu' | 'investigate' | 'arm' | 'aim' | 'shoot'>('menu');
  let tgt = $state<string | null>(null);
  let pick = $state<number | null>(null);
  // Cambiar de acción (o de investigado) descarta lo elegido debajo.
  $effect(() => { void mode; tgt = null; pick = null; });
  $effect(() => { void tgt; pick = null; });
  const targetCards = $derived(tgt ? game.cards[tgt] : []);
  const back = () => (mode = 'menu');

  /** Investigar y abrir «🎴 Mi carta» con el resultado: es el mismo toque tuyo,
   *  con el móvil aún en la mano, y allí se tapa solo a los pocos segundos.
   *  No es una segunda puerta: es dónde aterriza la acción que acabas de hacer. */
  function doInvestigate(target: string, idx: number) {
    back();
    guard(() => A.investigate(target, idx));
    app.ui.modal = { type: 'gc-mycard' };
  }
</script>

<div class="actionpanel">
  <h3>🎬 Te toca: elige UNA acción</h3>

  <!-- Tu estado PÚBLICO, siempre delante: es lo que decide qué puedes hacer. -->
  <div class="gcstate">
    <span class="gctag {armed ? 'on' : 'off'}">{armed ? '🔫 Vas armado' : '🔫 Sin arma'}</span>
    <span class="gctag {aimedOk ? 'on' : 'off'}">{aimedOk ? `🎯 Apuntas a ${nm(myTarget!)}` : '🎯 Sin diana'}</span>
  </div>
  {#if aimingAtMe.length}
    <p class="gcwarn"><b>⚠️ Te apuntan: {aimingAtMe.join(', ')}.</b> En su próximo turno pueden dispararte: ármate, investígalos o convence a la mesa.</p>
  {/if}

  {#if mode === 'menu'}
    <p class="hint" style="margin:10px 0 8px">Cualquiera de las cuatro gasta tu turno entero.</p>
    <div class="gcacts">
      <button class="gcact" data-a="gc-mode-investigate" onclick={() => (mode = 'investigate')}>
        <span class="gcemo">🔍</span>
        <span class="gcbody">
          <span class="gcname">Investigar una carta ajena</span>
          <span class="gceff">Miras a solas una de las 3 cartas de otro. La mesa ve a quién y cuál; lo que hay, solo tú.</span>
          <span class="gcreq">Sin requisitos · es tu radar</span>
        </span>
      </button>

      <button class="gcact" data-a="gc-arm" disabled={armed} onclick={() => (mode = 'arm')}>
        <span class="gcemo">🔫</span>
        <span class="gcbody">
          <span class="gcname">Armarte</span>
          <span class="gceff">Coges la pistola a la vista de todos. Sin ella no puedes apuntar ni disparar.</span>
          <span class="gcreq {armWhy ? 'lock' : ''}">{armWhy || 'Sin requisitos · paso 1 de 3'}</span>
        </span>
      </button>

      <button class="gcact" data-a="gc-mode-aim" disabled={!!aimWhy} onclick={() => (mode = 'aim')}>
        <span class="gcemo">🎯</span>
        <span class="gcbody">
          <span class="gcname">Apuntar a alguien</span>
          <span class="gceff">Eliges diana y todos la ven. Podrás dispararle en tu próximo turno; ella tiene ese turno para reaccionar.</span>
          <span class="gcreq {aimWhy ? 'lock' : ''}">{aimWhy || 'Requisito: ir armado ✅ · paso 2 de 3'}</span>
        </span>
      </button>

      <button class="gcact danger-act" data-a="gc-shoot" disabled={!canShoot} onclick={() => (mode = 'shoot')}>
        <span class="gcemo">💥</span>
        <span class="gcbody">
          <span class="gcname">Disparar{aimedOk ? ` a ${nm(myTarget!)}` : ''}</span>
          <span class="gceff">Elimina a tu diana y destapa sus 3 cartas. Si era un LÍDER, la partida acaba ahí. Gastas la bala.</span>
          <span class="gcreq {shootWhy ? 'lock' : ''}">{shootWhy || 'Armado y apuntando ✅ · paso 3 de 3'}</span>
        </span>
      </button>
    </div>

  {:else if mode === 'investigate'}
    <p class="gcplan">🔍 <b>Vas a investigar.</b> La mesa leerá a quién investigas y qué carta miras; lo que había, solo tú.</p>
    <button class="ghost block small" style="margin:8px 0" data-a="gc-back" onclick={back}>↩️ Cambiar de acción</button>
    <p class="gcstep"><b>1) ¿A quién investigas?</b></p>
    <div class="btnrow" style="flex-wrap:wrap;margin-top:6px">
      {#each others as pid (pid)}
        {@const seen = seenOf(pid).length}
        <button class="small {tgt === pid ? 'primary' : 'ghost'}" data-a="gc-inv-target" data-p={pid} onclick={() => (tgt = pid)}>
          {tgt === pid ? '✅ ' : ''}{nm(pid)}{seen ? ` · ya le miraste ${seen}` : ''}
        </button>
      {/each}
    </div>
    {#if tgt}
      <p class="gcstep" style="margin-top:12px"><b>2) ¿Cuál de las 3 cartas de {nm(tgt)} miras?</b> Van boca abajo: eliges a ciegas.</p>
      <div class="btnrow" style="flex-wrap:wrap;margin-top:6px">
        {#each targetCards as c, i (i)}
          {@const yaVista = seenOf(tgt).includes(i)}
          <button class="small {pick === i ? 'primary' : 'ghost'}" data-a="gc-inv-card" data-p={String(i)} disabled={c.up}
            onclick={() => (pick = i)}>
            {pick === i ? '✅ ' : ''}Carta {i + 1}{c.up ? ` · destapada: ${cardLabel(c)}` : yaVista ? ' · ya la miraste' : ''}
          </button>
        {/each}
      </div>
      {#if seenOf(tgt).length}<p class="small-note" style="margin-top:6px">Lo ya mirado va marcado: eso lo dice el diario, o sea que la mesa también lo sabe. Lo que VISTE solo vive en «🎴 Mi carta».</p>{/if}
      <button class="primary block" data-a="gc-inv-confirm" disabled={pick === null}
        onclick={() => doInvestigate(tgt!, pick!)}>
        {pick === null ? '🔍 Elige una carta' : `🔍 Mirar a solas la carta ${pick + 1} de ${nm(tgt)}`}
      </button>
      <!-- Repetir carta es legal pero regala el turno: se avisa antes, no se bloquea. -->
      <p class="small-note" style="margin-top:6px">{pick === null
        ? 'Toca una de sus tres cartas y el botón dirá exactamente lo que vas a hacer.'
        : seenOf(tgt).includes(pick)
          ? '⚠️ Esa ya la miraste: verás lo mismo y habrás gastado el turno. Lo que viste sigue en «🎴 Mi carta».'
          : 'El resultado se abre en «🎴 Mi carta» y se tapa solo: nadie más lo verá nunca.'}</p>
    {/if}

  {:else if mode === 'arm'}
    <p class="gcplan">🔫 <b>Vas a coger una pistola.</b> La mesa entera te verá armado y sospechará de ti. Apuntar será otro turno; disparar, un tercero.</p>
    <button class="ghost block small" style="margin:8px 0" data-a="gc-back" onclick={back}>↩️ Cambiar de acción</button>
    <button class="primary block" data-a="gc-arm-confirm" disabled={armed}
      onclick={() => { back(); guard(A.arm); }}>🔫 Sí, coger la pistola</button>

  {:else if mode === 'aim'}
    <p class="gcplan">🎯 <b>Vas a apuntar.</b> Todos verán a quién y podrás dispararle en tu próximo turno. Apuntar también es una pregunta: «¿alguien lo defiende?».</p>
    <button class="ghost block small" style="margin:8px 0" data-a="gc-back" onclick={back}>↩️ Cambiar de acción</button>
    <p class="gcstep"><b>¿A quién apuntas?</b></p>
    <div class="btnrow" style="flex-wrap:wrap;margin-top:6px">
      {#each others as pid (pid)}
        <!-- Apuntar a quien YA apuntas no hace nada: se marca y se bloquea. -->
        <button class="small {tgt === pid ? 'primary' : 'ghost'}" data-a="gc-aim-target" data-p={pid} disabled={myTarget === pid}
          onclick={() => (tgt = pid)}>
          {tgt === pid ? '✅ ' : ''}{nm(pid)}{myTarget === pid ? ' · ya lo apuntas' : ''}
        </button>
      {/each}
    </div>
    <button class="danger block" data-a="gc-aim-confirm" disabled={!tgt}
      onclick={() => { const t = tgt!; back(); guard(() => A.aim(t)); }}>{tgt ? `🎯 Sí, apuntar a ${nm(tgt)}` : '🎯 Elige a quién'}</button>
    {#if !tgt}<p class="small-note" style="margin-top:6px">Toca un nombre y el botón dirá a quién vas a apuntar.</p>{/if}

  {:else if mode === 'shoot'}
    <p class="gcplan danger-plan"><b>💥 ¿Disparas a {myTarget ? nm(myTarget) : '¿?'}?</b> Queda eliminado y sus 3 cartas se destapan para todos. Si era un LÍDER, la partida acaba aquí mismo… y si era el de tu bando, regalas la victoria. No tiene vuelta atrás.</p>
    <button class="danger block" data-a="gc-shoot-confirm" disabled={!canShoot}
      onclick={() => { back(); guard(A.shoot); }}>💥 Sí, disparar a {myTarget ? nm(myTarget) : '¿?'}</button>
    <button class="ghost block" style="margin-top:8px" data-a="gc-back" onclick={back}>↩️ No, volver</button>
  {/if}

  <!-- Las reglas, aquí mismo y plegadas: nadie debería salir de la pantalla en la
       que decide. Se llaman igual que dentro de «Mi carta» (B34: un nombre por
       cosa; «la chuleta» no existe). -->
  <details class="gcref">
    <summary data-a="gc-ref">📖 Las reglas: bandos, líderes y qué hace cada acción</summary>
    <RefRows title="🧮 Todo esto es público: lo sabe la mesa entera" rows={refRows(game.playerIds.length)} />
  </details>
</div>

<style>
  /* Móvil primero: todo lo que se toca aquí (incluidos los nombres, que son
     botones pequeños) llega al objetivo cómodo de 44 px. */
  .actionpanel button { min-height: 44px; }
  .gcstate { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
  .gctag { font-size: 0.8rem; padding: 4px 10px; border-radius: var(--r-full); border: 1px solid var(--border); color: var(--muted); }
  .gctag.on { border-color: var(--accent); color: var(--moon); background: color-mix(in srgb, var(--accent) 14%, transparent); }
  .gcwarn {
    margin-top: 8px; padding: 8px 10px; border-radius: var(--r-1); font-size: 0.85rem;
    color: #f3c2c2; background: color-mix(in srgb, var(--danger) 16%, transparent); border: 1px solid var(--danger);
  }
  .gcacts { display: flex; flex-direction: column; gap: 8px; }
  .gcact {
    display: flex; gap: 10px; align-items: flex-start; width: 100%; text-align: left;
    padding: 12px; border-radius: var(--r-2); border: 1px solid var(--line-2); background: var(--card2);
  }
  .gcact:disabled { opacity: 0.8; border-style: dashed; cursor: default; }
  .gcact.danger-act { border-color: color-mix(in srgb, var(--danger) 55%, var(--line-2)); }
  .gcemo { font-size: 1.5rem; line-height: 1.1; }
  .gcbody { flex: 1; min-width: 0; }
  .gcname { display: block; font-size: 1.02rem; font-weight: 700; color: var(--moon); }
  .gceff { display: block; font-size: 0.85rem; font-weight: 400; color: var(--text); margin-top: 3px; }
  .gcreq { display: block; font-size: 0.8rem; font-weight: 400; color: var(--muted); margin-top: 6px; }
  .gcreq.lock { color: var(--moon); }
  .gcreq.lock::before { content: '🔒 '; }
  .gcplan {
    padding: 11px 12px; border-radius: var(--r-2); font-size: 0.9rem;
    border: 1px solid var(--accent); background: color-mix(in srgb, var(--accent) 12%, var(--card2));
  }
  .gcplan.danger-plan { border-color: var(--danger); background: color-mix(in srgb, var(--danger) 14%, var(--card2)); }
  .gcstep { font-size: 0.9rem; color: var(--text); margin-top: 10px; }
  .gcref { margin-top: 14px; border-top: 1px solid var(--border); padding-top: 8px; }
  .gcref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); padding: 6px 0; }
</style>
