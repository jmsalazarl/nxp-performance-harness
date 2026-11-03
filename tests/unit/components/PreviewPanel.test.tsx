/**
 * Unit tests for PreviewPanel component
 * 
 * Tests preview panel rendering, validation state, and empty state behavior.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 * 
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import React, { useEffect } from 'react';
import { PreviewPanel } from '../../../src/components/PreviewPanel/PreviewPanel';
import { ConfigProvider } from '../../../src/context/ConfigContext';
import { useConfig } from '../../../src/hooks/useConfig';

afterEach(() => {
  cleanup();
});

// Helper to render component with provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(<ConfigProvider>{component}</ConfigProvider>);
};

// Helper component to add an endpoint for testing
const PreviewPanelWithEndpoint: React.FC = () => {
  const { dispatch } = useConfig();
  
  useEffect(() => {
    dispatch({ type: 'ADD_ENDPOINT' });
  }, [dispatch]);

  return <PreviewPanel />;
};

const PreviewPanelWithExportableEndpoint: React.FC = () => {
  const { dispatch, state } = useConfig();
  
  useEffect(() => {
    dispatch({ type: 'ADD_ENDPOINT' });
  }, [dispatch]);

  useEffect(() => {
    const endpoint = state.endpoints[0];
    if (!endpoint) {
      return;
    }

    if (endpoint.url !== 'https://example.com/api/test') {
      dispatch({
        type: 'UPDATE_ENDPOINT',
        id: endpoint.id,
        patch: { url: 'https://example.com/api/test' },
      });
    }

    const loadtest = endpoint.profiles.find((profile) => profile.type === 'loadtest');
    if (loadtest && !loadtest.enabled) {
      dispatch({ type: 'TOGGLE_PROFILE', endpointId: endpoint.id, profileType: 'loadtest' });
    }
    if (loadtest?.enabled && loadtest.stages.length === 0) {
      dispatch({ type: 'ADD_STAGE', endpointId: endpoint.id, profileType: 'loadtest' });
    }
  }, [dispatch, state.endpoints]);

  return <PreviewPanel />;
};

describe('PreviewPanel', () => {
  // ========================================================================
  // HEADER
  // ========================================================================

  it('displays the panel header (Requirement 6.1)', () => {
    renderWithProvider(<PreviewPanel />);
    
    expect(screen.getByText('Vista previa y exportación')).toBeDefined();
  });

  // ========================================================================
  // EMPTY STATE
  // ========================================================================

  it('displays empty state when no endpoints exist (Requirement 2.5)', () => {
    renderWithProvider(<PreviewPanel />);
    
    expect(screen.getByText('No hay endpoints configurados.')).toBeDefined();
    expect(
      screen.getByText('Agrega al menos un endpoint para generar la vista previa de configuración.')
    ).toBeDefined();
  });

  it('does not show empty state when endpoints exist', () => {
    renderWithProvider(<PreviewPanelWithEndpoint />);
    
    // Empty state should not be visible
    expect(screen.queryByText('No hay endpoints configurados.')).toBeNull();
  });

  // ========================================================================
  // PREVIEW CONTENT
  // ========================================================================

  it('displays validation errors and generated preview when endpoints exist', () => {
    renderWithProvider(<PreviewPanelWithEndpoint />);
    
    expect(screen.getByText('config.js generado')).toBeDefined();
    expect(screen.getByText('Errores de validación')).toBeDefined();
    expect(screen.getByText('Comandos k6 sugeridos')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Descargar config.js' })).toHaveProperty('disabled', true);
    expect(screen.getByText(/export default/)).toBeDefined();
  });

  // ========================================================================
  // STATE TRANSITIONS
  // ========================================================================

  it('transitions from empty state to preview when endpoint is added', async () => {
    const DynamicPreview: React.FC = () => {
      const { dispatch, state } = useConfig();
      
      return (
        <div>
          <button onClick={() => dispatch({ type: 'ADD_ENDPOINT' })}>Add Endpoint</button>
          <PreviewPanel />
        </div>
      );
    };

    renderWithProvider(<DynamicPreview />);
    
    // Initially empty
    expect(screen.getByText('No hay endpoints configurados.')).toBeDefined();
    
    // Add endpoint
    const addButton = screen.getByText('Add Endpoint');
    addButton.click();
    
    // Wait for state to update and component to re-render
    await waitFor(() => {
      expect(screen.queryByText('No hay endpoints configurados.')).toBeNull();
    });
    
    expect(screen.getByText('config.js generado')).toBeDefined();
  });

  it('enables download and shows commands for an exportable configuration', async () => {
    renderWithProvider(<PreviewPanelWithExportableEndpoint />);

    await waitFor(() => {
      expect(screen.getByText('Listo para exportar')).toBeDefined();
    });

    expect(screen.getByRole('button', { name: 'Descargar config.js' })).toHaveProperty('disabled', false);
    expect(screen.getByText('k6 run -e TEST_TYPE=loadtest k6/performancetest.js')).toBeDefined();
  });

  it('downloads the exact generated preview content', async () => {
    const click = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLElement;
      if (tagName === 'a') {
        Object.defineProperty(element, 'click', { value: click });
      }
      return element;
    });

    renderWithProvider(<PreviewPanelWithExportableEndpoint />);

    await waitFor(() => {
      expect(screen.getByText('Listo para exportar')).toBeDefined();
    });

    const preview = screen.getByText(/export default/).textContent;
    fireEvent.click(screen.getByRole('button', { name: 'Descargar config.js' }));

    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    const downloadedText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });

    expect(downloadedText).toBe(preview);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
