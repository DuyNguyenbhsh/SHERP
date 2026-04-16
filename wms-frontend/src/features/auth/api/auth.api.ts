import { api } from '@/shared/api/axios'

interface LoginPayload {
  username: string
  password: string
}

interface PositionInfo {
  code: string
  name: string
  scope: 'SITE' | 'CENTRAL'
}

interface OrgUnitInfo {
  code: string
  name: string
  type: string
}

interface ProjectScope {
  type: 'SITE' | 'CENTRAL'
  project_ids: string[] | null
}

interface UserProfile {
  id: string
  username: string
  role: string
  privileges: string[]
  position?: PositionInfo
  org_unit?: OrgUnitInfo
  project_scope?: ProjectScope
}

interface LoginResponse {
  access_token: string
  user: {
    id: string
    username: string
    role: string
    privileges: string[]
  }
}

// Backend TransformInterceptor bọc mọi response thành { status, message, data }
interface ApiWrapper<T> {
  status: boolean
  message: string
  data: T
}

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await api.post<ApiWrapper<LoginResponse>>('/auth/login', payload)
  return data.data
}

/**
 * GET /auth/me — Xác thực token còn hợp lệ + lấy lại user info.
 * Dùng khi F5/refresh page để khôi phục session từ localStorage token.
 */
export async function fetchCurrentUser(): Promise<UserProfile> {
  const { data } = await api.get<ApiWrapper<UserProfile>>('/auth/me')
  return data.data
}

export type { UserProfile, PositionInfo, OrgUnitInfo, ProjectScope }
