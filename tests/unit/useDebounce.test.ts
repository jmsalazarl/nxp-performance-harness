import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useDebounce } from '../../src/hooks/useDebounce';
import { VALIDATION_DEBOUNCE_MS } from '../../src/utils/constants';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));
    expect(result.current).toBe('initial');
  });

  it('should debounce value changes with custom delay', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'first', delay: 300 } }
    );

    expect(result.current).toBe('first');

    // Cambiar el valor
    rerender({ value: 'second', delay: 300 });
    expect(result.current).toBe('first'); // Aún no debería cambiar

    // Avanzar tiempo parcialmente
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('first'); // Todavía no

    // Completar el delay
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe('second'); // Ahora sí
  });

  it('should use default delay of VALIDATION_DEBOUNCE_MS when not specified', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });
    expect(result.current).toBe('initial');

    await act(async () => {
      vi.advanceTimersByTime(VALIDATION_DEBOUNCE_MS);
    });
    expect(result.current).toBe('updated');
  });

  it('should reset timeout when value changes before delay completes', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'first' } }
    );

    // Primera actualización
    rerender({ value: 'second' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('first');

    // Segunda actualización antes de completar el delay
    rerender({ value: 'third' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('first'); // Todavía el valor inicial

    // Completar el nuevo delay
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('third'); // Ahora el último valor
  });

  it('should handle multiple rapid changes correctly', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'v1' } }
    );

    // Cambios rápidos
    rerender({ value: 'v2' });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: 'v3' });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: 'v4' });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ value: 'v5' });

    // El valor no debería haber cambiado aún
    expect(result.current).toBe('v1');

    // Esperar el delay completo desde el último cambio
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe('v5'); // Solo el último valor
  });

  it('should work with different types', async () => {
    // Number
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 42 } }
    );

    numberRerender({ value: 100 });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(numberResult.current).toBe(100);

    // Boolean
    const { result: boolResult, rerender: boolRerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: true } }
    );

    boolRerender({ value: false });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(boolResult.current).toBe(false);

    // Object
    const obj1 = { id: 1, name: 'test' };
    const obj2 = { id: 2, name: 'test2' };
    const { result: objResult, rerender: objRerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: obj1 } }
    );

    objRerender({ value: obj2 });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(objResult.current).toBe(obj2);
  });

  it('should cleanup timeout on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    
    const { unmount } = renderHook(() => useDebounce('value', 500));
    
    unmount();
    
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('should handle delay changes', async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'first', delay: 500 } }
    );

    // Cambiar valor con delay de 500ms
    rerender({ value: 'second', delay: 500 });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe('first');

    // Cambiar delay a 200ms con nuevo valor
    rerender({ value: 'third', delay: 200 });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe('third');
  });
});
