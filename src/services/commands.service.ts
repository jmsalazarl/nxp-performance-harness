/**
 * Commands Service - Genera comandos K6 sugeridos basados en perfiles habilitados
 * 
 * Este servicio analiza el estado de la aplicación y genera comandos k6
 * sugeridos para ejecutar las pruebas de performance configuradas.
 */

import { AppState } from '../models/AppState';
import { ProfileType } from '../models/ProfileDraft';

/**
 * Genera comandos K6 sugeridos para perfiles habilitados
 * 
 * Analiza el estado de la aplicación y retorna un comando por cada tipo de perfil
 * que esté habilitado en al menos un endpoint.
 * 
 * El formato del comando es: "k6 run -e TEST_TYPE=<profile> k6/performancetest.js"
 * 
 * @param state - Estado actual de la aplicación
 * @returns Array de comandos sugeridos, uno por cada perfil habilitado
 * 
 * @example
 * const state = {
 *   endpoints: [
 *     { profiles: [{ type: 'loadtest', enabled: true, ... }, { type: 'stresstest', enabled: false, ... }] }
 *   ],
 *   activeEndpointId: null
 * };
 * 
 * getSuggestedCommands(state); // ["k6 run -e TEST_TYPE=loadtest k6/performancetest.js"]
 */
export function getSuggestedCommands(state: AppState): string[] {
  // Conjunto de perfiles habilitados (sin duplicados)
  const enabledProfiles = new Set<ProfileType>();

  // Recorrer todos los endpoints y sus perfiles
  for (const endpoint of state.endpoints) {
    for (const profile of endpoint.profiles) {
      if (profile.enabled) {
        enabledProfiles.add(profile.type);
      }
    }
  }

  // Convertir el Set a array y mapear a comandos
  // Ordenar alfabéticamente para determinismo
  const sortedProfiles = Array.from(enabledProfiles).sort();

  return sortedProfiles.map(
    (profileType) => `k6 run -e TEST_TYPE=${profileType} k6/performancetest.js`
  );
}
