import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { Role } from '../types'

interface ApiResponse {
  status: boolean
  data: Role[]
}

const MOCK_ROLES: Role[] = [
  {
    id: '1',
    role_code: 'SUPER_ADMIN',
    role_name: 'Quản trị viên cấp cao',
    description: 'Toàn quyền hệ thống',
    is_active: true,
    created_at: '2026-03-13T07:38:32.730Z',
  },
  {
    id: '2',
    role_code: 'WAREHOUSE_MANAGER',
    role_name: 'Quản lý kho',
    description: 'Quản lý nhập xuất tồn kho',
    is_active: true,
    created_at: '2026-03-13T07:38:32.730Z',
  },
  {
    id: '3',
    role_code: 'ACCOUNTANT',
    role_name: 'Kế toán',
    description: 'Quản lý tài chính, công nợ',
    is_active: true,
    created_at: '2026-03-13T07:38:32.730Z',
  },
  {
    id: '4',
    role_code: 'PURCHASER',
    role_name: 'Nhân viên mua hàng',
    description: 'Tạo và quản lý đơn mua hàng',
    is_active: true,
    created_at: '2026-03-13T07:38:32.730Z',
  },
  {
    id: '5',
    role_code: 'DRIVER',
    role_name: 'Tài xế',
    description: 'Giao hàng và vận chuyển',
    is_active: false,
    created_at: '2026-03-13T07:38:32.730Z',
  },
]

async function fetchRoles(): Promise<Role[]> {
  try {
    const { data } = await api.get<ApiResponse>('/roles')
    return data.data
  } catch {
    return MOCK_ROLES
  }
}

export function useRoles(): ReturnType<typeof useQuery<Role[]>> {
  return useQuery({ queryKey: ['roles'], queryFn: fetchRoles })
}
