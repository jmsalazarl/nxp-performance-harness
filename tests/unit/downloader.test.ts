/**
 * Unit tests for downloader utility
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadTextFile } from '../../src/utils/downloader';

describe('downloader.ts', () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Asegurar que URL.createObjectURL y revokeObjectURL existen (jsdom no los provee por defecto)
    if (!URL.createObjectURL) {
      URL.createObjectURL = vi.fn();
    }
    if (!URL.revokeObjectURL) {
      URL.revokeObjectURL = vi.fn();
    }

    // Mock URL.createObjectURL y URL.revokeObjectURL
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // Mock document.body.appendChild y removeChild
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    // Mock click en HTMLAnchorElement
    clickSpy = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        const link = {
          href: '',
          download: '',
          click: clickSpy,
        } as unknown as HTMLAnchorElement;
        return link;
      }
      return document.createElement(tagName);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debe crear un Blob con el contenido y tipo MIME correcto', () => {
    const content = 'export default { test: true };';
    const filename = 'config.js';

    // Guardar referencia original
    const OriginalBlob = globalThis.Blob;
    const blobInstances: Blob[] = [];

    // Mock Blob para capturar llamadas sin romper la construcción
    globalThis.Blob = class MockBlob extends OriginalBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options);
        blobInstances.push(this);
      }
    } as typeof Blob;

    downloadTextFile(content, filename);

    // Restaurar Blob original
    globalThis.Blob = OriginalBlob;

    expect(blobInstances.length).toBe(1);
    expect(blobInstances[0].type).toBe('application/javascript;charset=utf-8');
  });

  it('debe crear una URL temporal del Blob', () => {
    const content = 'export default {};';
    const filename = 'test.js';

    downloadTextFile(content, filename);

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
  });

  it('debe crear un link temporal con href y download correctos', () => {
    const content = 'export default { endpoints: [] };';
    const filename = 'config.js';

    const createElementSpy = vi.spyOn(document, 'createElement');

    downloadTextFile(content, filename);

    expect(createElementSpy).toHaveBeenCalledWith('a');
  });

  it('debe agregar el link al DOM, hacer click, y removerlo', () => {
    const content = 'test content';
    const filename = 'test.js';

    downloadTextFile(content, filename);

    expect(appendChildSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeChildSpy).toHaveBeenCalledTimes(1);
  });

  it('debe liberar la URL del Blob después de la descarga', () => {
    const content = 'export default {};';
    const filename = 'config.js';

    downloadTextFile(content, filename);

    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('debe manejar contenido vacío sin errores', () => {
    expect(() => {
      downloadTextFile('', 'empty.js');
    }).not.toThrow();

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
  });

  it('debe manejar nombres de archivo con caracteres especiales', () => {
    const content = 'export default {};';
    const filename = 'my-config-2024.js';

    expect(() => {
      downloadTextFile(content, filename);
    }).not.toThrow();

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('debe ejecutar las operaciones en el orden correcto', () => {
    const content = 'test';
    const filename = 'test.js';

    const callOrder: string[] = [];

    createObjectURLSpy.mockImplementation(() => {
      callOrder.push('createObjectURL');
      return 'blob:mock';
    });

    appendChildSpy.mockImplementation((node) => {
      callOrder.push('appendChild');
      return node;
    });

    clickSpy.mockImplementation(() => {
      callOrder.push('click');
    });

    removeChildSpy.mockImplementation((node) => {
      callOrder.push('removeChild');
      return node;
    });

    revokeObjectURLSpy.mockImplementation(() => {
      callOrder.push('revokeObjectURL');
    });

    downloadTextFile(content, filename);

    expect(callOrder).toEqual([
      'createObjectURL',
      'appendChild',
      'click',
      'removeChild',
      'revokeObjectURL',
    ]);
  });
});
