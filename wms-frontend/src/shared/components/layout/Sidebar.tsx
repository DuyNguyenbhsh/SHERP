import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  PackageSearch,
  Warehouse,
  Truck,
  ShoppingCart,
  TruckIcon,
  Settings,
  Users,
  Shield,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Package,
  ContactRound,
  UserCog,
  CarFront,
  Database,
  BookOpen,
  Receipt,
  CreditCard,
  Landmark,
  FolderKanban,
  ListChecks,
  UsersRound,
  ClipboardCheck,
  FileSearch,
  UserCircle,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import shLogo from '@/assets/sh-visionary-logo.jpg'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

interface NavSection {
  title: string
  items: NavItem[]
  defaultOpen?: boolean
  nested?: {
    label: string
    icon: React.ReactNode
    basePath: string
    children: NavItem[]
  }
}

const sections: NavSection[] = [
  {
    title: '',
    defaultOpen: true,
    items: [{ label: 'Tổng quan', path: '/', icon: <LayoutDashboard className="h-4 w-4" /> }],
  },
  {
    title: 'Dữ liệu nền',
    defaultOpen: true,
    items: [
      { label: 'Danh mục', path: '/master-data', icon: <Database className="h-4 w-4" /> },
      { label: 'Hàng hóa', path: '/products', icon: <Package className="h-4 w-4" /> },
      { label: 'Nhà cung cấp', path: '/suppliers', icon: <ContactRound className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Chuỗi cung ứng',
    defaultOpen: true,
    items: [
      { label: 'Mua hàng', path: '/procurement', icon: <ShoppingCart className="h-4 w-4" /> },
      { label: 'Nhập kho', path: '/inbound', icon: <PackageSearch className="h-4 w-4" /> },
      { label: 'Tồn kho', path: '/inventory', icon: <Warehouse className="h-4 w-4" /> },
      { label: 'Xuất kho', path: '/outbound', icon: <Truck className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Bán hàng (O2C)',
    defaultOpen: true,
    items: [
      { label: 'Khách hàng', path: '/customers', icon: <UserCircle className="h-4 w-4" /> },
      { label: 'Báo giá & Đơn bán', path: '/sales', icon: <TrendingUp className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Vận tải',
    defaultOpen: true,
    items: [
      { label: 'Đội xe', path: '/vehicles', icon: <CarFront className="h-4 w-4" /> },
      { label: 'Vận tải & Giao hàng', path: '/tms', icon: <TruckIcon className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Quản lý Dự án',
    defaultOpen: true,
    items: [
      {
        label: 'Yêu cầu & Phê duyệt',
        path: '/project-requests',
        icon: <ClipboardCheck className="h-4 w-4" />,
      },
      { label: 'Danh sách Dự án', path: '/projects', icon: <FolderKanban className="h-4 w-4" /> },
      { label: 'Công việc', path: '/projects/tasks', icon: <ListChecks className="h-4 w-4" /> },
      { label: 'Nguồn lực', path: '/projects/resources', icon: <UsersRound className="h-4 w-4" /> },
      {
        label: 'Quản lý Tài liệu',
        path: '/documents/search',
        icon: <FileSearch className="h-4 w-4" />,
      },
    ],
  },
  {
    title: 'Tài chính - Kế toán',
    defaultOpen: true,
    items: [
      { label: 'Sổ cái chung', path: '/finance/gl', icon: <BookOpen className="h-4 w-4" /> },
      { label: 'Khoản phải thu', path: '/finance/ar', icon: <Receipt className="h-4 w-4" /> },
      { label: 'Khoản phải trả', path: '/finance/ap', icon: <CreditCard className="h-4 w-4" /> },
      { label: 'Quỹ & Ngân hàng', path: '/finance/cash', icon: <Landmark className="h-4 w-4" /> },
    ],
  },
  {
    title: 'Nội bộ & Hệ thống',
    defaultOpen: true,
    items: [{ label: 'Nhân sự', path: '/hrm/employees', icon: <UserCog className="h-4 w-4" /> }],
    nested: {
      label: 'Hệ thống',
      icon: <Settings className="h-4 w-4" />,
      basePath: '/system',
      children: [
        { label: 'Tài khoản', path: '/system/users', icon: <Users className="h-4 w-4" /> },
        { label: 'Phân quyền', path: '/system/roles', icon: <Shield className="h-4 w-4" /> },
        {
          label: 'Quản lý phê duyệt',
          path: '/system/workflow-config',
          icon: <ListChecks className="h-4 w-4" />,
        },
      ],
    },
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps): React.JSX.Element {
  const location = useLocation()
  const [nestedOpen, setNestedOpen] = useState<Record<string, boolean>>({})

  const isItemActive = (path: string): boolean =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const linkClass = (path: string): string =>
    cn(
      'flex items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
      isItemActive(path)
        ? 'bg-primary/10 text-primary'
        : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
      collapsed && 'justify-center px-2',
    )

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Brand logo */}
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-3">
        <img
          src={shLogo}
          alt="SH Visionary"
          className={cn('shrink-0 object-contain', collapsed ? 'h-8 w-8' : 'h-9')}
        />
        {!collapsed && (
          <div className="ml-2 flex flex-col leading-none">
            <span className="text-sm font-bold tracking-tight text-sidebar-primary">SH ERP</span>
            <span className="text-[10px] font-medium tracking-wide text-sidebar-foreground/40">
              Enterprise Resource Planning
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {sections.map((section) => {
          const key = section.title || '__main'

          /* No title = standalone items (Tổng quan) */
          if (!section.title) {
            return (
              <div key={key} className="mb-1">
                {section.items.map((item) => (
                  <NavLink key={item.path} to={item.path} className={linkClass(item.path)}>
                    {item.icon}
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            )
          }

          /* Collapsed sidebar: icons only with dividers */
          if (collapsed) {
            return (
              <div key={key} className="mb-1">
                <div className="mx-auto my-2 h-px w-8 bg-sidebar-foreground/10" />
                {section.items.map((item) => (
                  <NavLink key={item.path} to={item.path} className={linkClass(item.path)}>
                    {item.icon}
                  </NavLink>
                ))}
                {section.nested?.children.map((child) => (
                  <NavLink key={child.path} to={child.path} className={linkClass(child.path)}>
                    {child.icon}
                  </NavLink>
                ))}
              </div>
            )
          }

          /* Expanded: Collapsible section group */
          return (
            <Collapsible key={key} defaultOpen={section.defaultOpen} className="mb-0.5">
              <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-md px-3 py-1.5 hover:bg-sidebar-accent/30">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/35">
                  {section.title}
                </span>
                <ChevronDown className="h-3 w-3 text-sidebar-foreground/25 transition-transform group-data-[state=closed]:-rotate-90" />
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="space-y-px">
                  {section.items.map((item) => (
                    <NavLink key={item.path} to={item.path} className={linkClass(item.path)}>
                      {item.icon}
                      <span>{item.label}</span>
                    </NavLink>
                  ))}

                  {/* Nested collapsible — Hệ thống */}
                  {section.nested && (
                    <Collapsible
                      open={nestedOpen[section.nested.label] ?? false}
                      onOpenChange={(open) =>
                        setNestedOpen((prev) => ({ ...prev, [section.nested!.label]: open }))
                      }
                    >
                      <CollapsibleTrigger
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
                          location.pathname.startsWith(section.nested.basePath)
                            ? 'text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                        )}
                      >
                        {section.nested.icon}
                        <span className="flex-1 text-left">{section.nested.label}</span>
                        <ChevronRight
                          className={cn(
                            'h-3 w-3 transition-transform',
                            nestedOpen[section.nested.label] && 'rotate-90',
                          )}
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="ml-4 space-y-px border-l border-sidebar-border/60 pl-2">
                          {section.nested.children.map((child) => (
                            <NavLink
                              key={child.path}
                              to={child.path}
                              className={linkClass(child.path)}
                            >
                              {child.icon}
                              <span>{child.label}</span>
                            </NavLink>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2">
        <Button variant="ghost" size="sm" onClick={onToggle} className="w-full justify-center">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  )
}
