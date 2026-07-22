<script lang="ts">
  // Pantalla de primer acceso: activa el sonido (desbloqueo iOS/móvil con una
  // reproducción real y audible, que además calienta la voz neuronal) y deja
  // configurar motor, voz, velocidad y ambiente antes de entrar. Reutiliza el
  // mismo circuito que el botón «Activar la voz» de las partidas.
  import { app } from '../core/sync/store.svelte';
  import { unlockAudio } from '../core/audio/engine';
  import { play, stopSpeech } from '../core/audio/player';
  import { getVoiceConfig, setVoiceConfig, onVoiceConfig, CLOUD_VOICES } from '../core/audio/voice-config';
  import { listSpanishVoices } from '../core/audio/device-voice';
  import { cloudAvailable } from '../core/audio/tts';

  const { ondone }: { ondone: () => void } = $props();

  let cfg = $state(getVoiceConfig());
  $effect(() => onVoiceConfig((c) => (cfg = c)));

  // Las voces del dispositivo llegan de forma asíncrona en algunos navegadores.
  let voices = $state(listSpanishVoices());
  $effect(() => {
    if (typeof speechSynthesis === 'undefined') return;
    const update = () => (voices = listSpanishVoices());
    speechSynthesis.addEventListener('voiceschanged', update);
    return () => speechSynthesis.removeEventListener('voiceschanged', update);
  });

  const cloud = $derived(cfg.engine !== 'device' && cloudAvailable());
  const current = $derived(cfg.voiceURI || (voices[0] && voices[0].voiceURI) || '');

  // 'idle' → 'testing' (suena la prueba) → 'ok' (ya se ha oído sonar).
  let phase = $state<'idle' | 'testing' | 'ok'>('idle');

  function activar() {
    unlockAudio(); // debe correr DENTRO del gesto (click): desbloquea el audio del móvil
    app.ui.muted = false;
    app.ui.voiceUnlocked = true; // las pantallas de partida ya no volverán a pedirlo
    phase = 'testing';
    play({ id: 'audio-setup', segments: [{ kind: 'clip', text: 'El sonido ya está activado. Uno, dos, tres.' }] }, {
      onSegment: () => { if (phase === 'testing') phase = 'ok'; },
    }).finally(() => { if (phase === 'testing') phase = 'ok'; });
  }

  function sinVoz() {
    stopSpeech('hard');
    app.ui.muted = true;
    ondone();
  }
</script>

<div class="audio-setup" role="dialog" aria-label="Activar el sonido">
  <div class="sheet">
    <span class="moon">🔊</span>
    <h1 class="title-hero" style="font-size:1.45rem;margin-top:6px">Activa el sonido</h1>
    <p class="subtitle" style="margin-bottom:14px">
      Este juego se narra en voz alta. En el móvil, el sonido solo se enciende con un toque:
      actívalo ahora y la partida sonará sin cortes cuando le des a jugar.
    </p>

    {#if phase !== 'ok'}
      <button class="primary block" data-a="audio-activate" onclick={activar}>
        {phase === 'testing' ? '🔊 Sonando…' : '🔊 Activar el sonido'}
      </button>
    {:else}
      <div class="ok-banner" data-a="audio-ok">✅ El sonido está activado. ¿Se ha oído?</div>
      <button class="ghost block" data-a="audio-retest" onclick={activar}>▶️ Probar otra vez</button>
    {/if}

    <details class="tune">
      <summary>⚙️ Ajustar la voz</summary>

      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label>Motor de voz</label>
      <div class="btnrow" style="margin-bottom:8px">
        <button class={cloud ? 'primary small' : 'ghost small'} data-a="setup-engine" data-p="cloud" onclick={() => setVoiceConfig({ engine: 'cloud' })}>🌩️ Neuronal (muy humana)</button>
        <button class={cloud ? 'ghost small' : 'primary small'} data-a="setup-engine" data-p="device" onclick={() => setVoiceConfig({ engine: 'device' })}>📱 Del dispositivo</button>
      </div>

      {#if cloud}
        <label for="setup-cloud-voice">Voz neuronal</label>
        <select id="setup-cloud-voice" style="width:100%;padding:10px;border-radius:10px;background:var(--bg2);color:var(--text);border:1px solid var(--border)"
          value={cfg.cloudVoice}
          oninput={(e) => setVoiceConfig({ cloudVoice: e.currentTarget.value })}>
          {#each CLOUD_VOICES as v (v.id)}<option value={v.id}>{v.label}</option>{/each}
        </select>
      {:else if voices.length}
        <label for="setup-voice">Voz del dispositivo</label>
        <select id="setup-voice" style="width:100%;padding:10px;border-radius:10px;background:var(--bg2);color:var(--text);border:1px solid var(--border)"
          value={current}
          oninput={(e) => setVoiceConfig({ voiceURI: e.currentTarget.value })}>
          {#each voices as v (v.voiceURI)}<option value={v.voiceURI}>{v.name} ({v.lang})</option>{/each}
        </select>
      {:else}
        <p class="small-note">⚠️ Este navegador no ofrece voces en español; se usará la que haya.</p>
      {/if}

      <label for="setup-rate">Velocidad</label>
      <input type="range" id="setup-rate" min="0.6" max="1.3" step="0.05" value={cfg.rate} style="width:100%"
        oninput={(e) => setVoiceConfig({ rate: parseFloat(e.currentTarget.value) })} />

      <div class="settingrow" style="margin-top:6px">
        <div class="sinfo"><div class="sname">🎵 Ambiente de fondo</div><div class="sdesc">Viento, grillos y búhos de noche; pájaros de día. Se atenúa al hablar.</div></div>
        <div class="switch {cfg.ambience ? 'on' : ''}" data-a="setup-ambience"
          onclick={() => setVoiceConfig({ ambience: !cfg.ambience })}
          role="switch" aria-checked={cfg.ambience} aria-label="Ambiente de fondo" tabindex="0"
          onkeydown={(e) => { if (e.key === 'Enter') setVoiceConfig({ ambience: !cfg.ambience }); }}></div>
      </div>

      {#if !cloudAvailable()}<p class="small-note">Esta instancia no tiene voz neuronal: se usa la del dispositivo.</p>{/if}
    </details>

    <button class="primary block" data-a="audio-done" onclick={ondone}>
      {phase === 'ok' ? '✔️ Listo, a jugar' : '✔️ Continuar'}
    </button>
    <button class="linklike" data-a="audio-skip" onclick={sinVoz}>Prefiero jugar sin voz</button>
    <p class="small-note" style="text-align:center;opacity:.55">{__APP_VERSION__}</p>
  </div>
</div>

<style>
  .audio-setup {
    position: fixed;
    inset: 0;
    z-index: 60; /* por encima de modales (overlay: 50) y del Toast */
    background: var(--bg);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 24px 14px 40px;
  }
  .sheet {
    width: 100%;
    max-width: 460px;
    margin: auto;
  }
  .ok-banner {
    text-align: center;
    color: var(--ok);
    font-weight: 700;
    padding: 12px;
    margin-top: 4px;
    border: 1px solid color-mix(in srgb, var(--ok) 45%, transparent);
    border-radius: var(--r-2);
    background: color-mix(in srgb, var(--ok) 10%, transparent);
  }
  .tune {
    margin: 16px 0;
    border: 1px solid var(--border);
    border-radius: var(--r-2);
    padding: 0 14px;
    background: var(--bg2);
  }
  .tune summary {
    cursor: pointer;
    padding: 12px 0;
    color: var(--muted);
    font-size: 0.9rem;
    list-style: none;
  }
  .tune[open] summary { border-bottom: 1px solid var(--border); margin-bottom: 8px; }
  .tune summary::-webkit-details-marker { display: none; }
  .linklike {
    display: block;
    width: 100%;
    margin-top: 10px;
    background: none;
    border: none;
    color: var(--muted);
    text-decoration: underline;
    font-size: 0.85rem;
    cursor: pointer;
    padding: 8px;
  }
</style>
