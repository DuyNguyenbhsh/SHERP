/**
 * Budget enums — Theo SA_DESIGN hard-limit-budget-control.
 */

export enum BudgetType {
  OPEX = 'OPEX',
  CAPEX = 'CAPEX',
}

export enum BudgetControlLevel {
  HARD = 'HARD',
  SOFT = 'SOFT',
  ADVISORY = 'ADVISORY',
}

export enum BudgetStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  CLOSED = 'CLOSED',
  REVISED = 'REVISED',
}

export enum BudgetAmountType {
  COMMITTED = 'COMMITTED',
  CONSUMED = 'CONSUMED',
}

export enum BudgetCheckResult {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  OVERRIDE = 'OVERRIDE',
}

export enum BudgetTransactionType {
  PO = 'PO',
  AP_INVOICE = 'AP_INVOICE',
  GL_JOURNAL = 'GL_JOURNAL',
  INVENTORY_ISSUE = 'INVENTORY_ISSUE',
  TIMESHEET = 'TIMESHEET',
  EXPENSE = 'EXPENSE',
  SUBCONTRACT = 'SUBCONTRACT',
  WMS_INBOUND = 'WMS_INBOUND',
  WMS_OUTBOUND = 'WMS_OUTBOUND',
  MANUAL = 'MANUAL',
}

export enum BudgetRevisionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
