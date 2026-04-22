import { useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { EntityPicker } from '@/shared/ui/entity-picker'
import { api } from '@/shared/api/axios'
import { fetchProjectById } from '../../api/useProjectLookup'
import type { LookupProjectItem, ProjectStatus } from '../../types'
import { PROJECT_LOOKUP_STRINGS as S } from '@/features/master-plan/constants/project-lookup.strings'

interface ProjectPickerProps {
  value: string | null
  onChange: (id: string | null, project: LookupProjectItem | null) => void
  /** Show inactive (DRAFT, BIDDING, LOST_BID, SETTLED, RETENTION_RELEASED, CANCELED) projects. Default false. */
  includeInactive?: boolean
  /** Show cross-org hint when selected project.organization_id != this context. */
  currentOrgId?: string | null
  disabled?: boolean
  id?: string
  placeholder?: string
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  WON_BID: S.STATUS_WON_BID,
  ACTIVE: S.STATUS_ACTIVE,
  ON_HOLD: S.STATUS_ON_HOLD,
  SETTLING: S.STATUS_SETTLING,
  WARRANTY: S.STATUS_WARRANTY,
  DRAFT: S.STATUS_DRAFT,
  BIDDING: S.STATUS_BIDDING,
  LOST_BID: S.STATUS_LOST_BID,
  SETTLED: S.STATUS_SETTLED,
  RETENTION_RELEASED: S.STATUS_RETENTION_RELEASED,
  CANCELED: S.STATUS_CANCELED,
}

const STATUS_VARIANT: Record<ProjectStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  WON_BID: 'secondary',
  ACTIVE: 'default',
  ON_HOLD: 'outline',
  SETTLING: 'outline',
  WARRANTY: 'secondary',
  DRAFT: 'outline',
  BIDDING: 'outline',
  LOST_BID: 'destructive',
  SETTLED: 'outline',
  RETENTION_RELEASED: 'outline',
  CANCELED: 'destructive',
}

const PROJECT_ACTIVE_STATUSES = 'WON_BID,ACTIVE,ON_HOLD,SETTLING,WARRANTY'

async function searchProjects(q: string, includeInactive: boolean): Promise<LookupProjectItem[]> {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  params.set('limit', '20')
  if (!includeInactive) {
    params.set('status_whitelist', PROJECT_ACTIVE_STATUSES)
  }
  try {
    const { data } = await api.get<{
      data: { items: LookupProjectItem[] }
    }>(`/projects/lookup?${params.toString()}`)
    return data.data.items
  } catch {
    return []
  }
}

export function ProjectPicker({
  value,
  onChange,
  includeInactive = false,
  currentOrgId,
  disabled = false,
  id,
  placeholder,
}: ProjectPickerProps): React.JSX.Element {
  const onSearch = useCallback(
    (q: string): Promise<LookupProjectItem[]> => searchProjects(q, includeInactive),
    [includeInactive],
  )

  const renderItem = useCallback(
    (item: LookupProjectItem): React.JSX.Element => {
      const isCrossOrg =
        currentOrgId !== undefined &&
        currentOrgId !== null &&
        item.organization_id !== null &&
        item.organization_id !== currentOrgId
      return (
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium">{item.project_code}</span>
              <span className="text-sm truncate">— {item.project_name}</span>
            </div>
            {isCrossOrg && item.organization_name && (
              <span className="text-xs text-muted-foreground">
                {S.CROSS_ORG_PREFIX} {item.organization_name}
              </span>
            )}
          </div>
          <Badge variant={STATUS_VARIANT[item.status]} className="shrink-0">
            {STATUS_LABEL[item.status]}
          </Badge>
        </div>
      )
    },
    [currentOrgId],
  )

  const renderSelected = useCallback(
    (item: LookupProjectItem): React.JSX.Element => (
      <span className="inline-flex items-center gap-2 truncate">
        <span className="font-mono font-medium">{item.project_code}</span>
        <span className="truncate">— {item.project_name}</span>
      </span>
    ),
    [],
  )

  return (
    <EntityPicker<LookupProjectItem>
      value={value}
      onChange={onChange}
      onSearch={onSearch}
      onFetchById={fetchProjectById}
      renderItem={renderItem}
      renderSelected={renderSelected}
      placeholder={placeholder ?? S.PLACEHOLDER}
      emptyText={S.EMPTY_NO_RESULTS}
      disabled={disabled}
      id={id}
      aria-label={S.LABEL_PROJECT}
    />
  )
}
