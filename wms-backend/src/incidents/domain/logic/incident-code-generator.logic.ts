// Pure fn: sinh mã incident theo pattern IC-YYMMDD-XXX (BA_SPEC §naming).
// sequence = số thứ tự trong ngày cho project (1-based).

export function buildIncidentCode(date: Date, sequence: number): string {
  if (sequence < 1 || sequence > 999) {
    throw new Error(`Sequence ngoài phạm vi 1-999: ${sequence}`);
  }
  const yy = String(date.getUTCFullYear()).slice(-2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const seq = String(sequence).padStart(3, '0');
  return `IC-${yy}${mm}${dd}-${seq}`;
}
