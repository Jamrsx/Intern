import { Form, Head, router, usePage } from '@inertiajs/react';
import { CalendarClock, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { AppModal } from '@/components/superadmin/app-modal';
import { PageHeader } from '@/components/superadmin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { destroy, store, update } from '@/routes/coordinators/document-requirements';

type RequirementRow = {
    id: number;
    title: string;
    description: string | null;
    deadline_at: string;
    accepted_file_types: 'pdf_only' | 'pdf_and_word';
    accepted_file_types_label: string;
    is_active: boolean;
    submitted_count: number;
    pending_count: number;
    student_count: number;
};

type Section = {
    id: number;
    display_name: string;
} | null;

type Props = {
    section: Section;
    requirements: RequirementRow[];
    student_count: number;
};

function formatDeadline(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function toDatetimeLocalValue(iso: string): string {
    const date = new Date(iso);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60 * 1000);

    return local.toISOString().slice(0, 16);
}

function defaultDeadlineLocal(): string {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setHours(23, 59, 0, 0);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60 * 1000);

    return local.toISOString().slice(0, 16);
}

export default function CoordinatorDocumentRequirements({
    section,
    requirements,
    student_count,
}: Props) {
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<RequirementRow | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    console.log('Coordinator document requirements loaded', {
        section,
        requirementCount: requirements.length,
        student_count,
    });

    const openCreateModal = () => {
        setEditing(null);
        setShowModal(true);
    };

    const openEditModal = (requirement: RequirementRow) => {
        setEditing(requirement);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditing(null);
    };

    const handleDelete = (requirement: RequirementRow) => {
        if (
            !confirm(
                `Remove "${requirement.title}"? Interns will no longer see this requirement in the app.`,
            )
        ) {
            return;
        }

        setDeletingId(requirement.id);
        router.delete(destroy(requirement.id).url, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    const isPastDeadline = (iso: string) => new Date(iso).getTime() < Date.now();

    return (
        <>
            <Head title="Document Requirements" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Document requirements"
                    description={
                        section
                            ? `Assign required documents for ${section.display_name}. Interns see these on the mobile Docs screen with deadlines.`
                            : 'You are not assigned to a section yet.'
                    }
                    icon={FileText}
                    badgeText="Coordinator"
                    action={
                        section ? (
                            <Button
                                type="button"
                                onClick={openCreateModal}
                                className="bg-brand text-brand-foreground hover:bg-brand-hover"
                            >
                                <Plus className="mr-2 size-4" />
                                New requirement
                            </Button>
                        ) : undefined
                    }
                />

                {!section ? (
                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardContent className="py-10 text-center text-muted-foreground">
                            Ask your dean to assign you to a section before you
                            can create document requirements.
                        </CardContent>
                    </Card>
                ) : requirements.length === 0 ? (
                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardContent className="py-10 text-center">
                            <p className="text-muted-foreground">
                                No document requirements yet. Create MOA, weekly
                                reports, or other files interns must submit.
                            </p>
                            <Button
                                type="button"
                                onClick={openCreateModal}
                                className="mt-4 bg-brand text-brand-foreground hover:bg-brand-hover"
                            >
                                <Plus className="mr-2 size-4" />
                                Create first requirement
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {requirements.map((requirement) => (
                            <Card
                                key={requirement.id}
                                className="border-sidebar-border/70 shadow-sm"
                            >
                                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-lg font-semibold">
                                                {requirement.title}
                                            </h3>
                                            {!requirement.is_active && (
                                                <Badge variant="secondary">
                                                    Inactive
                                                </Badge>
                                            )}
                                            {isPastDeadline(
                                                requirement.deadline_at,
                                            ) &&
                                            requirement.pending_count > 0 ? (
                                                <Badge variant="destructive">
                                                    Overdue
                                                </Badge>
                                            ) : null}
                                        </div>
                                        {requirement.description ? (
                                            <p className="text-sm text-muted-foreground">
                                                {requirement.description}
                                            </p>
                                        ) : null}
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <CalendarClock className="size-4 shrink-0 text-brand" />
                                            <span>
                                                Deadline:{' '}
                                                {formatDeadline(
                                                    requirement.deadline_at,
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            <Badge variant="outline">
                                                {requirement.accepted_file_types_label}
                                            </Badge>
                                            <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                                                {requirement.submitted_count}{' '}
                                                submitted
                                            </Badge>
                                            <Badge variant="secondary">
                                                {requirement.pending_count}{' '}
                                                pending
                                            </Badge>
                                            <Badge variant="outline">
                                                {student_count} interns
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                openEditModal(requirement)
                                            }
                                        >
                                            <Pencil className="mr-1 size-3.5" />
                                            Edit
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="text-destructive hover:text-destructive"
                                            disabled={
                                                deletingId === requirement.id
                                            }
                                            onClick={() =>
                                                handleDelete(requirement)
                                            }
                                        >
                                            {deletingId === requirement.id ? (
                                                <Spinner />
                                            ) : (
                                                <Trash2 className="mr-1 size-3.5" />
                                            )}
                                            Remove
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <AppModal
                open={showModal}
                onOpenChange={(open) => {
                    if (!open) {
                        closeModal();
                    }
                }}
                title={
                    editing
                        ? 'Edit document requirement'
                        : 'New document requirement'
                }
                description="Interns in your section will see this on the mobile Docs tab. Set a clear title and deadline."
            >
                <Form
                    action={
                        editing
                            ? update(editing.id)
                            : store()
                    }
                    method={editing ? 'put' : 'post'}
                    resetOnSuccess
                    onSuccess={() => closeModal()}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="title">Document name</Label>
                                <Input
                                    id="title"
                                    name="title"
                                    defaultValue={editing?.title ?? ''}
                                    placeholder="e.g. MOA, Week 1 Report"
                                    required
                                />
                                <InputError message={errors.title} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">
                                    Instructions (optional)
                                </Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    defaultValue={editing?.description ?? ''}
                                    placeholder="What should interns include in this file?"
                                    rows={3}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                                <InputError message={errors.description} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="accepted_file_types">
                                    Accepted file types
                                </Label>
                                <select
                                    id="accepted_file_types"
                                    name="accepted_file_types"
                                    defaultValue={
                                        editing?.accepted_file_types ??
                                        'pdf_and_word'
                                    }
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="pdf_and_word">
                                        PDF and Word (.pdf, .doc, .docx)
                                    </option>
                                    <option value="pdf_only">
                                        PDF only (.pdf)
                                    </option>
                                </select>
                                <p className="text-xs text-muted-foreground">
                                    Interns see this rule when uploading from
                                    the mobile Docs screen.
                                </p>
                                <InputError
                                    message={errors.accepted_file_types}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="deadline_at">Deadline</Label>
                                <Input
                                    id="deadline_at"
                                    name="deadline_at"
                                    type="datetime-local"
                                    defaultValue={
                                        editing
                                            ? toDatetimeLocalValue(
                                                  editing.deadline_at,
                                              )
                                            : defaultDeadlineLocal()
                                    }
                                    required
                                />
                                <InputError message={errors.deadline_at} />
                            </div>

                            {editing ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="hidden"
                                        name="is_active"
                                        value="0"
                                    />
                                    <input
                                        id="is_active"
                                        name="is_active"
                                        type="checkbox"
                                        value="1"
                                        defaultChecked={editing.is_active}
                                        className="size-4 rounded border-input"
                                    />
                                    <Label htmlFor="is_active">
                                        Visible to interns in the mobile app
                                    </Label>
                                </div>
                            ) : null}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={closeModal}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                >
                                    {processing ? (
                                        <Spinner />
                                    ) : editing ? (
                                        'Save changes'
                                    ) : (
                                        'Create requirement'
                                    )}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </AppModal>
        </>
    );
}
