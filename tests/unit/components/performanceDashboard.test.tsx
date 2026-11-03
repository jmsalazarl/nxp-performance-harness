import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExportButton } from '../../../src/components/ExportButton';
import { FileUploader } from '../../../src/components/FileUploader';
import { KpiCard } from '../../../src/components/KpiCard';
import { ThresholdTable } from '../../../src/components/ThresholdTable';
import { ReportModel } from '../../../src/models/report';

const report: ReportModel = {
  fileName: 'summary-loadtest.json',
  testType: 'loadtest',
  kpis: [
    { key: 'http_reqs', label: 'Total requests', value: '100', unit: 'count', status: 'normal' },
  ],
  thresholds: [
    { metric: 'http_req_duration', expression: 'p(95)<500', passed: true },
    { metric: 'http_req_failed', expression: 'rate<0.01', passed: false },
  ],
  charts: [],
  rawSummary: { metrics: {} },
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('performance dashboard components', () => {
  it('FileUploader renders a JSON input and emits file contents', async () => {
    const onFileLoaded = vi.fn();
    const { container } = render(<FileUploader onFileLoaded={onFileLoaded} />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{"metrics":{}}'], 'summary.json', { type: 'application/json' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onFileLoaded).toHaveBeenCalledWith('{"metrics":{}}', 'summary.json');
    });
  });

  it('KpiCard renders label, value and unit', () => {
    render(<KpiCard kpi={report.kpis[0]} />);

    expect(screen.getByText('Total requests')).toBeDefined();
    expect(screen.getByText('100')).toBeDefined();
    expect(screen.getByText('count')).toBeDefined();
  });

  it('ThresholdTable renders pass and fail states', () => {
    render(<ThresholdTable thresholds={report.thresholds} />);

    expect(screen.getByText('http_req_duration')).toBeDefined();
    expect(screen.getByText('Correcto')).toBeDefined();
    expect(screen.getByText('Falló')).toBeDefined();
  });

  it('ThresholdTable shows neutral state when no thresholds are available', () => {
    render(<ThresholdTable thresholds={[]} />);

    expect(screen.getByText('No hay datos de umbrales disponibles.')).toBeDefined();
  });

  it('ExportButton is disabled without a report', () => {
    render(<ExportButton report={null} />);

    expect(screen.getByRole('button', { name: 'Exportar HTML' })).toHaveProperty('disabled', true);
  });

  it('ExportButton creates a local blob download with a report', () => {
    const click = vi.fn();
    const appendChild = vi.spyOn(document.body, 'appendChild');
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

    render(<ExportButton report={report} />);
    appendChild.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Exportar HTML' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(appendChild).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});
