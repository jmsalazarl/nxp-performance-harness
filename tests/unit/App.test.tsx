/**
 * App Component Unit Tests
 * 
 * Tests for the main App component integration.
 * Validates that the App renders correctly with all three main sections:
 * - Sidebar with EndpointList
 * - Main area with EndpointEditor
 * - Right panel with PreviewPanel
 * 
 * Requirements: 1.1, 1.2, 1.3
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import App from '../../src/App';

describe('App Component', () => {
  afterEach(() => {
    cleanup();
  });

  it('debe renderizar correctamente con ConfigProvider wrapper', () => {
    const { container } = render(<App />);
    
    // Verificar que el componente principal se renderiza
    const appElement = container.querySelector('.app');
    expect(appElement).toBeTruthy();
  });

  it('debe mostrar el título "Endpoints" del sidebar', () => {
    render(<App />);
    
    // Verificar que EndpointList está presente
    const endpointsTitle = screen.getByText('Endpoints');
    expect(endpointsTitle).toBeTruthy();
  });

  it('debe mostrar el botón "Add Endpoint"', () => {
    render(<App />);
    
    // Verificar que el botón de agregar endpoint está presente
    const addButton = screen.getByText('+ Agregar Endpoint');
    expect(addButton).toBeTruthy();
  });

  it('debe mostrar mensaje inicial cuando no hay endpoint seleccionado', () => {
    render(<App />);
    
    // Verificar que el EndpointEditor muestra el mensaje de estado vacío
    const emptyMessage = screen.getByText(/No hay endpoint seleccionado/i);
    expect(emptyMessage).toBeTruthy();
  });

  it('debe mostrar el título "Vista previa y exportación" en el panel derecho', () => {
    render(<App />);
    
    // Verificar que PreviewPanel está presente usando un selector más específico
    const previewTitles = screen.getAllByText('Vista previa y exportación');
    expect(previewTitles.length).toBeGreaterThan(0);
  });

  it('debe tener la estructura de layout con tres áreas principales', () => {
    const { container } = render(<App />);
    
    // Verificar que las tres áreas del layout existen
    const sidebar = container.querySelector('.app-sidebar');
    const main = container.querySelector('.app-main');
    const preview = container.querySelector('.app-preview');
    
    expect(sidebar).toBeTruthy();
    expect(main).toBeTruthy();
    expect(preview).toBeTruthy();
  });

  it('debe inicializar con estado vacío (sin endpoints)', () => {
    render(<App />);
    
    // Verificar mensajes de estado vacío - hay múltiples porque cada componente muestra su propio mensaje
    const emptyMessages = screen.getAllByText(/No hay endpoints configurados/i);
    expect(emptyMessages.length).toBeGreaterThan(0);
  });
});
