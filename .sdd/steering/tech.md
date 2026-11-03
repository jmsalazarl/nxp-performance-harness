# Technical Steering

## Current Stack

- TypeScript como lenguaje principal de la app.
- React + Vite para el frontend (Config Builder UI y Performance Dashboard).
- Vitest + fast-check para testing (unit, property-based, integration).
- K6 para ejecución de performance.
- `config.js` como input de configuración de pruebas.
- `performancetest.js` como runner K6.

## Frontend Stack (v1)

- **Framework**: React 18+ con TypeScript.
- **Build tool**: Vite.
- **Test runner**: Vitest.
- **PBT library**: fast-check.
- **Styling**: CSS modules o CSS vanilla (sin librerías de componentes externas en v1).
- **State management**: React state + context (sin Redux ni Zustand en v1).
- **Charts**: Canvas/SVG inline o librería ligera si se justifica.

## Roadmap de Stack (v2 — cuando se necesite backend)

- **Backend**: NestJS + TypeScript.
- **Monorepo**: Turborepo o Nx para compartir tipos entre frontend y backend.
- **Persistencia**: A definir cuando se requiera historial de ejecuciones.
- Agregar NestJS no debe requerir reescritura del frontend.

## Constraints

- The config builder must generate a file compatible with the existing import: `import config from "./config.js"`.
- The runner currently selects profiles through `-e TEST_TYPE=<profile>`.
- Supported profiles are `loadtest`, `stresstest`, `capacitytest`, and `stabilitytest`.
- La primera versión es solo frontend (sin backend), ejecuta localmente en el navegador.
- El backend (NestJS) se agrega en v2 cuando se necesite persistencia o APIs.

## Preferred Implementation Direction

- Mantener la documentacion y las specs en `.sdd/`.
- Keep generated config deterministic and human-readable.
- Add `handleSummary(data)` for K6 summary JSON export.
- Use TypeScript strict mode for type safety.
- Use React functional components with hooks.
- Use Vite for fast HMR and minimal configuration.
- Use Vitest as the natural test runner for the Vite ecosystem.

## Validation Priorities

- Generated JavaScript must be syntactically valid.
- JSON payload and headers must be validated before export.
- Uploaded dashboard JSON must be parsed defensively.
- Existing K6 behavior should remain stable.
- TypeScript types must enforce contracts between modules at compile time.
