/**
 * Quy tắc tăng version:
 * - V1.0 là version đầu tiên (seq = 1)
 * - Các version tiếp theo tăng minor: V1.1, V1.2, ... V1.9, V1.10, ...
 * - Rollback KHÔNG tạo major version — chỉ tăng seq như version thường (source_version_id ghi lại gốc)
 */
export function nextVersionNumber(currentSeq: number): {
  seq: number;
  label: string;
} {
  const seq = currentSeq + 1;
  const minor = seq - 1;
  return { seq, label: `V1.${minor}` };
}
