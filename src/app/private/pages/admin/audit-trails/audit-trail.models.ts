/** Fila de GET api/Audits/Trails (solo SuperAdmin). `dateTime` viene en hora de Lima, sin zona: se muestra tal cual. */
export interface AuditTrail {
  id: number;
  userId: string | null;
  userName: string | null;
  ipAddress: string | null;
  type: string | null;
  tableName: string | null;
  dateTime: string;
  oldValues: string | null;
  newValues: string | null;
  affectedColumns: string | null;
  primaryKey: string | null;

  // Etiquetas para la tabla (las arma el servicio)
  typeLabel?: string;
  badgeColor?: string;
  keyLabel?: string;
  userLabel?: string;
}

/** Un campo del registro en el detalle: valor anterior, nuevo y si cambió. */
export interface AuditFieldChange {
  field: string;
  before: string;
  after: string;
  changed: boolean;
}

export const AUDIT_TYPE_OPTIONS = [
  { id: 'Create', name: 'Creación' },
  { id: 'Update', name: 'Modificación' },
  { id: 'Delete', name: 'Eliminación' }
];

const TYPE_BADGES: Record<string, string> = {
  Create: 'badge-light-success',
  Update: 'badge-light-primary',
  Delete: 'badge-light-danger'
};

export function decorateAuditTrail(row: AuditTrail): AuditTrail {
  row.typeLabel = AUDIT_TYPE_OPTIONS.find((t) => t.id === row.type)?.name ?? row.type ?? '-';
  row.badgeColor = TYPE_BADGES[row.type ?? ''] ?? 'badge-light-secondary';
  row.keyLabel = keyLabel(row.primaryKey);
  row.userLabel = row.userName || (row.userId ? row.userId : 'Sistema');
  return row;
}

/** {"Id":2} → "2"; varias claves → "Id: 2 · Code: X". */
export function keyLabel(primaryKey: string | null): string {
  const parsed = parseJson(primaryKey);
  if (!parsed) return primaryKey ?? '-';
  const entries = Object.entries(parsed);
  if (entries.length === 1) return formatValue(entries[0][1]);
  return entries.map(([k, v]) => `${k}: ${formatValue(v)}`).join(' · ');
}

/** Campos del registro, ordenados: primero los que cambiaron (en una modificación), luego el resto por nombre. */
export function fieldChanges(row: AuditTrail): AuditFieldChange[] {
  const before = parseJson(row.oldValues) ?? {};
  const after = parseJson(row.newValues) ?? {};
  const affected = new Set<string>((parseJsonArray(row.affectedColumns) ?? []).map(String));
  const fields = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  return fields
    .map((field) => {
      const b = field in before ? formatValue(before[field]) : '';
      const a = field in after ? formatValue(after[field]) : '';
      return { field, before: b, after: a, changed: row.type === 'Update' && (affected.has(field) || b !== a) };
    })
    .sort((x, y) => Number(y.changed) - Number(x.changed) || x.field.localeCompare(y.field));
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function parseJson(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function parseJsonArray(value: string | null): unknown[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
