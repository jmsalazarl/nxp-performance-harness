# Seguridad

## Controles obligatorios

- Ejecutar `npm run verify` antes de publicar cambios.
- No almacenar tokens, contrasenas, llaves privadas ni credenciales reales en el repositorio.
- Usar placeholders como `<token>` en ejemplos y pruebas.
- Mantener `npm audit --audit-level=high` sin vulnerabilidades altas o criticas.
- Mantener la cobertura minima configurada en `vitest.config.ts`.
- Ejecutar la aplicacion publicada con el contenedor sin privilegios.

## Reporte de vulnerabilidades

No publicar credenciales ni detalles explotables en issues publicos. Reportar el hallazgo al equipo mantenedor incluyendo el archivo afectado, version, reproduccion minima e impacto.

## Limites

Estos controles reducen riesgos del framework, pero no reemplazan revisiones de infraestructura, configuracion TLS, control de acceso del entorno objetivo ni pruebas de penetracion antes de una exposicion publica.
