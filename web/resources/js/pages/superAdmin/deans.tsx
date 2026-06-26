import { Form, Head, router } from '@inertiajs/react';
import { Pencil, Plus, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { destroy, index as deansIndex, store, update } from '@/routes/superadmin/deans';

type CourseMajorOption = {
    id: number;
    code: string | null;
    name: string;
    program_head_user_id: number | null;
};

type CourseOption = {
    id: number;
    code: string;
    name: string;
    dean_user_id: number | null;
    majors: CourseMajorOption[];
};

type LeaderCourse = {
    id: number;
    code: string;
    name: string;
};

type LeaderMajor = {
    id: number;
    code: string | null;
    name: string;
    course: LeaderCourse;
};

type Leader = {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    role: 'dean' | 'program_head';
    role_label: string;
    course: LeaderCourse | null;
    course_major: LeaderMajor | null;
    created_at: string | null;
};

type Props = {
    leaders: Leader[];
    courses: CourseOption[];
};

type LeaderRole = 'dean' | 'program_head';

function formatMajorLabel(major: CourseMajorOption, course: CourseOption): string {
    const code = major.code ? `${course.code}-${major.code}` : course.code;

    return `${code} — ${major.name}`;
}

function formatAssignment(leader: Leader): string {
    if (leader.role === 'dean' && leader.course) {
        return `${leader.course.code} — ${leader.course.name}`;
    }

    if (leader.role === 'program_head' && leader.course_major) {
        const majorCode = leader.course_major.code
            ? `${leader.course_major.course.code}-${leader.course_major.code}`
            : leader.course_major.course.code;

        return `${majorCode} — ${leader.course_major.name}`;
    }

    return 'Not assigned';
}

function assignableCourses(
    courses: CourseOption[],
    userId?: number,
): CourseOption[] {
    return courses.filter(
        (course) => course.dean_user_id === null || course.dean_user_id === userId,
    );
}

function assignableMajors(
    courses: CourseOption[],
    userId?: number,
): Array<CourseMajorOption & { course: CourseOption }> {
    return courses.flatMap((course) =>
        course.majors
            .filter(
                (major) =>
                    major.program_head_user_id === null
                    || major.program_head_user_id === userId,
            )
            .map((major) => ({
                ...major,
                course,
            })),
    );
}

function RoleAssignmentFields({
    role,
    onRoleChange,
    courseId,
    onCourseIdChange,
    majorId,
    onMajorIdChange,
    courses,
    userId,
    errors,
}: {
    role: LeaderRole;
    onRoleChange: (role: LeaderRole) => void;
    courseId: string;
    onCourseIdChange: (value: string) => void;
    majorId: string;
    onMajorIdChange: (value: string) => void;
    courses: CourseOption[];
    userId?: number;
    errors: Record<string, string>;
}) {
    const availableCourses = useMemo(
        () => assignableCourses(courses, userId),
        [courses, userId],
    );

    const availableMajors = useMemo(
        () => assignableMajors(courses, userId),
        [courses, userId],
    );

    return (
        <>
            <div className="grid gap-2">
                <Label>Role</Label>
                <input type="hidden" name="role" value={role} />
                <Select
                    value={role}
                    onValueChange={(value) => onRoleChange(value as LeaderRole)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="dean">College Dean</SelectItem>
                        <SelectItem value="program_head">Program Head</SelectItem>
                    </SelectContent>
                </Select>
                <InputError message={errors.role} />
            </div>

            {role === 'dean' ? (
                <div className="grid gap-2">
                    <Label>Assigned course</Label>
                    <input type="hidden" name="course_id" value={courseId} />
                    <Select value={courseId} onValueChange={onCourseIdChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select course" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableCourses.length === 0 ? (
                                <SelectItem value="none" disabled>
                                    No courses available
                                </SelectItem>
                            ) : (
                                availableCourses.map((course) => (
                                    <SelectItem
                                        key={course.id}
                                        value={String(course.id)}
                                    >
                                        {course.code} — {course.name}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.course_id} />
                </div>
            ) : (
                <div className="grid gap-2">
                    <Label>Assigned program</Label>
                    <input type="hidden" name="course_major_id" value={majorId} />
                    <Select value={majorId} onValueChange={onMajorIdChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select program" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableMajors.length === 0 ? (
                                <SelectItem value="none" disabled>
                                    No programs available. Add majors on the
                                    Courses page first.
                                </SelectItem>
                            ) : (
                                availableMajors.map((major) => (
                                    <SelectItem
                                        key={major.id}
                                        value={String(major.id)}
                                    >
                                        {formatMajorLabel(major, major.course)}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.course_major_id} />
                </div>
            )}
        </>
    );
}

export default function Deans({ leaders, courses }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editLeader, setEditLeader] = useState<Leader | null>(null);
    const [createRole, setCreateRole] = useState<LeaderRole>('dean');
    const [createCourseId, setCreateCourseId] = useState('');
    const [createMajorId, setCreateMajorId] = useState('');
    const [editRole, setEditRole] = useState<LeaderRole>('dean');
    const [editCourseId, setEditCourseId] = useState('');
    const [editMajorId, setEditMajorId] = useState('');
    const [editIsActive, setEditIsActive] = useState(true);
    const storeRoute = store();

    useEffect(() => {
        if (createOpen) {
            setCreateRole('dean');
            setCreateCourseId('');
            setCreateMajorId('');
        }
    }, [createOpen]);

    useEffect(() => {
        if (editLeader) {
            setEditRole(editLeader.role);
            setEditCourseId(
                editLeader.course ? String(editLeader.course.id) : '',
            );
            setEditMajorId(
                editLeader.course_major
                    ? String(editLeader.course_major.id)
                    : '',
            );
            setEditIsActive(editLeader.is_active);
        }
    }, [editLeader]);

    useEffect(() => {
        if (createRole === 'dean') {
            setCreateMajorId('');
        } else {
            setCreateCourseId('');
        }
    }, [createRole]);

    useEffect(() => {
        if (editRole === 'dean') {
            setEditMajorId('');
        } else {
            setEditCourseId('');
        }
    }, [editRole]);

    console.log('Deans index loaded', {
        leaderCount: leaders.length,
        courseCount: courses.length,
    });

    const handleDeactivate = (leader: Leader) => {
        if (
            !confirm(
                `Deactivate ${leader.name}? They will no longer be able to log in.`,
            )
        ) {
            return;
        }

        router.delete(destroy(leader.id).url, {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Manage Deans" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Manage Deans & Program Heads"
                    description="Create accounts and assign college deans to courses or program heads to specific majors."
                    icon={Users}
                    action={
                        <Button
                            onClick={() => setCreateOpen(true)}
                            className="bg-brand text-brand-foreground hover:bg-brand-hover"
                        >
                            <Plus className="mr-2 size-4" />
                            Add account
                        </Button>
                    }
                />

                <Card className="border-sidebar-border/70">
                    <CardHeader>
                        <CardTitle>Accounts ({leaders.length})</CardTitle>
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
                                            Role
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Assignment
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
                                    {leaders.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-4 py-8 text-center text-muted-foreground"
                                            >
                                                No accounts yet. Click Add
                                                account to create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        leaders.map((leader) => (
                                            <tr
                                                key={leader.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="px-4 py-3 font-medium">
                                                    {leader.name}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {leader.email}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="secondary">
                                                        {leader.role_label}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {leader.course
                                                    || leader.course_major ? (
                                                        <span>
                                                            {formatAssignment(
                                                                leader,
                                                            )}
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
                                                            leader.is_active
                                                                ? 'default'
                                                                : 'secondary'
                                                        }
                                                        className={
                                                            leader.is_active
                                                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
                                                                : ''
                                                        }
                                                    >
                                                        {leader.is_active
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
                                                                setEditLeader(
                                                                    leader,
                                                                )
                                                            }
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </Button>
                                                        {leader.is_active && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-700"
                                                                onClick={() =>
                                                                    handleDeactivate(
                                                                        leader,
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
                title="Add account"
                description="Create a college dean or program head account and assign their scope."
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
                            <RoleAssignmentFields
                                role={createRole}
                                onRoleChange={setCreateRole}
                                courseId={createCourseId}
                                onCourseIdChange={setCreateCourseId}
                                majorId={createMajorId}
                                onMajorIdChange={setCreateMajorId}
                                courses={courses}
                                errors={errors}
                            />
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
                                    Create account
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </AppModal>

            {editLeader && (
                <AppModal
                    open={!!editLeader}
                    onOpenChange={(open) => !open && setEditLeader(null)}
                    title="Edit account"
                    description={`Update account for ${editLeader.name}`}
                >
                    <Form
                        action={update(editLeader.id).url}
                        method={update(editLeader.id).method}
                        onSuccess={() => setEditLeader(null)}
                        className="space-y-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-name">Full name</Label>
                                    <Input
                                        id="edit-name"
                                        name="name"
                                        defaultValue={editLeader.name}
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
                                        defaultValue={editLeader.email}
                                        required
                                    />
                                    <InputError message={errors.email} />
                                </div>
                                <RoleAssignmentFields
                                    role={editRole}
                                    onRoleChange={setEditRole}
                                    courseId={editCourseId}
                                    onCourseIdChange={setEditCourseId}
                                    majorId={editMajorId}
                                    onMajorIdChange={setEditMajorId}
                                    courses={courses}
                                    userId={editLeader.id}
                                    errors={errors}
                                />
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
                                        value={editIsActive ? '1' : '0'}
                                    />
                                    <Checkbox
                                        id="edit-is-active"
                                        checked={editIsActive}
                                        onCheckedChange={(checked) =>
                                            setEditIsActive(checked === true)
                                        }
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
                                        onClick={() => setEditLeader(null)}
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
