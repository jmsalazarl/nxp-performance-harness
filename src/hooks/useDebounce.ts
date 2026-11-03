import { useEffect, useState } from 'react';
import { VALIDATION_DEBOUNCE_MS } from '../utils/constants';

/**
 * Hook personalizado para debounce de valores
 * 
 * Este hook retrasa la actualización de un valor hasta que haya pasado
 * un tiempo específico sin cambios, útil para validación de campos en tiempo real.
 * 
 * @template T - Tipo del valor a debounce
 * @param value - Valor a aplicar debounce
 * @param delay - Tiempo de retraso en milisegundos (default: VALIDATION_DEBOUNCE_MS = 500ms)
 * @returns Valor debounced
 * 
 * @example
 * ```tsx
 * const SearchComponent = () => {
 *   const [searchTerm, setSearchTerm] = useState('');
 *   const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * 
 *   useEffect(() => {
 *     // Esta búsqueda solo se ejecutará 500ms después del último cambio
 *     if (debouncedSearchTerm) {
 *       performSearch(debouncedSearchTerm);
 *     }
 *   }, [debouncedSearchTerm]);
 * 
 *   return <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />;
 * };
 * ```
 * 
 * @requirement 3.6 - Este hook se usa para debounce de validación de campos
 */
export function useDebounce<T>(value: T, delay: number = VALIDATION_DEBOUNCE_MS): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Configurar timeout para actualizar el valor debounced
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function: limpiar timeout si value cambia antes de que se ejecute
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}
