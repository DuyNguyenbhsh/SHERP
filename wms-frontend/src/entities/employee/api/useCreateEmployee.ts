import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'

export interface CreateEmployeePayload {
  employee_code: string
  full_name: string
  email?: string
  phone_number?: string
  job_title?: string
  organization_id: string
}

async function createEmployee(payload: CreateEmployeePayload): Promise<void> {
  await api.post('/employees', payload)
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['employees'] })
      void queryClient.invalidateQueries({ queryKey: ['organizations'] })
    },
  })
}
