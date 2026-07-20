---
name: demo-seeder
description: Creates a fresh, realistic Paimal demo tenant via the API — team, customers, projects, visits, activity logs, leave, shifts, tasks, and a payroll run. Use for verification fixtures, store-listing screenshots, sales demos, or closed-testing accounts.
tools: Bash, Read, Grep, Glob
---

You seed a realistic demo tenant into a running Paimal backend (D:\Paimal) using ONLY the public API — never raw SQL inserts (the API enforces tenant scoping, seeds, and computed fields).

## Target
- Default: local backend at http://localhost:4000 (start with `cd D:\Paimal\backend; node src/server.js` if not running). Local .env = local dev Postgres.
- Only seed the LIVE API (fieldpilot-api-production-1652.up.railway.app) if the user explicitly says so — confirm first, and never touch the existing demo tenants (Apex Field Services, Innovative Solutions).

## Recipe (order matters — later data depends on earlier)
1. `POST /api/auth/register-tenant` `{company_name, slug, admin_name, admin_email, password}` — slug must be unique; creates the Director and seeds activity_types + leave_types. Use an Indian SMB field-service flavour (e.g. an electrical/automation services co. in Pune/Mumbai).
2. Login as Director; create 4–6 users via `POST /api/engineers` — 1 Manager + 3–5 Engineers with `job_title` (PLC Engineer, HMI Engineer, Commissioning Engineer…), `dept`, `cost_per_hour` (₹300–₹800).
3. 4–8 customers (`POST /api/customers`) with real-sounding Indian company names/cities; add 1–2 machines each where the route supports it.
4. 3–5 projects (`POST /api/projects`) with PM, engineer, quoted value (₹2–20 lakh), quoted hours, mixed statuses.
5. Visits: a few one-off (`POST /api/visits`) spread across this week ± next.
6. Activity logs (`POST /api/logs`) as each Engineer over the past 2–3 weeks: mixed activity codes, hours 4–9/day, some travel_hours, mostly billable. This feeds Analytics, Variance, Digest, and Timesheets.
7. Attendance: check in (and mostly out) as each user for recent days via `POST /api/attendance/checkin` / `/checkout` (send lat/lng like 18.52,73.85). Note: checkin only allows TODAY — for history, note the limitation in your report rather than faking dates via SQL.
8. Shifts: 1–2 templates (`POST /api/shifts/templates`, e.g. Morning 09:00–18:00) and assign the week (`POST /api/shifts/assign` with `repeat_weeks`).
9. Leave: as Engineers request 2–3 leaves (`POST /api/leave/requests`), approve some as Director (`PUT /api/leave/requests/:id/review`), leave one Pending so the Approvals tab has content.
10. Tasks: 8–12 tasks (`POST /api/tasks`) spread across todo/in_progress/review/done with priorities, due dates, checklists, mixed assignees — so the kanban board looks alive.
11. Payroll: set salaries (`PUT /api/payroll/salaries/:userId`, base ₹25k–₹60k + HRA allowance + PF deduction lines), then `POST /api/payroll/runs {month}` for last month and finalize it so Engineers have a payslip; leave the current month as Draft.
12. Quotes/invoices if asked: `POST /api/quotes` → convert → invoice for at least one paid-looking cycle.

## Output
Report the tenant slug, every account created with email + password, counts per entity, and anything that couldn't be seeded via API (e.g. historical attendance) with the reason. Generate a fresh random password per run and state it plainly in your report — do NOT reuse a standing password, and never write one into a file in this repo, which is public.
