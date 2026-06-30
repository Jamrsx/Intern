import { Form, Head, Link, router } from '@inertiajs/react';
import { CheckCircle, ChevronDown, ListChecks, Pencil, Plus } from 'lucide-react';
import { useLayoutEffect, useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { AppModal } from '@/components/superadmin/app-modal';
import { PageHeader } from '@/components/superadmin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { cn } from '@/lib/utils';
import { DeanPortalRoutesProvider, useDeanPortalRoutes } from '@/contexts/dean-portal-routes-context';
import { deanPortalRoutes } from '@/lib/dean-portal-routes';

type CourseMajor = {
    id: number;
    code: string | null;
    name: string;
    display_name: string;
};

type Course = {
    id: number;
    code: string;
    name: string;
    portal_role?: 'dean' | 'program_head';
    major?: CourseMajor | null;
};

type SchoolYearOption = {
    id: number;
    name: string;
    is_active: boolean;
};

type Section = {
    id: number;
    name: string;
    code: string | null;
    display_name: string;
    school_year_id: number;
    school_year: {
        id: number;
        name: string;
        is_active?: boolean;
    } | null;
    students_count: number;
    is_active: boolean;
    created_at: string | null;
    course_major: CourseMajor | null;
};

type SectionGroup = {
    schoolYearId: number;
    schoolYearName: string;
    isActiveSchoolYear: boolean;
    sections: Section[];
};

type Props = {
    course: Course | null;
    majors: CourseMajor[];
    schoolYears: SchoolYearOption[];
    sections: Section[];
};

const SECTION_GROUP_STATE_KEY = 'dean-sections-group-state';

function readStoredGroupState(): Record<number, boolean> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = localStorage.getItem(SECTION_GROUP_STATE_KEY);

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

function persistGroupState(state: Record<number, boolean>): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(SECTION_GROUP_STATE_KEY, JSON.stringify(state));
}

function SchoolYearSelect({
    schoolYears,
    value,
    onChange,
    name = 'school_year_id',
}: {
    schoolYears: SchoolYearOption[];
    value: string;
    onChange: (value: string) => void;
    name?: string;
}) {
    return (
        <>
            <input type="hidden" name={name} value={value} />
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select school year" />
                </SelectTrigger>
                <SelectContent>
                    {schoolYears.map((schoolYear) => (
                        <SelectItem
                            key={schoolYear.id}
                            value={String(schoolYear.id)}
                        >
                            {schoolYear.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </>
    );
}

function MajorSelect({
    majors,
    value,
    onChange,
    name = 'course_major_id',
}: {
    majors: CourseMajor[];
    value: string;
    onChange: (value: string) => void;
    name?: string;
}) {
    return (
        <>
            <input type="hidden" name={name} value={value} />
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select program / major" />
                </SelectTrigger>
                <SelectContent>
                    {majors.map((major) => (
                        <SelectItem key={major.id} value={String(major.id)}>
                            {major.display_name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </>
    );
}

export function DeanSectionsPage({
    course,
    majors,
    schoolYears,
    sections,
}: Props) {
    const portalRoutes = useDeanPortalRoutes();
    const isReadOnly = portalRoutes.readOnly;
    const [createOpen, setCreateOpen] = useState(false);
    const [editSection, setEditSection] = useState<Section | null>(null);
    const [activatingSectionId, setActivatingSectionId] = useState<number | null>(
        null,
    );
    const [filterSchoolYearId, setFilterSchoolYearId] = useState('all');
    const [createSchoolYearId, setCreateSchoolYearId] = useState('');
    const [createMajorId, setCreateMajorId] = useState('');
    const [editSchoolYearId, setEditSchoolYearId] = useState('');
    const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
    const [hasLoadedGroupState, setHasLoadedGroupState] = useState(false);

    useLayoutEffect(() => {
        const storedState = readStoredGroupState();
        setOpenGroups(storedState);
        setHasLoadedGroupState(true);
        console.log('Dean sections group state restored', storedState);
    }, []);

    const storeRoute = portalRoutes.sections.store();

    const activeSchoolYearId = useMemo(
        () => schoolYears.find((sy) => sy.is_active)?.id ?? schoolYears[0]?.id,
        [schoolYears],
    );

    const sectionGroups = useMemo(() => {
        const grouped = new Map<number, SectionGroup>();

        for (const section of sections) {
            const existing = grouped.get(section.school_year_id);

            if (existing) {
                existing.sections.push(section);
                continue;
            }

            grouped.set(section.school_year_id, {
                schoolYearId: section.school_year_id,
                schoolYearName: section.school_year?.name ?? 'Unknown',
                isActiveSchoolYear: section.school_year?.is_active ?? false,
                sections: [section],
            });
        }

        return Array.from(grouped.values()).sort((a, b) =>
            b.schoolYearName.localeCompare(a.schoolYearName),
        );
    }, [sections]);

    const filteredGroups = useMemo(() => {
        if (filterSchoolYearId === 'all') {
            return sectionGroups;
        }

        return sectionGroups.filter(
            (group) => String(group.schoolYearId) === filterSchoolYearId,
        );
    }, [filterSchoolYearId, sectionGroups]);

    const schoolYearsWithSections = useMemo(
        () =>
            schoolYears.filter((sy) =>
                sections.some((section) => section.school_year_id === sy.id),
            ),
        [schoolYears, sections],
    );

    console.log('Dean Sections page loaded', {
        course,
        majorsCount: majors.length,
        sectionsCount: sections.length,
        groupCount: sectionGroups.length,
        savedGroupState: openGroups,
    });

    const isProgramHead = course?.portal_role === 'program_head';
    const showMajorColumn =
        majors.length > 0 || sections.some((section) => section.course_major !== null);
    const requiresMajorOnCreate =
        !isProgramHead && majors.length > 0;

    const handleDeactivate = (section: Section) => {
        if (
            !confirm(
                `Deactivate ${section.display_name}? Students must be moved before deactivation.`,
            )
        ) {
            return;
        }

        router.delete(portalRoutes.sections.destroy(section.id).url, {
            preserveScroll: true,
        });
    };

    const handleActivate = (section: Section) => {
        console.log('Dean activate section', {
            sectionId: section.id,
            name: section.display_name,
        });

        setActivatingSectionId(section.id);
        router.patch(
            portalRoutes.sections.update(section.id).url,
            {
                school_year_id: section.school_year_id,
                name: section.name,
                code: section.code ?? '',
                is_active: '1',
            },
            {
                preserveScroll: true,
                onFinish: () => setActivatingSectionId(null),
            },
        );
    };

    const openCreateModal = () => {
        setCreateSchoolYearId(
            activeSchoolYearId ? String(activeSchoolYearId) : '',
        );
        setCreateMajorId(majors[0] ? String(majors[0].id) : '');
        setCreateOpen(true);
    };

    const openEditModal = (section: Section) => {
        setEditSection(section);
        setEditSchoolYearId(String(section.school_year_id));
    };

    const isGroupOpen = (group: SectionGroup) => {
        if (!hasLoadedGroupState) {
            return false;
        }

        if (openGroups[group.schoolYearId] !== undefined) {
            return openGroups[group.schoolYearId];
        }

        return group.isActiveSchoolYear;
    };

    const toggleGroup = (schoolYearId: number, open: boolean) => {
        setOpenGroups((current) => {
            const next = {
                ...current,
                [schoolYearId]: open,
            };

            persistGroupState(next);
            console.log('Dean sections group state saved', next);

            return next;
        });
    };

    const canAddSection = course !== null && schoolYears.length > 0 && !isReadOnly;

    return (
        <>
            <Head title="Sections" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Sections"
                    description={
                        course
                            ? isReadOnly
                                ? `View sections for ${course.major?.display_name ?? course.code}.`
                                : `Create sections for ${course.code} and assign them to a school year.`
                            : 'You need an assigned course before you can manage sections.'
                    }
                    icon={ListChecks}
                    badgeText={portalRoutes.badgeText}
                    action={
                        canAddSection ? (
                            <Button
                                onClick={openCreateModal}
                                className="bg-brand text-brand-foreground hover:bg-brand-hover"
                            >
                                <Plus className="mr-2 size-4" />
                                Add Section
                            </Button>
                        ) : undefined
                    }
                />

                {!course && (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No course is assigned to your dean account yet. Ask
                            the Super Admin to assign you to a course.
                        </CardContent>
                    </Card>
                )}

                {course && schoolYears.length === 0 && isReadOnly && (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No active school year is available to display sections yet.
                        </CardContent>
                    </Card>
                )}

                {course && schoolYears.length === 0 && !isReadOnly && (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No active school year found.{' '}
                            <Link
                                href={portalRoutes.schoolYears.index().url}
                                className="text-brand underline-offset-4 hover:underline"
                            >
                                Go to School Years and set one as active
                            </Link>
                            .
                        </CardContent>
                    </Card>
                )}

                {course && schoolYears.length > 0 && sections.length === 0 && (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            No sections yet. Click{' '}
                            <span className="font-medium text-foreground">
                                Add Section
                            </span>{' '}
                            to create one (e.g. 4A, 4B) and assign it to a school
                            year.
                        </CardContent>
                    </Card>
                )}

                {course && sections.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                {isReadOnly
                                    ? 'Sections grouped by school year. Expand a group to view section details.'
                                    : 'Sections grouped by school year. Expand a group to view or manage sections.'}
                            </p>
                            <div className="w-full sm:w-64">
                                <Label
                                    htmlFor="filter-school-year"
                                    className="mb-2 block text-sm"
                                >
                                    Filter by school year
                                </Label>
                                <Select
                                    value={filterSchoolYearId}
                                    onValueChange={setFilterSchoolYearId}
                                >
                                    <SelectTrigger
                                        id="filter-school-year"
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="All school years" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            All school years
                                        </SelectItem>
                                        {schoolYearsWithSections.map(
                                            (schoolYear) => (
                                                <SelectItem
                                                    key={schoolYear.id}
                                                    value={String(schoolYear.id)}
                                                >
                                                    {schoolYear.name}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {filteredGroups.length === 0 ? (
                            <Card className="border-sidebar-border/70">
                                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                                    No sections found for the selected school
                                    year.
                                </CardContent>
                            </Card>
                        ) : (
                            filteredGroups.map((group) => (
                                <Collapsible
                                    key={group.schoolYearId}
                                    open={isGroupOpen(group)}
                                    onOpenChange={(open) =>
                                        toggleGroup(group.schoolYearId, open)
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
                                                        <h3 className="font-semibold">
                                                            {course.code} sections
                                                            — {group.schoolYearName}
                                                        </h3>
                                                        {group.isActiveSchoolYear && (
                                                            <Badge className="bg-brand text-brand-foreground hover:bg-brand">
                                                                Active SY
                                                            </Badge>
                                                        )}
                                                        <Badge variant="secondary">
                                                            {group.sections.length}{' '}
                                                            {group.sections.length === 1
                                                                ? 'section'
                                                                : 'sections'}
                                                        </Badge>
                                                    </div>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        Click to expand or collapse
                                                    </p>
                                                </div>
                                                <ChevronDown
                                                    className={cn(
                                                        'size-5 shrink-0 text-muted-foreground transition-transform',
                                                        isGroupOpen(group) &&
                                                            'rotate-180',
                                                    )}
                                                />
                                            </button>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                            <div className="border-t">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b bg-muted/40 text-left">
                                                                <th className="px-4 py-3 font-medium">
                                                                    Section
                                                                </th>
                                                                <th className="px-4 py-3 font-medium">
                                                                    Code
                                                                </th>
                                                                {showMajorColumn && (
                                                                    <th className="px-4 py-3 font-medium">
                                                                        Program
                                                                    </th>
                                                                )}
                                                                <th className="px-4 py-3 font-medium">
                                                                    Students
                                                                </th>
                                                                <th className="px-4 py-3 font-medium">
                                                                    Status
                                                                </th>
                                                                {!isReadOnly ? (
                                                                    <th className="px-4 py-3 text-right font-medium">
                                                                        Actions
                                                                    </th>
                                                                ) : null}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {group.sections.map(
                                                                (section) => (
                                                                    <tr
                                                                        key={
                                                                            section.id
                                                                        }
                                                                        className="border-b last:border-0"
                                                                    >
                                                                        <td className="px-4 py-3 font-medium">
                                                                            {
                                                                                section.display_name
                                                                            }
                                                                        </td>
                                                                        <td className="px-4 py-3 text-muted-foreground">
                                                                            {section.code ??
                                                                                '—'}
                                                                        </td>
                                                                        {showMajorColumn && (
                                                                            <td className="px-4 py-3 text-muted-foreground">
                                                                                {section.course_major
                                                                                    ?.display_name ??
                                                                                    '—'}
                                                                            </td>
                                                                        )}
                                                                        <td className="px-4 py-3">
                                                                            {
                                                                                section.students_count
                                                                            }
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <Badge
                                                                                variant={
                                                                                    section.is_active
                                                                                        ? 'default'
                                                                                        : 'secondary'
                                                                                }
                                                                                className={
                                                                                    section.is_active
                                                                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
                                                                                        : ''
                                                                                }
                                                                            >
                                                                                {section.is_active
                                                                                    ? 'Active'
                                                                                    : 'Inactive'}
                                                                            </Badge>
                                                                        </td>
                                                                        {!isReadOnly ? (
                                                                            <td className="px-4 py-3">
                                                                                <div className="flex justify-end gap-2">
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        size="sm"
                                                                                        onClick={() =>
                                                                                            openEditModal(
                                                                                                section,
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <Pencil className="size-3.5" />
                                                                                    </Button>
                                                                                    {!section.is_active && (
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className="text-emerald-600 hover:text-emerald-700"
                                                                                            disabled={
                                                                                                activatingSectionId ===
                                                                                                section.id
                                                                                            }
                                                                                            onClick={() =>
                                                                                                handleActivate(
                                                                                                    section,
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            {activatingSectionId ===
                                                                                            section.id ? (
                                                                                                <Spinner className="size-3.5" />
                                                                                            ) : (
                                                                                                <CheckCircle className="size-3.5" />
                                                                                            )}
                                                                                            Activate
                                                                                        </Button>
                                                                                    )}
                                                                                    {section.is_active &&
                                                                                        section.students_count ===
                                                                                            0 && (
                                                                                            <Button
                                                                                                variant="outline"
                                                                                                size="sm"
                                                                                                className="text-red-600 hover:text-red-700"
                                                                                                onClick={() =>
                                                                                                    handleDeactivate(
                                                                                                        section,
                                                                                                    )
                                                                                                }
                                                                                            >
                                                                                                Deactivate
                                                                                            </Button>
                                                                                        )}
                                                                                </div>
                                                                            </td>
                                                                        ) : null}
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
                            ))
                        )}
                    </div>
                )}
            </div>

            {course && !isReadOnly && (
                <AppModal
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    title="Add Section"
                    description={`Create a section under ${course.code} and assign it to a school year.`}
                >
                    <Form
                        action={storeRoute.url}
                        method={storeRoute.method}
                        onSuccess={() => setCreateOpen(false)}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label>School year</Label>
                                    <SchoolYearSelect
                                        schoolYears={schoolYears}
                                        value={createSchoolYearId}
                                        onChange={setCreateSchoolYearId}
                                    />
                                    <InputError message={errors.school_year_id} />
                                </div>
                                {requiresMajorOnCreate && (
                                    <div className="grid gap-2">
                                        <Label>Program / major</Label>
                                        <MajorSelect
                                            majors={majors}
                                            value={createMajorId}
                                            onChange={setCreateMajorId}
                                        />
                                        <InputError
                                            message={errors.course_major_id}
                                        />
                                    </div>
                                )}
                                <div className="grid gap-2">
                                    <Label htmlFor="create-name">
                                        Section name
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-md border bg-muted px-3 py-2 text-sm">
                                            {course.code}
                                        </span>
                                        <Input
                                            id="create-name"
                                            name="name"
                                            required
                                            placeholder="4A"
                                            className="flex-1"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Example: 4A, 4B — displays as{' '}
                                        {course.code} 4A
                                    </p>
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="create-code">
                                        Section code (optional)
                                    </Label>
                                    <Input
                                        id="create-code"
                                        name="code"
                                        placeholder="4A"
                                    />
                                    <InputError message={errors.code} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="hidden"
                                        name="is_active"
                                        value="0"
                                    />
                                    <Checkbox
                                        id="create-is-active"
                                        name="is_active"
                                        value="1"
                                        defaultChecked
                                    />
                                    <Label htmlFor="create-is-active">
                                        Section is active
                                    </Label>
                                </div>
                                <InputError message={errors.is_active} />
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setCreateOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={
                                            processing
                                            || !createSchoolYearId
                                            || (requiresMajorOnCreate
                                                && !createMajorId)
                                        }
                                        className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                    >
                                        {processing && <Spinner />}
                                        Create Section
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </AppModal>
            )}

            {editSection && course && !isReadOnly && (
                <AppModal
                    open={!!editSection}
                    onOpenChange={(open) => !open && setEditSection(null)}
                    title="Edit Section"
                    description={`Update ${editSection.display_name}`}
                >
                    <Form
                        action={portalRoutes.sections.update(editSection.id).url}
                        method={portalRoutes.sections.update(editSection.id).method}
                        onSuccess={() => setEditSection(null)}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label>School year</Label>
                                    <SchoolYearSelect
                                        schoolYears={schoolYears}
                                        value={editSchoolYearId}
                                        onChange={setEditSchoolYearId}
                                    />
                                    <InputError message={errors.school_year_id} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-name">
                                        Section name
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-md border bg-muted px-3 py-2 text-sm">
                                            {course.code}
                                        </span>
                                        <Input
                                            id="edit-name"
                                            name="name"
                                            defaultValue={editSection.name}
                                            required
                                            className="flex-1"
                                        />
                                    </div>
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-code">
                                        Section code (optional)
                                    </Label>
                                    <Input
                                        id="edit-code"
                                        name="code"
                                        defaultValue={editSection.code ?? ''}
                                    />
                                    <InputError message={errors.code} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="hidden"
                                        name="is_active"
                                        value="0"
                                    />
                                    <Checkbox
                                        id="edit-is-active"
                                        name="is_active"
                                        value="1"
                                        defaultChecked={editSection.is_active}
                                    />
                                    <Label htmlFor="edit-is-active">
                                        Section is active
                                    </Label>
                                </div>
                                <InputError message={errors.is_active} />
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditSection(null)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={
                                            processing || !editSchoolYearId
                                        }
                                        className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                    >
                                        {processing && <Spinner />}
                                        Save changes
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </AppModal>
            )}
        </>
    );
}

export default function DeanSections(props: Props) {
    return (
        <DeanPortalRoutesProvider value={deanPortalRoutes}>
            <DeanSectionsPage {...props} />
        </DeanPortalRoutesProvider>
    );
}

DeanSections.layout = {
    breadcrumbs: [{ title: 'Sections', href: deanPortalRoutes.sections.index().url }],
};
