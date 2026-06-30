import { useEffect, useState } from 'react';
import { CalendarX2, ChevronDown } from 'lucide-react';
import { AppModal } from '@/components/superadmin/app-modal';
import { Badge } from '@/components/ui/badge';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export type AttendanceAbsenceEntry = {
    date: string;
    date_label: string;
    status: 'absent';
    status_label: string;
    rendered_hours: number;
    rendered_minutes: number;
    absence_id: number;
    reason: string | null;
    has_proof: boolean;
    proof_url: string | null;
    justification_submitted_at: string | null;
};

export type AttendanceJournal = {
    schedule_label: string | null;
    days_per_week: number | null;
    today: {
        date: string;
        date_label: string;
        status: string;
        status_label: string;
        rendered_hours: number;
        rendered_minutes: number;
    };
    absences: AttendanceAbsenceEntry[];
    absence_count: number;
    pending_justification_count: number;
};

type Props = {
    journal: AttendanceJournal;
};

function todayBadgeVariant(
    status: string,
): 'default' | 'secondary' | 'destructive' | 'outline' {
    if (status === 'present') {
        return 'default';
    }

    if (status === 'absent') {
        return 'destructive';
    }

    return 'secondary';
}

export function CoordinatorStudentAttendanceJournal({ journal }: Props) {
    const [open, setOpen] = useState(true);
    const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

    console.log('Coordinator attendance journal rendered', {
        absenceCount: journal.absence_count,
        todayStatus: journal.today.status,
        schedule: journal.schedule_label,
    });

    return (
        <>
            <Card className="border-sidebar-border/70 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <CalendarX2 className="size-5 text-brand" />
                                <CardTitle className="text-base">
                                    Attendance
                                </CardTitle>
                            </div>
                            <CardDescription>
                                {journal.schedule_label
                                    ? `Schedule: ${journal.schedule_label}`
                                    : 'Based on each student’s OJT schedule'}
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge
                                variant={todayBadgeVariant(journal.today.status)}
                                className={
                                    journal.today.status === 'present'
                                        ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                                        : undefined
                                }
                            >
                                Today: {journal.today.status_label}
                                {journal.today.status === 'present'
                                    ? ` · ${journal.today.rendered_hours} hr`
                                    : journal.today.status === 'absent'
                                      ? ' · 0 hr'
                                      : ''}
                            </Badge>
                            {journal.pending_justification_count > 0 ? (
                                <Badge variant="outline" className="border-amber-500 text-amber-700">
                                    {journal.pending_justification_count} pending reason
                                    {journal.pending_justification_count === 1 ? '' : 's'}
                                </Badge>
                            ) : null}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    {journal.absences.length === 0 ? (
                        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                            No absences recorded yet.
                        </div>
                    ) : (
                        <Collapsible open={open} onOpenChange={setOpen}>
                            <CollapsibleTrigger asChild>
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/40"
                                >
                                    <span className="font-medium">
                                        Absence history ({journal.absence_count})
                                    </span>
                                    <ChevronDown
                                        className={cn(
                                            'size-4 text-muted-foreground transition-transform',
                                            open && 'rotate-180',
                                        )}
                                    />
                                </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="mt-3 space-y-3">
                                    {journal.absences.map((entry) => (
                                        <div
                                            key={entry.absence_id}
                                            className="rounded-lg border bg-muted/20 px-3 py-2.5"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        {entry.date_label}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {entry.status_label} · 0 hr
                                                    </p>
                                                </div>
                                                {entry.reason ? (
                                                    <Badge variant="outline">
                                                        Justified
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary">
                                                        No reason yet
                                                    </Badge>
                                                )}
                                            </div>
                                            {entry.reason ? (
                                                <p className="mt-2 text-sm text-foreground">
                                                    {entry.reason}
                                                </p>
                                            ) : null}
                                            {entry.has_proof && entry.proof_url ? (
                                                <button
                                                    type="button"
                                                    className="mt-2 block"
                                                    onClick={() =>
                                                        setPreviewProofUrl(
                                                            entry.proof_url,
                                                        )
                                                    }
                                                >
                                                    <img
                                                        src={entry.proof_url}
                                                        alt="Absence proof"
                                                        className="size-14 rounded-md border object-cover"
                                                        loading="lazy"
                                                    />
                                                </button>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    )}
                </CardContent>
            </Card>

            <AppModal
                open={previewProofUrl !== null}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setPreviewProofUrl(null);
                    }
                }}
                title="Absence proof"
                description="Submitted by the intern."
                className="sm:max-w-3xl"
            >
                {previewProofUrl ? (
                    <div className="max-h-[70vh] overflow-auto p-4">
                        <img
                            src={previewProofUrl}
                            alt="Absence proof"
                            className="mx-auto max-h-[65vh] w-full rounded-lg object-contain"
                        />
                    </div>
                ) : null}
            </AppModal>
        </>
    );
}
