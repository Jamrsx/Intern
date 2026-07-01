import { Head, Link } from '@inertiajs/react';
import { ChevronDown, Eye, Search, Users } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DeanPortalRoutesProvider } from '@/contexts/dean-portal-routes-context';
import { useDeanPortalRoutes } from '@/contexts/dean-portal-routes-context';
import { deanPortalRoutes } from '@/lib/dean-portal-routes';
import {
    DeanSectionAddStudentButton,
    DeanStudentAccountsProvider,
    DeanStudentHeaderActions,
} from '@/components/deans/dean-student-accounts';
import { cn } from '@/lib/utils';

type Course = {
    id: number;
    code: string;
    name: string;
    portal_role?: 'dean' | 'program_head';
    major?: {
        id: number;
        code: string | null;
        name: string;
        display_name: string;
    } | null;
};

type SectionOption = {
    id: number;
    name: string;
    display_name: string;
    school_year: string | null | undefined;
    coordinator: {
        id: number;
        name: string;
        email: string;
    } | null;
};

type CoordinatorSummary = {
    id: number;
    name: string;
    email: string;
};

type StudentRow = {
    id: number;
    student_number: string;
    email: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    full_name: string;
    section_id: number;
    section: {
        id: number;
        display_name: string;
        school_year: string | null | undefined;
        coordinator: CoordinatorSummary | null;
    } | null;
    company_id: number | null;
    company: { id: number; name: string } | null;
    department_id: number | null;
    department: { id: number; name: string } | null;
    supervisor_id: number | null;
    supervisor: { id: number; name: string } | null;
    is_active: boolean;
};

type StudentGroup = {
    sectionId: number;
    displayName: string;
    schoolYear: string | null | undefined;
    coordinator: CoordinatorSummary | null;
    students: StudentRow[];
};

type Props = {
    course: Course | null;
    sections: SectionOption[];
    students: StudentRow[];
};

const STUDENT_GROUP_STATE_KEY = 'dean-students-group-state';

function readStoredStudentGroupState(): Record<number, boolean> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = localStorage.getItem(STUDENT_GROUP_STATE_KEY);

        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw) as Record<string, boolean>;

        return Object.fromEntries(
            Object.entries(parsed).map(([key, value]) => [Number(key), value]),
        );
    } catch {
        return {};
    }
}

function persistStudentGroupState(state: Record<number, boolean>): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(STUDENT_GROUP_STATE_KEY, JSON.stringify(state));
}

function StudentGroupTable({ students }: { students: StudentRow[] }) {
    const portalRoutes = useDeanPortalRoutes();
    const showStudent = portalRoutes.students.show;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b bg-muted/40 text-left">
                        <th className="px-4 py-3 font-medium">Student</th>
                        <th className="px-4 py-3 font-medium">Section</th>
                        <th className="px-4 py-3 font-medium">Coordinator</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">OJT Company</th>
                        <th className="px-4 py-3 font-medium">Supervisor</th>
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
                            className="border-b last:border-0"
                        >
                            <td className="px-4 py-3">
                                <div className="font-medium">
                                    {student.full_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Student ID: {student.student_number}
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <div className="font-medium">
                                    {student.section?.display_name ?? (
                                        <span className="text-muted-foreground">
                                            Unassigned
                                        </span>
                                    )}
                                </div>
                                {student.section?.school_year ? (
                                    <div className="text-xs text-muted-foreground">
                                        {student.section.school_year}
                                    </div>
                                ) : null}
                            </td>
                            <td className="px-4 py-3">
                                {student.section?.coordinator?.name ?? (
                                    <span className="text-amber-600">
                                        Unassigned
                                    </span>
                                )}
                                {student.section?.coordinator?.email ? (
                                    <div className="text-xs text-muted-foreground">
                                        {student.section.coordinator.email}
                                    </div>
                                ) : null}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                                {student.email}
                            </td>
                            <td className="px-4 py-3">
                                {student.company?.name ?? (
                                    <span className="text-muted-foreground">
                                        Not assigned
                                    </span>
                                )}
                            </td>
                            <td className="px-4 py-3">
                                {student.supervisor?.name ?? (
                                    <span className="text-muted-foreground">
                                        Not assigned
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
                                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
                                            : ''
                                    }
                                >
                                    {student.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                                {showStudent ? (
                                    <Button
                                        asChild
                                        variant="outline"
                                        size="sm"
                                    >
                                        <Link
                                            href={showStudent(student.id).url}
                                            prefetch
                                        >
                                            <Eye className="mr-1 size-3.5" />
                                            View
                                        </Link>
                                    </Button>
                                ) : null}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function studentMatchesSearch(student: StudentRow, query: string): boolean {
    const normalized = query.trim().toLowerCase();

    if (normalized === '') {
        return true;
    }

    const searchable = [
        student.student_number,
        student.first_name,
        student.middle_name ?? '',
        student.last_name,
        student.full_name,
    ]
        .join(' ')
        .toLowerCase();

    return searchable.includes(normalized);
}

export function DeanStudentsPage({ course, sections, students }: Props) {
    const portalRoutes = useDeanPortalRoutes();
    const [filterSectionId, setFilterSectionId] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
    const [hasLoadedGroupState, setHasLoadedGroupState] = useState(false);

    useLayoutEffect(() => {
        const storedState = readStoredStudentGroupState();
        setOpenGroups(storedState);
        setHasLoadedGroupState(true);
        console.log('Dean students group state restored', storedState);
    }, []);

    console.log('Dean Students page loaded', {
        course,
        sectionsCount: sections.length,
        studentsCount: students.length,
        searchQuery,
        savedGroupState: openGroups,
    });

    const filteredStudents = useMemo(() => {
        return students.filter((student) =>
            studentMatchesSearch(student, searchQuery),
        );
    }, [students, searchQuery]);

    const studentGroups = useMemo(() => {
        const bySection = new Map<number, StudentRow[]>();

        for (const student of filteredStudents) {
            const existing = bySection.get(student.section_id) ?? [];
            existing.push(student);
            bySection.set(student.section_id, existing);
        }

        const hasSearch = searchQuery.trim() !== '';

        return sections
            .filter((section) => !hasSearch || bySection.has(section.id))
            .map((section) => ({
                sectionId: section.id,
                displayName: section.display_name,
                schoolYear: section.school_year,
                coordinator: section.coordinator,
                students: bySection.get(section.id) ?? [],
            }));
    }, [filteredStudents, sections, searchQuery]);

    const filteredGroups = useMemo(() => {
        if (filterSectionId === 'all') {
            return studentGroups;
        }

        return studentGroups.filter(
            (group) => String(group.sectionId) === filterSectionId,
        );
    }, [filterSectionId, studentGroups]);

    const isGroupOpen = (group: StudentGroup) => {
        if (searchQuery.trim() !== '') {
            return true;
        }

        if (!hasLoadedGroupState) {
            return false;
        }

        if (openGroups[group.sectionId] !== undefined) {
            return openGroups[group.sectionId];
        }

        return true;
    };

    const toggleGroup = (sectionId: number, open: boolean) => {
        setOpenGroups((current) => {
            const next = {
                ...current,
                [sectionId]: open,
            };

            persistStudentGroupState(next);
            console.log('Dean students group state saved', next);

            return next;
        });
    };

    return (
        <DeanStudentAccountsProvider
            courseCode={course?.code ?? ''}
            sections={sections}
        >
            <Head title="Students" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Students"
                    description={
                        course
                            ? `Manage students and section assignments for ${course.major?.display_name ?? course.code}.`
                            : 'You need an assigned course before you can view students.'
                    }
                    icon={Users}
                    badgeText={portalRoutes.badgeText}
                    action={
                        course && sections.length > 0 ? (
                            <DeanStudentHeaderActions />
                        ) : undefined
                    }
                />

                {!course && (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No course is assigned to your dean account yet.
                        </CardContent>
                    </Card>
                )}

                {course && sections.length === 0 && (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No active sections found.{' '}
                            <Link
                                href={portalRoutes.sections.index().url}
                                className="text-brand underline-offset-4 hover:underline"
                            >
                                Create a section first
                            </Link>
                            .
                        </CardContent>
                    </Card>
                )}

                {course && sections.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="flex-1 space-y-2">
                                <Label htmlFor="search-students">
                                    Search students
                                </Label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="search-students"
                                        value={searchQuery}
                                        onChange={(event) => {
                                            setSearchQuery(event.target.value);
                                            console.log(
                                                'Dean students search',
                                                event.target.value,
                                            );
                                        }}
                                        placeholder="Search by student ID, first name, middle name, or last name"
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="w-full lg:w-64">
                                <Label
                                    htmlFor="filter-section"
                                    className="mb-2 block text-sm"
                                >
                                    Filter by section
                                </Label>
                                <Select
                                    value={filterSectionId}
                                    onValueChange={setFilterSectionId}
                                >
                                    <SelectTrigger
                                        id="filter-section"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="All sections" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All sections
                                        </SelectItem>
                                        {sections.map((section) => (
                                            <SelectItem
                                                key={section.id}
                                                value={String(section.id)}
                                            >
                                                {section.display_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Students grouped by section. Expand a section to view
                            its interns and assigned coordinator.
                            {searchQuery.trim() !== '' && (
                                <>
                                    {' '}
                                    Showing {filteredStudents.length} of{' '}
                                    {students.length} student(s) matching your
                                    search.
                                </>
                            )}
                        </p>

                        {filteredGroups.length === 0 ? (
                            <Card className="border-sidebar-border/70">
                                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                                    {searchQuery.trim() !== ''
                                        ? 'No students match your search.'
                                        : 'No students found for the selected section.'}
                                </CardContent>
                            </Card>
                        ) : (
                            filteredGroups.map((group) => (
                                <Collapsible
                                    key={group.sectionId}
                                    open={isGroupOpen(group)}
                                    onOpenChange={(open) =>
                                        toggleGroup(group.sectionId, open)
                                    }
                                >
                                    <Card className="overflow-hidden border-sidebar-border/70 py-0">
                                        <div className="flex items-center gap-2 px-4 py-4">
                                            <CollapsibleTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="flex min-w-0 flex-1 items-center gap-4 text-left transition-colors hover:bg-muted/40"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <h3 className="font-semibold">
                                                                {
                                                                    group.displayName
                                                                }
                                                            </h3>
                                                            {group.schoolYear && (
                                                                <Badge variant="secondary">
                                                                    {
                                                                        group.schoolYear
                                                                    }
                                                                </Badge>
                                                            )}
                                                            <Badge
                                                                variant={
                                                                    group
                                                                        .students
                                                                        .length ===
                                                                    0
                                                                        ? 'secondary'
                                                                        : 'default'
                                                                }
                                                                className={
                                                                    group
                                                                        .students
                                                                        .length ===
                                                                    0
                                                                        ? ''
                                                                        : 'bg-brand text-brand-foreground hover:bg-brand'
                                                                }
                                                            >
                                                                {group.students
                                                                    .length ===
                                                                0
                                                                    ? 'Empty section'
                                                                    : `${group.students.length} ${
                                                                          group
                                                                              .students
                                                                              .length ===
                                                                          1
                                                                              ? 'student'
                                                                              : 'students'
                                                                      }`}
                                                            </Badge>
                                                        </div>
                                                        <p className="mt-1 text-sm text-muted-foreground">
                                                            Coordinator:{' '}
                                                            {group.coordinator ? (
                                                                <span className="text-foreground">
                                                                    {
                                                                        group
                                                                            .coordinator
                                                                            .name
                                                                    }
                                                                    <span className="text-muted-foreground">
                                                                        {' '}
                                                                        (
                                                                        {
                                                                            group
                                                                                .coordinator
                                                                                .email
                                                                        }
                                                                        )
                                                                    </span>
                                                                </span>
                                                            ) : (
                                                                <span className="text-amber-600">
                                                                    Unassigned
                                                                </span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </button>
                                            </CollapsibleTrigger>
                                            <DeanSectionAddStudentButton
                                                sectionId={group.sectionId}
                                                displayName={group.displayName}
                                            />
                                            <CollapsibleTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/40"
                                                    aria-label={`Toggle ${group.displayName}`}
                                                >
                                                    <ChevronDown
                                                        className={cn(
                                                            'size-5 transition-transform',
                                                            isGroupOpen(
                                                                group,
                                                            ) && 'rotate-180',
                                                        )}
                                                    />
                                                </button>
                                            </CollapsibleTrigger>
                                        </div>

                                        <CollapsibleContent>
                                            <div className="border-t">
                                                {group.students.length === 0 ? (
                                                    <div className="flex flex-col items-center gap-4 px-4 py-8 text-center text-sm text-muted-foreground">
                                                        <p>
                                                            No students in this
                                                            section yet.
                                                        </p>
                                                        <DeanSectionAddStudentButton
                                                            sectionId={
                                                                group.sectionId
                                                            }
                                                            displayName={
                                                                group.displayName
                                                            }
                                                            variant="default"
                                                        />
                                                    </div>
                                                ) : (
                                                    <StudentGroupTable
                                                        students={group.students}
                                                    />
                                                )}
                                            </div>
                                        </CollapsibleContent>
                                    </Card>
                                </Collapsible>
                            ))
                        )}
                    </div>
                )}
            </div>
        </DeanStudentAccountsProvider>
    );
}

export default function DeanStudents(props: Props) {
    return (
        <DeanPortalRoutesProvider value={deanPortalRoutes}>
            <DeanStudentsPage {...props} />
        </DeanPortalRoutesProvider>
    );
}

export { DeanStudentsPage as ProgramHeadStudentsPage };
