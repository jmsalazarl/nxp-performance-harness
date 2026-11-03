# Estructura SDD

## Specs

`.sdd/specs/` contiene specs de funcionalidades. Cada spec debe ser pequena y ejecutable.

Each spec contains:

- `requirements.md`: user needs, functional requirements, non-functional requirements, and acceptance criteria.
- `design.md`: implementation approach, data contracts, validation, and failure behavior.
- `tasks.md`: ordered checklist for implementation.
- `spec.yaml`: identidad, estado y documentos de la spec.

## Hooks

`.sdd/hooks/` esta reservado para automatizaciones orientadas a eventos. Actualmente no hay hooks activos.

## Steering

`.sdd/steering/` almacena las reglas persistentes del proyecto:

- `product.md`: product intent and scope.
- `tech.md`: technical constraints and preferred approach.
- `structure.md`: repository and documentation conventions.

## Skills

`.sdd/skills/` esta reservado para workflows reutilizables. Actualmente no hay skills personalizadas activas.

## Docs

`.sdd/docs/` contiene documentacion de apoyo local. Estos archivos no son specs.
