export {
  useCustomers,
  useCustomerDebt,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useRestoreCustomer,
} from './api/useCustomers'
export type {
  Customer,
  CustomerType,
  CustomerPaymentTerm,
  CustomerDebt,
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from './types'
export { CUSTOMER_TYPE_LABELS, CUSTOMER_PAYMENT_TERM_LABELS } from './types'
