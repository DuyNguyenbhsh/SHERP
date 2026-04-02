import { createBrowserRouter } from 'react-router-dom'

import { LoginPage } from '@/features/auth'
import { MainLayout } from '@/shared/components/layout'
import { AuthGuard } from './AuthGuard'

import { DashboardPage } from '@/pages/DashboardPage'
import { MasterDataPage } from '@/pages/MasterDataPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { SuppliersPage } from '@/pages/SuppliersPage'
import { ProcurementPage } from '@/pages/ProcurementPage'
import { InboundPage } from '@/pages/InboundPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { OutboundPage } from '@/pages/OutboundPage'
import { VehiclesPage } from '@/pages/VehiclesPage'
import { TmsPage } from '@/pages/TmsPage'
import { ProjectsPage } from '@/pages/projects/ProjectsPage'
import { ProjectDetailPage } from '@/pages/projects/ProjectDetailPage'
import { ProjectDocumentsPage } from '@/pages/projects/ProjectDocumentsPage'
import { TasksPage } from '@/pages/projects/TasksPage'
import { ResourcesPage } from '@/pages/projects/ResourcesPage'
import { GeneralLedgerPage } from '@/pages/finance/GeneralLedgerPage'
import { AccountsReceivablePage } from '@/pages/finance/AccountsReceivablePage'
import { AccountsPayablePage } from '@/pages/finance/AccountsPayablePage'
import { CashManagementPage } from '@/pages/finance/CashManagementPage'
import { EmployeesPage } from '@/pages/EmployeesPage'
import { UsersPage } from '@/pages/UsersPage'
import { RolesPage } from '@/pages/RolesPage'
import { ProjectRequestsPage } from '@/pages/project-requests/ProjectRequestsPage'
import { WorkflowConfigPage } from '@/pages/WorkflowConfigPage'

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
          { index: true, element: <DashboardPage /> },
          // Dữ liệu nền
          { path: 'master-data', element: <MasterDataPage /> },
          { path: 'products', element: <ProductsPage /> },
          { path: 'suppliers', element: <SuppliersPage /> },
          // Chuỗi cung ứng
          { path: 'procurement', element: <ProcurementPage /> },
          { path: 'inbound', element: <InboundPage /> },
          { path: 'inventory', element: <InventoryPage /> },
          { path: 'outbound', element: <OutboundPage /> },
          // Vận tải
          { path: 'vehicles', element: <VehiclesPage /> },
          { path: 'tms', element: <TmsPage /> },
          // Quản lý Dự án
          { path: 'project-requests', element: <ProjectRequestsPage /> },
          { path: 'projects', element: <ProjectsPage /> },
          { path: 'projects/:projectId', element: <ProjectDetailPage /> },
          { path: 'projects/:projectId/documents', element: <ProjectDocumentsPage /> },
          { path: 'projects/tasks', element: <TasksPage /> },
          { path: 'projects/resources', element: <ResourcesPage /> },
          // Tài chính - Kế toán
          { path: 'finance/gl', element: <GeneralLedgerPage /> },
          { path: 'finance/ar', element: <AccountsReceivablePage /> },
          { path: 'finance/ap', element: <AccountsPayablePage /> },
          { path: 'finance/cash', element: <CashManagementPage /> },
          // Nội bộ & Hệ thống
          { path: 'hrm/employees', element: <EmployeesPage /> },
          { path: 'system/users', element: <UsersPage /> },
          { path: 'system/roles', element: <RolesPage /> },
          { path: 'system/workflow-config', element: <WorkflowConfigPage /> },
        ],
      },
    ],
  },
])
