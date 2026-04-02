import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { ProjectTaskItem, TaskLinkItem, ScheduleData, ScheduleBaselineItem } from '../types'

interface ApiResponse<T> {
  status: string
  data: T
}

export function useScheduleData(projectId: string | undefined) {
  return useQuery({
    queryKey: ['schedule-data', projectId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ScheduleData>>('/project-schedule/data', {
        params: { project_id: projectId },
      })
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useScheduleTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ['schedule-tasks', projectId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ProjectTaskItem[]>>('/project-schedule/tasks', {
        params: { project_id: projectId },
      })
      return data.data
    },
    enabled: !!projectId,
  })
}

export function useScheduleBaselines(projectId: string | undefined) {
  return useQuery({
    queryKey: ['schedule-baselines', projectId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ScheduleBaselineItem[]>>(
        '/project-schedule/baselines',
        { params: { project_id: projectId } },
      )
      return data.data
    },
    enabled: !!projectId,
  })
}

interface CreateTaskPayload {
  project_id: string
  task_code: string
  name: string
  duration_days: number
  description?: string
  start_date?: string
  wbs_id?: string
  planned_labor?: number
  resource_notes?: string
  sort_order?: number
}

export function useCreateScheduleTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: CreateTaskPayload) => {
      const { data } = await api.post<ApiResponse<ProjectTaskItem>>('/project-schedule/tasks', p)
      return data.data
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['schedule-data', v.project_id] })
      void qc.invalidateQueries({ queryKey: ['schedule-tasks', v.project_id] })
    },
  })
}

export function useUpdateScheduleTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string
      project_id: string
      [k: string]: unknown
    }) => {
      const { data } = await api.patch<ApiResponse<ProjectTaskItem>>(
        `/project-schedule/tasks/${id}`,
        body,
      )
      return data.data
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['schedule-data', v.project_id] })
    },
  })
}

export function useDeleteScheduleTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      await api.delete(`/project-schedule/tasks/${id}`)
      return project_id
    },
    onSuccess: (pid) => {
      void qc.invalidateQueries({ queryKey: ['schedule-data', pid] })
    },
  })
}

interface CreateLinkPayload {
  project_id: string
  predecessor_id: string
  successor_id: string
  link_type?: string
  lag_days?: number
}

export function useCreateScheduleLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: CreateLinkPayload) => {
      const { data } = await api.post<ApiResponse<TaskLinkItem>>('/project-schedule/links', p)
      return data.data
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['schedule-data', v.project_id] })
    },
  })
}

export function useDeleteScheduleLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, project_id }: { id: string; project_id: string }) => {
      await api.delete(`/project-schedule/links/${id}`)
      return project_id
    },
    onSuccess: (pid) => {
      void qc.invalidateQueries({ queryKey: ['schedule-data', pid] })
    },
  })
}

export function useCreateBaseline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: { project_id: string; title: string }) => {
      const { data } = await api.post<ApiResponse<ScheduleBaselineItem>>(
        '/project-schedule/baselines',
        p,
      )
      return data.data
    },
    onSuccess: (_d, v) => {
      void qc.invalidateQueries({ queryKey: ['schedule-baselines', v.project_id] })
    },
  })
}

export function useApproveBaseline() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { data } = await api.patch<ApiResponse<ScheduleBaselineItem>>(
        `/project-schedule/baselines/${id}/approve`,
      )
      return data.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['schedule-baselines'] })
    },
  })
}
