import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ConfirmDialog, ValidationMessage } from '../../../src/components/common';

afterEach(() => {
  cleanup();
});

describe('ConfirmDialog', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="Test Title"
        message="Test Message"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog when open is true', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Test Title"
        message="Test Message"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByText('Test Title')).toBeDefined();
    expect(screen.getByText('Test Message')).toBeDefined();
    expect(screen.getByText('Confirmar')).toBeDefined();
    expect(screen.getByText('Cancelar')).toBeDefined();
  });

  it('calls onConfirm when Confirmar button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        title="Test Title"
        message="Test Message"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Confirmar'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancelar button is clicked', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        title="Test Title"
        message="Test Message"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <ConfirmDialog
        open={true}
        title="Test Title"
        message="Test Message"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('ValidationMessage', () => {
  it('renders nothing when message is null', () => {
    const { container } = render(<ValidationMessage message={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders message when provided', () => {
    render(<ValidationMessage message="This is an error" />);
    expect(screen.getByText(/This is an error/)).toBeDefined();
  });

  it('renders fieldName when provided', () => {
    render(<ValidationMessage message="Invalid value" fieldName="URL" />);
    expect(screen.getByText('URL:')).toBeDefined();
    expect(screen.getByText(/Invalid value/)).toBeDefined();
  });

  it('renders without fieldName when not provided', () => {
    render(<ValidationMessage message="Invalid value" />);
    expect(screen.queryByText(':')).toBeNull();
    expect(screen.getByText(/Invalid value/)).toBeDefined();
  });

  it('displays warning icon', () => {
    const { container } = render(<ValidationMessage message="Error" />);
    // Verificar que el icono esté presente en el contenido
    expect(container.textContent).toContain('⚠');
  });
});
