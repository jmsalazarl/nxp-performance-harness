/**
 * Unit tests for EndpointEditor component
 * 
 * Tests endpoint editor rendering and empty state behavior.
 * Requirements: 2.2, 3.1, 3.2, 3.3, 3.4, 3.5
 * 
 * NOTE: This tests the placeholder implementation. When full implementation is completed,
 * additional tests should be added for:
 * - RequestFields (URL, method, expectedStatus, maxRetries, thinkTimeSeconds)
 * - EncabezadosEditor (JSON validation, inline errors)
 * - CuerpoEditor (JSON validation, GET query params label)
 * - ProfileTabs integration
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React, { useEffect } from 'react';
import { EndpointEditor } from '../../../src/components/EndpointEditor/EndpointEditor';
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
const EndpointEditorWithEndpoint: React.FC = () => {
  const { dispatch } = useConfig();
  
  useEffect(() => {
    dispatch({ type: 'ADD_ENDPOINT' });
  }, [dispatch]);

  return <EndpointEditor />;
};

describe('EndpointEditor', () => {
  // ========================================================================
  // EMPTY STATE
  // ========================================================================

  it('displays empty state when no endpoint is selected (Requirement 2.2)', () => {
    renderWithProvider(<EndpointEditor />);
    
    expect(screen.getByText('No hay endpoint seleccionado.')).toBeDefined();
    expect(
      screen.getByText('Selecciona un endpoint de la lista o crea uno nuevo.')
    ).toBeDefined();
  });

  // ========================================================================
  // ACTIVE ENDPOINT DISPLAY
  // ========================================================================

  it('displays the active endpoint name when an endpoint is selected (Requirement 2.2)', () => {
    renderWithProvider(<EndpointEditorWithEndpoint />);
    
    // Default name for first endpoint is "Endpoint 1"
    expect(screen.getByDisplayValue('Endpoint 1')).toBeDefined();
  });

  it('displays endpoint description when available (Requirement 2.2)', () => {
    const EditorWithDescription: React.FC = () => {
      const { dispatch, state } = useConfig();
      
      useEffect(() => {
        dispatch({ type: 'ADD_ENDPOINT' });
      }, [dispatch]);

      useEffect(() => {
        if (state.endpoints.length > 0) {
          const endpoint = state.endpoints[0];
          dispatch({ 
            type: 'UPDATE_ENDPOINT', 
            id: endpoint.id, 
            patch: { description: 'Test description for API endpoint' } 
          });
        }
      }, [state.endpoints.length, dispatch]);

      return <EndpointEditor />;
    };

    renderWithProvider(<EditorWithDescription />);
    
    expect(screen.getByText('Test description for API endpoint')).toBeDefined();
  });

  it('does not crash when description is empty (Requirement 2.2)', () => {
    renderWithProvider(<EndpointEditorWithEndpoint />);
    
    // Should show endpoint name without description
    expect(screen.getByDisplayValue('Endpoint 1')).toBeDefined();
    // Description should not appear
    expect(screen.queryByText('description')).toBeNull();
  });

  // ========================================================================
  // SUB-COMPONENTS RENDERING
  // ========================================================================

  it('displays RequestFields component with URL input', () => {
    renderWithProvider(<EndpointEditorWithEndpoint />);
    
    expect(screen.getByText('Configuración de la solicitud')).toBeDefined();
    expect(screen.getByLabelText(/URL/)).toBeDefined();
    expect(screen.getByLabelText(/Método/)).toBeDefined();
  });

  it('displays EncabezadosEditor component', () => {
    renderWithProvider(<EndpointEditorWithEndpoint />);
    
    expect(screen.getByText('Encabezados')).toBeDefined();
    expect(screen.getByLabelText(/Headers JSON/)).toBeDefined();
  });

  it('displays CuerpoEditor component', () => {
    renderWithProvider(<EndpointEditorWithEndpoint />);
    
    expect(screen.getByText('Cuerpo')).toBeDefined();
    expect(screen.getByLabelText(/Payload \(JSON\)/)).toBeDefined();
  });

  it('displays ProfileEditor component (Task 9.4 - completed)', () => {
    renderWithProvider(<EndpointEditorWithEndpoint />);
    
    // Should display performance profiles section
    expect(screen.getByText('Perfiles de rendimiento')).toBeDefined();
    
    // Should display profile tabs (Perfiles de prueba heading)
    expect(screen.getByText('Perfiles de prueba')).toBeDefined();
  });

  it('renames the active endpoint from the editor header', () => {
    renderWithProvider(<EndpointEditorWithEndpoint />);

    const nameInput = screen.getByLabelText('Nombre del endpoint');
    fireEvent.change(nameInput, { target: { value: 'Payments API' } });

    expect(screen.getByDisplayValue('Payments API')).toBeDefined();
  });

  it('keeps the previous endpoint name when rename input is blank on blur', () => {
    renderWithProvider(<EndpointEditorWithEndpoint />);

    const nameInput = screen.getByLabelText('Nombre del endpoint');
    fireEvent.change(nameInput, { target: { value: '' } });
    expect(screen.getByText('El nombre del endpoint es obligatorio')).toBeDefined();

    fireEvent.blur(nameInput);

    expect(screen.getByDisplayValue('Endpoint 1')).toBeDefined();
    expect(screen.queryByText('El nombre del endpoint es obligatorio')).toBeNull();
  });
});

/**
 * TODO: Additional tests needed when full implementation is completed
 * 
 * RequestFields tests:
 * - [ ] URL field validation (must start with http:// or https://)
 * - [ ] Método dropdown restricted to GET, POST, PUT, PATCH, DELETE
 * - [ ] expectedStatus validation (100-599 range)
 * - [ ] maxRetries validation (0-10 range)
 * - [ ] thinkTimeSeconds validation (0-60 range)
 * - [ ] Inline validation errors appear within 500ms
 * - [ ] Fields update in state when edited
 * 
 * EncabezadosEditor tests:
 * - [ ] Accepts valid JSON object
 * - [ ] Rejects JSON arrays
 * - [ ] Rejects JSON primitives
 * - [ ] Rejects malformed JSON
 * - [ ] Displays inline validation error message
 * - [ ] Updates state on valid input
 * 
 * CuerpoEditor tests:
 * - [ ] Accepts any valid JSON
 * - [ ] Rejects malformed JSON
 * - [ ] Label changes to "Query Params" when method is GET
 * - [ ] Displays inline validation error message
 * - [ ] Updates state on valid input
 * 
 * ProfileTabs integration tests:
 * - [ ] Displays tabs for all 4 profile types
 * - [ ] Toggles profile enabled/disabled state
 * - [ ] Shows StagesEditor for enabled profiles
 * - [ ] Shows ThresholdsEditor for enabled profiles
 */
