/**
 * Unit tests for EndpointList component
 * 
 * Tests endpoint list rendering, selection, and CRUD operations.
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { EndpointList } from '../../../src/components/EndpointList/EndpointList';
import { ConfigProvider } from '../../../src/context/ConfigContext';

afterEach(() => {
  cleanup();
});

// Helper to render component with provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(<ConfigProvider>{component}</ConfigProvider>);
};

describe('EndpointList', () => {
  // ========================================================================
  // EMPTY STATE
  // ========================================================================

  it('displays empty message when no endpoints exist (Requirement 2.5)', () => {
    renderWithProvider(<EndpointList />);
    expect(
      screen.getByText(/No hay endpoints configurados/)
    ).toBeDefined();
    expect(
      screen.getByText(/Haz clic en "Agregar Endpoint" para crear el primero/)
    ).toBeDefined();
  });

  it('renders Add Endpoint button when list is empty (Requirement 1.2)', () => {
    renderWithProvider(<EndpointList />);
    const addButton = screen.getByText('+ Agregar Endpoint');
    expect(addButton).toBeDefined();
  });

  // ========================================================================
  // ADDING ENDPOINTS
  // ========================================================================

  it('creates a new endpoint when Add Endpoint button is clicked (Requirement 2.1)', () => {
    renderWithProvider(<EndpointList />);
    
    const addButton = screen.getByText('+ Agregar Endpoint');
    fireEvent.click(addButton);

    // Endpoint should be created with default name
    expect(screen.getByText('Endpoint 1')).toBeDefined();
    
    // Empty message should no longer be visible
    expect(screen.queryByText(/No hay endpoints configurados/)).toBeNull();
  });

  it('creates multiple endpoints with incremented names (Requirement 2.1)', () => {
    renderWithProvider(<EndpointList />);
    
    const addButton = screen.getByText('+ Agregar Endpoint');
    
    // Add three endpoints
    fireEvent.click(addButton);
    fireEvent.click(addButton);
    fireEvent.click(addButton);

    expect(screen.getByText('Endpoint 1')).toBeDefined();
    expect(screen.getByText('Endpoint 2')).toBeDefined();
    expect(screen.getByText('Endpoint 3')).toBeDefined();
  });

  // ========================================================================
  // SELECTING ENDPOINTS
  // ========================================================================

  it('visually indicates the active endpoint (Requirement 2.2)', () => {
    renderWithProvider(<EndpointList />);
    
    const addButton = screen.getByText('+ Agregar Endpoint');
    fireEvent.click(addButton);

    // First endpoint should be auto-selected
    // The item has both endpointItem and active classes
    const endpointNameDiv = screen.getByText('Endpoint 1');
    const endpointItem = endpointNameDiv.parentElement?.parentElement;
    expect(endpointItem).toBeDefined();
    // Check that the class list includes 'active' (CSS module hashing may occur)
    expect(endpointItem?.className).toContain('active');
  });

  it('changes active endpoint when another endpoint is clicked (Requirement 2.2)', () => {
    renderWithProvider(<EndpointList />);
    
    const addButton = screen.getByText('+ Agregar Endpoint');
    fireEvent.click(addButton);
    fireEvent.click(addButton);

    // Click on second endpoint
    const endpoint2Element = screen.getByText('Endpoint 2');
    const endpoint2 = endpoint2Element.closest('div[class*="endpointItem"]');
    expect(endpoint2).toBeDefined();
    fireEvent.click(endpoint2 as Element);

    // Second endpoint should now be active
    expect(endpoint2?.className).toContain('active');
    
    // First endpoint should not be active
    const endpoint1Element = screen.getByText('Endpoint 1');
    const endpoint1 = endpoint1Element.closest('div[class*="endpointItem"]');
    expect(endpoint1?.className).not.toContain('active');
  });

  // ========================================================================
  // DUPLICATING ENDPOINTS
  // ========================================================================

  it('duplicates an endpoint when Duplicar button is clicked (Requirement 2.3)', () => {
    renderWithProvider(<EndpointList />);
    
    const addButton = screen.getByText('+ Agregar Endpoint');
    fireEvent.click(addButton);

    // Click duplicate button on first endpoint
    const duplicateButton = screen.getByTitle('Duplicar');
    fireEvent.click(duplicateButton);

    // Should now have two endpoints: original and copy
    expect(screen.getByText('Endpoint 1')).toBeDefined();
    expect(screen.getByText('Endpoint 1 (copy)')).toBeDefined();
  });

  it('does not select original endpoint when duplicating (Requirement 2.3)', () => {
    renderWithProvider(<EndpointList />);
    
    const addButton = screen.getByText('+ Agregar Endpoint');
    fireEvent.click(addButton);

    // Duplicar button click should not trigger selection
    const duplicateButton = screen.getByTitle('Duplicar');
    fireEvent.click(duplicateButton);

    // The copy should be auto-selected
    const copyElement = screen.getByText('Endpoint 1 (copy)');
    const copyItem = copyElement.closest('div[class*="endpointItem"]');
    expect(copyItem?.className).toContain('active');
  });

  // ========================================================================
  // DELETING ENDPOINTS
  // ========================================================================

  it('shows confirmation dialog when Eliminar button is clicked (Requirement 2.4)', () => {
    renderWithProvider(<EndpointList />);
    
    const addButton = screen.getByText('+ Agregar Endpoint');
    fireEvent.click(addButton);

    const deleteButton = screen.getByTitle('Eliminar');
    fireEvent.click(deleteButton);

    // Confirmaration dialog should appear
    expect(screen.getByText('Eliminar Endpoint')).toBeDefined();
    expect(screen.getByText(/¿Seguro que quieres eliminar "Endpoint 1"\?/)).toBeDefined();
  });

  it('deletes endpoint when confirmed in dialog (Requirement 2.4)', () => {
    renderWithProvider(<EndpointList />);
    
    const addButton = screen.getByText('+ Agregar Endpoint');
    fireEvent.click(addButton);

    const deleteButton = screen.getByTitle('Eliminar');
    fireEvent.click(deleteButton);

    // Confirmar deletion
    const confirmButton = screen.getByText('Confirmar');
    fireEvent.click(confirmButton);

    // Endpoint should be removed
    expect(screen.queryByText('Endpoint 1')).toBeNull();
    
    // Empty message should reappear
    expect(screen.getByText(/No hay endpoints configurados/)).toBeDefined();
  });

  it('does not delete endpoint when cancel is clicked in dialog (Requirement 2.4)', () => {
    renderWithProvider(<EndpointList />);
    
    const addButton = screen.getByText('+ Agregar Endpoint');
    fireEvent.click(addButton);

    const deleteButton = screen.getByTitle('Eliminar');
    fireEvent.click(deleteButton);

    // Cancelar deletion
    const cancelButton = screen.getByText('Cancelar');
    fireEvent.click(cancelButton);

    // Endpoint should still exist
    expect(screen.getByText('Endpoint 1')).toBeDefined();
  });

  it('does not select endpoint when Eliminar button is clicked (Requirement 2.4)', () => {
    renderWithProvider(<EndpointList />);
    
    const addButton = screen.getByText('+ Agregar Endpoint');
    fireEvent.click(addButton);
    fireEvent.click(addButton);

    // Select second endpoint
    const endpoint2Element = screen.getByText('Endpoint 2');
    const endpoint2 = endpoint2Element.closest('div[class*="endpointItem"]');
    expect(endpoint2).toBeDefined();
    fireEvent.click(endpoint2 as Element);

    // Click delete on first endpoint (not active)
    const endpoint1Element = screen.getByText('Endpoint 1');
    const endpoint1Item = endpoint1Element.closest('div[class*="endpointItem"]');
    const deleteButton = endpoint1Item?.querySelector('[title="Eliminar"]') as HTMLElement;
    fireEvent.click(deleteButton);

    // Second endpoint should still be active
    expect(endpoint2?.className).toContain('active');
  });

  // ========================================================================
  // ACTION BUTTONS
  // ========================================================================

  it('displays Duplicar and Eliminar buttons for each endpoint (Requirement 2.3, 2.4)', () => {
    renderWithProvider(<EndpointList />);
    
    const addButton = screen.getByText('+ Agregar Endpoint');
    fireEvent.click(addButton);

    expect(screen.getByText('Duplicar')).toBeDefined();
    expect(screen.getByText('Eliminar')).toBeDefined();
  });
});
