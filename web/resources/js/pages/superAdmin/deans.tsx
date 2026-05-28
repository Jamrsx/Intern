import { Form, Head, router } from '@inertiajs/react';
import { Pencil, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { AppModal } from '@/components/superadmin/app-modal';
import { PageHeader } from '@/components/superadmin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { destroy, index as deansIndex, store, update } from '@/routes/superadmin/deans';

type DeanCourse = {
    id: number;
    code: string;
    name: string;
};

type Dean = {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    course: DeanCourse | null;
    created_at: string | null;
};

type Props = {
    deans: Dean[];
};

export default function Deans({ deans }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editDean, setEditDean] = useState<Dean | null>(null);
    const storeRoute = store();

    console.log('Deans index loaded', { count: deans.length });

    const handleDeactivate = (dean: Dean) => {
        if (
            !confirm(
                `Deactivate ${dean.name}? They will no longer be able to log in.`,
            )
        ) {
            return;
        }

        router.delete(destroy(dean.id).url, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Manage Deans" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Manage Deans"
                    description="Create dean accounts and assign them to courses."
                    icon={Users}
                    action={
                        <Button
                            onClick={() => setCreateOpen(true)}
                            className="bg-brand text-brand-foreground hover:bg-brand-hover"
                        >
                            <Plus className="mr-2 size-4" />
                            Add Dean
                        </Button>
                    }
                />

                <Card className="border-sidebar-border/70">
                    <CardHeader>
                        <CardTitle>Dean accounts ({deans.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-left">
                                        <th className="px-4 py-3 font-medium">
                                            Name
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Email
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Assigned course
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
                                    {deans.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-4 py-8 text-center text-muted-foreground"
                                            >
                                                No deans yet. Click Add Dean to
                                                create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        deans.map((dean) => (
                                            <tr
                                                key={dean.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="px-4 py-3 font-medium">
                                                    {dean.name}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {dean.email}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {dean.course ? (
                                                        <span>
                                                            {dean.course.code}{' '}
                                                            — {dean.course.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            Not assigned
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge
                                                        variant={
                                                            dean.is_active
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                        className={
                                                            dean.is_active
                                                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
                                                                : ''
                                                        }
                                                    >
                                                        {dean.is_active
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
                                                                setEditDean(dean)
                                                            }
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </Button>
                                                        {dean.is_active && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-700"
                                                                onClick={() =>
                                                                    handleDeactivate(
                                                                        dean,
                                                                    )
                                                                }
                                                            >
                                                                Deactivate
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <AppModal
                open={createOpen}
                onOpenChange={setCreateOpen}
                title="Add Dean"
                description="Create a new dean account for course management."
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
                                <Label htmlFor="create-name">Full name</Label>
                                <Input
                                    id="create-name"
                                    name="name"
                                    required
                                    placeholder="Juan Dela Cruz"
                                />
                                <InputError message={errors.name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-email">Email</Label>
                                <Input
                                    id="create-email"
                                    name="email"
                                    type="email"
                                    required
                                    placeholder="dean@occ.edu.ph"
                                />
                                <InputError message={errors.email} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-password">Password</Label>
                                <PasswordInput
                                    id="create-password"
                                    name="password"
                                    required
                                />
                                <InputError message={errors.password} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-password-confirmation">
                                    Confirm password
                                </Label>
                                <PasswordInput
                                    id="create-password-confirmation"
                                    name="password_confirmation"
                                    required
                                />
                            </div>
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
                                    disabled={processing}
                                    className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                >
                                    {processing && <Spinner />}
                                    Create Dean
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </AppModal>

            {editDean && (
                <AppModal
                    open={!!editDean}
                    onOpenChange={(open) => !open && setEditDean(null)}
                    title="Edit Dean"
                    description={`Update account for ${editDean.name}`}
                >
                    <Form
                        action={update(editDean.id).url}
                        method={update(editDean.id).method}
                        onSuccess={() => setEditDean(null)}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-name">Full name</Label>
                                    <Input
                                        id="edit-name"
                                        name="name"
                                        defaultValue={editDean.name}
                                        required
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-email">Email</Label>
                                    <Input
                                        id="edit-email"
                                        name="email"
                                        type="email"
                                        defaultValue={editDean.email}
                                        required
                                    />
                                    <InputError message={errors.email} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-password">
                                        New password (optional)
                                    </Label>
                                    <PasswordInput
                                        id="edit-password"
                                        name="password"
                                    />
                                    <InputError message={errors.password} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-password-confirmation">
                                        Confirm new password
                                    </Label>
                                    <PasswordInput
                                        id="edit-password-confirmation"
                                        name="password_confirmation"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="hidden"
                                        name="is_active"
                                        value="0"
                                    />
                                    <Checkbox
                                        id="edit-is-active"
                                        name="is_active"
                                        value="1"
                                        defaultChecked={editDean.is_active}
                                    />
                                    <Label htmlFor="edit-is-active">
                                        Account is active
                                    </Label>
                                </div>
                                <InputError message={errors.is_active} />
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditDean(null)}
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

Deans.layout = {
    breadcrumbs: [
        { title: 'Deans', href: deansIndex() },
    ],
};
