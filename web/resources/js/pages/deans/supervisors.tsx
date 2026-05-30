import { Form, Head, Link, router } from '@inertiajs/react';
import { BookOpen, ChevronDown, Pencil, Plus } from 'lucide-react';
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
import { index as deanCompaniesIndex } from '@/routes/deans/companies';
import {
    destroy,
    index as deanSupervisorsIndex,
    store,
    update,
} from '@/routes/deans/supervisors';

type CompanyOption = {
    id: number;
    name: string;
    departments: { id: number; name: string }[];
};

type SupervisorRow = {
    id: number;
    name: string;
    email: string;
    company_id: number;
    company: { id: number; name: string } | null;
    department_id: number | null;
    department: { id: number; name: string } | null;
    position_title: string | null;
    students_count: number;
    is_active: boolean;
};

type SupervisorGroup = {
    companyId: number;
    companyName: string;
    supervisors: SupervisorRow[];
};

type Props = {
    companies: CompanyOption[];
    supervisors: SupervisorRow[];
};

const SUPERVISOR_GROUP_STATE_KEY = 'dean-supervisors-group-state';

function readStoredSupervisorGroupState(): Record<number, boolean> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = localStorage.getItem(SUPERVISOR_GROUP_STATE_KEY);

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

function persistSupervisorGroupState(state: Record<number, boolean>): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.setItem(SUPERVISOR_GROUP_STATE_KEY, JSON.stringify(state));
}

function CompanySelect({
    companies,
    value,
    onChange,
    name = 'company_id',
}: {
    companies: CompanyOption[];
    value: string;
    onChange: (value: string) => void;
    name?: string;
}) {
    return (
        <>
            <input type="hidden" name={name} value={value} />
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent>
                    {companies.map((company) => (
                        <SelectItem key={company.id} value={String(company.id)}>
                            {company.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </>
    );
}

function DepartmentSelect({
    departments,
    value,
    onChange,
    name = 'department_id',
}: {
    departments: { id: number; name: string }[];
    value: string;
    onChange: (value: string) => void;
    name?: string;
}) {
    return (
        <>
            <input
                type="hidden"
                name={name}
                value={value === 'none' ? '' : value}
            />
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department (optional)" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No department</SelectItem>
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
        </>
    );
}

export default function DeanSupervisors({ companies, supervisors }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editSupervisor, setEditSupervisor] = useState<SupervisorRow | null>(
        null,
    );
    const [createCompanyId, setCreateCompanyId] = useState('');
    const [createDepartmentId, setCreateDepartmentId] = useState('none');
    const [editCompanyId, setEditCompanyId] = useState('');
    const [editDepartmentId, setEditDepartmentId] = useState('none');
    const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
    const [hasLoadedGroupState, setHasLoadedGroupState] = useState(false);

    const storeRoute = store();

    useLayoutEffect(() => {
        const storedState = readStoredSupervisorGroupState();
        setOpenGroups(storedState);
        setHasLoadedGroupState(true);
        console.log('Dean supervisors group state restored', storedState);
    }, []);

    console.log('Dean Supervisors page loaded', {
        companiesCount: companies.length,
        supervisorsCount: supervisors.length,
    });

    const activeSupervisors = useMemo(
        () => supervisors.filter((supervisor) => supervisor.is_active),
        [supervisors],
    );

    const supervisorGroups = useMemo(() => {
        const grouped = new Map<number, SupervisorGroup>();

        for (const supervisor of activeSupervisors) {
            const existing = grouped.get(supervisor.company_id);

            if (existing) {
                existing.supervisors.push(supervisor);
                continue;
            }

            grouped.set(supervisor.company_id, {
                companyId: supervisor.company_id,
                companyName: supervisor.company?.name ?? 'Unknown company',
                supervisors: [supervisor],
            });
        }

        return Array.from(grouped.values()).sort((a, b) =>
            a.companyName.localeCompare(b.companyName),
        );
    }, [activeSupervisors]);

    const createDepartments = useMemo(() => {
        if (!createCompanyId) {
            return [];
        }

        return (
            companies.find((company) => company.id === Number(createCompanyId))
                ?.departments ?? []
        );
    }, [companies, createCompanyId]);

    const editDepartments = useMemo(() => {
        if (!editCompanyId) {
            return [];
        }

        return (
            companies.find((company) => company.id === Number(editCompanyId))
                ?.departments ?? []
        );
    }, [companies, editCompanyId]);

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

            persistSupervisorGroupState(next);
            console.log('Dean supervisors group state saved', next);

            return next;
        });
    };

    const openCreateModal = () => {
        setCreateCompanyId(String(companies[0]?.id ?? ''));
        setCreateDepartmentId('none');
        setCreateOpen(true);
    };

    const openEditModal = (supervisor: SupervisorRow) => {
        setEditSupervisor(supervisor);
        setEditCompanyId(String(supervisor.company_id));
        setEditDepartmentId(
            supervisor.department_id ? String(supervisor.department_id) : 'none',
        );
    };

    const handleDeactivate = (supervisor: SupervisorRow) => {
        if (
            !confirm(
                `Deactivate ${supervisor.name}? You cannot deactivate a supervisor with active interns assigned.`,
            )
        ) {
            return;
        }

        router.delete(destroy(supervisor.id).url, { preserveScroll: true });
    };

    const canManageSupervisors = companies.length > 0;

    return (
        <>
            <Head title="Supervisors" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Supervisors"
                    description="Create supervisor accounts and assign them to company departments."
                    icon={BookOpen}
                    badgeText="Dean"
                    action={
                        canManageSupervisors ? (
                            <Button
                                onClick={openCreateModal}
                                className="bg-brand text-brand-foreground hover:bg-brand-hover"
                            >
                                <Plus className="mr-2 size-4" />
                                Add Supervisor
                            </Button>
                        ) : undefined
                    }
                />

                {companies.length === 0 && (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No active companies found.{' '}
                            <Link
                                href={deanCompaniesIndex().url}
                                className="text-brand underline-offset-4 hover:underline"
                            >
                                Create a company first
                            </Link>
                            .
                        </CardContent>
                    </Card>
                )}

                {companies.length > 0 && activeSupervisors.length === 0 && (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            No supervisors yet. Click{' '}
                            <span className="font-medium text-foreground">
                                Add Supervisor
                            </span>{' '}
                            to create an OJT supervisor account for a company
                            department.
                        </CardContent>
                    </Card>
                )}

                {activeSupervisors.length > 0 && (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Supervisors grouped by company. Assign them when
                            editing intern OJT details on the Students page.
                        </p>

                        {supervisorGroups.map((group) => (
                            <Collapsible
                                key={group.companyId}
                                open={isGroupOpen(group.companyId)}
                                onOpenChange={(open) =>
                                    toggleGroup(group.companyId, open)
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
                                                        {group.companyName}
                                                    </h3>
                                                    <Badge className="bg-brand text-brand-foreground hover:bg-brand">
                                                        {group.supervisors.length}{' '}
                                                        {group.supervisors.length ===
                                                        1
                                                            ? 'supervisor'
                                                            : 'supervisors'}
                                                    </Badge>
                                                </div>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    Click to expand or collapse
                                                </p>
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
                                        <div className="overflow-x-auto border-t">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b bg-muted/40 text-left">
                                                        <th className="px-4 py-3 font-medium">
                                                            Supervisor
                                                        </th>
                                                        <th className="px-4 py-3 font-medium">
                                                            Department
                                                        </th>
                                                        <th className="px-4 py-3 font-medium">
                                                            Position
                                                        </th>
                                                        <th className="px-4 py-3 font-medium">
                                                            Interns
                                                        </th>
                                                        <th className="px-4 py-3 text-right font-medium">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.supervisors.map(
                                                        (supervisor) => (
                                                            <tr
                                                                key={
                                                                    supervisor.id
                                                                }
                                                                className="border-b last:border-0"
                                                            >
                                                                <td className="px-4 py-3">
                                                                    <div className="font-medium">
                                                                        {
                                                                            supervisor.name
                                                                        }
                                                                    </div>
                                                                    <div className="text-xs text-muted-foreground">
                                                                        {
                                                                            supervisor.email
                                                                        }
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {supervisor
                                                                        .department
                                                                        ?.name ?? (
                                                                        <span className="text-muted-foreground">
                                                                            Not
                                                                            assigned
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-muted-foreground">
                                                                    {supervisor.position_title ??
                                                                        '—'}
                                                                </td>
                                                                <td className="px-4 py-3 text-muted-foreground">
                                                                    {
                                                                        supervisor.students_count
                                                                    }
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() =>
                                                                                openEditModal(
                                                                                    supervisor,
                                                                                )
                                                                            }
                                                                        >
                                                                            <Pencil className="size-3.5" />
                                                                        </Button>
                                                                        {supervisor.students_count ===
                                                                            0 && (
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="text-red-600 hover:text-red-700"
                                                                                onClick={() =>
                                                                                    handleDeactivate(
                                                                                        supervisor,
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
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CollapsibleContent>
                                </Card>
                            </Collapsible>
                        ))}
                    </div>
                )}
            </div>

            {canManageSupervisors && (
                <AppModal
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    title="Add Supervisor"
                    description="Create a supervisor login and assign them to a company department."
                    className="sm:max-w-xl"
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
                                    <Label htmlFor="create-supervisor-name">
                                        Full name
                                    </Label>
                                    <Input
                                        id="create-supervisor-name"
                                        name="name"
                                        required
                                        placeholder="Juan Dela Cruz"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="create-supervisor-email">
                                        Email
                                    </Label>
                                    <Input
                                        id="create-supervisor-email"
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="supervisor@gmail.com"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Company</Label>
                                    <CompanySelect
                                        companies={companies}
                                        value={createCompanyId}
                                        onChange={(value) => {
                                            setCreateCompanyId(value);
                                            setCreateDepartmentId('none');
                                        }}
                                    />
                                    <InputError message={errors.company_id} />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Department</Label>
                                    <DepartmentSelect
                                        departments={createDepartments}
                                        value={createDepartmentId}
                                        onChange={setCreateDepartmentId}
                                    />
                                    <InputError
                                        message={errors.department_id}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="create-position-title">
                                        Position title (optional)
                                    </Label>
                                    <Input
                                        id="create-position-title"
                                        name="position_title"
                                        placeholder="HR Supervisor"
                                    />
                                    <InputError
                                        message={errors.position_title}
                                    />
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    A temporary password will be generated and
                                    shown after creation.
                                </p>

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
                                            processing || !createCompanyId
                                        }
                                        className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                    >
                                        {processing && <Spinner />}
                                        Create Supervisor
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </AppModal>
            )}

            {editSupervisor && (
                <AppModal
                    open={!!editSupervisor}
                    onOpenChange={(open) => !open && setEditSupervisor(null)}
                    title="Edit Supervisor"
                    description={`Update ${editSupervisor.name}`}
                    className="sm:max-w-xl"
                >
                    <Form
                        action={update(editSupervisor.id).url}
                        method={update(editSupervisor.id).method}
                        onSuccess={() => setEditSupervisor(null)}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-supervisor-name">
                                        Full name
                                    </Label>
                                    <Input
                                        id="edit-supervisor-name"
                                        name="name"
                                        defaultValue={editSupervisor.name}
                                        required
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-supervisor-email">
                                        Email
                                    </Label>
                                    <Input
                                        id="edit-supervisor-email"
                                        name="email"
                                        type="email"
                                        defaultValue={editSupervisor.email}
                                        required
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Company</Label>
                                    <CompanySelect
                                        companies={companies}
                                        value={editCompanyId}
                                        onChange={(value) => {
                                            setEditCompanyId(value);
                                            setEditDepartmentId('none');
                                        }}
                                    />
                                    <InputError message={errors.company_id} />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Department</Label>
                                    <DepartmentSelect
                                        departments={editDepartments}
                                        value={editDepartmentId}
                                        onChange={setEditDepartmentId}
                                    />
                                    <InputError
                                        message={errors.department_id}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-position-title">
                                        Position title
                                    </Label>
                                    <Input
                                        id="edit-position-title"
                                        name="position_title"
                                        defaultValue={
                                            editSupervisor.position_title ??
                                            ''
                                        }
                                        placeholder="HR Supervisor"
                                    />
                                    <InputError
                                        message={errors.position_title}
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="hidden"
                                        name="is_active"
                                        value="0"
                                    />
                                    <Checkbox
                                        id="edit-supervisor-active"
                                        name="is_active"
                                        value="1"
                                        defaultChecked={
                                            editSupervisor.is_active
                                        }
                                    />
                                    <Label htmlFor="edit-supervisor-active">
                                        Active supervisor
                                    </Label>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setEditSupervisor(null)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={
                                            processing || !editCompanyId
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

DeanSupervisors.layout = {
    breadcrumbs: [{ title: 'Supervisors', href: deanSupervisorsIndex().url }],
};
