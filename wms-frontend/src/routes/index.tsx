/* eslint-disable react-refresh/only-export-components -- router file exports both helpers and components */
import { lazy, Suspense, type ComponentType } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { LoginPage } from '@/features/auth'
import { MainLayout } from '@/shared/components/layout'
import { ErrorBoundary } from '@/shared/components/ErrorBoundary'
import { AuthGuard } from './AuthGuard'

// ── Lazy-loaded pages (code splitting) ──
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const MasterDataPage = lazy(() =>
  import('@/pages/MasterDataPage').then((m) => ({ default: m.MasterDataPage })),
)
const ProductsPage = lazy(() =>
  import('@/pages/ProductsPage').then((m) => ({ default: m.ProductsPage })),
)
const SuppliersPage = lazy(() =>
  import('@/pages/SuppliersPage').then((m) => ({ default: m.SuppliersPage })),
)
const ProcurementPage = lazy(() =>
  import('@/pages/ProcurementPage').then((m) => ({ default: m.ProcurementPage })),
)
const InboundPage = lazy(() =>
  import('@/pages/InboundPage').then((m) => ({ default: m.InboundPage })),
)
const InventoryPage = lazy(() =>
  import('@/pages/InventoryPage').then((m) => ({ default: m.InventoryPage })),
)
const OutboundPage = lazy(() =>
  import('@/pages/OutboundPage').then((m) => ({ default: m.OutboundPage })),
)
const VehiclesPage = lazy(() =>
  import('@/pages/VehiclesPage').then((m) => ({ default: m.VehiclesPage })),
)
const TmsPage = lazy(() => import('@/pages/TmsPage').then((m) => ({ default: m.TmsPage })))
const ProjectsPage = lazy(() =>
  import('@/pages/projects/ProjectsPage').then((m) => ({ default: m.ProjectsPage })),
)
const ProjectDetailPage = lazy(() =>
  import('@/pages/projects/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })),
)
const ProjectDocumentsPage = lazy(() =>
  import('@/pages/projects/ProjectDocumentsPage').then((m) => ({
    default: m.ProjectDocumentsPage,
  })),
)
const TasksPage = lazy(() =>
  import('@/pages/projects/TasksPage').then((m) => ({ default: m.TasksPage })),
)
const ResourcesPage = lazy(() =>
  import('@/pages/projects/ResourcesPage').then((m) => ({ default: m.ResourcesPage })),
)
const GeneralLedgerPage = lazy(() =>
  import('@/pages/finance/GeneralLedgerPage').then((m) => ({ default: m.GeneralLedgerPage })),
)
const AccountsReceivablePage = lazy(() =>
  import('@/pages/finance/AccountsReceivablePage').then((m) => ({
    default: m.AccountsReceivablePage,
  })),
)
const AccountsPayablePage = lazy(() =>
  import('@/pages/finance/AccountsPayablePage').then((m) => ({ default: m.AccountsPayablePage })),
)
const CashManagementPage = lazy(() =>
  import('@/pages/finance/CashManagementPage').then((m) => ({ default: m.CashManagementPage })),
)
const EmployeesPage = lazy(() =>
  import('@/pages/EmployeesPage').then((m) => ({ default: m.EmployeesPage })),
)
const UsersPage = lazy(() => import('@/pages/UsersPage').then((m) => ({ default: m.UsersPage })))
const RolesPage = lazy(() => import('@/pages/RolesPage').then((m) => ({ default: m.RolesPage })))
const ProjectRequestsPage = lazy(() =>
  import('@/pages/project-requests/ProjectRequestsPage').then((m) => ({
    default: m.ProjectRequestsPage,
  })),
)
const WorkflowConfigPage = lazy(() =>
  import('@/pages/WorkflowConfigPage').then((m) => ({ default: m.WorkflowConfigPage })),
)
const DocumentSearchPage = lazy(() =>
  import('@/pages/DocumentSearchPage').then((m) => ({ default: m.DocumentSearchPage })),
)
const DocumentsHubPage = lazy(() =>
  import('@/pages/DocumentsHubPage').then((m) => ({ default: m.DocumentsHubPage })),
)
const CustomersPage = lazy(() =>
  import('@/pages/CustomersPage').then((m) => ({ default: m.CustomersPage })),
)
const SalesPage = lazy(() => import('@/pages/SalesPage').then((m) => ({ default: m.SalesPage })))

function PageLoader(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}

function withSuspense(Component: ComponentType): React.JSX.Element {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Component />
      </Suspense>
    </ErrorBoundary>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <MainLayout />,
        children: [
          { index: true, element: withSuspense(DashboardPage) },
          // Dữ liệu nền
          { path: 'master-data', element: withSuspense(MasterDataPage) },
          { path: 'products', element: withSuspense(ProductsPage) },
          { path: 'suppliers', element: withSuspense(SuppliersPage) },
          // Chuỗi cung ứng
          { path: 'procurement', element: withSuspense(ProcurementPage) },
          { path: 'inbound', element: withSuspense(InboundPage) },
          { path: 'inventory', element: withSuspense(InventoryPage) },
          { path: 'outbound', element: withSuspense(OutboundPage) },
          // Bán hàng (O2C)
          { path: 'customers', element: withSuspense(CustomersPage) },
          { path: 'sales', element: withSuspense(SalesPage) },
          // Vận tải
          { path: 'vehicles', element: withSuspense(VehiclesPage) },
          { path: 'tms', element: withSuspense(TmsPage) },
          // Quản lý Dự án
          { path: 'project-requests', element: withSuspense(ProjectRequestsPage) },
          { path: 'projects', element: withSuspense(ProjectsPage) },
          { path: 'projects/:projectId', element: withSuspense(ProjectDetailPage) },
          { path: 'projects/:projectId/documents', element: withSuspense(ProjectDocumentsPage) },
          { path: 'projects/tasks', element: withSuspense(TasksPage) },
          { path: 'projects/resources', element: withSuspense(ResourcesPage) },
          // Quản lý Tài liệu (standalone module)
          { path: 'documents', element: withSuspense(DocumentsHubPage) },
          { path: 'documents/search', element: withSuspense(DocumentSearchPage) },
          // Tài chính - Kế toán
          { path: 'finance/gl', element: withSuspense(GeneralLedgerPage) },
          { path: 'finance/ar', element: withSuspense(AccountsReceivablePage) },
          { path: 'finance/ap', element: withSuspense(AccountsPayablePage) },
          { path: 'finance/cash', element: withSuspense(CashManagementPage) },
          // Nội bộ & Hệ thống
          { path: 'hrm/employees', element: withSuspense(EmployeesPage) },
          { path: 'system/users', element: withSuspense(UsersPage) },
          { path: 'system/roles', element: withSuspense(RolesPage) },
          { path: 'system/workflow-config', element: withSuspense(WorkflowConfigPage) },
        ],
      },
    ],
  },
])
