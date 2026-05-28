import { Form, Head, router } from '@inertiajs/react';
import { BookOpen, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import CourseController from '@/actions/App/Http/Controllers/SuperAdmin/CourseController';
import InputError from '@/components/input-error';
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
import { index as coursesIndex } from '@/routes/superadmin/courses';

type DeanOption = {
    id: number;
    name: string;
    email: string;
    assigned_course: {
        id: number;
        code: string;
        name: string;
    } | null;
};

type CourseDean = {
    id: number;
    name: string;
    email: string;
};

type Course = {
    id: number;
    code: string;
    name: string;
    required_hours: number;
    is_active: boolean;
    dean: CourseDean | null;
    created_at: string | null;
};

type Props = {
    courses: Course[];
    deansForAssignment: DeanOption[];
};

function assignableDeans(
    deans: DeanOption[],
    courseId?: number,
): DeanOption[] {
    return deans.filter(
        (dean) =>
            !dean.assigned_course ||
            dean.assigned_course.id === courseId,
    );
}

function DeanSelect({
    deans,
    defaultValue,
    name = 'dean_user_id',
}: {
    deans: DeanOption[];
    defaultValue?: string;
    name?: string;
}) {
    const [value, setValue] = useState(defaultValue ?? 'none');

    return (
        <>
            <input
                type="hidden"
                name={name}
                value={value === 'none' ? '' : value}
            />
            <Select value={value} onValueChange={setValue}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a dean (optional)" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="none">No dean assigned</SelectItem>
                    {deans.map((dean) => (
                        <SelectItem key={dean.id} value={String(dean.id)}>
                            {dean.name} ({dean.email})
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </>
    );
}

export default function Courses({
    courses,
    deansForAssignment,
}: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editCourse, setEditCourse] = useState<Course | null>(null);

    const createDeans = useMemo(
        () => assignableDeans(deansForAssignment),
        [deansForAssignment],
    );

    const editDeans = useMemo(
        () =>
            editCourse
                ? assignableDeans(deansForAssignment, editCourse.id)
                : [],
        [deansForAssignment, editCourse],
    );

    console.log('Courses index loaded', {
        courses: courses.length,
        deans: deansForAssignment.length,
    });

    const handleDeactivate = (course: Course) => {
        if (!confirm(`Deactivate ${course.code}?`)) {
            return;
        }

        router.delete(CourseController.destroy.url(course.id), {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title="Manage Courses" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Manage Courses"
                    description="Add courses, set required OJT hours, and assign deans."
                    icon={BookOpen}
                    action={
                        <Button
                            onClick={() => setCreateOpen(true)}
                            className="bg-brand text-brand-foreground hover:bg-brand-hover"
                        >
                            <Plus className="mr-2 size-4" />
                            Add Course
                        </Button>
                    }
                />

                <Card className="border-sidebar-border/70">
                    <CardHeader>
                        <CardTitle>
                            Courses ({courses.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-left">
                                        <th className="px-4 py-3 font-medium">
                                            Code
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Name
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Required hours
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Dean
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
                                    {courses.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-4 py-8 text-center text-muted-foreground"
                                            >
                                                No courses yet. Click Add Course
                                                to create one.
                                            </td>
                                        </tr>
                                    ) : (
                                        courses.map((course) => (
                                            <tr
                                                key={course.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="px-4 py-3 font-mono font-medium">
                                                    {course.code}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {course.name}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {course.required_hours} hrs
                                                </td>
                                                <td className="px-4 py-3">
                                                    {course.dean ? (
                                                        <span>
                                                            {course.dean.name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-amber-600">
                                                            Unassigned
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge
                                                        className={
                                                            course.is_active
                                                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300'
                                                                : ''
                                                        }
                                                    >
                                                        {course.is_active
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
                                                                setEditCourse(
                                                                    course,
                                                                )
                                                            }
                                                        >
                                                            <Pencil className="size-3.5" />
                                                        </Button>
                                                        {course.is_active && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="text-red-600"
                                                                onClick={() =>
                                                                    handleDeactivate(
                                                                        course,
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
                title="Add Course"
                description="Create a course and set required OJT render hours."
            >
                <Form
                    {...CourseController.store.form()}
                    onSuccess={() => setCreateOpen(false)}
                    className="space-y-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <input type="hidden" name="is_active" value="1" />
                            <div className="grid gap-2">
                                <Label htmlFor="create-code">Course code</Label>
                                <Input
                                    id="create-code"
                                    name="code"
                                    required
                                    placeholder="BSIT"
                                    className="uppercase"
                                />
                                <InputError message={errors.code} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-name">Course name</Label>
                                <Input
                                    id="create-name"
                                    name="name"
                                    required
                                    placeholder="Bachelor of Science in IT"
                                />
                                <InputError message={errors.name} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-hours">
                                    Required OJT hours
                                </Label>
                                <Input
                                    id="create-hours"
                                    name="required_hours"
                                    type="number"
                                    min={1}
                                    required
                                    placeholder="486"
                                />
                                <InputError message={errors.required_hours} />
                            </div>
                            <div className="grid gap-2">
                                <Label>Assign dean (optional)</Label>
                                <DeanSelect deans={createDeans} />
                                <InputError message={errors.dean_user_id} />
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
                                    Create Course
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </AppModal>

            {editCourse && (
                <AppModal
                    open={!!editCourse}
                    onOpenChange={(open) => !open && setEditCourse(null)}
                    title="Edit Course"
                    description={`${editCourse.code} — ${editCourse.name}`}
                >
                    <Form
                        {...CourseController.update.form(editCourse.id)}
                        onSuccess={() => setEditCourse(null)}
                        className="space-y-4"
                        key={editCourse.id}
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-code">Course code</Label>
                                    <Input
                                        id="edit-code"
                                        name="code"
                                        defaultValue={editCourse.code}
                                        required
                                        className="uppercase"
                                    />
                                    <InputError message={errors.code} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-name">Course name</Label>
                                    <Input
                                        id="edit-name"
                                        name="name"
                                        defaultValue={editCourse.name}
                                        required
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="edit-hours">
                                        Required OJT hours
                                    </Label>
                                    <Input
                                        id="edit-hours"
                                        name="required_hours"
                                        type="number"
                                        min={1}
                                        defaultValue={editCourse.required_hours}
                                        required
                                    />
                                    <InputError
                                        message={errors.required_hours}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Assign dean (optional)</Label>
                                    <DeanSelect
                                        deans={editDeans}
                                        defaultValue={
                                            editCourse.dean
                                                ? String(editCourse.dean.id)
                                                : 'none'
                                        }
                                    />
                                    <InputError message={errors.dean_user_id} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="hidden"
                                        name="is_active"
                                        value="0"
                                    />
                                    <Checkbox
                                        id="edit-course-active"
                                        name="is_active"
                                        value="1"
                                        defaultChecked={editCourse.is_active}
                                    />
                                    <Label htmlFor="edit-course-active">
                                        Course is active
                                    </Label>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setEditCourse(null)}
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

Courses.layout = {
    breadcrumbs: [
        { title: 'Courses', href: coursesIndex() },
    ],
};
