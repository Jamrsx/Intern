import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Bell,
    Building2,
    ChevronDown,
    ClipboardList,
    Eye,
    FileText,
    Search,
    Users,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import InputError from '@/components/input-error';
import { AppModal } from '@/components/superadmin/app-modal';
import { PageHeader } from '@/components/superadmin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
    countUnreadDocumentSubmissions,
    ensureDocumentNotificationBaseline,
    hasUnreadDocumentSubmission,
    markStudentDocumentsAsSeen,
    readDocumentSeenMap,
} from '@/lib/coordinator-document-notifications';
import { useEvaluationAlertPolling } from '@/hooks/use-evaluation-alert-polling';
import { cn } from '@/lib/utils';
import {
    CoordinatorStudentHeaderActions,
    CoordinatorStudentRowActions,
} from '@/components/coordinator/coordinator-student-accounts';
import { index as evaluationTemplatesIndex } from '@/routes/coordinators/evaluation-templates';
import { storeAll as storeAllEvaluations } from '@/routes/coordinators/students/evaluations';
import { index as studentsIndex, show } from '@/routes/coordinators/students';

type Section = {
    id: number;
    name: string;
    display_name: string;
    school_year: string | null | undefined;
    course: {
        code: string;
        name: string;
    };
} | null;

type StudentRow = {
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
    documents_count: number;
    has_submitted_documents: boolean;
    latest_document_uploaded_at: string | null;
    evaluation_status: 'none' | 'pending_supervisor' | 'completed';
    pending_evaluation: {
        id: number;
        template_name: string | null;
        opened_at: string;
    } | null;
    latest_completed_evaluation: {
        id: number;
        template_name: string | null;
        submitted_at: string | null;
        is_new: boolean;
    } | null;
    has_new_completed_evaluation: boolean;
    ojt_start_date: string | null;
};

type CompanyGroup = {
    companyId: number | null;
    companyName: string;
    students: StudentRow[];
};

type EvaluationTemplateOption = {
    id: number;
    name: string;
    description: string | null;
    items_count: number;
};

type Props = {
    section: Section;
    students: StudentRow[];
    evaluation_stats: {
        eligible: number;
        pending: number;
        without_supervisor: number;
        new_completed?: number;
    };
    evaluation_templates: EvaluationTemplateOption[];
    evaluation_alerts: {
        awaiting_supervisor: number;
        new_completed_count: number;
        has_unread: boolean;
    } | null;
};

const COMPANY_GROUP_STATE_KEY = 'coordinator-students-company-group-state';

function readStoredCompanyGroupState(): Record<string, boolean> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = localStorage.getItem(COMPANY_GROUP_STATE_KEY);

        if (!raw) {
            return {};
        }

        return JSON.parse(raw) as Record<string, boolean>;
    } catch {
        return {};
    }
}

function persistCompanyGroupState(state: Record<string, boolean>): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(COMPANY_GROUP_STATE_KEY, JSON.stringify(state));
}

function groupKey(companyId: number | null): string {
    return companyId === null ? 'unassigned' : String(companyId);
}

function formatOjtStartDate(value: string | null): string {
    if (!value) {
        return '—';
    }

    return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function CoordinatorStudents() {
    const {
        section,
        students,
        evaluation_stats,
        evaluation_templates,
        evaluation_alerts,
    } = usePage<Props>().props;
    const [search, setSearch] = useState('');
    const [openingAllEvaluations, setOpeningAllEvaluations] = useState(false);
    const [showBulkEvaluationModal, setShowBulkEvaluationModal] = useState(false);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [bulkEvaluationError, setBulkEvaluationError] = useState<
        string | null
    >(null);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const [hasLoadedGroupState, setHasLoadedGroupState] = useState(false);
    const [documentSeenMap, setDocumentSeenMap] = useState<
        Record<number, string>
    >({});
    const [notificationsReady, setNotificationsReady] = useState(false);
    const hasShownDocumentToast = useRef(false);
    const hasShownEvaluationToast = useRef(false);

    useEvaluationAlertPolling({
        enabled: Boolean(section),
        reloadKeys: [
            'evaluationAlerts',
            'evaluation_alerts',
            'students',
            'evaluation_stats',
        ],
    });

    useLayoutEffect(() => {
        const storedState = readStoredCompanyGroupState();
        setOpenGroups(storedState);
        setHasLoadedGroupState(true);
        console.log('Coordinator students group state restored', storedState);
    }, []);

    useLayoutEffect(() => {
        if (!section) {
            setNotificationsReady(false);
            return;
        }

        const seenMap = ensureDocumentNotificationBaseline(
            section.id,
            students,
        );
        setDocumentSeenMap(seenMap);
        setNotificationsReady(true);
    }, [section, students]);

    const unreadDocumentCount = useMemo(() => {
        if (!notificationsReady) {
            return 0;
        }

        return countUnreadDocumentSubmissions(students, documentSeenMap);
    }, [documentSeenMap, notificationsReady, students]);

    useEffect(() => {
        if (
            !notificationsReady ||
            !section ||
            hasShownDocumentToast.current
        ) {
            return;
        }

        if (unreadDocumentCount > 0) {
            toast.info(
                unreadDocumentCount === 1
                    ? '1 student submitted a new document.'
                    : `${unreadDocumentCount} students submitted new documents.`,
                {
                    description:
                        'Check the Documents column or open the student profile.',
                    duration: 6000,
                },
            );
            hasShownDocumentToast.current = true;
            console.log('Coordinator document notification toast shown', {
                unreadDocumentCount,
            });
        }
    }, [notificationsReady, section, unreadDocumentCount]);

    useEffect(() => {
        if (
            !section ||
            !evaluation_alerts?.has_unread ||
            hasShownEvaluationToast.current
        ) {
            return;
        }

        hasShownEvaluationToast.current = true;

        toast.success(
            evaluation_alerts.new_completed_count === 1
                ? '1 evaluation completed by supervisor'
                : `${evaluation_alerts.new_completed_count} evaluations completed by supervisors`,
            {
                description:
                    'Look for the Done badge in the Evaluations column.',
                duration: 6000,
            },
        );
    }, [evaluation_alerts, section]);

    const markCompletedAlertsSeen = () => {
        router.post(
            '/coordinators/evaluation-alerts/completed/seen',
            {},
            {
                preserveScroll: true,
                only: [
                    'evaluationAlerts',
                    'evaluation_alerts',
                    'students',
                    'evaluation_stats',
                ],
                onSuccess: () => {
                    console.log(
                        'Coordinator marked completed evaluation alerts as seen',
                    );
                },
            },
        );
    };

    const handleViewStudent = (student: StudentRow) => {
        if (!section) {
            return;
        }

        markStudentDocumentsAsSeen(
            section.id,
            student.id,
            student.latest_document_uploaded_at,
        );

        setDocumentSeenMap(readDocumentSeenMap(section.id));
    };

    console.log('Coordinator students loaded', {
        section,
        studentCount: students.length,
        evaluation_stats,
        evaluationTemplateCount: evaluation_templates.length,
    });

    const filteredStudents = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return students;
        }

        return students.filter((student) => {
            return (
                student.full_name.toLowerCase().includes(query) ||
                student.student_number.toLowerCase().includes(query) ||
                student.email.toLowerCase().includes(query) ||
                (student.company?.name ?? '').toLowerCase().includes(query) ||
                (student.department?.name ?? '').toLowerCase().includes(query) ||
                (student.supervisor?.name ?? '').toLowerCase().includes(query)
            );
        });
    }, [students, search]);

    const companyGroups = useMemo(() => {
        const groupMap = new Map<string, CompanyGroup>();

        for (const student of filteredStudents) {
            const key = groupKey(student.company_id);
            const existing = groupMap.get(key);

            if (existing) {
                existing.students.push(student);
                continue;
            }

            groupMap.set(key, {
                companyId: student.company_id,
                companyName: student.company?.name ?? 'Not assigned',
                students: [student],
            });
        }

        return [...groupMap.values()].sort((left, right) => {
            if (left.companyId === null) {
                return 1;
            }

            if (right.companyId === null) {
                return -1;
            }

            return left.companyName.localeCompare(right.companyName);
        });
    }, [filteredStudents]);

    const unassignedCount = useMemo(
        () => students.filter((student) => !student.company_id).length,
        [students],
    );

    const isGroupOpen = (companyId: number | null) => {
        const key = groupKey(companyId);

        if (!hasLoadedGroupState) {
            return false;
        }

        if (openGroups[key] !== undefined) {
            return openGroups[key];
        }

        return true;
    };

    const toggleGroup = (companyId: number | null, open: boolean) => {
        const key = groupKey(companyId);

        setOpenGroups((current) => {
            const next = {
                ...current,
                [key]: open,
            };

            persistCompanyGroupState(next);
            console.log('Coordinator students group state saved', next);

            return next;
        });
    };

    const openBulkEvaluationModal = () => {
        if (evaluation_stats.eligible === 0) {
            return;
        }

        if (evaluation_templates.length === 0) {
            setBulkEvaluationError(
                'Create an evaluation sheet first before sending evaluations.',
            );
            setShowBulkEvaluationModal(true);
            return;
        }

        setSelectedTemplateId(String(evaluation_templates[0]?.id ?? ''));
        setBulkEvaluationError(null);
        setShowBulkEvaluationModal(true);
        console.log('Coordinator bulk evaluation modal opened', {
            eligible: evaluation_stats.eligible,
            templates: evaluation_templates.length,
        });
    };

    const handleSendEvaluationToAll = () => {
        if (!selectedTemplateId) {
            setBulkEvaluationError('Please select an evaluation sheet.');
            return;
        }

        setOpeningAllEvaluations(true);
        router.post(
            storeAllEvaluations().url,
            {
                evaluation_template_id: Number(selectedTemplateId),
            },
            {
                preserveScroll: true,
                onSuccess: () => setShowBulkEvaluationModal(false),
                onFinish: () => setOpeningAllEvaluations(false),
            },
        );
    };

    return (
        <>
            <Head title="Students" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Students"
                    description={
                        section
                            ? `Manage student accounts and OJT progress for ${section.display_name}.`
                            : 'You are not assigned to a section yet.'
                    }
                    icon={Users}
                    badgeText="Coordinator"
                    action={
                        section ? (
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <CoordinatorStudentHeaderActions
                                    section={section}
                                    students={students}
                                />
                                <Button
                                    type="button"
                                    onClick={openBulkEvaluationModal}
                                    disabled={
                                        evaluation_stats.eligible === 0 ||
                                        openingAllEvaluations
                                    }
                                    className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                >
                                    {openingAllEvaluations ? (
                                        <Spinner />
                                    ) : (
                                        <ClipboardList className="mr-2 size-4" />
                                    )}
                                    Send evaluation to all
                                    {evaluation_stats.eligible > 0 && (
                                        <Badge
                                            variant="secondary"
                                            className="ml-2 bg-white/20 text-brand-foreground"
                                        >
                                            {evaluation_stats.eligible}
                                        </Badge>
                                    )}
                                </Button>
                            </div>
                        ) : undefined
                    }
                />

                {!section ? (
                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardContent className="py-10 text-center text-muted-foreground">
                            Ask your dean to assign you to a section before you
                            can manage students.
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {evaluation_alerts?.has_unread ? (
                            <div className="flex flex-col gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3 text-sm">
                                    <ClipboardList className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                                    <div>
                                        <p className="font-semibold text-emerald-900">
                                            {evaluation_alerts.new_completed_count ===
                                            1
                                                ? 'Supervisor completed an evaluation'
                                                : `${evaluation_alerts.new_completed_count} supervisors completed evaluations`}
                                        </p>
                                        <p className="mt-1 text-muted-foreground">
                                            Students with a{' '}
                                            <span className="font-medium text-emerald-700">
                                                Done
                                            </span>{' '}
                                            badge have new results ready to
                                            review.
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0 border-emerald-600/30"
                                    onClick={markCompletedAlertsSeen}
                                >
                                    Mark as seen
                                </Button>
                            </div>
                        ) : null}

                        {unreadDocumentCount > 0 ? (
                            <div className="flex items-start gap-3 rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-foreground">
                                <Bell className="mt-0.5 size-5 shrink-0 text-brand" />
                                <div>
                                    <p className="font-semibold text-brand">
                                        New document
                                        {unreadDocumentCount === 1
                                            ? ''
                                            : 's'}{' '}
                                        submitted
                                    </p>
                                    <p className="mt-1 text-muted-foreground">
                                        {unreadDocumentCount === 1
                                            ? '1 intern uploaded a file since you last checked.'
                                            : `${unreadDocumentCount} interns uploaded files since you last checked.`}{' '}
                                        Look for the{' '}
                                        <span className="font-medium text-brand">
                                            New
                                        </span>{' '}
                                        badge in the Documents column.
                                    </p>
                                </div>
                            </div>
                        ) : null}

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <Card className="border-sidebar-border/70 shadow-sm">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="rounded-lg bg-brand/15 p-3">
                                        <Users className="size-5 text-brand" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {students.length}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Total students
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-sidebar-border/70 shadow-sm">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="rounded-lg bg-brand/15 p-3">
                                        <Building2 className="size-5 text-brand" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {students.length - unassignedCount}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Assigned to company
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-sidebar-border/70 shadow-sm">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="rounded-lg bg-amber-500/15 p-3">
                                        <Building2 className="size-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {unassignedCount}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Pending assignment
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-sidebar-border/70 shadow-sm">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="rounded-lg bg-brand/15 p-3">
                                        <ClipboardList className="size-5 text-brand" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {evaluation_stats.pending}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Pending evaluations
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="relative max-w-md">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search by name, student ID, email, company, or department..."
                                className="pl-9"
                            />
                        </div>

                        {companyGroups.length === 0 ? (
                            <Card className="border-sidebar-border/70 shadow-sm">
                                <CardContent className="py-10 text-center text-muted-foreground">
                                    {search
                                        ? 'No students match your search.'
                                        : 'No students in this section yet. Use Add Student or Bulk Add to create intern accounts.'}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Students grouped by OJT company. Expand a
                                    company to view department assignments and
                                    intern details.
                                </p>

                                {companyGroups.map((group) => (
                                    <Collapsible
                                        key={groupKey(group.companyId)}
                                        open={isGroupOpen(group.companyId)}
                                        onOpenChange={(open) =>
                                            toggleGroup(group.companyId, open)
                                        }
                                    >
                                        <Card className="overflow-hidden border-sidebar-border/70 py-0 shadow-sm">
                                            <CollapsibleTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40"
                                                >
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <Building2 className="size-4 text-brand" />
                                                            <h3 className="font-semibold">
                                                                {
                                                                    group.companyName
                                                                }
                                                            </h3>
                                                            <Badge className="bg-brand text-brand-foreground hover:bg-brand">
                                                                {
                                                                    group
                                                                        .students
                                                                        .length
                                                                }{' '}
                                                                {group.students
                                                                    .length ===
                                                                1
                                                                    ? 'intern'
                                                                    : 'interns'}
                                                            </Badge>
                                                        </div>
                                                        {group.companyId ===
                                                            null && (
                                                            <p className="mt-1 text-sm text-muted-foreground">
                                                                Students still
                                                                needing OJT
                                                                company
                                                                placement
                                                            </p>
                                                        )}
                                                    </div>
                                                    <ChevronDown
                                                        className={cn(
                                                            'size-5 shrink-0 text-muted-foreground transition-transform',
                                                            isGroupOpen(
                                                                group.companyId,
                                                            ) && 'rotate-180',
                                                        )}
                                                    />
                                                </button>
                                            </CollapsibleTrigger>

                                            <CollapsibleContent>
                                                <div className="border-t px-4 py-4">
                                                    <div className="overflow-x-auto rounded-lg border">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="border-b bg-muted/40 text-left">
                                                                    <th className="px-4 py-3 font-medium">
                                                                        Student
                                                                    </th>
                                                                    <th className="px-4 py-3 font-medium">
                                                                        Email
                                                                    </th>
                                                                    <th className="px-4 py-3 font-medium">
                                                                        Department
                                                                    </th>
                                                                    <th className="px-4 py-3 font-medium">
                                                                        Supervisor
                                                                    </th>
                                                                    <th className="px-4 py-3 font-medium">
                                                                        OJT start
                                                                    </th>
                                                                    <th className="px-4 py-3 font-medium">
                                                                        Documents
                                                                    </th>
                                                                    <th className="px-4 py-3 font-medium">
                                                                        Evaluations
                                                                    </th>
                                                                    <th className="px-4 py-3 font-medium">
                                                                        Status
                                                                    </th>
                                                                    <th className="px-4 py-3 text-right font-medium">
                                                                        Actions
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {group.students.map(
                                                                    (
                                                                        student,
                                                                    ) => (
                                                                        <tr
                                                                            key={
                                                                                student.id
                                                                            }
                                                                            className="border-b last:border-b-0"
                                                                        >
                                                                            <td className="px-4 py-3">
                                                                                <div className="font-medium">
                                                                                    {
                                                                                        student.full_name
                                                                                    }
                                                                                </div>
                                                                                <div className="text-xs text-muted-foreground">
                                                                                    Student
                                                                                    ID:{' '}
                                                                                    {
                                                                                        student.student_number
                                                                                    }
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-muted-foreground">
                                                                                {
                                                                                    student.email
                                                                                }
                                                                            </td>
                                                                            <td className="px-4 py-3">
                                                                                {student.department ? (
                                                                                    student
                                                                                        .department
                                                                                        .name
                                                                                ) : (
                                                                                    <span className="text-muted-foreground">
                                                                                        —
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-4 py-3">
                                                                                {student.supervisor ? (
                                                                                    student
                                                                                        .supervisor
                                                                                        .name
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
                                                                                            {
                                                                                                student.documents_count
                                                                                            }{' '}
                                                                                            submitted
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
                                                                                            Awaiting
                                                                                            supervisor
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
                                                                                        <Badge variant="secondary">
                                                                                            None
                                                                                        </Badge>
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
                                                                                    {student.is_active
                                                                                        ? 'Active'
                                                                                        : 'Inactive'}
                                                                                </Badge>
                                                                            </td>
                                                                            <td className="px-4 py-3 text-right">
                                                                                <div className="flex items-center justify-end gap-2">
                                                                                    <CoordinatorStudentRowActions
                                                                                        student={
                                                                                            student
                                                                                        }
                                                                                    />
                                                                                    <Button
                                                                                        asChild
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                    >
                                                                                        <Link
                                                                                            href={show(
                                                                                                student.id,
                                                                                            )}
                                                                                            prefetch
                                                                                            onClick={() => {
                                                                                                handleViewStudent(
                                                                                                    student,
                                                                                                );

                                                                                                if (
                                                                                                    student.has_new_completed_evaluation
                                                                                                ) {
                                                                                                    markCompletedAlertsSeen();
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
                                                                    ),
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </CollapsibleContent>
                                        </Card>
                                    </Collapsible>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            <AppModal
                open={showBulkEvaluationModal}
                onOpenChange={setShowBulkEvaluationModal}
                title="Send evaluation to all"
                description={
                    evaluation_templates.length === 0
                        ? 'You need at least one active evaluation sheet.'
                        : `Open an evaluation for ${evaluation_stats.eligible} eligible student(s). Each assigned supervisor will receive the selected sheet.`
                }
                className="sm:max-w-lg"
            >
                {evaluation_templates.length === 0 ? (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Build a reusable evaluation sheet with rating
                            questions and text areas, then return here to send
                            it to supervisors.
                        </p>
                        {bulkEvaluationError && (
                            <p className="text-sm text-destructive">
                                {bulkEvaluationError}
                            </p>
                        )}
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    setShowBulkEvaluationModal(false)
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
                            <Label htmlFor="bulk-evaluation-template">
                                Evaluation sheet
                            </Label>
                            <Select
                                value={selectedTemplateId}
                                onValueChange={(value) => {
                                    setSelectedTemplateId(value);
                                    setBulkEvaluationError(null);
                                }}
                            >
                                <SelectTrigger id="bulk-evaluation-template">
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
                            {bulkEvaluationError && (
                                <InputError message={bulkEvaluationError} />
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    setShowBulkEvaluationModal(false)
                                }
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                disabled={openingAllEvaluations}
                                onClick={handleSendEvaluationToAll}
                                className="bg-brand text-brand-foreground hover:bg-brand-hover"
                            >
                                {openingAllEvaluations && <Spinner />}
                                Send to {evaluation_stats.eligible} student
                                {evaluation_stats.eligible === 1 ? '' : 's'}
                            </Button>
                        </div>
                    </div>
                )}
            </AppModal>
        </>
    );
}

CoordinatorStudents.layout = {
    breadcrumbs: [{ title: 'Students', href: studentsIndex().url }],
};
