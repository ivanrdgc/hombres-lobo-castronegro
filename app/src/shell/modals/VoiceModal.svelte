<script lang="ts">
  // Voz de este dispositivo: silencio, ambiente, motor (neuronal/dispositivo),
  // voz, velocidad y tono, prueba y diagnóstico neuronal, y relevo del narrador
  // en plena partida automática (port de voiceModal v1).
  import { app, me, isMaster } from '../../core/sync/store.svelte';
  import { guard } from '../../core/sync/guard';
  import * as A from '../../games/hombres-lobo/actions';
  import { getVoiceConfig, setVoiceConfig, onVoiceConfig, CLOUD_VOICES } from '../../core/audio/voice-config';
  import { listSpanishVoices } from '../../core/audio/device-voice';
  import { cloudAvailable, testCloudSynth, getLastCloudError } from '../../core/audio/tts';
  import { unlockAudio, audioState } from '../../core/audio/engine';
  import { play, stopSpeech } from '../../core/audio/player';
  import { stopAmbience } from '../../core/audio/ambience';

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
  const g = $derived(app.group);
  const inAutoGame = $derived(!!g && g.status === 'playing' && !!g.game && g.game.mode === 'auto');
  const t = $derived(app.ui.voiceTest);

  function toggleMute() {
    app.ui.muted = !app.ui.muted;
    if (app.ui.muted) stopSpeech('hard');
    else play({ id: 'unmute', segments: [{ kind: 'clip', text: 'La voz del narrador está activada.' }] }).catch(() => {});
  }

  function toggleAmbience() {
    const on = !cfg.ambience;
    setVoiceConfig({ ambience: on });
    if (!on) stopAmbience();
  }

  function voiceTest() {
    unlockAudio();
    play({ id: 'voice-test', segments: [{ kind: 'clip', text: 'Esta es la voz del narrador. Uno, dos, tres. La voz funciona correctamente.' }] }).catch(() => {});
  }

  // Prueba integral del circuito neuronal: clave → síntesis → reproducción.
  const DIAG_TEXT = 'Prueba de voz neuronal completada. Se te oye alto y claro.';
  async function voiceTestCloud() {
    app.ui.voiceTest = 'running';
    const report: Record<string, unknown> = { key: cloudAvailable() };
    const r = await testCloudSynth(DIAG_TEXT);
    report.synth = r.ok ? `ok (${r.ms} ms)` : (r.error || getLastCloudError() || 'error');
    if (r.ok) {
      const outcome = await play({ id: 'voice-diag', segments: [{ kind: 'clip', text: DIAG_TEXT }] }).catch(() => 'error' as const);
      report.play = outcome === 'completed' ? 'ok'
        : outcome === 'fell-back' ? `fallback — ${getLastCloudError() || 'reproducción bloqueada'}`
          : outcome;
    }
    report.unlocked = audioState().unlocked;
    app.ui.voiceTest = report;
  }

  // Cambiar de narrador en plena partida: el nuevo lo toma desde SU dispositivo
  // (así el toque desbloquea su audio) y el conductor pasa a narrar desde aquí.
  function becomeNarrator() {
    unlockAudio(); // el toque desbloquea el audio de este dispositivo
    const my = me();
    if (!my) return;
    app.ui.modal = null;
    guard(() => A.setNarratorDevice(my.id));
  }

  const diagVal = (v: unknown) => (v ? String(v) : '—');
</script>

<h3>🗣️ Voz del narrador</h3>
<p class="small-note" style="text-align:center;opacity:.6">{__APP_VERSION__}</p>
{#if inAutoGame && !isMaster()}
  <div class="card" style="border-color:var(--accent)">
    <div class="sname">🔊 Tomar la narración</div>
    <p class="small-note">Ahora mismo narra otro dispositivo. Si quieres que la voz suene desde aquí (por ejemplo, si a ese móvil se le acaba la batería), tómala tú.</p>
    <button class="violet block" data-a="become-narrator" onclick={becomeNarrator}>🔊 Narrar desde este dispositivo</button>
  </div>
{/if}
<div class="settingrow"><div class="sinfo"><div class="sname">🔊 Voz activada</div><div class="sdesc">Silencia la locución sin pausar la partida.</div></div>
  <div class="switch {app.ui.muted ? '' : 'on'}" data-a="toggle-mute"
    onclick={toggleMute}
    role="switch" aria-checked={!app.ui.muted} aria-label="🔊 Voz activada" tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter') toggleMute(); }}></div></div>
<div class="settingrow"><div class="sinfo"><div class="sname">🎵 Ambiente de fondo</div><div class="sdesc">Viento, grillos y búhos de noche; pájaros de día. Se atenúa al hablar.</div></div>
  <div class="switch {cfg.ambience ? 'on' : ''}" data-a="toggle-ambience"
    onclick={toggleAmbience}
    role="switch" aria-checked={cfg.ambience} aria-label="🎵 Ambiente de fondo" tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter') toggleAmbience(); }}></div></div>
<!-- svelte-ignore a11y_label_has_associated_control -->
<label>Motor de voz</label>
<div class="btnrow" style="margin-bottom:8px">
  <button class={cloud ? 'primary small' : 'ghost small'} data-a="voice-engine" data-p="cloud" onclick={() => setVoiceConfig({ engine: 'cloud' })}>🌩️ Neuronal (muy humana)</button>
  <button class={cloud ? 'ghost small' : 'primary small'} data-a="voice-engine" data-p="device" onclick={() => setVoiceConfig({ engine: 'device' })}>📱 Del dispositivo</button>
</div>
{#if cloud}
  <label for="cloud-voice">Voz neuronal</label>
  <select id="cloud-voice" data-vs="cloudvoice" style="width:100%;padding:10px;border-radius:10px;background:var(--bg2);color:var(--text);border:1px solid var(--border)"
    value={cfg.cloudVoice}
    oninput={(e) => setVoiceConfig({ cloudVoice: e.currentTarget.value })}>
    {#each CLOUD_VOICES as v (v.id)}<option value={v.id}>{v.label}</option>{/each}
  </select>
{:else}
  <label for="voice-select">Voz del dispositivo</label>
  {#if voices.length}
    <select id="voice-select" data-vs="voice" style="width:100%;padding:10px;border-radius:10px;background:var(--bg2);color:var(--text);border:1px solid var(--border)"
      value={current}
      oninput={(e) => setVoiceConfig({ voiceURI: e.currentTarget.value })}>
      {#each voices as v (v.voiceURI)}<option value={v.voiceURI}>{v.name} ({v.lang})</option>{/each}
    </select>
  {:else}
    <p class="small-note">⚠️ Este navegador no ofrece voces en español.</p>
  {/if}
{/if}
<label for="voice-rate">Velocidad</label>
<input type="range" id="voice-rate" data-vs="rate" min="0.6" max="1.3" step="0.05" value={cfg.rate} style="width:100%"
  oninput={(e) => setVoiceConfig({ rate: parseFloat(e.currentTarget.value) })} />
{#if !cloud}
  <label for="voice-pitch">Tono</label>
  <input type="range" id="voice-pitch" data-vs="pitch" min="0.5" max="1.3" step="0.05" value={cfg.pitch} style="width:100%"
    oninput={(e) => setVoiceConfig({ pitch: parseFloat(e.currentTarget.value) })} />
{/if}
<div class="btnrow">
  <button class="violet" data-a="voice-test" onclick={voiceTest}>▶️ Probar la voz</button>
  {#if !t}
    <button class="ghost" data-a="voice-test-cloud" onclick={voiceTestCloud}>🧪 Diagnóstico neuronal</button>
  {:else if t === 'running'}
    <p class="small-note" style="text-align:center">🧪 Probando… (sintetiza y reproduce una frase)</p>
  {:else}
    <div class="card">
      <div class="small-note">🔑 Clave: <b>{t.key ? 'presente' : 'AUSENTE'}</b></div>
      <div class="small-note">🗣️ Síntesis: <b>{diagVal(t.synth)}</b></div>
      <div class="small-note">▶️ Reproducción: <b>{diagVal(t.play)}</b></div>
      <div class="small-note">🔓 Desbloqueado: <b>{t.unlocked ? 'sí' : 'no'}</b></div>
    </div>
    <button class="ghost block" data-a="voice-test-cloud" onclick={voiceTestCloud}>🧪 Repetir diagnóstico</button>
  {/if}
  <button class="primary" data-a="close-modal" onclick={() => (app.ui.modal = null)}>✔️ Listo</button>
</div>
{#if !cloudAvailable()}<p class="small-note">⚠️ Esta instancia no tiene clave de voz neuronal configurada (js/tts-key.js): se usa la voz del dispositivo.</p>{/if}
<p class="small-note">La voz neuronal suena en cuanto llega de la nube (usa caché: cada frase se descarga una sola vez). Si falla la red, cae automáticamente a la voz del dispositivo.</p>
