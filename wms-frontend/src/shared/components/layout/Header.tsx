import { useNavigate } from 'react-router-dom'
import { LogOut, Menu } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useAuthStore } from '@/features/auth/model/auth.store'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps): React.JSX.Element {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const displayName =
    user?.username === 'admin' ? 'Duy Tri Nguyen' : (user?.username ?? 'Tài khoản')
  const displayRole = user?.username === 'admin' ? 'CTO / SA' : (user?.role ?? '')
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleLogout = (): void => {
    logout()
    toast.success('Đã đăng xuất')
    void navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background px-4">
      {/* Mobile menu toggle */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2.5 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col items-start leading-none sm:flex">
              <span className="text-sm font-medium">{displayName}</span>
              <span className="text-[11px] text-muted-foreground">{displayRole}</span>
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>
            <div className="text-sm font-medium">{displayName}</div>
            <div className="text-xs text-muted-foreground">{displayRole}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Đăng xuất
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
