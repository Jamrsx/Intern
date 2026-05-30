import { Form, Head, usePage } from '@inertiajs/react';
import { Building2, ClipboardList, Clock, Users } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { AppModal } from '@/components/superadmin/app-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { update as submitEvaluation } from '@/routes/supervisors/evaluations';
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
    };
    interns: InternRow[];
};

export default function SupervisorDashboard() {
    const { auth, supervisor, stats, interns } = usePage<Props>().props;
    const [evaluateIntern, setEvaluateIntern] = useState<InternRow | null>(null);
    const [rating, setRating] = useState('3');
    const [evaluationDate, setEvaluationDate] = useState(
        new Date().toISOString().slice(0, 10),
    );

    console.log('Supervisor dashboard loaded', {
        user: auth.user,
        supervisor,
        stats,
        internCount: interns.length,
    });

    const openEvaluationModal = (intern: InternRow) => {
        setEvaluateIntern(intern);
        setRating('3');
        setEvaluationDate(new Date().toISOString().slice(0, 10));
        console.log('Supervisor evaluation modal opened', {
            internId: intern.id,
            evaluationId: intern.pending_evaluation?.id,
        });
    };

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
                                Awaiting your rating
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
                                                        <Badge variant="secondary">
                                                            Pending
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {intern.pending_evaluation ? (
                                                        <Button
                                                            size="sm"
                                                            className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                                            onClick={() =>
                                                                openEvaluationModal(
                                                                    intern,
                                                                )
                                                            }
                                                        >
                                                            Evaluate
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

            {evaluateIntern?.pending_evaluation && (
                <AppModal
                    open={evaluateIntern !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setEvaluateIntern(null);
                        }
                    }}
                    title={`Evaluate ${evaluateIntern.full_name}`}
                    description="Provide a rating, comments, and evaluation date for this intern."
                    className="sm:max-w-lg"
                >
                    <Form
                        action={submitEvaluation(
                            evaluateIntern.pending_evaluation.id,
                        ).url}
                        method={
                            submitEvaluation(
                                evaluateIntern.pending_evaluation.id,
                            ).method
                        }
                        options={{ preserveScroll: true }}
                        onSuccess={() => setEvaluateIntern(null)}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="rating">Rating</Label>
                                    <input
                                        type="hidden"
                                        name="rating"
                                        value={rating}
                                    />
                                    <Select
                                        value={rating}
                                        onValueChange={setRating}
                                    >
                                        <SelectTrigger id="rating">
                                            <SelectValue placeholder="Select rating" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5">
                                                5 - Outstanding
                                            </SelectItem>
                                            <SelectItem value="4">
                                                4 - Very Good
                                            </SelectItem>
                                            <SelectItem value="3">
                                                3 - Satisfactory
                                            </SelectItem>
                                            <SelectItem value="2">
                                                2 - Needs Improvement
                                            </SelectItem>
                                            <SelectItem value="1">
                                                1 - Poor
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.rating} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="evaluation_date">
                                        Evaluation Date
                                    </Label>
                                    <Input
                                        id="evaluation_date"
                                        type="date"
                                        name="evaluation_date"
                                        value={evaluationDate}
                                        max={new Date()
                                            .toISOString()
                                            .slice(0, 10)}
                                        onChange={(event) =>
                                            setEvaluationDate(event.target.value)
                                        }
                                    />
                                    <InputError
                                        message={errors.evaluation_date}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="comments">Comments</Label>
                                    <textarea
                                        id="comments"
                                        name="comments"
                                        rows={4}
                                        placeholder="Describe the intern's performance, strengths, and areas for improvement."
                                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    />
                                    <InputError message={errors.comments} />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setEvaluateIntern(null)
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
                                        Submit evaluation
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

SupervisorDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: supervisorDashboard(),
        },
    ],
};
