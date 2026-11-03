export function selectByVu(values, offset = 0) {
  if (!values || values.length === 0) {
    throw new Error("El dataset debe contener al menos un valor");
  }

  const index = (Number(__VU || 1) - 1 + Number(__ITER || 0) + offset) % values.length;
  return values[index];
}

export function requireDatasetValue(value, name) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`Falta el valor de dataset requerido: ${name}`);
  }
  return value;
}
