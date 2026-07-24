// Espectros de «Wavelength»: pares de opuestos. El de la izquierda es el 0; el
// de la derecha, el 100. La gracia está en lo subjetivo: no hay respuesta
// «correcta», solo la sintonía entre el Psíquico y su equipo.
export interface Spectrum {
  id: string;
  left: string;
  right: string;
}

export const SPECTRUMS: Spectrum[] = [
  { id: 'temp', left: 'Frío', right: 'Caliente' },
  { id: 'util', left: 'Inútil', right: 'Útil' },
  { id: 'sano', left: 'Malsano', right: 'Sano' },
  { id: 'miedo', left: 'Da tranquilidad', right: 'Da miedo' },
  { id: 'comun', left: 'Raro', right: 'Común' },
  { id: 'caro', left: 'Barato', right: 'Caro' },
  { id: 'sobrevalorado', left: 'Infravalorado', right: 'Sobrevalorado' },
  { id: 'fuerte', left: 'Débil', right: 'Fuerte' },
  { id: 'sexy', left: 'Nada sexy', right: 'Muy sexy' },
  { id: 'redondo', left: 'Anguloso', right: 'Redondo' },
  { id: 'facil', left: 'Difícil', right: 'Fácil' },
  { id: 'temporal', left: 'Pasajero', right: 'Para siempre' },
  { id: 'ruidoso', left: 'Silencioso', right: 'Ruidoso' },
  { id: 'peligroso', left: 'Seguro', right: 'Peligroso' },
  { id: 'guilty', left: 'Placer culpable', right: 'Orgullo confesable' },
  { id: 'complejo', left: 'Simple', right: 'Complejo' },
  { id: 'infantil', left: 'Para niños', right: 'Para adultos' },
  { id: 'necesario', left: 'Un capricho', right: 'Una necesidad' },
  { id: 'antiguo', left: 'Moderno', right: 'Anticuado' },
  { id: 'educado', left: 'De mala educación', right: 'De buena educación' },
  { id: 'talento', left: 'Cuestión de suerte', right: 'Cuestión de talento' },
  { id: 'limpio', left: 'Sucio', right: 'Limpio' },
  { id: 'aburrido', left: 'Aburrido', right: 'Emocionante' },
  { id: 'sobrio', left: 'Elegante', right: 'Hortera' },
];

export function spectrumById(id: string): Spectrum | undefined {
  return SPECTRUMS.find((s) => s.id === id);
}

export function spectrumLabel(id: string): string {
  const s = spectrumById(id);
  return s ? `${s.left} ↔ ${s.right}` : id;
}
