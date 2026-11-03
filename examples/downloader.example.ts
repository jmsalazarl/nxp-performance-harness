/**
 * Example: Using downloader utility
 *
 * Este ejemplo muestra cómo usar la utilidad downloadTextFile
 * para descargar archivos config.js generados desde el PreviewPanel.
 */

import { downloadTextFile } from '../src/utils/downloader';

// Ejemplo 1: Descargar una configuración simple
function downloadSimpleConfig() {
  const configContent = `export default {
  endpoints: [
    {
      url: "https://api.example.com/users",
      method: "GET",
      expectedStatus: 200,
      maxRetries: 3,
      thinkTimeSeconds: 1,
      headers: { "Content-Type": "application/json" },
      payload: {},
      loadtest: {
        stages: [{ duration: "30s", target: 10 }],
        thresholds: {
          http_req_duration: ["p(95) < 2000"]
        }
      }
    }
  ]
};`;

  downloadTextFile(configContent, 'config.js');
  console.log('✓ Config simple descargado');
}

// Ejemplo 2: Descargar desde un PreviewPanel (simulado)
function downloadFromPreview(serializedContent: string) {
  // En el componente PreviewPanel, el contenido ya viene serializado
  // del SerializerService. Solo necesitamos disparar la descarga.
  
  downloadTextFile(serializedContent, 'config.js');
  console.log('✓ Config desde PreviewPanel descargado');
}

// Ejemplo 3: Uso típico en un handler de botón de React
function handleDownloadButton(
  isValid: boolean,
  previewContent: string
): void {
  if (!isValid) {
    console.error('Cannot download: configuration is invalid');
    return;
  }

  try {
    downloadTextFile(previewContent, 'config.js');
    console.log('✓ Download successful');
  } catch (error) {
    console.error('Download failed:', error);
  }
}

// Ejemplo 4: Descargar con nombre de archivo personalizado
function downloadWithCustomName(content: string, endpointName: string) {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `config-${endpointName}-${timestamp}.js`;
  
  downloadTextFile(content, filename);
  console.log(`✓ Config descargado como ${filename}`);
}

// Ejecutar ejemplos (solo para demostración, no ejecuta en node)
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  console.log('Downloader utility examples:');
  console.log('- downloadSimpleConfig()');
  console.log('- downloadFromPreview(content)');
  console.log('- handleDownloadButton(isValid, content)');
  console.log('- downloadWithCustomName(content, name)');
}

export {
  downloadSimpleConfig,
  downloadFromPreview,
  handleDownloadButton,
  downloadWithCustomName,
};
