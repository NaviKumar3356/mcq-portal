// All assessment scheduling in this portal is wall-clock IST (Asia/Kolkata).
// We intentionally do not use the browser's local timezone for form values.
const IST_OFFSET_MINUTES = 330;

function pad(n) { return String(n).padStart(2, '0'); }

export function istValueToUtcIso(value) {
  if (!value) return null;
  const [datePart, timePart = '00:00'] = String(value).split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh = 0, mm = 0] = timePart.split(':').map(Number);
  if (![y, m, d, hh, mm].every(Number.isFinite)) return null;
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MINUTES * 60000).toISOString();
}

export function utcIsoToIstValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

export function nowIstValue() {
  return utcIsoToIstValue(new Date().toISOString());
}

export function istDateFromValue(value) {
  if (!value) return null;
  const [datePart, timePart = '00:00'] = String(value).split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh = 0, mm = 0] = timePart.split(':').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm));
}

export function istValueFromDate(date) {
  if (!date || Number.isNaN(date.getTime())) return '';
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}
