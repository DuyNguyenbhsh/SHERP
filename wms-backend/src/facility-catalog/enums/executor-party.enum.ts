/**
 * Bên thực hiện task (SA §15.1.4, BR-MP-08).
 * Reuse trong task_templates.executor_party.
 */
export enum ExecutorParty {
  INTERNAL = 'INTERNAL', // IMPC tự làm
  OWNER = 'OWNER', // BW - chủ đầu tư
  TENANT = 'TENANT', // Khách thuê
  CONTRACTOR = 'CONTRACTOR', // Nhà thầu độc lập
  MIXED = 'MIXED', // Đồng thực hiện (BW & Tenant)
}
