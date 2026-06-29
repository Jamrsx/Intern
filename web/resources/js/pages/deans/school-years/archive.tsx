import { Head, Link } from '@inertiajs/react';
import { Archive, ArrowLeft, ChevronDown } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { DeanPortalRoutesProvider, useDeanPortalRoutes } from '@/contexts/dean-portal-routes-context';
import { deanPortalRoutes } from '@/lib/dean-portal-routes';

type Course = {
    id: number;
    code: string;
    name: string;
};

type ArchivedStudent = {
    id: number;
    student_number: string;
    full_name: string;
    email: string;
    is_active: boolean;
    internship: {
        company: string | null;
        department: string | null;
        supervisor: string | null;
    };
};

type ArchivedSection = {
    id: number;
    name: string;
    display_name: string;
    is_active: boolean;
    coordinator: {
        id: number;
        name: string;
        email: string;
    } | null;
    students: ArchivedStudent[];
    students_count: number;
};

type ArchivedSchoolYear = {
    id: number;
    name: string;
    start_date: string | null;
    end_date: string | null;
    sections: ArchivedSection[];
    sections_count: number;
    students_count: number;
};

type Props = {
    course: Course;
    archivedSchoolYears: ArchivedSchoolYear[];
};

const ARCHIVE_SY_STATE_KEY = 'dean-archived-sy-state';
const ARCHIVE_SECTION_STATE_KEY = 'dean-archived-section-state';

function readStoredState(key: string): Record<number, boolean> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = localStorage.getItem(key);

        if (!raw) {
            return {};
        }

        const parsed = JSON.parse(raw) as Record<string, boolean>;

        return Object.fromEntries(
            Object.entries(parsed).map(([id, value]) => [Number(id), value]),
        );
    } catch {
        return {};
    }
}

function persistState(key: string, state: Record<number, boolean>): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(key, JSON.stringify(state));
}

function formatDateRange(start: string | null, end: string | null): string {
    if (!start && !end) {
        return 'No date range recorded';
    }

    if (start && end) {
        return `${start} to ${end}`;
    }

    return start ?? end ?? 'No date range recorded';
}

function InternshipCell({
    internship,
}: {
    internship: ArchivedStudent['internship'];
}) {
    if (!internship.company) {
        return (
            <span className="text-muted-foreground">No placement recorded</span>
        );
    }

    return (
        <div className="space-y-1">
            <div className="font-medium">{internship.company}</div>
            {internship.department ? (
                <div className="text-xs text-muted-foreground">
                    {internship.department}
                </div>
            ) : null}
            {internship.supervisor ? (
                <div className="text-xs text-muted-foreground">
                    Supervisor: {internship.supervisor}
                </div>
            ) : null}
        </div>
    );
}

export function DeanSchoolYearsArchivePage({
    course,
    archivedSchoolYears,
}: Props) {
    const portalRoutes = useDeanPortalRoutes();
    const [openSchoolYears, setOpenSchoolYears] = useState<
        Record<number, boolean>
    >({});
    const [openSections, setOpenSections] = useState<Record<number, boolean>>(
        {},
    );

    useLayoutEffect(() => {
        setOpenSchoolYears(readStoredState(ARCHIVE_SY_STATE_KEY));
        setOpenSections(readStoredState(ARCHIVE_SECTION_STATE_KEY));
    }, []);

    const inactiveCount = archivedSchoolYears.length;

    console.log('Archived school years page loaded', {
        course: course.code,
        inactiveCount,
    });

    const totalStudents = useMemo(
        () =>
            archivedSchoolYears.reduce(
                (sum, schoolYear) => sum + schoolYear.students_count,
                0,
            ),
        [archivedSchoolYears],
    );

    const toggleSchoolYear = (schoolYearId: number, open: boolean) => {
        setOpenSchoolYears((current) => {
            const next = { ...current, [schoolYearId]: open };
            persistState(ARCHIVE_SY_STATE_KEY, next);

            return next;
        });
    };

    const toggleSection = (sectionId: number, open: boolean) => {
        setOpenSections((current) => {
            const next = { ...current, [sectionId]: open };
            persistState(ARCHIVE_SECTION_STATE_KEY, next);

            return next;
        });
    };

    return (
        <>
            <Head title="Archived School Years" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Archived School Years"
                    description={`Review inactive school years for ${course.code}: sections, students, and internship placements.`}
                    icon={Archive}
                    badgeText={portalRoutes.badgeText}
                    action={
                        <Button variant="outline" asChild>
                            <Link href={portalRoutes.schoolYears.index().url}>
                                <ArrowLeft className="mr-2 size-4" />
                                Back to school years
                            </Link>
                        </Button>
                    }
                />

                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">
                        {inactiveCount} inactive school year
                        {inactiveCount === 1 ? '' : 's'}
                    </Badge>
                    <Badge variant="secondary">
                        {totalStudents} archived student
                        {totalStudents === 1 ? '' : 's'}
                    </Badge>
                </div>

                {archivedSchoolYears.length === 0 ? (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            No inactive school years yet. When you deactivate a
                            school year, it will appear here with its sections
                            and student records.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {archivedSchoolYears.map((schoolYear) => (
                            <Collapsible
                                key={schoolYear.id}
                                open={openSchoolYears[schoolYear.id] ?? false}
                                onOpenChange={(open) =>
                                    toggleSchoolYear(schoolYear.id, open)
                                }
                            >
                                <Card className="overflow-hidden border-sidebar-border/70 py-0">
                                    <CollapsibleTrigger asChild>
                                        <button
                                            type="button"
                                            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-muted/40"
                                        >
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="text-lg font-semibold">
                                                        {schoolYear.name}
                                                    </h3>
                                                    <Badge variant="secondary">
                                                        Inactive
                                                    </Badge>
                                                    <Badge className="bg-brand text-brand-foreground hover:bg-brand">
                                                        {schoolYear.sections_count}{' '}
                                                        section
                                                        {schoolYear.sections_count ===
                                                        1
                                                            ? ''
                                                            : 's'}
                                                    </Badge>
                                                    <Badge variant="outline">
                                                        {schoolYear.students_count}{' '}
                                                        student
                                                        {schoolYear.students_count ===
                                                        1
                                                            ? ''
                                                            : 's'}
                                                    </Badge>
                                                </div>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {formatDateRange(
                                                        schoolYear.start_date,
                                                        schoolYear.end_date,
                                                    )}
                                                </p>
                                            </div>
                                            <ChevronDown
                                                className={cn(
                                                    'size-5 shrink-0 text-muted-foreground transition-transform',
                                                    openSchoolYears[
                                                        schoolYear.id
                                                    ] && 'rotate-180',
                                                )}
                                            />
                                        </button>
                                    </CollapsibleTrigger>

                                    <CollapsibleContent>
                                        <div className="space-y-3 border-t bg-muted/10 p-4">
                                            {schoolYear.sections.length === 0 ? (
                                                <p className="text-sm text-muted-foreground">
                                                    No sections recorded for{' '}
                                                    {course.code} in this school
                                                    year.
                                                </p>
                                            ) : (
                                                schoolYear.sections.map(
                                                    (section) => (
                                                        <Collapsible
                                                            key={section.id}
                                                            open={
                                                                openSections[
                                                                    section.id
                                                                ] ?? false
                                                            }
                                                            onOpenChange={(
                                                                open,
                                                            ) =>
                                                                toggleSection(
                                                                    section.id,
                                                                    open,
                                                                )
                                                            }
                                                        >
                                                            <Card className="overflow-hidden border-border/70 py-0">
                                                                <CollapsibleTrigger
                                                                    asChild
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                                                                    >
                                                                        <div>
                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                <p className="font-medium">
                                                                                    {
                                                                                        section.display_name
                                                                                    }
                                                                                </p>
                                                        <Badge
                                                            variant={
                                                                section.is_active
                                                                    ? 'default'
                                                                    : 'secondary'
                                                            }
                                                            className={
                                                                section.is_active
                                                                    ? ''
                                                                    : ''
                                                            }
                                                        >
                                                            {section.is_active
                                                                ? 'Active section'
                                                                : 'Inactive section'}
                                                        </Badge>
                                                                                <Badge variant="outline">
                                                                                    {
                                                                                        section.students_count
                                                                                    }{' '}
                                                                                    student
                                                                                    {section.students_count ===
                                                                                    1
                                                                                        ? ''
                                                                                        : 's'}
                                                                                </Badge>
                                                                            </div>
                                                                            <p className="mt-1 text-sm text-muted-foreground">
                                                                                Coordinator:{' '}
                                                                                {section.coordinator ? (
                                                                                    <span className="text-foreground">
                                                                                        {
                                                                                            section
                                                                                                .coordinator
                                                                                                .name
                                                                                        }
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-amber-600">
                                                                                        Unassigned
                                                                                    </span>
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                        <ChevronDown
                                                                            className={cn(
                                                                                'size-4 shrink-0 text-muted-foreground transition-transform',
                                                                                openSections[
                                                                                    section
                                                                                        .id
                                                                                ] &&
                                                                                    'rotate-180',
                                                                            )}
                                                                        />
                                                                    </button>
                                                                </CollapsibleTrigger>

                                                                <CollapsibleContent>
                                                                    <div className="border-t">
                                                                        {section
                                                                            .students
                                                                            .length ===
                                                                        0 ? (
                                                                            <p className="px-4 py-6 text-sm text-muted-foreground">
                                                                                No
                                                                                students
                                                                                in
                                                                                this
                                                                                section.
                                                                            </p>
                                                                        ) : (
                                                                            <div className="overflow-x-auto">
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
                                                                                                Internship
                                                                                                placement
                                                                                            </th>
                                                                                            <th className="px-4 py-3 font-medium">
                                                                                                Status
                                                                                            </th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody>
                                                                                        {section.students.map(
                                                                                            (
                                                                                                student,
                                                                                            ) => (
                                                                                                <tr
                                                                                                    key={
                                                                                                        student.id
                                                                                                    }
                                                                                                    className="border-b last:border-0"
                                                                                                >
                                                                                                    <td className="px-4 py-3">
                                                                                                        <div className="font-medium">
                                                                                                            {
                                                                                                                student.full_name
                                                                                                            }
                                                                                                        </div>
                                                                                                        <div className="text-xs text-muted-foreground">
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
                                                                                                        <InternshipCell
                                                                                                            internship={
                                                                                                                student.internship
                                                                                                            }
                                                                                                        />
                                                                                                    </td>
                                                                                                    <td className="px-4 py-3">
                                                                                                        <Badge
                                                                                                            variant={
                                                                                                                student.is_active
                                                                                                                    ? 'default'
                                                                                                                    : 'secondary'
                                                                                                            }
                                                                                                        >
                                                                                                            {student.is_active
                                                                                                                ? 'Active'
                                                                                                                : 'Inactive'}
                                                                                                        </Badge>
                                                                                                    </td>
                                                                                                </tr>
                                                                                            ),
                                                                                        )}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </CollapsibleContent>
                                                            </Card>
                                                        </Collapsible>
                                                    ),
                                                )
                                            )}
                                        </div>
                                    </CollapsibleContent>
                                </Card>
                            </Collapsible>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

export default function DeanSchoolYearsArchive(props: Props) {
    return (
        <DeanPortalRoutesProvider value={deanPortalRoutes}>
            <DeanSchoolYearsArchivePage {...props} />
        </DeanPortalRoutesProvider>
    );
}

DeanSchoolYearsArchive.layout = {
    breadcrumbs: [
        { title: 'School Years', href: deanPortalRoutes.schoolYears.index().url },
        { title: 'Archived', href: deanPortalRoutes.schoolYears.archive().url },
    ],
};
