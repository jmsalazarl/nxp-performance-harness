# Hooks Del Proyecto

Hooks are event-driven automations for the workspace. They can run agent actions when files are created, modified, or deleted.

This project does not enable hooks yet. Future useful hooks may include:

- Validar `.sdd/specs/**/spec.yaml` despues de editar una spec.
- Check that each spec contains `requirements.md`, `design.md`, and `tasks.md`.
- Remind the implementer to update docs when `performancetest.js` or generated config behavior changes.

Hook files should be JSON and live in this directory when introduced.
