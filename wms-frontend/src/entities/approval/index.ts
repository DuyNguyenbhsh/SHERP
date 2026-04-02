export {
  useApprovalConfigs,
  useCreateApprovalConfig,
  useUpdateApprovalConfig,
  useToggleApprovalConfig,
  useDeleteApprovalConfig,
  useMyPendingApprovals,
  useApprovalsByEntity,
  useSubmitForApproval,
  useApproveStep,
  useRejectStep,
} from './api/useApprovals'
export type {
  ApprovalConfig,
  ApprovalRequest,
  ApprovalStep,
  ApprovalRequestStatus,
  ApprovalStepStatus,
} from './types'
