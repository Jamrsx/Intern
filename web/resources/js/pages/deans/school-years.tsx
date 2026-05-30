import { Form, Head, router } from '@inertiajs/react';
import { CalendarDays, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
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
import {
    activate,
    destroy,
    index as schoolYearsIndex,
    store,
    update,
} from '@/routes/deans/school-years';

type SchoolYear = {
    id: number;
    name: string;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    sections_count: number;
    created_at: string | null;
};

type Props = {
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

export default function DeanSchoolYears({ schoolYears }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editSchoolYear, setEditSchoolYear] = useState<SchoolYear | null>(
        null,
    );
    const storeRoute = store();

    console.log('Dean School Years page loaded', { count: schoolYears.length });

    const handleDeactivate = (schoolYear: SchoolYear) => {
        if (
            !confirm(
                `Deactivate ${schoolYear.name}? You cannot deactivate a school year that has sections.`,
            )
        ) {
            return;
        }

        router.delete(destroy(schoolYear.id).url, {
            preserveScroll: true,
        });
    };

    const handleActivate = (schoolYear: SchoolYear) => {
        router.patch(activate(schoolYear.id).url, {}, { preserveScroll: true });
    };

    return (
        <>
            <Head title="School Years" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="School Years"
                    description="Create school years and set which one is active for section and student management."
                    icon={CalendarDays}
                    badgeText="Dean"
                    action={
                        <Button
                            onClick={() => setCreateOpen(true)}
                            className="bg-brand text-brand-foreground hover:bg-brand-hover"
                        >
                            <Plus className="mr-2 size-4" />
                            Add School Year
                        </Button>
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
                                            Sections
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
                                                        {schoolYear.is_active &&
                                                            schoolYear.sections_count ===
                                                                0 && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-red-600 hover:text-red-700"
                                                                    onClick={() =>
                                                                        handleDeactivate(
                                                                            schoolYear,
                                                                        )
                                                                    }
                                                                >
                                                                    Deactivate
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
                                    value="0"
                                />
                                <Checkbox
                                    id="create-is-active"
                                    name="is_active"
                                    value="1"
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
                        action={update(editSchoolYear.id).url}
                        method={update(editSchoolYear.id).method}
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
                                        value="0"
                                    />
                                    <Checkbox
                                        id="edit-is-active"
                                        name="is_active"
                                        value="1"
                                        defaultChecked={
                                            editSchoolYear.is_active
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

DeanSchoolYears.layout = {
    breadcrumbs: [
        { title: 'School Years', href: schoolYearsIndex().url },
    ],
};
