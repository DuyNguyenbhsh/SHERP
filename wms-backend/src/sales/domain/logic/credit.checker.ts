/**
 * CreditChecker — Pure function kiểm tra hạn mức công nợ.
 *
 * Business Rules:
 * - BR-SALES-06: current_debt + new_order > credit_limit → block
 *   Trừ khi user có privilege BYPASS_CREDIT_LIMIT
 */

export interface CreditCheckInput {
  current_debt: number;
  credit_limit: number;
  new_order_amount: number;
  has_bypass_privilege: boolean;
  bypass_reason?: string | null;
}

export interface CreditCheckResult {
  allowed: boolean;
  requires_bypass: boolean;
  shortfall: number; // Số tiền vượt hạn mức (0 nếu không vượt)
  message: string;
}

export function checkCredit(input: CreditCheckInput): CreditCheckResult {
  const projected = input.current_debt + input.new_order_amount;
  const shortfall = Math.max(0, projected - input.credit_limit);

  if (shortfall === 0) {
    return {
      allowed: true,
      requires_bypass: false,
      shortfall: 0,
      message: 'Trong hạn mức công nợ',
    };
  }

  // Vượt hạn mức
  if (input.has_bypass_privilege) {
    if (!input.bypass_reason || !input.bypass_reason.trim()) {
      return {
        allowed: false,
        requires_bypass: true,
        shortfall,
        message: `Vượt hạn mức ${shortfall.toLocaleString('vi-VN')} VND. Bắt buộc nhập lý do bypass.`,
      };
    }
    return {
      allowed: true,
      requires_bypass: true,
      shortfall,
      message: `Bypass hạn mức — vượt ${shortfall.toLocaleString('vi-VN')} VND (có ghi lý do)`,
    };
  }

  return {
    allowed: false,
    requires_bypass: false,
    shortfall,
    message: `Vượt hạn mức công nợ ${shortfall.toLocaleString('vi-VN')} VND. Liên hệ cấp trên để xử lý.`,
  };
}
