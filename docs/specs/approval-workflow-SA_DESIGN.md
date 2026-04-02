# SA DESIGN: Dynamic Approval Workflow (n-Level)

> Date: 2026-03-31 | Status: APPROVED | Gate: 2 (SA)

## 1. Architecture Decision

**Strategy: UPGRADE existing `approvals` module** (not rebuild).

The 4 core tables (`approval_configs`, `approval_config_steps`, `approval_requests`, `approval_steps`) already exist with the right structure. We add columns + logic for:

- Delegation (delegate_to_id on approval_config_steps)
- Parallel approval (required_count on approval_config_steps)
- Threshold routing (conditions JSONB on approval_configs)
- Skip-level protection (service-level guard)
- Audit enrichment (approver_name, role_code denormalized on approval_steps)

## 2. Schema Changes (Migration)

### 2.1 ALTER approval_config_steps
```sql
ADD required_count INT DEFAULT 1;       -- >1 = parallel approval
ADD delegate_to_id VARCHAR;             -- fallback approver UUID
```

### 2.2 ALTER approval_steps
```sql
ADD approver_name VARCHAR(100);         -- denormalized for audit
ADD role_code VARCHAR(50);              -- role that granted access
ADD delegated_from_id VARCHAR;          -- original approver if delegated
```

### 2.3 ALTER approval_configs
```sql
ADD module_code VARCHAR(50);            -- PROCUREMENT, PROJECT, WMS...
ADD description TEXT;
```

Existing `conditions` JSONB already supports threshold:
```json
{
  "threshold_rules": [
    { "max_amount": 5000000, "skip_to_step": 999 },
    { "max_amount": 50000000, "max_step": 2 },
    { "max_amount": null, "max_step": 999 }
  ]
}
```

## 3. Service Logic

### 3.1 getNextApprover(requestId)
1. Load request + steps
2. Find first PENDING step where step_order = current_step
3. Resolve approver: config_step.approver_role -> find User with that role_code
4. If primary approver unavailable -> check delegate_to_id
5. Return { userId, userName, roleName, stepOrder }

### 3.2 processApproval(stepId, userId, action, comment)
1. Validate: step.status == PENDING
2. Validate: user is authorized (approver_id match OR delegate OR SUPER_ADMIN)
3. **SKIP-LEVEL GUARD**: step.step_order must == request.current_step (no jumping)
4. Record action (APPROVED/REJECTED)
5. If APPROVED:
   - Check required_count: count approved steps with same step_order
   - If count >= required_count -> advance to next step
   - If no more steps -> status = APPROVED (FINAL_APPROVED)
6. If REJECTED -> status = REJECTED, resolved_at = now()

### 3.3 submitForApproval(entityType, entityId, userId, data)
1. Find active config for entity_type
2. Evaluate threshold_rules against data.amount
3. Filter steps based on threshold (skip steps beyond max_step)
4. Create request + instantiate filtered steps
5. Resolve first approver

## 4. API Endpoints (additions to existing)

| Method | Route | Description |
|--------|-------|-------------|
| GET | /approvals/configs/:id | Get single config with steps |
| PUT | /approvals/configs/:id | Update config + steps |
| PATCH | /approvals/configs/:id/toggle | Toggle active/inactive |
| GET | /approvals/requests/:id/next-approver | Get next approver info |
| POST | /approvals/submit | Submit entity for approval |

## 5. Frontend: Workflow Config Page

Route: `/system/workflow-config`

UI: Card-based editor
- Select module (dropdown)
- Add steps with [+] button
- Each step: order, role (dropdown), required_count, delegate, timeout
- Save/Delete config
- Conditions editor (threshold rules)
