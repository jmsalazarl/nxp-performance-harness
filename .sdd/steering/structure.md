# Structure Steering

## Current Project Structure

```text
.
├── config.js
└── performancetest.js
```

## SDD Structure

```text
.sdd/
├── specs/
├── hooks/
├── steering/
├── skills/
└── docs/
```

## Spec Convention

Each spec must live in:

```text
.sdd/specs/<spec-name>/
```

Each spec directory must contain:

- `spec.yaml`
- `requirements.md`
- `design.md`
- `tasks.md`

## `spec.yaml` Convention

Este proyecto usa un archivo YAML por spec:

```json
specId: "SPEC-000"
name: "spec-name"
version: "1.0.0"
status: "requirements-draft"
owner: "project-owner"
workflow: "requirements-first"
```

## App Structure (v1 — React + TypeScript + Vite)

```text
src/
├── main.tsx              ← entry point de React
├── App.tsx               ← componente raíz
├── components/           ← componentes React reutilizables
├── hooks/                ← custom hooks
├── models/               ← interfaces y tipos TypeScript
├── services/             ← lógica de negocio (validación, serialización, parsing)
├── utils/                ← utilidades compartidas
├── assets/               ← estilos, imágenes
└── index.html            ← HTML host (Vite)
```

## Test Structure

Tests live in a `tests/` directory at project root, separated from source code (POM convention):

```text
tests/
├── unit/                 ← tests unitarios por módulo
├── properties/           ← property-based tests con fast-check
└── integration/          ← tests de integración end-to-end
```

## Config Files (root)

```text
.
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── config.js             ← K6 config (existente)
└── performancetest.js    ← K6 runner (existente)
```

## Backend Structure (v2 — NestJS, cuando se necesite)

```text
backend/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   └── modules/
└── test/
```

When a backend is introduced, update this steering file and consider a monorepo structure (Turborepo/Nx).
