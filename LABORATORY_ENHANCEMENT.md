# Laboratory Workflow Enhancement

## What changed

- **Doctor ordering:** a searchable test selector uses an explicit catalogue derived from test names already in MedFlow's seed data. The server stores a catalogue code and supplies the canonical test name. Existing named custom requests remain supported. No multi-test order was added.
- **Department selection:** there are no reliable department-to-test mappings in the current data. Catalogue department lists are deliberately empty, with the two explicitly marked common tests first; no doctor-specific test assignments were invented.
- **Testing appointments:** new doctor orders start as `Unscheduled`. Patients can request a lab-only slot for an existing, clinician-authored, supported order; a Receptionist confirms it, or schedules/reschedules an order directly. Patient cancellation, duplicate active requests, ownership checks, audit entries, and notifications are handled. The appointment state/date/time live on the related lab order, so the workflow does not create a doctor consultation or consultation charge.
- **Technician workflow:** technicians cannot list, open, or update new unscheduled orders. They retain the existing status sequence after the test is scheduled. Historical rows are migrated as `Legacy` without changing their status or existing result text, preserving the prior workflow.
- **Structured results:** CBC and Lipid panel have small required-field templates. Units and reference ranges are omitted because the application has no trustworthy configuration for them. Other supported tests and custom requests keep the existing free-text result path. Required configured fields must be supplied before completion/release; results remain hidden from patients until `Reviewed`.
- **Patient booking:** **Book a Lab Test** is a separate patient route. It only offers a currently ordered, supported test linked to that authenticated patient; no tests are enabled for unrestricted self-ordering. The selected slot is a request, not represented as available or confirmed; Receptionist confirmation is required because the application has no lab-capacity calendar.
- **PDF reports:** authorized ordering doctors and the matching patient can download a real PDF after release. The report includes only available order/patient/staff dates and recorded values; it does not fabricate units, ranges, signatures, or clinical interpretation.

## Files changed

| File | Reason |
|---|---|
| `backend/src/domain/labCatalog.ts` | Explicit catalogue, common ordering, empty department mappings, and CBC/lipid field definitions. |
| `backend/src/db/migrations/004_laboratory_workflow.ts`, `backend/src/db/migrations.ts` | Additive migration and registration for catalogue/result/release/appointment columns; exact-name legacy test-code backfill. |
| `backend/src/domain/types.ts`, `backend/src/domain/seed.ts` | Type the new lab metadata and assign catalogue codes to existing seeded test names. |
| `backend/src/repositories/recordRepository.ts` | Persist and parse structured result/appointment metadata and supply safe defaults for legacy rows. |
| `backend/src/routes/api.ts` | Catalogue, booking/scheduling/cancellation, role-scoped result access, transition validation, audit/notifications, and PDF endpoint. |
| `frontend/src/lib/api/types.ts`, `frontend/src/lib/api/api.ts` | Typed calls through the existing API facade for catalogue, appointments, and report downloads. |
| `frontend/src/components/forms/EntityFormDialog.tsx` | Opt-in searchable form selector; existing fields retain their prior controls. |
| `frontend/src/features/laboratory/LaboratoryPages.tsx` | Doctor order selector, Receptionist scheduling controls, technician result forms, patient lab booking, and PDF actions. |
| `frontend/src/app/App.tsx`, `frontend/src/lib/auth/session.ts`, `frontend/src/components/layout/AppShell.tsx` | Register the patient route and expose role-appropriate navigation. |
| `backend/test/api.test.ts`, `backend/test/phase4.test.ts`, `backend/test/end-to-end-persistence.test.ts` | Cover booking/authorization/PDF output, migration compatibility, structured results, technician permissions, and restart persistence. The date-sensitive no-show test fixture now sets its future appointment relative to the test date; its assertions are retained. |
| `README.md` | Update project contents and test-count references. |

## Setup and run

Requires Node.js 22.5+.

```bash
# Backend terminal
cd backend
npm ci
cp .env.example .env
# Set JWT_SECRET to a private random value of 32+ characters.
npm run db:migrate
NODE_ENV=development npm run db:seed
npm run db:verify
npm run dev

# Frontend terminal
cd frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:3000`. Vite proxies `/api` to the backend at `http://127.0.0.1:4000`. Seeded synthetic logins (password `demo123`) are documented in `backend/DEMO_DATA.md`. Do not use the demo credentials outside local testing. Avoid `db:reset` unless intentionally replacing a local database with demo data.

## Verification performed

- `cd backend && npm test` — **43 passed, 0 failed**.
- `cd backend && npm run build` — **passed**.
- `cd frontend && npm run typecheck && npm run build` — **passed**.
- `cd backend && npm run db:verify` — **integrity `ok`, 0 foreign-key violations, 4 migrations**, original seeded counts preserved.
- The end-to-end test exercises backend restart persistence for appointment status/date and result-release metadata.
- The new API test checks PDF signature, uses `pdfinfo` and `pdftotext` to validate the document/content, and exercises multi-page output.

## Remaining limits

- There is no department-to-test mapping or laboratory-capacity calendar; department preference and real-time slot availability are therefore not claimed. Patient requests remain pending until Receptionist confirmation.
- Direct self-ordering is not enabled for any test until the clinic configures eligibility; patients can request booking only against their existing supported clinician order.
- Units, reference ranges, and an attachment-upload path were not present as reliable configured data in the original lab workflow and are not invented here. Structured templates currently cover CBC and Lipid panel; all other tests preserve free-text entry.
- A `Legacy` appointment status preserves old technician access; newly created orders require a scheduled appointment. This remains a local reference implementation, not a production clinical deployment.
