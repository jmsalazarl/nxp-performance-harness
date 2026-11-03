/**
 * Downloader Utility
 *
 * Utilidad pura para generar archivos descargables desde contenido de texto.
 * Genera un Blob del contenido y dispara una descarga del navegador mediante un link temporal.
 */

/**
 * Genera y descarga un archivo de texto en el navegador.
 *
 * @param content - Contenido del archivo como string (ej. JavaScript generado)
 * @param filename - Nombre del archivo a descargar (ej. "config.js")
 *
 * @example
 * ```typescript
 * const jsCode = 'export default { endpoints: [...] };';
 * downloadTextFile(jsCode, 'config.js');
 * ```
 */
export function downloadTextFile(content: string, filename: string): void {
  // Crear Blob con tipo MIME para JavaScript
  const blob = new Blob([content], { type: 'application/javascript;charset=utf-8' });

  // Crear URL temporal del Blob
  const url = URL.createObjectURL(blob);

  // Crear elemento <a> temporal para disparar descarga
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Agregar al DOM temporalmente (requerido en algunos navegadores)
  document.body.appendChild(link);

  // Disparar click programático
  link.click();

  // Limpieza: remover link del DOM
  document.body.removeChild(link);

  // Liberar URL del Blob para evitar memory leaks
  URL.revokeObjectURL(url);
}
