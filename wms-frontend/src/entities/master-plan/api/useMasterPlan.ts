import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type {
  MasterPlan,
  WbsNode,
  TaskTemplate,
  CreateMasterPlanPayload,
  UpdateMasterPlanPayload,
  CreateWbsNodePayload,
  UpdateWbsNodePayload,
  CreateTaskTemplatePayload,
} from '../types'

interface ApiResponse<T> {
  status?: string | boolean
  message?: string
  data: T
}

// ── Master Plan ───────────────────────────────────────────────
export function useMasterPlans() {
  return useQuery({
    queryKey: ['master-plan'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<MasterPlan[]>>('/master-plan')
      return data.data
    },
  })
}

export function useMasterPlan(id: string | null) {
  return useQuery({
    queryKey: ['master-plan', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<MasterPlan>>(`/master-plan/${id!}`)
      return data.data
    },
    enabled: Boolean(id),
  })
}

export function useCreateMasterPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateMasterPlanPayload) => {
      const { data } = await api.post<ApiResponse<MasterPlan>>('/master-plan', payload)
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['master-plan'] }),
  })
}

export function useUpdateMasterPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { id: string; data: UpdateMasterPlanPayload }) => {
      const { data } = await api.patch<ApiResponse<MasterPlan>>(
        `/master-plan/${args.id}`,
        args.data,
      )
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['master-plan'] }),
  })
}

export function useApproveMasterPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<MasterPlan>>(`/master-plan/${id}/approve`)
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['master-plan'] }),
  })
}

export function useCloseMasterPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<MasterPlan>>(`/master-plan/${id}/close`)
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['master-plan'] }),
  })
}

// ── WBS Tree ──────────────────────────────────────────────────
export function useWbsTree(planId: string | null) {
  return useQuery({
    queryKey: ['master-plan', planId, 'wbs-tree'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<WbsNode[]>>(`/master-plan/${planId!}/wbs-tree`)
      return data.data
    },
    enabled: Boolean(planId),
  })
}

export function useCreateWbsNode(planId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateWbsNodePayload) => {
      const { data } = await api.post<ApiResponse<WbsNode>>(
        `/master-plan/${planId}/wbs-nodes`,
        payload,
      )
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['master-plan', planId, 'wbs-tree'] }),
  })
}

export function useUpdateWbsNode(planId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { nodeId: string; data: UpdateWbsNodePayload }) => {
      const { data } = await api.patch<ApiResponse<WbsNode>>(
        `/master-plan/${planId}/wbs-nodes/${args.nodeId}`,
        args.data,
      )
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['master-plan', planId, 'wbs-tree'] }),
  })
}

export function useArchiveWbsNode(planId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (nodeId: string) => {
      await api.post(`/master-plan/${planId}/wbs-nodes/${nodeId}/archive`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['master-plan', planId, 'wbs-tree'] })
      void qc.invalidateQueries({ queryKey: ['master-plan', planId, 'task-templates'] })
      void qc.invalidateQueries({ queryKey: ['master-plan', planId, 'dashboard'] })
    },
  })
}

// ── Task Template ─────────────────────────────────────────────
export function useCreateTaskTemplate(wbsNodeId: string, planId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateTaskTemplatePayload) => {
      const { data } = await api.post<ApiResponse<TaskTemplate>>(
        `/master-plan/wbs-nodes/${wbsNodeId}/task-templates`,
        payload,
      )
      return data.data
    },
    onSuccess: () => {
      if (planId) {
        void qc.invalidateQueries({ queryKey: ['master-plan', planId, 'task-templates'] })
        void qc.invalidateQueries({ queryKey: ['master-plan', planId, 'dashboard'] })
      } else {
        void qc.invalidateQueries({ queryKey: ['master-plan'] })
      }
    },
  })
}

export function usePreviewTaskTemplate() {
  return useMutation({
    mutationFn: async (templateId: string) => {
      const { data } = await api.post<ApiResponse<string[]>>(
        `/master-plan/task-templates/${templateId}/preview`,
      )
      return data.data
    },
  })
}

// ── Dashboard + aggregated Task Templates ──────────────
export interface MasterPlanDashboardData {
  plan: { id: string; code: string; status: string; year: number }
  budget: { totalBudgetVnd: string; nodeCount: number }
  workItems: {
    total: number
    progressPct: number
    onTimeCompletedPct: number
    overdueCount: number
    byType: Record<string, number>
    byStatus: Record<string, number>
  }
}

export function useMasterPlanDashboard(planId: string | null) {
  return useQuery({
    queryKey: ['master-plan', planId, 'dashboard'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<MasterPlanDashboardData>>(
        `/master-plan/${planId!}/dashboard`,
      )
      return data.data
    },
    enabled: Boolean(planId),
    refetchInterval: 5 * 60 * 1000,
  })
}

export interface TaskTemplateListItem {
  id: string
  name: string
  work_item_type: string
  recurrence_rule: string
  sla_hours: number
  is_active: boolean
  last_generated_date: string | null
  default_assignee_role: string | null
  wbs_code: string
  wbs_name: string
  wbs_node_id: string
}

export function useTaskTemplatesByPlan(planId: string | null) {
  return useQuery({
    queryKey: ['master-plan', planId, 'task-templates'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<TaskTemplateListItem[]>>(
        `/master-plan/${planId!}/task-templates`,
      )
      return data.data
    },
    enabled: Boolean(planId),
  })
}
