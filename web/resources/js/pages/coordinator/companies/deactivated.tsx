import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, Building2, ChevronDown, RotateCcw } from 'lucide-react';
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
import { index as coordinatorCompaniesIndex, reactivate } from '@/routes/coordinators/companies';

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
    contact_person: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    is_active: boolean;
    departments_count: number;
    supervisors_count: number;
    students_count: number;
    departments: DepartmentRow[];
};

type Props = {
    companies: CompanyRow[];
};

const DEACTIVATED_GROUP_STATE_KEY = 'coordinator-deactivated-companies-group-state';

function readStoredGroupState(): Record<number, boolean> {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const raw = localStorage.getItem(DEACTIVATED_GROUP_STATE_KEY);

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

    localStorage.setItem(DEACTIVATED_GROUP_STATE_KEY, JSON.stringify(state));
}

export default function CoordinatorDeactivatedCompanies({ companies }: Props) {
    const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});
    const [hasLoadedGroupState, setHasLoadedGroupState] = useState(false);

    useLayoutEffect(() => {
        const storedState = readStoredGroupState();
        setOpenGroups(storedState);
        setHasLoadedGroupState(true);
        console.log('Coordinator deactivated companies group state restored', storedState);
    }, []);

    console.log('Coordinator Deactivated Companies page loaded', {
        count: companies.length,
    });

    const inactiveCompanies = useMemo(
        () => companies.filter((company) => !company.is_active),
        [companies],
    );

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

            persistGroupState(next);
            console.log('Coordinator deactivated companies group state saved', next);

            return next;
        });
    };

    const handleReactivate = (company: CompanyRow) => {
        if (
            !confirm(
                `Reactivate ${company.name}? All of its departments will be reactivated as well.`,
            )
        ) {
            return;
        }

        router.patch(reactivate(company.id).url, {}, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Deactivated Companies" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Deactivated Companies"
                    description="Review and restore OJT companies that were previously deactivated."
                    icon={Building2}
                    badgeText="Coordinator"
                    action={
                        <Button variant="outline" asChild>
                            <Link href={coordinatorCompaniesIndex().url}>
                                <ArrowLeft className="mr-2 size-4" />
                                Back to Companies
                            </Link>
                        </Button>
                    }
                />

                {inactiveCompanies.length === 0 ? (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            No deactivated companies. Deactivated partners will
                            appear here so you can restore them when needed.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            These companies are hidden from intern placement.
                            Reactivate a company to make it available again.
                        </p>

                        {inactiveCompanies.map((company) => (
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
                                                    <Badge variant="secondary">
                                                        Deactivated
                                                    </Badge>
                                                    <Badge variant="outline">
                                                        {company.departments_count}{' '}
                                                        {company.departments_count ===
                                                        1
                                                            ? 'department'
                                                            : 'departments'}
                                                    </Badge>
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
                                            <div className="mb-4">
                                                <Button
                                                    size="sm"
                                                    className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                                    onClick={() =>
                                                        handleReactivate(company)
                                                    }
                                                >
                                                    <RotateCcw className="mr-1 size-3.5" />
                                                    Reactivate Company
                                                </Button>
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
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {company.departments
                                                            .length === 0 ? (
                                                            <tr>
                                                                <td
                                                                    colSpan={3}
                                                                    className="px-4 py-6 text-center text-muted-foreground"
                                                                >
                                                                    No
                                                                    departments
                                                                    registered.
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            company.departments.map(
                                                                (department) => (
                                                                    <tr
                                                                        key={
                                                                            department.id
                                                                        }
                                                                        className="border-b last:border-b-0"
                                                                    >
                                                                        <td className="px-4 py-3">
                                                                            {
                                                                                department.name
                                                                            }
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            {
                                                                                department.students_count
                                                                            }
                                                                        </td>
                                                                        <td className="px-4 py-3">
                                                                            <Badge variant="secondary">
                                                                                Inactive
                                                                            </Badge>
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
        </>
    );
}
