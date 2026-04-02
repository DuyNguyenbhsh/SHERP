import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/axios'
import type { User } from '../types'

interface ApiResponse {
  status: boolean
  data: User[]
}

const MOCK_USERS: User[] = [
  {
    id: '1',
    username: 'admin',
    is_active: true,
    employee: {
      id: 'e1',
      employee_code: 'EMP-001',
      full_name: 'Nguyễn Trí Duy',
      email: 'duy.nguyen@shvisionary.com',
    },
    userRoles: [
      {
        id: 'ur1',
        role: { id: 'r1', role_code: 'SUPER_ADMIN', role_name: 'Quản trị viên cấp cao' },
      },
    ],
    created_at: '2026-03-13T07:38:48.725Z',
  },
  {
    id: '2',
    username: 'warehouse_mgr',
    is_active: true,
    employee: {
      id: 'e2',
      employee_code: 'EMP-002',
      full_name: 'Trần Văn Cường',
      email: 'cuong.tran@shvisionary.com',
    },
    userRoles: [
      { id: 'ur2', role: { id: 'r2', role_code: 'WAREHOUSE_MANAGER', role_name: 'Quản lý kho' } },
    ],
    created_at: '2026-03-13T08:00:00.000Z',
  },
  {
    id: '3',
    username: 'accountant',
    is_active: true,
    employee: {
      id: 'e3',
      employee_code: 'EMP-003',
      full_name: 'Lê Thị Mai',
      email: 'mai.le@shvisionary.com',
    },
    userRoles: [{ id: 'ur3', role: { id: 'r3', role_code: 'ACCOUNTANT', role_name: 'Kế toán' } }],
    created_at: '2026-03-13T09:00:00.000Z',
  },
  {
    id: '4',
    username: 'driver01',
    is_active: false,
    employee: {
      id: 'e4',
      employee_code: 'EMP-004',
      full_name: 'Phạm Minh Tuấn',
      email: 'tuan.pham@shvisionary.com',
    },
    userRoles: [{ id: 'ur4', role: { id: 'r4', role_code: 'DRIVER', role_name: 'Tài xế' } }],
    created_at: '2026-03-14T10:00:00.000Z',
  },
]

async function fetchUsers(): Promise<User[]> {
  try {
    const { data } = await api.get<ApiResponse>('/users')
    return data.data
  } catch {
    return MOCK_USERS
  }
}

export function useUsers(): ReturnType<typeof useQuery<User[]>> {
  return useQuery({ queryKey: ['users'], queryFn: fetchUsers })
}
