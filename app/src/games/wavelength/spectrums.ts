// Espectros de «Wavelength»: pares de opuestos. El de la izquierda es el 0; el
// de la derecha, el 100. La gracia está en lo subjetivo: no hay respuesta
// «correcta», solo la sintonía entre el Psíquico y su equipo.
export interface Spectrum {
  id: string;
  left: string;
  right: string;
}

// Una noche larga se come el mazo: con ~50 pares, y sin repetir hasta agotarlos,
// una mesa de 6 juega ocho vueltas sin ver dos veces el mismo espectro. Fuera
// los pares ambiguos (aquellos en los que no se sabe qué lado es el «más») y los
// demasiado locales: estos se entienden en cualquier mesa.
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
  { id: 'lento', left: 'Lento', right: 'Rápido' },
  { id: 'tamano', left: 'Diminuto', right: 'Enorme' },
  { id: 'feo', left: 'Feo', right: 'Bonito' },
  { id: 'dulce', left: 'Salado', right: 'Dulce' },
  { id: 'blando', left: 'Blando', right: 'Duro' },
  { id: 'oscuro', left: 'Oscuro', right: 'Luminoso' },
  { id: 'triste', left: 'Triste', right: 'Alegre' },
  { id: 'formal', left: 'Informal', right: 'Formal' },
  { id: 'natural', left: 'Artificial', right: 'Natural' },
  { id: 'relax', left: 'Relajante', right: 'Agotador' },
  { id: 'olvidable', left: 'Olvidable', right: 'Inolvidable' },
  { id: 'exagerado', left: 'Discreto', right: 'Exagerado' },
  { id: 'adictivo', left: 'Nada adictivo', right: 'Muy adictivo' },
  { id: 'justo', left: 'Injusto', right: 'Justo' },
  { id: 'noche', left: 'Cosa de noche', right: 'Cosa de día' },
  { id: 'verano', left: 'De invierno', right: 'De verano' },
  { id: 'deporte', left: 'No es deporte', right: 'Es deporte' },
  { id: 'arte', left: 'No es arte', right: 'Es arte' },
  { id: 'pereza', left: 'Da pereza', right: 'Apetece' },
  { id: 'esfuerzo', left: 'Sale solo', right: 'Cuesta un esfuerzo' },
  { id: 'rutina', left: 'Rutina', right: 'Aventura' },
  { id: 'olor', left: 'Huele mal', right: 'Huele bien' },
  { id: 'regalo', left: 'Mal regalo', right: 'Regalazo' },
  { id: 'locura', left: 'Una locura', right: 'Una buena idea' },
  { id: 'grave', left: 'Una tontería', right: 'Un problema serio' },
  { id: 'social', left: 'Cosa de uno', right: 'Cosa de grupo' },
];

export function spectrumById(id: string): Spectrum | undefined {
  return SPECTRUMS.find((s) => s.id === id);
}

export function spectrumLabel(id: string): string {
  const s = spectrumById(id);
  return s ? `${s.left} ↔ ${s.right}` : id;
}

/** El espectro DICHO en voz alta. El ↔ se queda para la pantalla: leerlo como
 *  «frente a» chirría con pares del tipo «No es deporte ↔ Es deporte», y
 *  nombrar los dos extremos deja claro cuál es cada lado del dial. */
export function spectrumSpeech(id: string): string {
  const s = spectrumById(id);
  return s ? `en un extremo, ${s.left}; en el otro, ${s.right}` : id;
}
