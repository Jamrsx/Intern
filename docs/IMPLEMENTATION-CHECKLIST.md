# OCC Intern Tracking System — Implementation Checklist

This checklist is the running guide for what’s done and what’s next.

Legend:
- [ ] Not started
- [~] In progress
- [x] Done

## Phase 1 — Web app (build first)

### 1) Foundations (RBAC + shared data rules)

- [x] Laravel Passport installed (API auth for mobile)
- [ ] Define roles & permissions in code (policies/guards)
- [ ] Enforce scope rules:
  - Dean-by-course
  - Coordinator-by-section
  - Supervisor-by-company+department
- [ ] Set up shared “remaining hours” + “estimated end date” calculation source

### 2) Super Admin module (Courses + Deans)

- [x] Deans: create/view/update/disable
- [x] Courses: create/view/update/disable
- [x] Assign dean to course

### 3) Dean module (Students + required hours)

- [ ] Course required hours: set/update per course
- [ ] Students: create/view/update/disable (scoped to dean’s course)
- [ ] Student assignment:
  - [ ] assign to section (exactly 1)
  - [ ] assign to company + optional department

### 4) Dean module (Companies + Departments + Supervisors)

- [ ] Companies: create/view/update/disable
- [ ] Departments: create/view/update/disable (per company; optional usage)
- [ ] Supervisors: create/view/update/disable
- [ ] Assign supervisor to company + department

### 5) Dean module (Sections + Coordinators)

- [ ] Sections: create/view/update/disable
- [ ] Assign coordinator to section
- [ ] Assign students to section

### 6) Coordinator module

- [ ] Students preview (in their section)
- [ ] Manage students (ONLY):
  - [ ] Reassign student section (A)
  - [ ] Reassign student company/department (B)
- [ ] Documents preview (PDF): weekly reports, MOA, medical, other uploads
- [ ] OJT progress preview: remaining hours + estimated end date

### 7) Supervisor module

- [ ] Intern progress preview (scoped to company/department):
  - [ ] remaining hours
  - [ ] estimated end date

## Phase 2 — Mobile app (build last)

- [ ] Mobile API base URL configs:
  - [ ] Local (Laragon IP: `10.163.52.143`)
  - [ ] Production
  - [ ] In-app server toggle (Local/Production)
- [ ] Intern login (email-based)
- [ ] Upload PDFs (reports/documents)
- [ ] Facial recognition time-in/out
- [ ] Time logs history + remaining hours view
- [ ] iOS WebView access support (if required for iOS users)

## Notes

- Use the modern design system components in `Web/resources/js/Components/DesignSystem/` for all web pages.
- Modals must use the required overlay class:
  - `bg-clear bg-opacity-20 backdrop-blur-sm flex items-center justify-center z-50`

