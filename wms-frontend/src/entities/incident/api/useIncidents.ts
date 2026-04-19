import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type {
  Incident,
  CreateIncidentPayload,
  AssignIncidentPayload,
  ResolveIncidentPayload,
  IncidentStatus,
} from '../types'

interface ApiResponse<T> {
  status?: string | boolean
  message?: string
  data: T
}

export function useIncidents(
  filter: {
    projectId?: string
    status?: IncidentStatus
    assigneeId?: string
  } = {},
) {
  return useQuery({
    queryKey: ['incidents', filter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filter.projectId) params.projectId = filter.projectId
      if (filter.status) params.status = filter.status
      if (filter.assigneeId) params.assigneeId = filter.assigneeId
      const { data } = await api.get<ApiResponse<Incident[]>>('/incidents', { params })
      return data.data
    },
  })
}

export function useIncident(id: string | null) {
  return useQuery({
    queryKey: ['incidents', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Incident>>(`/incidents/${id!}`)
      return data.data
    },
    enabled: Boolean(id),
  })
}

export function useCreateIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateIncidentPayload) => {
      const { data } = await api.post<ApiResponse<Incident>>('/incidents', payload)
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['incidents'] }),
  })
}

export function useAssignIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { id: string; data: AssignIncidentPayload }) => {
      const { data } = await api.patch<ApiResponse<Incident>>(
        `/incidents/${args.id}/assign`,
        args.data,
      )
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['incidents'] }),
  })
}

export function useResolveIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { id: string; data: ResolveIncidentPayload }) => {
      const { data } = await api.post<ApiResponse<Incident>>(
        `/incidents/${args.id}/resolve`,
        args.data,
      )
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['incidents'] }),
  })
}

export function useCloseIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ApiResponse<Incident>>(`/incidents/${id}/close`)
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['incidents'] }),
  })
}

export function useAddIncidentComment(incidentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) => {
      const { data } = await api.post<ApiResponse<unknown>>(`/incidents/${incidentId}/comments`, {
        body,
      })
      return data.data
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['incidents', incidentId] }),
  })
}
