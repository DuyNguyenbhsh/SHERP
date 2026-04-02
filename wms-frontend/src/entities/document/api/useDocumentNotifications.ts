import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { DocumentNotification } from '../types'

interface ApiResponse {
  status: string
  data: DocumentNotification[]
}

async function fetchNotifications(unreadOnly: boolean): Promise<DocumentNotification[]> {
  const { data } = await api.get<ApiResponse>(
    `/documents/notifications${unreadOnly ? '?unread=true' : ''}`,
  )
  return data.data
}

export function useDocumentNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ['document-notifications', unreadOnly],
    queryFn: () => fetchNotifications(unreadOnly),
  })
}

async function generateNotifications(): Promise<void> {
  await api.post('/documents/notifications/generate')
}

async function markRead(notificationId: string): Promise<void> {
  await api.patch(`/documents/notifications/${notificationId}/read`)
}

async function markAllRead(): Promise<void> {
  await api.patch('/documents/notifications/read-all')
}

export function useGenerateNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: generateNotifications,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['document-notifications'] }),
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['document-notifications'] }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['document-notifications'] }),
  })
}
