import { Form, Head, Link, router } from '@inertiajs/react';
import { Archive, CalendarDays, Pencil, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import { AppModal } from '@/components/superadmin/app-modal';
import { PageHeader } from '@/components/superadmin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { DeanPortalRoutesProvider, useDeanPortalRoutes } from '@/contexts/dean-portal-routes-context';
import { deanPortalRoutes } from '@/lib/dean-portal-routes';

type SchoolYear = {
    id: number;
    name: string;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    sections_count: number;
    created_at: string | null;
};

type Course = {
    id: number;
    code: string;
    name: string;
};

type Props = {
    course: Course | null;
    schoolYears: SchoolYear[];
};

function formatDateRange(start: string | null, end: string | null): string {
    if (!start && !end) {
        return '—';
    }

    if (start && end) {
        return `${start} to ${end}`;
    }

    return start ?? end ?? '—';
}

export function DeanSchoolYearsPage({ course, schoolYears }: Props) {
    const portalRoutes = useDeanPortalRoutes();
    const [createOpen, setCreateOpen] = useState(false);
    const [createIsActive, setCreateIsActive] = useState(false);
    const [editSchoolYear, setEditSchoolYear] = useState<SchoolYear | null>(
        null,
    );
    const [editIsActive, setEditIsActive] = useState(false);
    const storeRoute = portalRoutes.schoolYears.store();

    useEffect(() => {
        if (createOpen) {
            setCreateIsActive(false);
        }
    }, [createOpen]);

    useEffect(() => {
        if (editSchoolYear) {
            setEditIsActive(editSchoolYear.is_active);
        }
    }, [editSchoolYear]);

    const inactiveCount = schoolYears.filter(
        (schoolYear) => !schoolYear.is_active,
    ).length;

    console.log('Dean School Years page loaded', {
        course,
        count: schoolYears.length,
        inactiveCount,
    });

    const handleCloseSchoolYear = (schoolYear: SchoolYear) => {
        if (
            !confirm(
                `Close ${schoolYear.name}? All sections and student accounts under this school year will be set to inactive.`,
            )
        ) {
            return;
        }

        console.log('Closing school year', schoolYear.id, schoolYear.name);

        router.delete(portalRoutes.schoolYears.destroy(schoolYear.id).url, {
            preserveScroll: true,
        });
    };

    const handleActivate = (schoolYear: SchoolYear) => {
        router.patch(portalRoutes.schoolYears.activate(schoolYear.id).url, {}, { preserveScroll: true });
    };

    return (
        <>
            <Head title="School Years" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="School Years"
                    description="Create school years and set which one is active for section and student management."
                    icon={CalendarDays}
                    badgeText={portalRoutes.badgeText}
                    action={
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" asChild>
                                <Link href={portalRoutes.schoolYears.archive().url}>
                                    <Archive className="mr-2 size-4" />
                                    View archived
                                    {inactiveCount > 0
                                        ? ` (${inactiveCount})`
                                        : ''}
                                </Link>
                            </Button>
                            <Button
                                onClick={() => setCreateOpen(true)}
                                className="bg-brand text-brand-foreground hover:bg-brand-hover"
                            >
                                <Plus className="mr-2 size-4" />
                                Add School Year
                            </Button>
                        </div>
                    }
                />

                <Card className="border-sidebar-border/70">
                    <CardHeader>
                        <CardTitle>
                            School years ({schoolYears.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-left">
                                        <th className="px-4 py-3 font-medium">
                                            School year
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Date range
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            {course
                                                ? `${course.code} sections`
                                                : 'Sections'}
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
                                    {schoolYears.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-4 py-8 text-center text-muted-foreground"
                                            >
                                                No school years yet. Click Add
                                                School Year to create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        schoolYears.map((schoolYear) => (
                                            <tr
                                                key={schoolYear.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="px-4 py-3 font-medium">
                                                    {schoolYear.name}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {formatDateRange(
                                                        schoolYear.start_date,
                                                        schoolYear.end_date,
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {schoolYear.sections_count}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge
                                                        variant={
                                                            schoolYear.is_active
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                        className={
                                                            schoolYear.is_active
                                                                ? 'bg-brand text-brand-foreground hover:bg-brand'
                                                                : ''
                                                        }
                                                    >
                                                        {schoolYear.is_active
                                                            ? 'Active'
                                                            : 'Inactive'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        {!schoolYear.is_active && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleActivate(
                                                                        schoolYear,
                                                                    )
                                                                }
                                                            >
                                                                Set active
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                setEditSchoolYear(
                                                                    schoolYear,
                                                                )
                                                            }
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </Button>
                                                        {schoolYear.is_active && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-700"
                                                                onClick={() =>
                                                                    handleCloseSchoolYear(
                                                                        schoolYear,
                                                                    )
                                                                }
                                                            >
                                                                Close school year
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <AppModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                title="Add School Year"
                description="Create a new school year for sections and student assignments."
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
                                <Label htmlFor="create-name">
                                    School year
                                </Label>
                                <Input
                                    id="create-name"
                                    name="name"
                                    required
                                    placeholder="2025-2026"
                                    pattern="\d{4}-\d{4}"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Format: YYYY-YYYY (e.g. 2025-2026)
                                </p>
                                <InputError message={errors.name} />
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="create-start-date">
                                        Start date (optional)
                                    </Label>
                                    <Input
                                        id="create-start-date"
                                        name="start_date"
                                        type="date"
                                    />
                                    <InputError message={errors.start_date} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="create-end-date">
                                        End date (optional)
                                    </Label>
                                    <Input
                                        id="create-end-date"
                                        name="end_date"
                                        type="date"
                                    />
                                    <InputError message={errors.end_date} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="hidden"
                                    name="is_active"
                                    value={createIsActive ? '1' : '0'}
                                />
                                <Checkbox
                                    id="create-is-active"
                                    checked={createIsActive}
                                    onCheckedChange={(checked) =>
                                        setCreateIsActive(checked === true)
                                    }
                                />
                                <Label htmlFor="create-is-active">
                                    Set as active school year
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
                                    disabled={processing}
                                    className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                >
                                    {processing && <Spinner />}
                                    Create
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </AppModal>

            {editSchoolYear && (
                <AppModal
                    open={!!editSchoolYear}
                    onOpenChange={(open) => !open && setEditSchoolYear(null)}
                    title="Edit School Year"
                    description={`Update ${editSchoolYear.name}`}
                >
                    <Form
                        action={portalRoutes.schoolYears.update(editSchoolYear.id).url}
                        method={portalRoutes.schoolYears.update(editSchoolYear.id).method}
                        onSuccess={() => setEditSchoolYear(null)}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-name">
                                        School year
                                    </Label>
                                    <Input
                                        id="edit-name"
                                        name="name"
                                        defaultValue={editSchoolYear.name}
                                        required
                                        pattern="\d{4}-\d{4}"
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-start-date">
                                            Start date
                                        </Label>
                                        <Input
                                            id="edit-start-date"
                                            name="start_date"
                                            type="date"
                                            defaultValue={
                                                editSchoolYear.start_date ??
                                                undefined
                                            }
                                        />
                                        <InputError
                                            message={errors.start_date}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="edit-end-date">
                                            End date
                                        </Label>
                                        <Input
                                            id="edit-end-date"
                                            name="end_date"
                                            type="date"
                                            defaultValue={
                                                editSchoolYear.end_date ??
                                                undefined
                                            }
                                        />
                                        <InputError message={errors.end_date} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="hidden"
                                        name="is_active"
                                        value={editIsActive ? '1' : '0'}
                                    />
                                    <Checkbox
                                        id="edit-is-active"
                                        checked={editIsActive}
                                        onCheckedChange={(checked) =>
                                            setEditIsActive(checked === true)
                                        }
                                    />
                                    <Label htmlFor="edit-is-active">
                                        Active school year
                                    </Label>
                                </div>
                                <InputError message={errors.is_active} />
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setEditSchoolYear(null)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={processing}
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

export default function DeanSchoolYears(props: Props) {
    return (
        <DeanPortalRoutesProvider value={deanPortalRoutes}>
            <DeanSchoolYearsPage {...props} />
        </DeanPortalRoutesProvider>
    );
}

DeanSchoolYears.layout = {
    breadcrumbs: [
        { title: 'School Years', href: deanPortalRoutes.schoolYears.index().url },
    ],
};
