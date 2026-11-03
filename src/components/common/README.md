# Common Components

Este directorio contiene componentes React reutilizables que se utilizan a lo largo de la aplicación Config Builder UI.

## Componentes

### ConfirmDialog

Diálogo de confirmación modal genérico que solicita confirmación del usuario para acciones destructivas.

**Props:**
- `open` (boolean): Controla si el diálogo está visible
- `title` (string): Título del diálogo
- `message` (string): Mensaje descriptivo
- `onConfirm` (function): Callback ejecutado cuando el usuario confirma
- `onCancel` (function): Callback ejecutado cuando el usuario cancela o hace clic fuera del diálogo

**Ejemplo de uso:**
```tsx
import { ConfirmDialog } from '@/components/common';

<ConfirmDialog
  open={isDialogOpen}
  title="Eliminar Endpoint"
  message="¿Estás seguro de que deseas eliminar este endpoint? Esta acción no se puede deshacer."
  onConfirm={() => handleDelete()}
  onCancel={() => setIsDialogOpen(false)}
/>
```

### ValidationMessage

Componente de mensaje de error inline que se muestra debajo de campos de formulario para indicar errores de validación.

**Props:**
- `message` (string | null): Mensaje de error a mostrar (si es null, no se renderiza nada)
- `fieldName` (string, opcional): Nombre del campo que tiene el error (se muestra en negrita antes del mensaje)

**Ejemplo de uso:**
```tsx
import { ValidationMessage } from '@/components/common';

<ValidationMessage message={urlError} fieldName="URL" />
<ValidationMessage message={jsonError} />
```

## Estilos

Cada componente tiene su propio CSS module:
- `ConfirmDialog.module.css` - Estilos del diálogo modal
- `ValidationMessage.module.css` - Estilos del mensaje de error
- `common.module.css` - Estilos compartidos (botones, inputs, labels)

Los estilos en `common.module.css` pueden ser utilizados por otros componentes mediante `composes` o importación directa.
