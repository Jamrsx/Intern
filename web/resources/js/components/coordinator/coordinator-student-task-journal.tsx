import { useEffect, useMemo, useState } from 'react';
import { Camera, ChevronDown } from 'lucide-react';
import { AppModal } from '@/components/superadmin/app-modal';
import {
    persistTaskJournalOpenDays,
    resolveTaskJournalOpenDays,
} from '@/lib/coordinator-task-journal-state';
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

export type TaskPhotoItem = {
    id: number;
    original_filename: string;
    mime_type: string;
    file_size: number | null;
    submitted_at: string | null;
    image_url: string;
};

export type TaskPhotoSession = {
    time_log_id: number;
    session_period: 'morning' | 'afternoon';
    session_label: string;
    time_in: string;
    time_out: string | null;
    time_in_label: string;
    time_out_label: string | null;
    photos: TaskPhotoItem[];
};

export type TaskPhotoDay = {
    date: string;
    date_label: string;
    sessions: TaskPhotoSession[];
};

type Props = {
    studentId: number;
    days: TaskPhotoDay[];
    studentName: string;
};

function formatFileSize(bytes: number | null): string {
    if (bytes === null || bytes === 0) {
        return '';
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function dayPhotoCount(day: TaskPhotoDay): number {
    return day.sessions.reduce(
        (total, session) => total + session.photos.length,
        0,
    );
}

export function CoordinatorStudentTaskJournal({
    studentId,
    days,
    studentName,
}: Props) {
    const [previewPhoto, setPreviewPhoto] = useState<TaskPhotoItem | null>(
        null,
    );
    const [openDays, setOpenDays] = useState<Record<string, boolean>>(() =>
        resolveTaskJournalOpenDays(
            studentId,
            days.map((day) => day.date),
        ),
    );

    useEffect(() => {
        setOpenDays(
            resolveTaskJournalOpenDays(
                studentId,
                days.map((day) => day.date),
            ),
        );
    }, [studentId]);

    const totalPhotos = useMemo(
        () => days.reduce((total, day) => total + dayPhotoCount(day), 0),
        [days],
    );

    console.log('Coordinator student task journal rendered', {
        studentName,
        dayCount: days.length,
        photoCount: totalPhotos,
    });

    const toggleDay = (date: string, open: boolean) => {
        setOpenDays((current) => {
            const next = { ...current, [date]: open };
            persistTaskJournalOpenDays(studentId, next);
            console.log('Coordinator task journal day toggled', {
                studentId,
                date,
                open,
            });

            return next;
        });
    };

    return (
        <>
            <Card className="border-sidebar-border/70 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Camera className="size-5 text-brand" />
                        <CardTitle className="text-base">
                            Daily task photos
                        </CardTitle>
                    </div>
                    <CardDescription>
                        Tap a date to expand. Tap a thumbnail to view full
                        size.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    {days.length === 0 ? (
                        <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                            No task photos submitted yet.
                        </div>
                    ) : (
                        <div className="divide-y rounded-lg border">
                            {days.map((day) => {
                                const photosOnDay = dayPhotoCount(day);
                                const isOpen = openDays[day.date] ?? false;

                                return (
                                    <Collapsible
                                        key={day.date}
                                        open={isOpen}
                                        onOpenChange={(open) =>
                                            toggleDay(day.date, open)
                                        }
                                    >
                                        <CollapsibleTrigger asChild>
                                            <button
                                                type="button"
                                                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold">
                                                        {day.date_label}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {day.sessions.length}{' '}
                                                        session
                                                        {day.sessions.length ===
                                                        1
                                                            ? ''
                                                            : 's'}
                                                        {' · '}
                                                        {photosOnDay} photo
                                                        {photosOnDay === 1
                                                            ? ''
                                                            : 's'}
                                                    </p>
                                                </div>
                                                <ChevronDown
                                                    className={cn(
                                                        'size-4 shrink-0 text-muted-foreground transition-transform',
                                                        isOpen && 'rotate-180',
                                                    )}
                                                />
                                            </button>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                            <div className="space-y-3 border-t bg-muted/20 px-3 py-3">
                                                {day.sessions.map((session) => (
                                                    <div
                                                        key={
                                                            session.time_log_id
                                                        }
                                                        className="space-y-1.5"
                                                    >
                                                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                                            <p className="text-xs font-medium text-foreground">
                                                                {session.session_label.toLowerCase()}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {
                                                                    session.time_in_label
                                                                }
                                                                {session.time_out_label
                                                                    ? ` – ${session.time_out_label}`
                                                                    : ''}
                                                            </p>
                                                        </div>

                                                        <div className="flex flex-wrap gap-1.5">
                                                            {session.photos.map(
                                                                (photo) => (
                                                                    <button
                                                                        key={
                                                                            photo.id
                                                                        }
                                                                        type="button"
                                                                        title={`View ${photo.original_filename}`}
                                                                        className={cn(
                                                                            'group relative size-14 shrink-0 overflow-hidden rounded-md border bg-background text-left transition',
                                                                            'hover:border-brand hover:ring-2 hover:ring-brand/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                                                                        )}
                                                                        onClick={() => {
                                                                            console.log(
                                                                                'Coordinator task photo preview opened',
                                                                                {
                                                                                    photoId:
                                                                                        photo.id,
                                                                                },
                                                                            );
                                                                            setPreviewPhoto(
                                                                                photo,
                                                                            );
                                                                        }}
                                                                    >
                                                                        <img
                                                                            src={
                                                                                photo.image_url
                                                                            }
                                                                            alt={
                                                                                photo.original_filename
                                                                            }
                                                                            className="size-full object-cover"
                                                                            loading="lazy"
                                                                        />
                                                                    </button>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <AppModal
                open={previewPhoto !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPreviewPhoto(null);
                    }
                }}
                title={previewPhoto?.original_filename ?? 'Task photo'}
                description={
                    previewPhoto?.file_size
                        ? `${formatFileSize(previewPhoto.file_size)} · Submitted task image`
                        : 'Submitted task image from the intern mobile app.'
                }
                className="sm:max-w-3xl"
            >
                {previewPhoto ? (
                    <div className="max-h-[70vh] overflow-auto p-4">
                        <img
                            src={previewPhoto.image_url}
                            alt={previewPhoto.original_filename}
                            className="mx-auto max-h-[65vh] w-full rounded-lg object-contain"
                        />
                    </div>
                ) : null}
            </AppModal>
        </>
    );
}
