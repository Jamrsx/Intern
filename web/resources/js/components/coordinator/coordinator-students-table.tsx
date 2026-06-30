import { Link } from '@inertiajs/react';
import { Building2, Eye, FileText, TriangleAlert } from 'lucide-react';
import { CoordinatorStudentRowActions } from '@/components/coordinator/coordinator-student-accounts';
import { hasUnreadDocumentSubmission } from '@/lib/coordinator-document-notifications';
import { cn } from '@/lib/utils';
import { show } from '@/routes/coordinators/students';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type CoordinatorStudentTableRow = {
    id: number;
    student_number: string;
    email: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    full_name: string;
    company_id: number | null;
    department_id: number | null;
    department: { id: number; name: string } | null;
    supervisor: { id: number; name: string } | null;
    is_active: boolean;
    documents_count: number;
    has_submitted_documents: boolean;
    latest_document_uploaded_at: string | null;
    evaluation_status: 'none' | 'pending_supervisor' | 'completed';
    has_new_completed_evaluation: boolean;
    ojt_start_date: string | null;
};

type CoordinatorStudentsTableProps = {
    students: CoordinatorStudentTableRow[];
    showDepartmentColumn?: boolean;
    notificationsReady: boolean;
    documentSeenMap: Record<number, string>;
    needsPlacement: (student: CoordinatorStudentTableRow) => boolean;
    onAssignPlacement: (student: CoordinatorStudentTableRow) => void;
    onViewStudent: (student: CoordinatorStudentTableRow) => void;
    onMarkCompletedAlertsSeen: () => void;
    formatOjtStartDate: (value: string | null) => string;
};

export function CoordinatorStudentsTable({
    students,
    showDepartmentColumn = true,
    notificationsReady,
    documentSeenMap,
    needsPlacement,
    onAssignPlacement,
    onViewStudent,
    onMarkCompletedAlertsSeen,
    formatOjtStartDate,
}: CoordinatorStudentsTableProps) {
    return (
        <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b bg-muted/40 text-left">
                        <th className="px-4 py-3 font-medium">Student</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        {showDepartmentColumn ? (
                            <th className="px-4 py-3 font-medium">
                                Department
                            </th>
                        ) : null}
                        <th className="px-4 py-3 font-medium">Supervisor</th>
                        <th className="px-4 py-3 font-medium">OJT start</th>
                        <th className="px-4 py-3 font-medium">Documents</th>
                        <th className="px-4 py-3 font-medium">Evaluations</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 text-right font-medium">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {students.map((student) => (
                        <tr
                            key={student.id}
                            className={cn(
                                'border-b last:border-b-0',
                                needsPlacement(student) && 'bg-amber-500/5',
                            )}
                        >
                            <td className="px-4 py-3">
                                <div className="flex items-start gap-2">
                                    {needsPlacement(student) ? (
                                        <TriangleAlert
                                            className="mt-0.5 size-4 shrink-0 text-amber-500"
                                            aria-label="No OJT placement"
                                            title="No OJT company assigned yet"
                                        />
                                    ) : null}
                                    <div>
                                        <div className="font-medium">
                                            {student.full_name}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            Student ID: {student.student_number}
                                        </div>
                                        {needsPlacement(student) ? (
                                            <Badge
                                                variant="outline"
                                                className="mt-1.5 border-amber-500/50 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
                                            >
                                                Needs placement
                                            </Badge>
                                        ) : null}
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                                {student.email}
                            </td>
                            {showDepartmentColumn ? (
                                <td className="px-4 py-3">
                                    {student.department ? (
                                        student.department.name
                                    ) : (
                                        <span className="text-muted-foreground">
                                            —
                                        </span>
                                    )}
                                </td>
                            ) : null}
                            <td className="px-4 py-3">
                                {student.supervisor ? (
                                    student.supervisor.name
                                ) : (
                                    <span className="text-muted-foreground">
                                        —
                                    </span>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                {student.ojt_start_date ? (
                                    <span>
                                        {formatOjtStartDate(
                                            student.ojt_start_date,
                                        )}
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">
                                        Not started
                                    </span>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    {student.has_submitted_documents ? (
                                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                                            <FileText className="mr-1 size-3" />
                                            {student.documents_count} submitted
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary">
                                            None yet
                                        </Badge>
                                    )}
                                    {notificationsReady &&
                                    hasUnreadDocumentSubmission(
                                        student,
                                        documentSeenMap,
                                    ) ? (
                                        <Badge className="bg-brand text-brand-foreground hover:bg-brand">
                                            New
                                        </Badge>
                                    ) : null}
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    {student.evaluation_status ===
                                    'pending_supervisor' ? (
                                        <Badge variant="secondary">
                                            Awaiting supervisor
                                        </Badge>
                                    ) : student.has_new_completed_evaluation ? (
                                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                                            Done
                                        </Badge>
                                    ) : student.evaluation_status ===
                                      'completed' ? (
                                        <Badge variant="outline">
                                            Completed
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary">None</Badge>
                                    )}
                                    {student.has_new_completed_evaluation ? (
                                        <span
                                            className="size-2.5 rounded-full bg-red-600"
                                            title="New completed evaluation"
                                        />
                                    ) : null}
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <Badge
                                    variant={
                                        student.is_active
                                            ? 'default'
                                            : 'secondary'
                                    }
                                    className={
                                        student.is_active
                                            ? 'bg-brand text-brand-foreground'
                                            : undefined
                                    }
                                >
                                    {student.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    {needsPlacement(student) ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="border-amber-500/50 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
                                            title="Assign OJT placement"
                                            onClick={() =>
                                                onAssignPlacement(student)
                                            }
                                        >
                                            <Building2 className="mr-1 size-3.5" />
                                            Assign
                                        </Button>
                                    ) : null}
                                    <CoordinatorStudentRowActions
                                        student={student}
                                    />
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                    >
                                        <Link
                                            href={show(student.id)}
                                            prefetch
                                            onClick={() => {
                                                onViewStudent(student);
                                                if (
                                                    student.has_new_completed_evaluation
                                                ) {
                                                    onMarkCompletedAlertsSeen();
                                                }
                                            }}
                                        >
                                            <Eye className="mr-1 size-3.5" />
                                            View
                                        </Link>
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export type DepartmentStudentGroup = {
    departmentId: number | null;
    departmentName: string;
    students: CoordinatorStudentTableRow[];
};

export function buildDepartmentGroups(
    students: CoordinatorStudentTableRow[],
): DepartmentStudentGroup[] {
    const groupMap = new Map<string, DepartmentStudentGroup>();

    for (const student of students) {
        const key =
            student.department_id !== null
                ? String(student.department_id)
                : 'none';

        const existing = groupMap.get(key);

        if (existing) {
            existing.students.push(student);
            continue;
        }

        groupMap.set(key, {
            departmentId: student.department_id,
            departmentName: student.department?.name ?? 'No department',
            students: [student],
        });
    }

    return [...groupMap.values()].sort((left, right) => {
        if (left.departmentId === null) {
            return 1;
        }

        if (right.departmentId === null) {
            return -1;
        }

        return left.departmentName.localeCompare(right.departmentName);
    });
}
