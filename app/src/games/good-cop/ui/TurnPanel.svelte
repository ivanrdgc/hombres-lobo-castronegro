<script lang="ts">
  // Turno: eliges UNA acción de cuatro. Cada una se ofrece con SU EFECTO y SU
  // REQUISITO escritos (y, si está bloqueada, con el porqué a la vista: nunca un
  // botón gris mudo). Elegida la acción se ve «qué va a pasar», después el
  // objetivo, y siempre se confirma con un botón que NOMBRA la consecuencia:
  // las cuatro gastan tu turno entero, así que ninguna se dispara de un toque.
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

  // Lo que YA has investigado: sin esto se gastaba un turno en mirar dos veces
  // la misma carta. El resultado no se enseña aquí (el móvil acaba sobre la
  // mesa): vive en el 🎴.
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
</script>

<div class="actionpanel">
  <h3>🎬 Tu turno: UNA acción</h3>

  <!-- Tu estado PÚBLICO, siempre delante: es lo que decide qué puedes hacer. -->
  <div class="gcstate">
    <span class="gctag {armed ? 'on' : 'off'}">{armed ? '🔫 Vas armado' : '🔫 Sin arma'}</span>
    <span class="gctag {aimedOk ? 'on' : 'off'}">{aimedOk ? `🎯 Apuntas a ${nm(myTarget!)}` : '🎯 Sin diana'}</span>
  </div>
  {#if aimingAtMe.length}
    <p class="gcwarn"><b>⚠️ Te apuntan: {aimingAtMe.join(', ')}.</b> En su próximo turno pueden dispararte: ármate, investígalos o convence a la mesa.</p>
  {/if}

  {#if mode === 'menu'}
    <p class="hint" style="margin:10px 0 8px">Elige una: las cuatro gastan tu turno entero. Armarte, apuntar y disparar son TRES turnos tuyos.</p>
    <div class="gcacts">
      <button class="gcact" data-a="gc-mode-investigate" onclick={() => (mode = 'investigate')}>
        <span class="gcemo">🔍</span>
        <span class="gcbody">
          <span class="gcname">Investigar una carta ajena</span>
          <span class="gceff">Miras EN SECRETO una de las 3 cartas de otro. La mesa verá a quién y QUÉ carta miras; el resultado, solo tú.</span>
          <span class="gcreq">Sin requisitos · es tu radar</span>
        </span>
      </button>

      <button class="gcact" data-a="gc-arm" disabled={armed} onclick={() => (mode = 'arm')}>
        <span class="gcemo">🔫</span>
        <span class="gcbody">
          <span class="gcname">Armarte</span>
          <span class="gceff">Coges una pistola. Es público: la mesa entera te verá armado. Sin arma no puedes apuntar ni disparar.</span>
          <span class="gcreq {armWhy ? 'lock' : ''}">{armWhy || 'Sin requisitos · primer paso de los tres'}</span>
        </span>
      </button>

      <button class="gcact" data-a="gc-mode-aim" disabled={!!aimWhy} onclick={() => (mode = 'aim')}>
        <span class="gcemo">🎯</span>
        <span class="gcbody">
          <span class="gcname">Apuntar a alguien</span>
          <span class="gceff">Eliges diana y todos la ven. En tu siguiente turno podrás disparar… y quien apuntas tiene ese turno para reaccionar.</span>
          <span class="gcreq {aimWhy ? 'lock' : ''}">{aimWhy || 'Requisito: ir armado ✅'}</span>
        </span>
      </button>

      <button class="gcact danger-act" data-a="gc-shoot" disabled={!canShoot} onclick={() => (mode = 'shoot')}>
        <span class="gcemo">💥</span>
        <span class="gcbody">
          <span class="gcname">Disparar{aimedOk ? ` a ${nm(myTarget!)}` : ''}</span>
          <span class="gceff">Elimina a quien apuntas y destapa sus 3 cartas para todos. Si era un LÍDER, la partida acaba ahí. Gasta la bala: te quedas sin arma.</span>
          <span class="gcreq {shootWhy ? 'lock' : ''}">{shootWhy || `Requisito: armado y apuntando ✅ · diana: ${nm(myTarget!)}`}</span>
        </span>
      </button>
    </div>

  {:else if mode === 'investigate'}
    <p class="gcplan">🔍 <b>Vas a investigar.</b> Verás EN SECRETO una carta boca abajo. Todos leerán a quién investigas y qué carta miras; nadie sabrá lo que había.</p>
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
      {#if seenOf(tgt).length}<p class="small-note" style="margin-top:6px">Lo que ya viste de {nm(tgt)} está guardado en 🎴 (no se enseña aquí, por si alguien mira tu pantalla).</p>{/if}
      <button class="primary block" data-a="gc-inv-confirm" disabled={pick === null}
        onclick={() => { const t = tgt!, i = pick!; back(); guard(() => A.investigate(t, i)); }}>
        {pick === null ? '🔍 Elige una carta' : `🔍 Mirar la carta ${pick + 1} de ${nm(tgt)} (en secreto)`}
      </button>
      {#if pick === null}<p class="small-note" style="margin-top:6px">Toca una de sus tres cartas y el botón dirá exactamente lo que vas a hacer.</p>{/if}
    {/if}

  {:else if mode === 'arm'}
    <p class="gcplan">🔫 <b>Vas a coger una pistola.</b> Es PÚBLICO: la mesa entera te verá armado y sospechará de ti. Después podrás apuntar (otro turno) y disparar (un tercero).</p>
    <button class="ghost block small" style="margin:8px 0" data-a="gc-back" onclick={back}>↩️ Cambiar de acción</button>
    <p class="small-note">Esta acción no elige objetivo: solo confirma.</p>
    <button class="primary block" data-a="gc-arm-confirm" disabled={armed}
      onclick={() => { back(); guard(A.arm); }}>🔫 Sí, coger la pistola</button>

  {:else if mode === 'aim'}
    <p class="gcplan">🎯 <b>Vas a apuntar.</b> La mesa verá a quién, y a partir de ahí podrás dispararle en tu próximo turno. Apuntar también es una pregunta: «¿alguien lo defiende?».</p>
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

  <!-- La referencia, aquí mismo: nadie debería salir de la pantalla en la que decide. -->
  <details class="gcref">
    <summary data-a="gc-ref">📖 Chuleta: bandos, líderes y qué hace cada acción</summary>
    <RefRows title="🧮 Lo que sabe toda la mesa" rows={refRows(game.playerIds.length)} />
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
