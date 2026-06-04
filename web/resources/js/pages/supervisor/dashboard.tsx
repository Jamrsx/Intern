import { Head, Link, router, usePage } from '@inertiajs/react';
import { Bell, Building2, ClipboardList, Clock, Users } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useEvaluationAlertPolling } from '@/hooks/use-evaluation-alert-polling';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { show as showEvaluation } from '@/routes/supervisors/evaluations';
import { dashboard as supervisorDashboard } from '@/routes/supervisors';
import type { Auth } from '@/types';

type Progress = {
    required_hours: number;
    rendered_hours: number;
    remaining_hours: number;
    percent_complete: number;
    time_log_count: number;
};

type PendingEvaluation = {
    id: number;
    opened_at: string;
    is_new?: boolean;
    template: {
        id: number;
        name: string;
        description: string | null;
        items: {
            id: number;
            item_type: 'rating_question' | 'text_area';
            label: string;
            is_required: boolean;
        }[];
    } | null;
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
    pending_evaluation: PendingEvaluation | null;
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
        pending_evaluations: number;
        new_evaluations?: number;
    };
    evaluation_alerts: {
        pending_count: number;
        new_count: number;
        has_unread: boolean;
    } | null;
    interns: InternRow[];
};

export default function SupervisorDashboard() {
    const { auth, supervisor, stats, interns, evaluation_alerts } =
        usePage<Props>().props;
    const hasShownEvaluationToast = useRef(false);

    useEvaluationAlertPolling({
        enabled: true,
        reloadKeys: ['evaluationAlerts', 'evaluation_alerts', 'interns', 'stats'],
    });

    useEffect(() => {
        if (
            hasShownEvaluationToast.current ||
            !evaluation_alerts?.has_unread
        ) {
            return;
        }

        hasShownEvaluationToast.current = true;

        toast.info(
            evaluation_alerts.new_count === 1
                ? '1 new evaluation assigned'
                : `${evaluation_alerts.new_count} new evaluations assigned`,
            {
                description:
                    'Your coordinator sent evaluation forms. Complete them from the table below.',
                duration: 6000,
            },
        );
    }, [evaluation_alerts]);

    const markPendingAlertsSeen = () => {
        router.post(
            '/supervisors/evaluation-alerts/pending/seen',
            {},
            {
                preserveScroll: true,
                only: ['evaluationAlerts', 'evaluation_alerts', 'interns', 'stats'],
                onSuccess: () => {
                    console.log('Supervisor marked pending evaluation alerts as seen');
                },
            },
        );
    };

    console.log('Supervisor dashboard loaded', {
        user: auth.user,
        supervisor,
        stats,
        internCount: interns.length,
        evaluation_alerts,
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
                        View rendered OJT hours and submit evaluations for
                        interns assigned to you.
                    </p>
                </div>

                {evaluation_alerts?.has_unread ? (
                    <div className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3 text-sm">
                            <Bell className="mt-0.5 size-5 shrink-0 text-amber-600" />
                            <div>
                                <p className="font-semibold text-amber-900">
                                    {evaluation_alerts.new_count === 1
                                        ? 'New evaluation to complete'
                                        : `${evaluation_alerts.new_count} new evaluations to complete`}
                                </p>
                                <p className="mt-1 text-muted-foreground">
                                    Look for the red dot next to each intern who
                                    needs your evaluation.
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 border-amber-600/30"
                            onClick={markPendingAlertsSeen}
                        >
                            Mark as seen
                        </Button>
                    </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Pending Evaluations
                            </CardTitle>
                            <div className="rounded-lg bg-amber-500/15 p-2">
                                <ClipboardList className="size-4 text-amber-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">
                                {stats.pending_evaluations}
                            </p>
                            <CardDescription className="mt-1">
                                Awaiting your submission
                            </CardDescription>
                        </CardContent>
                    </Card>

                    <Card className="border-sidebar-border/70 shadow-sm">
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
                            Submit evaluations when the coordinator opens one
                            for an intern.
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
                                            <th className="px-4 py-3 font-medium">
                                                Evaluation
                                            </th>
                                            <th className="px-4 py-3 text-right font-medium">
                                                Action
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
                                                        hrs remaining
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex min-w-[120px] flex-col gap-1">
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
                                                <td className="px-4 py-3">
                                                    {intern.pending_evaluation ? (
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <Badge variant="secondary">
                                                                    Pending
                                                                </Badge>
                                                                <span
                                                                    className="size-2.5 rounded-full bg-red-600"
                                                                    title="Pending evaluation"
                                                                />
                                                            </div>
                                                            {intern
                                                                .pending_evaluation
                                                                .template && (
                                                                <p className="mt-1 text-xs text-muted-foreground">
                                                                    {
                                                                        intern
                                                                            .pending_evaluation
                                                                            .template
                                                                            .name
                                                                    }
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {intern.pending_evaluation ? (
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                                        >
                                                            <Link
                                                                href={showEvaluation(
                                                                    intern
                                                                        .pending_evaluation
                                                                        .id,
                                                                )}
                                                                prefetch
                                                            >
                                                                Evaluate
                                                            </Link>
                                                        </Button>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">
                                                            No open evaluation
                                                        </span>
                                                    )}
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
