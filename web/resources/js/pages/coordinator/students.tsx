import { Head, Link, router, usePage } from '@inertiajs/react';
import { Building2, ChevronDown, ClipboardList, Eye, Search, Users } from 'lucide-react';
import { useLayoutEffect, useMemo, useState } from 'react';
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
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
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
};

type CompanyGroup = {
    companyId: number | null;
    companyName: string;
    students: StudentRow[];
};

type Props = {
    section: Section;
    students: StudentRow[];
    evaluation_stats: {
        eligible: number;
        pending: number;
        without_supervisor: number;
    };
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

export default function CoordinatorStudents() {
    const { section, students, evaluation_stats } = usePage<Props>().props;
    const [search, setSearch] = useState('');
    const [openingAllEvaluations, setOpeningAllEvaluations] = useState(false);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
    const [hasLoadedGroupState, setHasLoadedGroupState] = useState(false);

    useLayoutEffect(() => {
        const storedState = readStoredCompanyGroupState();
        setOpenGroups(storedState);
        setHasLoadedGroupState(true);
        console.log('Coordinator students group state restored', storedState);
    }, []);

    console.log('Coordinator students loaded', {
        section,
        studentCount: students.length,
        evaluation_stats,
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

    const handleSendEvaluationToAll = () => {
        if (evaluation_stats.eligible === 0) {
            return;
        }

        if (
            !confirm(
                `Open evaluations for ${evaluation_stats.eligible} student(s)? Each assigned supervisor will be able to rate their intern.`,
            )
        ) {
            return;
        }

        setOpeningAllEvaluations(true);
        router.post(
            storeAllEvaluations().url,
            {},
            {
                preserveScroll: true,
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
                            ? `View progress, documents, and OJT placement for ${section.display_name}.`
                            : 'You are not assigned to a section yet.'
                    }
                    icon={Users}
                    badgeText="Coordinator"
                    action={
                        <Button
                            type="button"
                            onClick={handleSendEvaluationToAll}
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
                                        : 'No students in this section yet.'}
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
                                                                                    >
                                                                                        <Eye className="mr-1 size-3.5" />
                                                                                        View
                                                                                    </Link>
                                                                                </Button>
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
        </>
    );
}

CoordinatorStudents.layout = {
    breadcrumbs: [{ title: 'Students', href: studentsIndex().url }],
};
