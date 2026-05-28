# OCC Intern Tracking System — Plan & Access Control

Last updated: 2026-05-28

## Scope (Phase order)

- Phase 1 (Web): Super Admin, Dean, Coordinator, Supervisor modules
- Phase 2 (Mobile - last): Intern mobile app (documents + facial time-in/out)

## Roles

- Super Admin
- Dean
- Coordinator
- Supervisor
- Intern (Mobile)

## Finalized business rules

- **Student → Course**: a student belongs to **exactly 1** course.
- **Student → Section**: a student belongs to **exactly 1** section (e.g., BSIT 4A, BSIT 4B).
- **Company → Department**: a company may have **multiple** departments (optional usage per company).
- **Department → Supervisor**: a department can have **1 or more** supervisors (depends on company policy).
- **Required hours**: set **per course** (e.g., BSIT = 486 hours, BSBA = 600 hours). This value is used to compute remaining hours and estimated end date.

## Ownership / visibility boundaries (security scope)

- **Dean scope**: can manage only the entities under their **course** (since Super Admin assigns a dean to a course).
- **Coordinator scope**: can manage/preview only students under their **section**.
- **Supervisor scope**: can preview only interns under their assigned **company + department**.
- **Intern scope**: can access only their own profile, uploads, and time logs.

## Responsibilities per role (high-level)

### Super Admin

- Create dean accounts
- Create courses
- Assign a dean to a specific course

### Dean (within assigned course)

- Create student accounts
- Set/update course required hours
- Create companies and (optional) departments
- Assign student to a company + optional department
- Create sections (e.g., BSIT 4A)
- Assign coordinator(s) to section(s)
- Assign students to sections
- Create supervisor accounts and assign them to company + department

### Coordinator (within assigned section)

- Preview students
- Manage students (ONLY):
  - Reassign student section (**A**)
  - Reassign student company/department (**B**)
- Preview student documents (PDF): weekly reports, MOA, medical, other uploads
- Preview remaining hours and estimated end date

### Supervisor (within assigned company/department)

- Preview remaining hours and estimated end date of interns under their scope

### Intern (Mobile — last phase)

- Upload documents/reports (PDF)
- Time-in/out using facial recognition (creates time logs)
- View own remaining hours and estimated end date

## Permission matrix (CRUD + special actions)

Legend:
- **C** = Create
- **R** = Read
- **U** = Update
- **D** = Disable/Delete (prefer disable/soft-delete where applicable)

### Courses

- Super Admin: **C/R/U/D**
- Dean: **R** + **U (required_hours) only for their course**
- Coordinator/Supervisor/Intern: **R (optional)** / none

### Deans

- Super Admin: **C/R/U/D**
- Others: none

### Students (within scope)

- Dean: **C/R/U/D**
- Coordinator: **R/U** (only reassign section and company/department)
- Supervisor: **R** (only interns in their company/department)
- Intern: **R** (self only)

### Sections

- Dean: **C/R/U/D**
- Coordinator: **R** (self section)

### Coordinators

- Dean: **C/R/U/D** (create/assign to sections within course)
- Super Admin: **R (optional)**

### Companies

- Dean: **C/R/U/D**
- Coordinator/Supervisor: **R** (scoped)

### Departments

- Dean: **C/R/U/D**
- Coordinator/Supervisor: **R** (scoped)

### Supervisors

- Dean: **C/R/U/D**
- Supervisor: **R** (self only)

### Documents (PDF uploads)

- Intern: **C/R** (self uploads)
- Coordinator: **R** (students in section)
- Dean: **R (optional)** (students in course)
- Supervisor: **R (optional)** (interns in scope; only if policy requires)

### Time Logs (Facial time-in/out)

- Intern: **C/R** (self only)
- Coordinator: **R** (students in section)
- Supervisor: **R** (interns in scope)
- Dean: **R (optional)** (students in course)
- Editing time logs: **not allowed** by default (if needed later, must include audit trail)

## Notes (implementation expectations)

- Web UI should use the existing modern design system components in `Web/resources/js/Components/DesignSystem/`.
- Modals should use the required overlay class:
  - `bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50`
- Add console logs during development where useful for testing/debugging.

