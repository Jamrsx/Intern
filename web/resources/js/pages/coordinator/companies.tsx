import { Form, Head, Link, router } from '@inertiajs/react';
import { Archive, Building2, ChevronDown, Pencil, Plus } from 'lucide-react';
import { useLayoutEffect, useState } from 'react';
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
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
    create as createCompany,
    deactivated as deactivatedCompaniesIndex,
    destroy as destroyCompany,
    edit as editCompany,
    index as coordinatorCompaniesIndex,
} from '@/routes/coordinators/companies';
import {
    destroy as destroyDepartment,
    store as storeDepartment,
    update as updateDepartment,
} from '@/routes/coordinators/companies/departments';

type DepartmentRow = {
    id: number;
    name: string;
    is_active: boolean;
    students_count: number;
};

type CompanyRow = {
    id: number;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    geofence_radius_meters: number;
    geofence_enabled: boolean;
    contact_person: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    is_active: boolean;
    departments_count: number;
    supervisors_count: number;
    students_count: number;
    departments: DepartmentRow[];
};

type Section = {
    id: number;
    display_name: string;
} | null;

type Props = {
    section: Section;
    companies: CompanyRow[];
    deactivated_count: number;
};

const COMPANY_GROUP_STATE_KEY = 'coordinator-companies-group-state';

function formatGeofenceRadius(meters: number): string {
    if (meters >= 1000) {
        const km = meters / 1000;
        return km % 1 === 0 ? `${km} km` : `${km.toFixed(1)} km`;
    }

    return `${meters} m`;
}

function readStoredCompanyGroupState(): Record<number, boolean> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = localStorage.getItem(COMPANY_GROUP_STATE_KEY);

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

function persistCompanyGroupState(state: Record<number, boolean>): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(COMPANY_GROUP_STATE_KEY, JSON.stringify(state));
}

export default function CoordinatorCompanies({
    section,
    companies,
    deactivated_count,
}: Props) {
    const [addDepartmentCompany, setAddDepartmentCompany] =
        useState<CompanyRow | null>(null);
    const [editDepartment, setEditDepartment] = useState<{
        company: CompanyRow;
        department: DepartmentRow;
    } | null>(null);
    const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
    const [hasLoadedGroupState, setHasLoadedGroupState] = useState(false);

    useLayoutEffect(() => {
        const storedState = readStoredCompanyGroupState();
        setOpenGroups(storedState);
        setHasLoadedGroupState(true);
        console.log('Coordinator companies group state restored', storedState);
    }, []);

    console.log('Coordinator Companies page loaded', {
        section,
        count: companies.length,
        deactivated_count,
    });

    const isGroupOpen = (companyId: number) => {
        if (!hasLoadedGroupState) {
            return false;
        }

        if (openGroups[companyId] !== undefined) {
            return openGroups[companyId];
        }

        return true;
    };

    const toggleGroup = (companyId: number, open: boolean) => {
        setOpenGroups((current) => {
            const next = {
                ...current,
                [companyId]: open,
            };

            persistCompanyGroupState(next);
            console.log('Coordinator companies group state saved', next);

            return next;
        });
    };

    const handleDeactivateCompany = (company: CompanyRow) => {
        if (
            !confirm(
                `Deactivate ${company.name}? You cannot deactivate a company with active students assigned.`,
            )
        ) {
            return;
        }

        router.delete(destroyCompany(company.id).url, {
            preserveScroll: true,
        });
    };

    const handleDeactivateDepartment = (
        company: CompanyRow,
        department: DepartmentRow,
    ) => {
        if (
            !confirm(
                `Deactivate ${department.name} from ${company.name}? You cannot deactivate a department with active students assigned.`,
            )
        ) {
            return;
        }

        router.delete(
            destroyDepartment({ company: company.id, department: department.id })
                .url,
            { preserveScroll: true },
        );
    };

    return (
        <>
            <Head title="Companies" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Companies"
                    description={
                        section
                            ? `Create OJT companies, their address, and departments for ${section.display_name}.`
                            : 'You are not assigned to a section yet.'
                    }
                    icon={Building2}
                    badgeText="Coordinator"
                    action={
                        section ? (
                            <div className="flex flex-wrap gap-2">
                                <Button variant="outline" asChild>
                                    <Link href={deactivatedCompaniesIndex().url}>
                                        <Archive className="mr-2 size-4" />
                                        Deactivated
                                        {deactivated_count > 0 && (
                                            <Badge
                                                variant="secondary"
                                                className="ml-2"
                                            >
                                                {deactivated_count}
                                            </Badge>
                                        )}
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                >
                                    <Link href={createCompany().url}>
                                        <Plus className="mr-2 size-4" />
                                        Add Company
                                    </Link>
                                </Button>
                            </div>
                        ) : undefined
                    }
                />

                {!section ? (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-10 text-center text-muted-foreground">
                            Ask your dean to assign you to a section before you
                            can manage companies.
                        </CardContent>
                    </Card>
                ) : companies.length === 0 ? (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            No companies yet. Click{' '}
                            <span className="font-medium text-foreground">
                                Add Company
                            </span>{' '}
                            to register an OJT partner such as Opol LGU with
                            departments like HR.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Companies grouped with their departments. Expand a
                            company to manage departments or assign interns
                            later.
                        </p>

                        {companies.map((company) => (
                            <Collapsible
                                key={company.id}
                                open={isGroupOpen(company.id)}
                                onOpenChange={(open) =>
                                    toggleGroup(company.id, open)
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
                                                        {company.name}
                                                    </h3>
                                                    <Badge className="bg-brand text-brand-foreground hover:bg-brand">
                                                        {company.departments_count}{' '}
                                                        {company.departments_count ===
                                                        1
                                                            ? 'department'
                                                            : 'departments'}
                                                    </Badge>
                                                    {company.students_count >
                                                        0 && (
                                                        <Badge variant="secondary">
                                                            {company.students_count}{' '}
                                                            intern(s)
                                                        </Badge>
                                                    )}
                                                    {company.geofence_enabled &&
                                                    company.latitude !== null &&
                                                    company.longitude !==
                                                        null ? (
                                                        <Badge variant="outline">
                                                            Geofence{' '}
                                                            {formatGeofenceRadius(
                                                                company.geofence_radius_meters,
                                                            )}
                                                        </Badge>
                                                    ) : null}
                                                </div>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    {company.address ??
                                                        'No address provided'}
                                                </p>
                                            </div>
                                            <ChevronDown
                                                className={cn(
                                                    'size-5 shrink-0 text-muted-foreground transition-transform',
                                                    isGroupOpen(company.id) &&
                                                        'rotate-180',
                                                )}
                                            />
                                        </button>
                                    </CollapsibleTrigger>

                                    <CollapsibleContent>
                                        <div className="border-t px-4 py-4">
                                            <div className="mb-4 flex flex-wrap gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <Link
                                                        href={
                                                            editCompany(
                                                                company.id,
                                                            ).url
                                                        }
                                                    >
                                                        <Pencil className="mr-1 size-3.5" />
                                                        Edit Company
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setAddDepartmentCompany(
                                                            company,
                                                        )
                                                    }
                                                >
                                                    <Plus className="mr-1 size-3.5" />
                                                    Add Department
                                                </Button>
                                                {company.students_count ===
                                                    0 && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700"
                                                        onClick={() =>
                                                            handleDeactivateCompany(
                                                                company,
                                                            )
                                                        }
                                                    >
                                                        Deactivate
                                                    </Button>
                                                )}
                                            </div>

                                            <div className="overflow-x-auto rounded-lg border">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="border-b bg-muted/40 text-left">
                                                            <th className="px-4 py-3 font-medium">
                                                                Department
                                                            </th>
                                                            <th className="px-4 py-3 font-medium">
                                                                Interns
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
                                                        {company.departments
                                                            .length === 0 ? (
                                                            <tr>
                                                                <td
                                                                    colSpan={4}
                                                                    className="px-4 py-6 text-center text-muted-foreground"
                                                                >
                                                                    No
                                                                    departments
                                                                    yet.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            company.departments.map(
                                                                (department) => (
                                                                    <tr
                                                                        key={
                                                                            department.id
                                                                        }
                                                                        className="border-b last:border-0"
                                                                    >
                                                                        <td className="px-4 py-3 font-medium">
                                                                            {
                                                                                department.name
                                                                            }
                                                                        </td>
                                                                        <td className="px-4 py-3 text-muted-foreground">
                                                                            {
                                                                                department.students_count
                                                                            }
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <Badge
                                                                                variant={
                                                                                    department.is_active
                                                                                        ? 'default'
                                                                                        : 'secondary'
                                                                                }
                                                                                className={
                                                                                    department.is_active
                                                                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
                                                                                        : ''
                                                                                }
                                                                            >
                                                                                {department.is_active
                                                                                    ? 'Active'
                                                                                    : 'Inactive'}
                                                                            </Badge>
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <div className="flex justify-end gap-2">
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={() =>
                                                                                        setEditDepartment(
                                                                                            {
                                                                                                company,
                                                                                                department,
                                                                                            },
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <Pencil className="size-3.5" />
                                                                                </Button>
                                                                                {department.is_active &&
                                                                                    department.students_count ===
                                                                                        0 && (
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className="text-red-600 hover:text-red-700"
                                                                                            onClick={() =>
                                                                                                handleDeactivateDepartment(
                                                                                                    company,
                                                                                                    department,
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            Deactivate
                                                                                        </Button>
                                                                                    )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ),
                                                            )
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
            </div>

            {addDepartmentCompany && (
                <AppModal
                    open={!!addDepartmentCompany}
                    onOpenChange={(open) =>
                        !open && setAddDepartmentCompany(null)
                    }
                    title="Add Department"
                    description={`Add a department to ${addDepartmentCompany.name}`}
                >
                    <Form
                        action={
                            storeDepartment(addDepartmentCompany.id).url
                        }
                        method={storeDepartment(addDepartmentCompany.id).method}
                        onSuccess={() => setAddDepartmentCompany(null)}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="add-department-name">
                                        Department name
                                    </Label>
                                    <Input
                                        id="add-department-name"
                                        name="name"
                                        required
                                        placeholder="HR"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setAddDepartmentCompany(null)
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
                                        Add Department
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </AppModal>
            )}

            {editDepartment && (
                <AppModal
                    open={!!editDepartment}
                    onOpenChange={(open) => !open && setEditDepartment(null)}
                    title="Edit Department"
                    description={`Update ${editDepartment.department.name}`}
                >
                    <Form
                        action={
                            updateDepartment({
                                company: editDepartment.company.id,
                                department: editDepartment.department.id,
                            }).url
                        }
                        method={
                            updateDepartment({
                                company: editDepartment.company.id,
                                department: editDepartment.department.id,
                            }).method
                        }
                        onSuccess={() => setEditDepartment(null)}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-department-name">
                                        Department name
                                    </Label>
                                    <Input
                                        id="edit-department-name"
                                        name="name"
                                        defaultValue={
                                            editDepartment.department.name
                                        }
                                        required
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="hidden"
                                        name="is_active"
                                        value="0"
                                    />
                                    <Checkbox
                                        id="edit-department-active"
                                        name="is_active"
                                        value="1"
                                        defaultChecked={
                                            editDepartment.department.is_active
                                        }
                                    />
                                    <Label htmlFor="edit-department-active">
                                        Active department
                                    </Label>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditDepartment(null)}
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

CoordinatorCompanies.layout = {
    breadcrumbs: [{ title: 'Companies', href: coordinatorCompaniesIndex().url }],
};
