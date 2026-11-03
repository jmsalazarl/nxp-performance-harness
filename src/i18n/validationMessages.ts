import type { Language } from './translations';

const exactMessages: Record<string, Record<Language, string>> = {
  'URL is required and cannot be empty': {
    es: 'La URL es obligatoria y no puede estar vacía',
    en: 'URL is required and cannot be empty',
  },
  'URL must start with http:// or https://': {
    es: 'La URL debe iniciar con http:// o https://',
    en: 'URL must start with http:// or https://',
  },
  'JSON cannot be empty': {
    es: 'El JSON no puede estar vacío',
    en: 'JSON cannot be empty',
  },
  'JSON must be an object (not an array or primitive)': {
    es: 'El JSON debe ser un objeto, no un arreglo ni un valor primitivo',
    en: 'JSON must be an object (not an array or primitive)',
  },
  'Duration cannot be empty': {
    es: 'La duración no puede estar vacía',
    en: 'Duration cannot be empty',
  },
  'Invalid K6 duration format (e.g., "30s", "2m", "1h")': {
    es: 'Formato de duración K6 inválido (ej.: "30s", "2m", "1h")',
    en: 'Invalid K6 duration format (e.g., "30s", "2m", "1h")',
  },
  'Duration must be in K6 format (e.g., "30s", "2m", "1h", "1h30m")': {
    es: 'La duración debe estar en formato K6 (ej.: "30s", "2m", "1h", "1h30m")',
    en: 'Duration must be in K6 format (e.g., "30s", "2m", "1h", "1h30m")',
  },
  'Target must be a number': {
    es: 'El objetivo debe ser un número',
    en: 'Target must be a number',
  },
  'Metric name cannot be empty': {
    es: 'El nombre de la métrica no puede estar vacío',
    en: 'Metric name cannot be empty',
  },
  'Metric name cannot be empty or whitespace only': {
    es: 'El nombre de la métrica no puede estar vacío ni contener solo espacios',
    en: 'Metric name cannot be empty or whitespace only',
  },
  'Metric name must be 128 characters or less': {
    es: 'El nombre de la métrica debe tener 128 caracteres o menos',
    en: 'Metric name must be 128 characters or less',
  },
  'Metric name must contain only letters, digits, and underscores': {
    es: 'El nombre de la métrica solo puede contener letras, dígitos y guiones bajos',
    en: 'Metric name must contain only letters, digits, and underscores',
  },
  'Metric name must contain only letters, digits, and underscores (1-128 chars)': {
    es: 'El nombre de la métrica solo puede contener letras, dígitos y guiones bajos (1-128 caracteres)',
    en: 'Metric name must contain only letters, digits, and underscores (1-128 chars)',
  },
  'Metric already exists': {
    es: 'La métrica ya existe',
    en: 'Metric already exists',
  },
  'Expression cannot be empty': {
    es: 'La expresión no puede estar vacía',
    en: 'Expression cannot be empty',
  },
  'Threshold expression cannot be empty or whitespace only': {
    es: 'La expresión del umbral no puede estar vacía ni contener solo espacios',
    en: 'Threshold expression cannot be empty or whitespace only',
  },
  'At least one endpoint is required for export': {
    es: 'Se requiere al menos un endpoint para exportar',
    en: 'At least one endpoint is required for export',
  },
};

export function translateValidationMessage(message: string | null, language: Language): string | null {
  if (!message) return null;

  const exact = exactMessages[message];
  if (exact) {
    return exact[language];
  }

  if (language === 'en') {
    return message;
  }

  const invalidJsonMatch = message.match(/^Invalid JSON: (.+)$/);
  if (invalidJsonMatch) {
    return `JSON inválido: ${invalidJsonMatch[1]}`;
  }

  const fieldNumberMatch = message.match(/^(.+) must be a valid number$/);
  if (fieldNumberMatch) {
    return `${translateFieldName(fieldNumberMatch[1]!)} debe ser un número válido`;
  }

  const fieldMinMatch = message.match(/^(.+) must be at least (.+)$/);
  if (fieldMinMatch) {
    return `${translateFieldName(fieldMinMatch[1]!)} debe ser al menos ${fieldMinMatch[2]}`;
  }

  const fieldMaxMatch = message.match(/^(.+) must be at most (.+)$/);
  if (fieldMaxMatch) {
    return `${translateFieldName(fieldMaxMatch[1]!)} debe ser como máximo ${fieldMaxMatch[2]}`;
  }

  const targetRangeMatch = message.match(/^Target must be between (.+) and (.+)$/);
  if (targetRangeMatch) {
    return `El objetivo debe estar entre ${targetRangeMatch[1]} y ${targetRangeMatch[2]}`;
  }

  const profileStageMatch = message.match(/^Profile (.+) must have at least one stage$/);
  if (profileStageMatch) {
    return `El perfil ${profileStageMatch[1]} debe tener al menos una etapa`;
  }

  const endpointProfileMatch = message.match(/^Endpoint "(.+)" must have at least one enabled profile$/);
  if (endpointProfileMatch) {
    return `El endpoint "${endpointProfileMatch[1]}" debe tener al menos un perfil habilitado`;
  }

  const metricExpressionMatch = message.match(/^Metric (.+) must have at least one threshold expression$/);
  if (metricExpressionMatch) {
    return `La métrica ${metricExpressionMatch[1]} debe tener al menos una expresión de umbral`;
  }

  return message;
}

function translateFieldName(fieldName: string): string {
  const fields: Record<string, string> = {
    expectedStatus: 'El estado esperado',
    maxRetries: 'Los reintentos máximos',
    thinkTimeSeconds: 'El tiempo de espera',
    target: 'El objetivo',
  };

  return fields[fieldName] ?? fieldName;
}
