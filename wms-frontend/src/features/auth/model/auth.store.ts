import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { fetchCurrentUser } from '../api/auth.api'
import type { PositionInfo, OrgUnitInfo, ProjectScope } from '../api/auth.api'

interface User {
  id: string
  username: string
  role: string
  privileges: string[]
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isValidating: boolean
  // Phase 1: Scope resolution
  position: PositionInfo | null
  orgUnit: OrgUnitInfo | null
  projectScope: ProjectScope | null
  // Actions
  setAuth: (user: User, token: string) => void
  logout: () => void
  validateToken: () => Promise<void>
  hasPrivilege: (code: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isValidating: false,
      position: null,
      orgUnit: null,
      projectScope: null,

      setAuth: (user, token) =>
        set({
          user,
          accessToken: token,
          isAuthenticated: true,
          isValidating: false,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isValidating: false,
          position: null,
          orgUnit: null,
          projectScope: null,
        }),

      validateToken: async () => {
        const { accessToken, isAuthenticated } = get()
        if (!accessToken || !isAuthenticated) return

        set({ isValidating: true })
        try {
          const profile = await fetchCurrentUser()
          set({
            user: {
              id: profile.id,
              username: profile.username,
              role: profile.role,
              privileges: profile.privileges ?? [],
            },
            position: profile.position ?? null,
            orgUnit: profile.org_unit ?? null,
            projectScope: profile.project_scope ?? null,
            isValidating: false,
          })
        } catch {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
            isValidating: false,
            position: null,
            orgUnit: null,
            projectScope: null,
          })
        }
      },

      hasPrivilege: (code) => {
        const { user } = get()
        return user?.privileges?.includes(code) ?? false
      },
    }),
    {
      name: 'sh-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        position: state.position,
        orgUnit: state.orgUnit,
        projectScope: state.projectScope,
      }),
    },
  ),
)
