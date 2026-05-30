import { Head, usePage } from '@inertiajs/react';
import { Building2, Clock, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard as supervisorDashboard } from '@/routes/supervisors';
import type { Auth } from '@/types';

type Progress = {
    required_hours: number;
    rendered_hours: number;
    remaining_hours: number;
    percent_complete: number;
    time_log_count: number;
};

type InternRow = {
    id: number;
    full_name: string;
    student_number: string;
    section: {
        display_name: string;
        school_year: string | null | undefined;
    } | null;
    progress: Progress;
};

type Props = {
    auth: Auth;
    supervisor: {
        id: number;
        name: string;
        position_title: string | null;
        company: { id: number; name: string } | null;
        department: { id: number; name: string } | null;
    } | null;
    stats: {
        interns: number;
        total_rendered_hours: number;
    };
    interns: InternRow[];
};

export default function SupervisorDashboard() {
    const { auth, supervisor, stats, interns } = usePage<Props>().props;

    console.log('Supervisor dashboard loaded', {
        user: auth.user,
        supervisor,
        stats,
        internCount: interns.length,
    });

    return (
        <>
            <Head title="Supervisor Dashboard" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="rounded-2xl bg-brand p-6 text-brand-foreground shadow-lg md:p-8">
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                        Welcome back, {auth.user.name}
                    </h1>
                    <p className="mt-1 text-sm text-brand-foreground/80">
                        View rendered OJT hours for interns assigned to you by
                        the coordinator.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Company
                            </CardTitle>
                            <div className="rounded-lg bg-brand/15 p-2">
                                <Building2 className="size-4 text-brand" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {supervisor?.company ? (
                                <>
                                    <p className="text-lg font-semibold">
                                        {supervisor.company.name}
                                    </p>
                                    <CardDescription className="mt-1">
                                        {supervisor.department?.name ??
                                            'No department assigned'}
                                        {supervisor.position_title
                                            ? ` • ${supervisor.position_title}`
                                            : ''}
                                    </CardDescription>
                                </>
                            ) : (
                                <CardDescription>
                                    No supervisor profile found. Ask your dean to
                                    set up your account.
                                </CardDescription>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Assigned Interns
                            </CardTitle>
                            <div className="rounded-lg bg-brand/15 p-2">
                                <Users className="size-4 text-brand" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{stats.interns}</p>
                            <CardDescription className="mt-1">
                                Students under your supervision
                            </CardDescription>
                        </CardContent>
                    </Card>

                    <Card className="border-sidebar-border/70 shadow-sm sm:col-span-2 lg:col-span-1">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Total Rendered Hours
                            </CardTitle>
                            <div className="rounded-lg bg-brand/15 p-2">
                                <Clock className="size-4 text-brand" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">
                                {stats.total_rendered_hours.toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                })}
                            </p>
                            <CardDescription className="mt-1">
                                Combined hours from all assigned interns
                            </CardDescription>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-sidebar-border/70 shadow-sm">
                    <CardHeader>
                        <CardTitle>Assigned Interns</CardTitle>
                        <CardDescription>
                            Rendered hours are based on verified time logs.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {interns.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                No interns assigned to you yet. The coordinator
                                will assign students when they are placed at your
                                company.
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-lg border">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-left">
                                            <th className="px-4 py-3 font-medium">
                                                Intern
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Section
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Rendered Hours
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Progress
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {interns.map((intern) => (
                                            <tr
                                                key={intern.id}
                                                className="border-b last:border-b-0"
                                            >
                                                <td className="px-4 py-3">
                                                    <p className="font-medium">
                                                        {intern.full_name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {intern.student_number}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {intern.section ? (
                                                        <>
                                                            <p>
                                                                {
                                                                    intern.section
                                                                        .display_name
                                                                }
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {
                                                                    intern.section
                                                                        .school_year
                                                                }
                                                            </p>
                                                        </>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold">
                                                        {intern.progress.rendered_hours.toLocaleString(
                                                            undefined,
                                                            {
                                                                minimumFractionDigits: 0,
                                                                maximumFractionDigits: 2,
                                                            },
                                                        )}{' '}
                                                        /{' '}
                                                        {
                                                            intern.progress
                                                                .required_hours
                                                        }
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {
                                                            intern.progress
                                                                .remaining_hours
                                                        }{' '}
                                                        hrs remaining •{' '}
                                                        {
                                                            intern.progress
                                                                .time_log_count
                                                        }{' '}
                                                        log(s)
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex min-w-[140px] flex-col gap-1">
                                                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                                                            <div
                                                                className="h-full rounded-full bg-brand transition-all"
                                                                style={{
                                                                    width: `${Math.min(intern.progress.percent_complete, 100)}%`,
                                                                }}
                                                            />
                                                        </div>
                                                        <Badge
                                                            variant="secondary"
                                                            className="w-fit"
                                                        >
                                                            {
                                                                intern.progress
                                                                    .percent_complete
                                                            }
                                                            %
                                                        </Badge>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

SupervisorDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: supervisorDashboard(),
        },
    ],
};
