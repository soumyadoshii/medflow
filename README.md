# MedFlow
### Multi-Role Healthcare Operations Platform

MedFlow is a full-stack healthcare operations platform designed to streamline clinic administration through a unified application. It connects clinical, administrative, pharmacy, laboratory, and financial workflows, enabling healthcare teams to manage essential operations through a centralized system.

Built with React, TypeScript, Node.js, Express.js, and PostgreSQL, MedFlow focuses on secure role-based access, transactional consistency, and reliable healthcare workflows.

**6 User Roles | 6 Core Modules | 30+ REST Endpoints | 43 Passing Backend Tests**

---

## Core Modules

### 1. Appointment Management
- Centralized appointment management and scheduling.
- Role-based appointment operations.
- Structured appointment workflows and status management.

### 2. Patient Management
- Centralized patient records.
- Patient information management.
- Secure access to patient-related information.

### 3. Prescription Management
- Doctor-authored prescription workflows.
- Prescription processing and dispensing.
- Atomic prescription dispensing to maintain transactional consistency.

### 4. Pharmacy & Inventory
- Pharmacy inventory management.
- Prescription-linked dispensing workflows.
- Inventory-related operational controls.

### 5. Laboratory Management
- Doctor-initiated laboratory test ordering.
- Searchable test catalogue with canonical test names.
- Patient-requested laboratory appointments with receptionist confirmation.
- Dedicated technician workflow for processing scheduled orders.
- Structured CBC and Lipid Panel result templates.
- Result review and controlled patient visibility.
- Downloadable PDF laboratory reports for authorized users.
- Legacy laboratory record preservation through additive database migrations.

### 6. Billing & Finance
- Integrated clinic billing workflows.
- Integer-paise monetary representation to prevent floating-point precision errors.
- Consistent financial record handling.

---

## Engineering Highlights

- **Role-Based Architecture:** Six user roles with JWT authentication and server-side authorization.
- **30+ REST Endpoints:** Structured API layer supporting multiple healthcare workflows.
- **Transactional Consistency:** Atomic prescription dispensing and conflict-checked approval operations.
- **Laboratory Workflow:** End-to-end lifecycle from doctor ordering to patient-accessible released reports.
- **Structured Results:** Configurable result templates with required-field validation.
- **PDF Generation:** Downloadable laboratory reports with verified document output.
- **Database Integrity:** Additive migrations, legacy record compatibility, and persistence verification.
- **Automated Testing:** 43 passing backend tests covering API behavior, authorization, persistence, and laboratory workflows.

---

## Laboratory Workflow Enhancement

One of MedFlow's major engineering contributions is its end-to-end laboratory workflow, connecting doctors, patients, receptionists, and laboratory technicians through a controlled process.

### Doctor Ordering
- Searchable test selector backed by an explicit catalogue derived from existing test data.
- Server-maintained catalogue codes and canonical test names.
- Support for existing named custom test requests.

### Patient Booking & Scheduling
- Patients can request laboratory appointments for existing eligible doctor orders.
- Receptionists confirm, schedule, or reschedule laboratory appointments.
- Duplicate active requests and unauthorized access are prevented.
- Laboratory appointments remain separate from doctor consultations and consultation charges.

### Technician Workflow
- Technicians access scheduled orders through the appropriate workflow.
- Unscheduled orders remain inaccessible to technicians.
- Existing technician status transitions are preserved.
- Historical laboratory records are migrated without losing their previous status or result text.

### Structured Results & Reports
- Required-field templates for CBC and Lipid Panel.
- Validation before result completion and release.
- Patient results remain hidden until reviewed.
- Authorized ordering doctors and the corresponding patient can download released PDF reports.

### Data Integrity
- Additive database migrations.
- Legacy test-name compatibility.
- Audit entries and notifications for relevant workflow operations.
- Persistence verification across backend restarts.

---

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React, TypeScript |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Authentication | JSON Web Tokens (JWT) |
| API Architecture | REST APIs |
| Testing | Automated Backend Tests |

---

## Getting Started

### Prerequisites
- Node.js 22.5+
- npm
- PostgreSQL

### 1. Clone the Repository

```bash
git clone https://github.com/soumyadoshii/medflow.git
cd medflow
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the appropriate backend directory and configure the required PostgreSQL connection string, authentication secret, and other environment variables used by the application.

### 4. Configure the Database

Create the PostgreSQL database and run the project's database migrations using the configured migration scripts.

### 5. Run the Application

Start the frontend and backend using the development scripts defined in their respective `package.json` files.

---

## Project Focus

MedFlow demonstrates practical full-stack engineering through:

- Multi-role authentication and authorization.
- REST API development and integration.
- Relational database design and migrations.
- Transaction-safe healthcare operations.
- End-to-end laboratory workflow automation.
- Structured data validation and PDF report generation.
- Backend testing and data persistence verification.

The project emphasizes maintainable architecture, data integrity, and reliable coordination between different healthcare stakeholders.
