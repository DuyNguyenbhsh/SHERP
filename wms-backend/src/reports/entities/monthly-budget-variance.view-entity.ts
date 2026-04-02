import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({
  name: 'v_monthly_project_budget_variance',
  expression: `
    WITH budget_changes AS (
      SELECT
        ph.project_id,
        EXTRACT(YEAR FROM ph.changed_at)::INT   AS reporting_year,
        EXTRACT(MONTH FROM ph.changed_at)::INT  AS reporting_month,
        ph.changed_at,
        CAST(ph.old_value AS DECIMAL(15,2))      AS old_val,
        CAST(ph.new_value AS DECIMAL(15,2))      AS new_val,
        ROW_NUMBER() OVER (
          PARTITION BY ph.project_id,
                       EXTRACT(YEAR FROM ph.changed_at),
                       EXTRACT(MONTH FROM ph.changed_at)
          ORDER BY ph.changed_at ASC
        ) AS rn_asc,
        ROW_NUMBER() OVER (
          PARTITION BY ph.project_id,
                       EXTRACT(YEAR FROM ph.changed_at),
                       EXTRACT(MONTH FROM ph.changed_at)
          ORDER BY ph.changed_at DESC
        ) AS rn_desc
      FROM project_history ph
      WHERE ph.field_name = 'budget'
        AND ph.new_value IS NOT NULL
    ),
    monthly_agg AS (
      SELECT
        bc.project_id,
        bc.reporting_year,
        bc.reporting_month,
        MAX(CASE WHEN bc.rn_asc  = 1 THEN bc.old_val END) AS first_old_value,
        MAX(CASE WHEN bc.rn_desc = 1 THEN bc.new_val END) AS last_new_value
      FROM budget_changes bc
      GROUP BY bc.project_id, bc.reporting_year, bc.reporting_month
    ),
    project_month_range AS (
      SELECT
        p.id AS project_id,
        gs.reporting_year,
        gs.reporting_month
      FROM projects p
      CROSS JOIN LATERAL (
        SELECT
          EXTRACT(YEAR FROM d)::INT  AS reporting_year,
          EXTRACT(MONTH FROM d)::INT AS reporting_month
        FROM generate_series(
          DATE_TRUNC('month', p.created_at),
          DATE_TRUNC('month', CURRENT_DATE),
          INTERVAL '1 month'
        ) AS d
      ) gs
      WHERE p.deleted_at IS NULL
    ),
    filled AS (
      SELECT
        pmr.project_id,
        pmr.reporting_year,
        pmr.reporting_month,
        ma.first_old_value,
        ma.last_new_value,
        MAX(ma2.last_new_value) OVER (
          PARTITION BY pmr.project_id
          ORDER BY pmr.reporting_year, pmr.reporting_month
          ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ) AS prev_closing
      FROM project_month_range pmr
      LEFT JOIN monthly_agg ma
        ON  ma.project_id     = pmr.project_id
        AND ma.reporting_year  = pmr.reporting_year
        AND ma.reporting_month = pmr.reporting_month
      LEFT JOIN monthly_agg ma2
        ON  ma2.project_id     = pmr.project_id
        AND (ma2.reporting_year < pmr.reporting_year
             OR (ma2.reporting_year = pmr.reporting_year
                 AND ma2.reporting_month <= pmr.reporting_month))
    )
    SELECT
      p.project_code,
      p.project_name,
      f.reporting_year,
      f.reporting_month,
      COALESCE(f.first_old_value, f.prev_closing, p.budget)  AS opening_budget,
      COALESCE(f.last_new_value, f.first_old_value, f.prev_closing, p.budget) AS closing_budget,
      COALESCE(f.last_new_value, f.first_old_value, f.prev_closing, p.budget)
        - COALESCE(f.first_old_value, f.prev_closing, p.budget) AS variance_amount,
      CASE
        WHEN COALESCE(f.first_old_value, f.prev_closing, p.budget) IS NOT NULL
         AND COALESCE(f.first_old_value, f.prev_closing, p.budget) != 0
        THEN ROUND(
          (
            (COALESCE(f.last_new_value, f.first_old_value, f.prev_closing, p.budget)
              - COALESCE(f.first_old_value, f.prev_closing, p.budget))
            / COALESCE(f.first_old_value, f.prev_closing, p.budget)
          ) * 100, 2
        )
        ELSE 0
      END AS variance_percentage
    FROM filled f
    INNER JOIN projects p ON p.id = f.project_id
    GROUP BY
      p.project_code, p.project_name,
      f.reporting_year, f.reporting_month,
      f.first_old_value, f.last_new_value,
      f.prev_closing, p.budget
    ORDER BY p.project_code, f.reporting_year, f.reporting_month
  `,
})
export class MonthlyBudgetVariance {
  @ViewColumn()
  project_code: string;

  @ViewColumn()
  project_name: string;

  @ViewColumn()
  reporting_year: number;

  @ViewColumn()
  reporting_month: number;

  @ViewColumn()
  opening_budget: number;

  @ViewColumn()
  closing_budget: number;

  @ViewColumn()
  variance_amount: number;

  @ViewColumn()
  variance_percentage: number;
}
