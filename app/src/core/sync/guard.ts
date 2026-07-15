// Ejecuta una acción remota con feedback inmediato: bloquea los botones y
// muestra «enviando…» al instante, y un «✔ recibido» al confirmarse.
// Port del guard() de la v1 con errores tipados por código.
import { applyRoute, setFlash, state } from './store.svelte';

export class CodedError extends Error {
  code: string;

  constructor(code: string, message = code) {
    super(message);
    this.code = code;
  }
}

// Algunos códigos abren modales que necesitan contexto del formulario (nombre
// escrito, grupo…): el shell registra aquí su manejador.
type CodedHandler = (code: string, err: CodedError) => boolean;
let codedHandler: CodedHandler | null = null;

export function setGuardCodedHandler(fn: CodedHandler | null): void {
  codedHandler = fn;
}

let okTimer: ReturnType<typeof setTimeout> | null = null;

export interface GuardOpts {
  /** El error se muestra junto al formulario (ui.formError) en vez de como flash. */
  form?: boolean;
}

export async function guard(fn: () => Promise<unknown>, opts: GuardOpts = {}): Promise<void> {
  if (state.ui.busy) return; // evita dobles pulsaciones mientras viaja la anterior
  state.ui.busy = true;
  state.ui.formError = null;
  const showError = (msg: string) => {
    if (opts.form) state.ui.formError = msg;
    else setFlash(msg);
  };
  const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 15000));
  try {
    const work = fn().then(() => 'ok' as const);
    work.catch(() => { /* si gana el timeout, evita un rechazo sin manejar */ });
    const result = await Promise.race([work, timeout]);
    if (result === 'timeout') {
      setFlash('La red va lenta… la acción puede tardar unos segundos en reflejarse.');
    } else {
      state.ui.lastOk = Date.now();
      if (okTimer) clearTimeout(okTimer);
      okTimer = setTimeout(() => {
        state.ui.lastOk = null;
      }, 1600);
    }
  } catch (e) {
    console.warn(e);
    const err = e instanceof CodedError ? e : null;
    if (err && codedHandler && codedHandler(err.code, err)) {
      // manejado por el shell (p. ej. abre el modal de «grupo ya existe»)
    } else if (err?.code === 'no-group') showError('El grupo ya no existe.');
    else if (err?.code === 'playing') {
      setFlash('La partida acaba de empezar: espera a que termine.');
      applyRoute();
    } else if (err?.code === 'no-player') showError('No hay ningún jugador con ese nombre en la partida.');
    else if (e instanceof Error && e.message) showError(e.message);
  } finally {
    state.ui.busy = false;
  }
}
