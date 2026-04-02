import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { ProjectTransaction, CostSummary, CostCategory, ProjectBudget } from '../types'

// ── Cost Categories ──

interface CatResponse {
  status: string
  data: CostCategory[]
}

async function fetchCategories(): Promise<CostCategory[]> {
  const { data } = await api.get<CatResponse>('/projects/cost-categories/all')
  return data.data
}

export function useCostCategories() {
  return useQuery({ queryKey: ['cost-categories'], queryFn: fetchCategories })
}

export interface CreateCategoryPayload {
  code: string
  name: string
  description?: string
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateCategoryPayload) => {
      await api.post('/projects/cost-categories', payload)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['cost-categories'] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/cost-categories/${id}`)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['cost-categories'] }),
  })
}

// ── Budgets ──

interface BudgetResponse {
  status: string
  data: ProjectBudget[]
}

async function fetchBudgets(projectId: string): Promise<ProjectBudget[]> {
  const { data } = await api.get<BudgetResponse>(`/projects/${projectId}/budgets`)
  return data.data
}

export function useBudgets(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-budgets', projectId],
    queryFn: () => fetchBudgets(projectId!),
    enabled: !!projectId,
  })
}

export interface UpsertBudgetPayload {
  project_id: string
  category_id: string
  planned_amount: number
  notes?: string
}

export function useUpsertBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ project_id, ...payload }: UpsertBudgetPayload) => {
      await api.post(`/projects/${project_id}/budgets`, payload)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project-budgets'] })
      void qc.invalidateQueries({ queryKey: ['project-cost'] })
    },
  })
}

// ── Cost Summary ──

interface CostResponse {
  status: string
  data: CostSummary
}

export function useCostSummary(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-cost', projectId],
    queryFn: async () => {
      const { data } = await api.get<CostResponse>(`/projects/${projectId}/cost-summary`)
      return data.data
    },
    enabled: !!projectId,
  })
}

// ── Transactions ──

interface TxResponse {
  status: string
  data: ProjectTransaction[]
}

export function useTransactions(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-transactions', projectId],
    queryFn: async () => {
      const { data } = await api.get<TxResponse>(`/projects/${projectId}/transactions`)
      return data.data
    },
    enabled: !!projectId,
  })
}

export interface CreateTransactionPayload {
  project_id: string
  category_id: string
  amount: number
  transaction_date: string
  description?: string
  reference_type?: string
  reference_id?: string
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ project_id, ...payload }: CreateTransactionPayload) => {
      await api.post(`/projects/${project_id}/transactions`, payload)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project-cost'] })
      void qc.invalidateQueries({ queryKey: ['project-transactions'] })
    },
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/transactions/${id}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['project-cost'] })
      void qc.invalidateQueries({ queryKey: ['project-transactions'] })
    },
  })
}
