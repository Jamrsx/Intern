import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    ClipboardList,
    Clock3,
    Eye,
    FileText,
    User,
} from 'lucide-react';
import {
    CoordinatorStudentAttendanceJournal,
    type AttendanceJournal,
} from '@/components/coordinator/coordinator-student-attendance-journal';
import {
    CoordinatorStudentTaskJournal,
    type TaskPhotoDay,
} from '@/components/coordinator/coordinator-student-task-journal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { useDeanPortalRoutes } from '@/contexts/dean-portal-routes-context';
import { DeanPortalRoutesProvider } from '@/contexts/dean-portal-routes-context';
import { deanPortalRoutes } from '@/lib/dean-portal-routes';

type Section = {
    id: number;
    name: string;
    display_name: string;
    school_year: string | null | undefined;
    course: {
        code: string;
        name: string;
        required_hours: number;
    };
};

type StudentDetail = {
    id: number;
    student_number: string;
    email: string;
    full_name: string;
    company: { id: number; name: string } | null;
    department: { id: number; name: string } | null;
    supervisor: { id: number; name: string } | null;
    is_active: boolean;
};

type Progress = {
    required_hours: number;
    rendered_hours: number;
    remaining_hours: number;
    percent_complete: number;
    time_log_count: number;
    estimated_end_date: string | null;
    schedule: {
        hours_per_day: number;
        days_per_week: number;
        start_date: string;
    } | null;
};

type DocumentRow = {
    id: number;
    document_type: string;
    is_required: boolean;
    original_filename: string;
    file_size: number | null;
    uploaded_at: string;
    notes: string | null;
    download_url: string;
};

type EvaluationResponse = {
    item_id: number;
    item_type: 'rating_question' | 'text_area';
    label: string;
    rating?: number;
    text?: string;
};

type EvaluationRow = {
    id: number;
    status: 'pending' | 'completed';
    template: { id: number; name: string } | null;
    rating: number | null;
    comments: string | null;
    responses: EvaluationResponse[];
    evaluation_date: string | null;
    opened_at: string;
    supervisor: { id: number; name: string };
};

type Props = {
    course: { code: string; name: string } | null;
    section: Section;
    student: StudentDetail;
    progress: Progress;
    documents: DocumentRow[];
    evaluations: EvaluationRow[];
    task_photo_journal: TaskPhotoDay[];
    attendance_journal: AttendanceJournal;
};

function formatFileSize(bytes: number | null): string {
    if (bytes === null || bytes === 0) {
        return '—';
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null): string {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function DeanStudentShowPage() {
    const portalRoutes = useDeanPortalRoutes();
    const {
        section,
        student,
        progress,
        documents,
        evaluations,
        task_photo_journal,
        attendance_journal,
    } = usePage<Props>().props;

    const studentsIndexUrl = portalRoutes.students.index().url;

    console.log('Dean student detail loaded', {
        studentId: student.id,
        progress,
        documentCount: documents.length,
        evaluationCount: evaluations.length,
        taskPhotoDayCount: task_photo_journal.length,
    });

    const pendingEvaluation = evaluations.find(
        (evaluation) => evaluation.status === 'pending',
    );

    return (
        <>
            <Head title={student.full_name} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="space-y-3">
                    <Button variant="ghost" size="sm" asChild className="-ml-2">
                        <Link href={studentsIndexUrl} prefetch>
                            <ArrowLeft className="mr-1 size-4" />
                            Back to students
                        </Link>
                    </Button>

                    <div className="flex items-start gap-4">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand shadow-md">
                            <User className="size-6 text-brand-foreground" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight">
                                    {student.full_name}
                                </h1>
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
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {student.student_number} • {student.email}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {section.display_name} • {section.school_year}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Building2 className="size-5 text-brand" />
                                <CardTitle>OJT placement</CardTitle>
                            </div>
                            <CardDescription>
                                Company assignment for this intern
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 sm:grid-cols-3">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Company
                                </p>
                                <p className="mt-1 font-medium">
                                    {student.company?.name ?? (
                                        <span className="text-muted-foreground">
                                            Not assigned
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Department
                                </p>
                                <p className="mt-1 font-medium">
                                    {student.department?.name ?? (
                                        <span className="text-muted-foreground">
                                            —
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    Supervisor
                                </p>
                                <p className="mt-1 font-medium">
                                    {student.supervisor?.name ?? (
                                        <span className="text-muted-foreground">
                                            —
                                        </span>
                                    )}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Clock3 className="size-5 text-brand" />
                                <CardTitle>OJT progress</CardTitle>
                            </div>
                            <CardDescription>
                                Required: {progress.required_hours} hours for{' '}
                                {section.course.code}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <div className="mb-2 flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        {progress.percent_complete}% complete
                                    </span>
                                    <span className="font-medium">
                                        {progress.rendered_hours} /{' '}
                                        {progress.required_hours} hrs
                                    </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-brand transition-all"
                                        style={{
                                            width: `${progress.percent_complete}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="rounded-lg border bg-muted/30 p-3">
                                    <p className="text-xs text-muted-foreground">
                                        Rendered
                                    </p>
                                    <p className="text-xl font-bold">
                                        {progress.rendered_hours}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        hours
                                    </p>
                                </div>
                                <div className="rounded-lg border bg-muted/30 p-3">
                                    <p className="text-xs text-muted-foreground">
                                        Remaining
                                    </p>
                                    <p className="text-xl font-bold text-brand">
                                        {progress.remaining_hours}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        hours
                                    </p>
                                </div>
                                <div className="rounded-lg border bg-muted/30 p-3">
                                    <p className="text-xs text-muted-foreground">
                                        Est. end date
                                    </p>
                                    <p className="text-sm font-semibold">
                                        {formatDate(
                                            progress.estimated_end_date,
                                        )}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {progress.time_log_count} time log
                                        {progress.time_log_count === 1
                                            ? ''
                                            : 's'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <CoordinatorStudentTaskJournal
                    studentId={student.id}
                    days={task_photo_journal}
                    studentName={student.full_name}
                />

                <CoordinatorStudentAttendanceJournal
                    journal={attendance_journal}
                />

                <Card className="border-sidebar-border/70 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <ClipboardList className="size-5 text-brand" />
                            <CardTitle>OJT evaluations</CardTitle>
                        </div>
                        <CardDescription>
                            Supervisor ratings and feedback for this intern
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {pendingEvaluation ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                                Waiting for{' '}
                                <span className="font-medium">
                                    {pendingEvaluation.supervisor.name}
                                </span>{' '}
                                to submit the evaluation opened on{' '}
                                {formatDate(pendingEvaluation.opened_at)}.
                            </div>
                        ) : null}

                        {evaluations.length === 0 ? (
                            <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">
                                No evaluations yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-left">
                                            <th className="px-4 py-3 font-medium">
                                                Sheet
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Supervisor
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Rating
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Responses
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Evaluation date
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {evaluations.map((evaluation) => (
                                            <tr
                                                key={evaluation.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="px-4 py-3">
                                                    {evaluation.template
                                                        ?.name ?? (
                                                        <span className="text-muted-foreground">
                                                            Legacy
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge
                                                        variant={
                                                            evaluation.status ===
                                                            'completed'
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                        className={
                                                            evaluation.status ===
                                                            'completed'
                                                                ? 'bg-brand text-brand-foreground'
                                                                : undefined
                                                        }
                                                    >
                                                        {evaluation.status ===
                                                        'completed'
                                                            ? 'Completed'
                                                            : 'Pending'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {
                                                        evaluation.supervisor
                                                            .name
                                                    }
                                                </td>
                                                <td className="px-4 py-3">
                                                    {evaluation.rating ?? '—'}
                                                </td>
                                                <td className="max-w-sm px-4 py-3 text-muted-foreground">
                                                    {evaluation.responses
                                                        .length > 0 ? (
                                                        <ul className="space-y-1">
                                                            {evaluation.responses.map(
                                                                (response) => (
                                                                    <li
                                                                        key={
                                                                            response.item_id
                                                                        }
                                                                    >
                                                                        <span className="font-medium text-foreground">
                                                                            {
                                                                                response.label
                                                                            }
                                                                            :
                                                                        </span>{' '}
                                                                        {response.item_type ===
                                                                        'rating_question'
                                                                            ? (response.rating ??
                                                                              '—')
                                                                            : (response.text ??
                                                                              '—')}
                                                                    </li>
                                                                ),
                                                            )}
                                                        </ul>
                                                    ) : (
                                                        evaluation.comments ??
                                                        '—'
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {formatDate(
                                                        evaluation.evaluation_date,
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="border-sidebar-border/70 shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <FileText className="size-5 text-brand" />
                            <CardTitle>Submitted documents</CardTitle>
                        </div>
                        <CardDescription>
                            PDF uploads from this intern
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {documents.length === 0 ? (
                            <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">
                                No documents submitted yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-left">
                                            <th className="px-4 py-3 font-medium">
                                                Report
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Filename
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Uploaded
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Size
                                            </th>
                                            <th className="px-4 py-3 text-right font-medium">
                                                Action
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {documents.map((document) => (
                                            <tr
                                                key={document.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">
                                                        {document.notes ||
                                                            document.document_type}
                                                    </div>
                                                    {document.is_required ? (
                                                        <Badge
                                                            variant="secondary"
                                                            className="mt-1"
                                                        >
                                                            Required
                                                        </Badge>
                                                    ) : null}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {
                                                        document.original_filename
                                                    }
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {formatDate(
                                                        document.uploaded_at,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {formatFileSize(
                                                        document.file_size,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        asChild
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        <a
                                                            href={
                                                                document.download_url
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            <Eye className="mr-1 size-3.5" />
                                                            View
                                                        </a>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

export default function DeanStudentShow() {
    return (
        <DeanPortalRoutesProvider value={deanPortalRoutes}>
            <DeanStudentShowPage />
        </DeanPortalRoutesProvider>
    );
}

DeanStudentShow.layout = {
    breadcrumbs: [
        { title: 'Students', href: deanPortalRoutes.students.index().url },
        { title: 'Intern profile' },
    ],
};

export { DeanStudentShowPage as ProgramHeadStudentShowPage };
