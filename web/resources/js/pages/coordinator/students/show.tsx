import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    ClipboardList,
    Clock3,
    Eye,
    FileText,
    Pencil,
    Plus,
    User,
} from 'lucide-react';
import { useLayoutEffect, useMemo, useState } from 'react';
import { markStudentDocumentsAsSeen } from '@/lib/coordinator-document-notifications';
import InputError from '@/components/input-error';
import { AppModal } from '@/components/superadmin/app-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { index as evaluationTemplatesIndex } from '@/routes/coordinators/evaluation-templates';
import { index as studentsIndex, update } from '@/routes/coordinators/students';
import { store as storeEvaluation } from '@/routes/coordinators/students/evaluations';

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

type CompanyOption = {
    id: number;
    name: string;
    departments: { id: number; name: string }[];
};

type SupervisorOption = {
    id: number;
    name: string;
    company_id: number;
    department_id: number | null;
};

type StudentDetail = {
    id: number;
    student_number: string;
    email: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    full_name: string;
    company_id: number | null;
    company: { id: number; name: string } | null;
    department_id: number | null;
    department: { id: number; name: string } | null;
    supervisor_id: number | null;
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
    document_type_code: string;
    is_required: boolean;
    original_filename: string;
    file_size: number | null;
    mime_type: string;
    uploaded_at: string;
    notes: string | null;
    download_url: string;
};

type EvaluationTemplateOption = {
    id: number;
    name: string;
    description: string | null;
    items_count: number;
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
    submitted_at: string | null;
    supervisor: {
        id: number;
        name: string;
    };
};

type Props = {
    section: Section;
    student: StudentDetail;
    progress: Progress;
    documents: DocumentRow[];
    companies: CompanyOption[];
    supervisors: SupervisorOption[];
    evaluations: EvaluationRow[];
    evaluation_templates: EvaluationTemplateOption[];
    can_open_evaluation: boolean;
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

export default function CoordinatorStudentShow() {
    const {
        section,
        student,
        progress,
        documents,
        companies,
        supervisors,
        evaluations,
        evaluation_templates,
        can_open_evaluation,
    } = usePage<Props>().props;
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showOpenEvaluationModal, setShowOpenEvaluationModal] = useState(false);
    const [selectedEvaluationTemplateId, setSelectedEvaluationTemplateId] =
        useState('');
    const [openEvaluationError, setOpenEvaluationError] = useState<
        string | null
    >(null);
    const [openingEvaluation, setOpeningEvaluation] = useState(false);
    const [companyId, setCompanyId] = useState(
        student.company_id ? String(student.company_id) : 'none',
    );
    const [departmentId, setDepartmentId] = useState(
        student.department_id ? String(student.department_id) : 'none',
    );
    const [supervisorId, setSupervisorId] = useState(
        student.supervisor_id ? String(student.supervisor_id) : 'none',
    );

    console.log('Coordinator student detail loaded', {
        studentId: student.id,
        progress,
        documentCount: documents.length,
        evaluationCount: evaluations.length,
        evaluationTemplateCount: evaluation_templates.length,
        can_open_evaluation,
    });

    useLayoutEffect(() => {
        if (documents.length === 0) {
            return;
        }

        const latestUploadedAt = documents.reduce<string | null>(
            (latest, document) => {
                if (!latest) {
                    return document.uploaded_at;
                }

                return new Date(document.uploaded_at).getTime() >
                    new Date(latest).getTime()
                    ? document.uploaded_at
                    : latest;
            },
            null,
        );

        markStudentDocumentsAsSeen(
            section.id,
            student.id,
            latestUploadedAt,
        );
    }, [documents, section.id, student.id]);

    const departments = useMemo(() => {
        if (companyId === 'none') {
            return [];
        }

        return (
            companies.find((company) => company.id === Number(companyId))
                ?.departments ?? []
        );
    }, [companies, companyId]);

    const filteredSupervisors = useMemo(() => {
        if (companyId === 'none') {
            return [];
        }

        return supervisors.filter((supervisor) => {
            if (supervisor.company_id !== Number(companyId)) {
                return false;
            }

            if (
                departmentId !== 'none' &&
                supervisor.department_id !== null &&
                supervisor.department_id !== Number(departmentId)
            ) {
                return false;
            }

            return true;
        });
    }, [supervisors, companyId, departmentId]);

    const openAssignModal = () => {
        setCompanyId(student.company_id ? String(student.company_id) : 'none');
        setDepartmentId(
            student.department_id ? String(student.department_id) : 'none',
        );
        setSupervisorId(
            student.supervisor_id ? String(student.supervisor_id) : 'none',
        );
        setShowAssignModal(true);
    };

    const openEvaluationModal = () => {
        if (evaluation_templates.length === 0) {
            setOpenEvaluationError(
                'Create an evaluation sheet first before opening an evaluation.',
            );
            setShowOpenEvaluationModal(true);
            return;
        }

        setSelectedEvaluationTemplateId(
            String(evaluation_templates[0]?.id ?? ''),
        );
        setOpenEvaluationError(null);
        setShowOpenEvaluationModal(true);
        console.log('Coordinator open evaluation modal opened', {
            studentId: student.id,
            templates: evaluation_templates.length,
        });
    };

    const handleOpenEvaluation = () => {
        if (!selectedEvaluationTemplateId) {
            setOpenEvaluationError('Please select an evaluation sheet.');
            return;
        }

        setOpeningEvaluation(true);
        router.post(
            storeEvaluation(student.id).url,
            {
                evaluation_template_id: Number(selectedEvaluationTemplateId),
            },
            {
                preserveScroll: true,
                onSuccess: () => setShowOpenEvaluationModal(false),
                onFinish: () => setOpeningEvaluation(false),
            },
        );
    };

    const pendingEvaluation = evaluations.find(
        (evaluation) => evaluation.status === 'pending',
    );

    return (
        <>
            <Head title={student.full_name} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                        <Button variant="ghost" size="sm" asChild className="-ml-2">
                            <Link href={studentsIndex()} prefetch>
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
                                        {student.is_active
                                            ? 'Active'
                                            : 'Inactive'}
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

                    {student.is_active && (
                        <Button
                            type="button"
                            onClick={openAssignModal}
                            className="bg-brand text-brand-foreground hover:bg-brand-hover"
                        >
                            <Pencil className="mr-1 size-4" />
                            Edit placement
                        </Button>
                    )}
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
                        <CardContent className="space-y-4">
                            <div className="grid gap-3 sm:grid-cols-3">
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
                                        {formatDate(progress.estimated_end_date)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {progress.time_log_count} time log
                                        {progress.time_log_count === 1
                                            ? ''
                                            : 's'}
                                    </p>
                                </div>
                            </div>

                            {progress.time_log_count === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    No time entries yet. Hours will appear once
                                    the intern logs time via the mobile app.
                                </p>
                            )}

                            {!progress.schedule &&
                                progress.remaining_hours > 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        Estimated end date requires an OJT
                                        schedule once the intern starts.
                                    </p>
                                )}
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-sidebar-border/70 shadow-sm">
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <ClipboardList className="size-5 text-brand" />
                                    <CardTitle>OJT evaluations</CardTitle>
                                </div>
                                <CardDescription>
                                    Open an evaluation for the company supervisor
                                    to rate this intern. Rating, comments, and
                                    evaluation date are filled in by the supervisor.
                                </CardDescription>
                            </div>
                            {student.is_active && (
                                <Button
                                    type="button"
                                    onClick={openEvaluationModal}
                                    disabled={
                                        !can_open_evaluation || openingEvaluation
                                    }
                                    className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                >
                                    {openingEvaluation ? (
                                        <Spinner />
                                    ) : (
                                        <Plus className="mr-1 size-4" />
                                    )}
                                    Open evaluation
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!student.supervisor && (
                            <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                                Assign a supervisor first before opening an
                                evaluation.
                            </p>
                        )}

                        {pendingEvaluation && (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                                Waiting for{' '}
                                <span className="font-medium">
                                    {pendingEvaluation.supervisor.name}
                                </span>{' '}
                                to submit the evaluation opened on{' '}
                                {formatDate(pendingEvaluation.opened_at)}.
                            </div>
                        )}

                        {evaluations.length === 0 ? (
                            <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground">
                                No evaluations yet. Open one when the intern is
                                ready to be rated by the company supervisor.
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
                                            <th className="px-4 py-3 font-medium">
                                                Opened
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
                                                    {evaluation.template?.name ?? (
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
                                                    {evaluation.supervisor.name}
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
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {formatDate(
                                                        evaluation.opened_at,
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
                            PDF uploads from this intern (weekly reports, MOA,
                            medical, etc.)
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
                                                    {document.notes ? (
                                                        <div className="text-xs text-muted-foreground">
                                                            {
                                                                document.original_filename
                                                            }
                                                        </div>
                                                    ) : null}
                                                    {document.is_required && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="mt-1"
                                                        >
                                                            Required
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {document.original_filename}
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

            <AppModal
                open={showAssignModal}
                onOpenChange={setShowAssignModal}
                title="Edit OJT placement"
                description={`Update company, department, and supervisor for ${student.full_name}.`}
                className="sm:max-w-xl"
            >
                <Form
                    action={update(student.id).url}
                    method={update(student.id).method}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setShowAssignModal(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label>Company</Label>
                                <input
                                    type="hidden"
                                    name="company_id"
                                    value={
                                        companyId === 'none' ? '' : companyId
                                    }
                                />
                                <Select
                                    value={companyId}
                                    onValueChange={(value) => {
                                        setCompanyId(value);
                                        setDepartmentId('none');
                                        setSupervisorId('none');
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select company" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            No company
                                        </SelectItem>
                                        {companies.map((company) => (
                                            <SelectItem
                                                key={company.id}
                                                value={String(company.id)}
                                            >
                                                {company.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.company_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label>Department</Label>
                                <input
                                    type="hidden"
                                    name="department_id"
                                    value={
                                        departmentId === 'none'
                                            ? ''
                                            : departmentId
                                    }
                                />
                                <Select
                                    value={departmentId}
                                    onValueChange={(value) => {
                                        setDepartmentId(value);
                                        setSupervisorId('none');
                                    }}
                                    disabled={companyId === 'none'}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            No department
                                        </SelectItem>
                                        {departments.map((department) => (
                                            <SelectItem
                                                key={department.id}
                                                value={String(department.id)}
                                            >
                                                {department.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.department_id} />
                            </div>

                            <div className="grid gap-2">
                                <Label>Supervisor</Label>
                                <input
                                    type="hidden"
                                    name="supervisor_id"
                                    value={
                                        supervisorId === 'none'
                                            ? ''
                                            : supervisorId
                                    }
                                />
                                <Select
                                    value={supervisorId}
                                    onValueChange={setSupervisorId}
                                    disabled={companyId === 'none'}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select supervisor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            No supervisor
                                        </SelectItem>
                                        {filteredSupervisors.map(
                                            (supervisor) => (
                                                <SelectItem
                                                    key={supervisor.id}
                                                    value={String(
                                                        supervisor.id,
                                                    )}
                                                >
                                                    {supervisor.name}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.supervisor_id} />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowAssignModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                >
                                    {processing && <Spinner />}
                                    Save placement
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </AppModal>

            <AppModal
                open={showOpenEvaluationModal}
                onOpenChange={setShowOpenEvaluationModal}
                title="Open evaluation"
                description={
                    evaluation_templates.length === 0
                        ? 'You need at least one active evaluation sheet.'
                        : `Send an evaluation to ${student.supervisor?.name ?? 'the assigned supervisor'} for ${student.full_name}.`
                }
                className="sm:max-w-lg"
            >
                {evaluation_templates.length === 0 ? (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Build a reusable evaluation sheet first, then return
                            here to open an evaluation for this intern.
                        </p>
                        {openEvaluationError && (
                            <p className="text-sm text-destructive">
                                {openEvaluationError}
                            </p>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    setShowOpenEvaluationModal(false)
                                }
                            >
                                Close
                            </Button>
                            <Button
                                asChild
                                className="bg-brand text-brand-foreground hover:bg-brand-hover"
                            >
                                <Link href={evaluationTemplatesIndex()}>
                                    Create evaluation sheet
                                </Link>
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="open-evaluation-template">
                                Evaluation sheet
                            </Label>
                            <Select
                                value={selectedEvaluationTemplateId}
                                onValueChange={(value) => {
                                    setSelectedEvaluationTemplateId(value);
                                    setOpenEvaluationError(null);
                                }}
                            >
                                <SelectTrigger id="open-evaluation-template">
                                    <SelectValue placeholder="Select a sheet" />
                                </SelectTrigger>
                                <SelectContent>
                                    {evaluation_templates.map((template) => (
                                        <SelectItem
                                            key={template.id}
                                            value={String(template.id)}
                                        >
                                            {template.name}
                                            {template.items_count > 0
                                                ? ` (${template.items_count} items)`
                                                : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {openEvaluationError && (
                                <InputError message={openEvaluationError} />
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    setShowOpenEvaluationModal(false)
                                }
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                disabled={openingEvaluation}
                                onClick={handleOpenEvaluation}
                                className="bg-brand text-brand-foreground hover:bg-brand-hover"
                            >
                                {openingEvaluation && <Spinner />}
                                Open evaluation
                            </Button>
                        </div>
                    </div>
                )}
            </AppModal>
        </>
    );
}

CoordinatorStudentShow.layout = {
    breadcrumbs: [
        { title: 'Students', href: studentsIndex().url },
        { title: 'Student detail', href: studentsIndex().url },
    ],
};
