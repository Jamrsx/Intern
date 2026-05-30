import { Form, Head, Link, router } from '@inertiajs/react';
import { Mail, Pencil, Plus, UserCog } from 'lucide-react';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { AppModal } from '@/components/superadmin/app-modal';
import { PageHeader } from '@/components/superadmin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
    destroy,
    index as deanCoordinatorsIndex,
    mailCredentials,
    store,
    update,
} from '@/routes/deans/coordinators';
import { index as sectionsIndex } from '@/routes/deans/sections';

type Course = {
    id: number;
    code: string;
    name: string;
};

type SectionOption = {
    id: number;
    name: string;
    display_name: string;
    school_year: string | null | undefined;
    has_coordinator: boolean;
};

type CoordinatorRow = {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    section_id: number | null;
    section: {
        id: number;
        display_name: string;
        school_year: string | null | undefined;
    } | null;
};

type Props = {
    course: Course | null;
    sections: SectionOption[];
    coordinators: CoordinatorRow[];
};

function SectionSelect({
    sections,
    value,
    onChange,
    name = 'section_id',
}: {
    sections: SectionOption[];
    value: string;
    onChange: (value: string) => void;
    name?: string;
}) {
    return (
        <>
            <input type="hidden" name={name} value={value} />
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                    {sections.map((section) => (
                        <SelectItem key={section.id} value={String(section.id)}>
                            {section.display_name}
                            {section.school_year
                                ? ` (${section.school_year})`
                                : ''}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </>
    );
}

export default function DeanCoordinators({
    course,
    sections,
    coordinators,
}: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editCoordinator, setEditCoordinator] =
        useState<CoordinatorRow | null>(null);
    const [createSectionId, setCreateSectionId] = useState('');
    const [editSectionId, setEditSectionId] = useState('');
    const [createPassword, setCreatePassword] = useState('password');
    const [sendCredentialsEmail, setSendCredentialsEmail] = useState(false);
    const [mailingCoordinatorId, setMailingCoordinatorId] = useState<
        number | null
    >(null);

    const storeRoute = store();

    console.log('Dean Coordinators page loaded', {
        course,
        sectionsCount: sections.length,
        coordinatorsCount: coordinators.length,
    });

    const availableSections = useMemo(
        () => sections.filter((section) => !section.has_coordinator),
        [sections],
    );

    const activeCoordinators = useMemo(
        () => coordinators.filter((coordinator) => coordinator.is_active),
        [coordinators],
    );

    const openCreateModal = () => {
        setCreateSectionId(String(availableSections[0]?.id ?? ''));
        setCreatePassword('password');
        setSendCredentialsEmail(false);
        setCreateOpen(true);
    };

    const openEditModal = (coordinator: CoordinatorRow) => {
        setEditCoordinator(coordinator);
        setEditSectionId(String(coordinator.section_id ?? ''));
    };

    const editSectionOptions = useMemo(() => {
        if (!editCoordinator) {
            return [];
        }

        return sections.filter(
            (section) =>
                !section.has_coordinator ||
                section.id === editCoordinator.section_id,
        );
    }, [editCoordinator, sections]);

    const handleMailCredentials = (coordinator: CoordinatorRow) => {
        if (
            !confirm(
                `Email login credentials to ${coordinator.name}? This will reset their password to a new temporary password.`,
            )
        ) {
            return;
        }

        console.log('Dean mail coordinator credentials', {
            coordinatorId: coordinator.id,
            email: coordinator.email,
        });

        setMailingCoordinatorId(coordinator.id);
        router.post(mailCredentials(coordinator.id).url, {}, {
            preserveScroll: true,
            onFinish: () => setMailingCoordinatorId(null),
        });
    };

    const handleDeactivate = (coordinator: CoordinatorRow) => {
        if (!confirm(`Deactivate ${coordinator.name}?`)) {
            return;
        }

        router.delete(destroy(coordinator.id).url, { preserveScroll: true });
    };

    const canManageCoordinators =
        course !== null && availableSections.length > 0;

    return (
        <>
            <Head title="Coordinators" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Coordinators"
                    description="Create coordinator accounts and assign each one to a section."
                    icon={UserCog}
                    badgeText="Dean"
                    action={
                        canManageCoordinators ? (
                            <Button
                                onClick={openCreateModal}
                                className="bg-brand text-brand-foreground hover:bg-brand-hover"
                            >
                                <Plus className="mr-2 size-4" />
                                Add Coordinator
                            </Button>
                        ) : undefined
                    }
                />

                {!course && (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No course is assigned to your dean account yet.
                        </CardContent>
                    </Card>
                )}

                {course && sections.length === 0 && (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                            No active sections found.{' '}
                            <Link
                                href={sectionsIndex().url}
                                className="text-brand underline-offset-4 hover:underline"
                            >
                                Create a section first
                            </Link>
                            .
                        </CardContent>
                    </Card>
                )}

                {course &&
                    sections.length > 0 &&
                    availableSections.length === 0 &&
                    activeCoordinators.length === 0 && (
                        <Card className="border-sidebar-border/70">
                            <CardContent className="py-8 text-center text-sm text-muted-foreground">
                                All sections already have coordinators assigned.
                            </CardContent>
                        </Card>
                    )}

                {course && sections.length > 0 && activeCoordinators.length === 0 && availableSections.length > 0 && (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            No coordinators yet. Click{' '}
                            <span className="font-medium text-foreground">
                                Add Coordinator
                            </span>{' '}
                            to create an account and assign it to a section.
                        </CardContent>
                    </Card>
                )}

                {activeCoordinators.length > 0 && (
                    <Card className="border-sidebar-border/70">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/40 text-left">
                                            <th className="px-4 py-3 font-medium">
                                                Coordinator
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                Section
                                            </th>
                                            <th className="px-4 py-3 font-medium">
                                                School year
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
                                        {activeCoordinators.map((coordinator) => (
                                            <tr
                                                key={coordinator.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">
                                                        {coordinator.name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {coordinator.email}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {coordinator.section
                                                        ?.display_name ?? '—'}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {coordinator.section
                                                        ?.school_year ?? '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge
                                                        className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                                                    >
                                                        Active
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            title="Email login credentials"
                                                            disabled={
                                                                mailingCoordinatorId ===
                                                                coordinator.id
                                                            }
                                                            onClick={() =>
                                                                handleMailCredentials(
                                                                    coordinator,
                                                                )
                                                            }
                                                        >
                                                            {mailingCoordinatorId ===
                                                            coordinator.id ? (
                                                                <Spinner className="size-3.5" />
                                                            ) : (
                                                                <Mail className="size-3.5" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    coordinator,
                                                                )
                                                            }
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700"
                                                            onClick={() =>
                                                                handleDeactivate(
                                                                    coordinator,
                                                                )
                                                            }
                                                        >
                                                            Deactivate
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {course && (
                <AppModal
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    title="Add Coordinator"
                    description="Create a coordinator login and assign them to a section."
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
                                    <Label htmlFor="create-coordinator-name">
                                        Full name
                                    </Label>
                                    <Input
                                        id="create-coordinator-name"
                                        name="name"
                                        required
                                        placeholder="Juan Dela Cruz"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="create-coordinator-email">
                                        Email
                                    </Label>
                                    <Input
                                        id="create-coordinator-email"
                                        name="email"
                                        type="email"
                                        required
                                        placeholder="coordinator@gmail.com"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Section</Label>
                                    <SectionSelect
                                        sections={availableSections}
                                        value={createSectionId}
                                        onChange={setCreateSectionId}
                                    />
                                    <InputError message={errors.section_id} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="create-coordinator-password">
                                        Password
                                    </Label>
                                    <Input
                                        id="create-coordinator-password"
                                        name="password"
                                        type="text"
                                        value={createPassword}
                                        onChange={(event) =>
                                            setCreatePassword(event.target.value)
                                        }
                                        required={!sendCredentialsEmail}
                                        disabled={sendCredentialsEmail}
                                        placeholder="password"
                                    />
                                    <InputError message={errors.password} />
                                    <p className="text-xs text-muted-foreground">
                                        Use a simple password like{' '}
                                        <span className="font-medium text-foreground">
                                            password
                                        </span>{' '}
                                        for dummy or test accounts. For real
                                        coordinators, leave this and use email
                                        instead.
                                    </p>
                                </div>

                                <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
                                    <input
                                        type="hidden"
                                        name="send_credentials_email"
                                        value="0"
                                    />
                                    <Checkbox
                                        id="create-send-credentials-email"
                                        name="send_credentials_email"
                                        value="1"
                                        checked={sendCredentialsEmail}
                                        onCheckedChange={(checked) =>
                                            setSendCredentialsEmail(
                                                checked === true,
                                            )
                                        }
                                    />
                                    <div className="space-y-1">
                                        <Label
                                            htmlFor="create-send-credentials-email"
                                            className="leading-snug"
                                        >
                                            Email login credentials
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Generates a new temporary password
                                            and emails it to the coordinator.
                                            The manual password above will be
                                            ignored.
                                        </p>
                                    </div>
                                </div>

                                {!sendCredentialsEmail && (
                                    <p className="text-xs text-muted-foreground">
                                        The password you enter will be shown
                                        after creation so you can share it
                                        manually.
                                    </p>
                                )}

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
                                            processing || !createSectionId
                                        }
                                        className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                    >
                                        {processing && <Spinner />}
                                        Create Coordinator
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </AppModal>
            )}

            {editCoordinator && course && (
                <AppModal
                    open={!!editCoordinator}
                    onOpenChange={(open) => !open && setEditCoordinator(null)}
                    title="Edit Coordinator"
                    description={`Update ${editCoordinator.name}`}
                >
                    <Form
                        action={update(editCoordinator.id).url}
                        method={update(editCoordinator.id).method}
                        onSuccess={() => setEditCoordinator(null)}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-coordinator-name">
                                        Full name
                                    </Label>
                                    <Input
                                        id="edit-coordinator-name"
                                        name="name"
                                        defaultValue={editCoordinator.name}
                                        required
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="edit-coordinator-email">
                                        Email
                                    </Label>
                                    <Input
                                        id="edit-coordinator-email"
                                        name="email"
                                        type="email"
                                        defaultValue={editCoordinator.email}
                                        required
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="grid gap-2">
                                    <Label>Section</Label>
                                    <SectionSelect
                                        sections={editSectionOptions}
                                        value={editSectionId}
                                        onChange={setEditSectionId}
                                    />
                                    <InputError message={errors.section_id} />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="hidden"
                                        name="is_active"
                                        value="0"
                                    />
                                    <Checkbox
                                        id="edit-coordinator-active"
                                        name="is_active"
                                        value="1"
                                        defaultChecked={
                                            editCoordinator.is_active
                                        }
                                    />
                                    <Label htmlFor="edit-coordinator-active">
                                        Active coordinator
                                    </Label>
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setEditCoordinator(null)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={
                                            processing || !editSectionId
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

DeanCoordinators.layout = {
    breadcrumbs: [{ title: 'Coordinators', href: deanCoordinatorsIndex().url }],
};
