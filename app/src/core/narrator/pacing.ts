// PACING: TODOS los colchones del narrador en una única tabla, con jitter y
// perfil de ritmo elegible por mesa (settings.pacing). Los marcados
// scaled:false son ANTI-PISTAS: comparten distribución los pasos reales y los
// fantasma, y el perfil JAMÁS los toca (un humano no confirma más rápido
// porque la mesa prefiera un narrador ágil).

export type PacingProfile = 'rapido' | 'normal' | 'teatral';

export interface PacingEntry {
  min: number;
  max: number;
  scaled: boolean;
}

export const PACING_PROFILES: Record<PacingProfile, number> = {
  rapido: 0.6,
  normal: 1.0,
  teatral: 1.4,
};

export const PACING = {
  /** Colchón inicial de la noche: todos cierran los ojos. */
  sleepHold: { min: 1500, max: 2300, scaled: true },
  /** Pausa antes de resolver el amanecer. */
  dawnHold: { min: 1000, max: 1000, scaled: true },
  /** Rol públicamente muerto: salto discreto (información ya pública). */
  deadSkip: { min: 700, max: 700, scaled: false },
  /** LA espera compartida real/fantasma tras «actuar» y antes de la despedida. */
  postActionHold: { min: 900, max: 1600, scaled: false },
  /** Pasos vivos ya completados (enamorados confirmados, etc.). */
  outroKnown: { min: 400, max: 400, scaled: true },
  /** Tras la despedida, antes de avanzar (que suene entera y se bloquee el móvil). */
  advanceGap: { min: 800, max: 1200, scaled: true },
  /** Confirmación FALSA de una llamada con señuelos: imita a un humano. */
  fakeConfirmHold: { min: 4000, max: 9000, scaled: false },
  /** Cierre del repaso de roles. */
  refreshCloseGap: { min: 5000, max: 7000, scaled: true },
  /** Cadencia de los recordatorios. */
  nagInterval: { min: 30000, max: 30000, scaled: true },
  /** Murmullo ambiental ocasional antes del primer aviso. */
  fillerDelay: { min: 9000, max: 15000, scaled: true },
} as const satisfies Record<string, PacingEntry>;

export type PacingKey = keyof typeof PACING;

/** Avisos sin respuesta antes de escalar al repaso de roles (~2 min). */
export const NAG_ESCALATE_COUNT = 4;
export const FILLER_CHANCE = 0.3;

export function pauseMs(key: PacingKey, profile: PacingProfile = 'normal', rnd: () => number = Math.random): number {
  const e: PacingEntry = PACING[key];
  const base = e.min + rnd() * (e.max - e.min);
  return Math.round(e.scaled ? base * (PACING_PROFILES[profile] ?? 1) : base);
}

export function profileOf(raw: unknown): PacingProfile {
  return raw === 'rapido' || raw === 'teatral' ? raw : 'normal';
}

/**
 * Densidad del GUION según el perfil: además de las pausas, el ritmo controla
 * cuánta narración suena. 'max' (teatral) añade ambientación y dramatiza las
 * llamadas; 'min' (rápido) recorta improvisaciones y coletillas y deja solo lo
 * esencial; 'std' (normal) es la salida clásica, bit-idéntica a la v1.
 * Los añadidos/recortes solo dependen de semilla y paso: NUNCA de quién viva
 * o actúe (anti-pistas), y jamás tocan las llamadas por palabra clave.
 */
export type Density = 'min' | 'std' | 'max';

export function narrationDensity(raw: unknown): Density {
  return raw === 'rapido' ? 'min' : raw === 'teatral' ? 'max' : 'std';
}
