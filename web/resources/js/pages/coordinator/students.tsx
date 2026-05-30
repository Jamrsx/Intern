import { Head, Link, usePage } from '@inertiajs/react';
import { Building2, Eye, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/superadmin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { index as studentsIndex, show } from '@/routes/coordinators/students';

type Section = {
    id: number;
    name: string;
    display_name: string;
    school_year: string | null | undefined;
    course: {
        code: string;
        name: string;
    };
} | null;

type StudentRow = {
    id: number;
    student_number: string;
    email: string;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    full_name: string;
    company_id: number | null;
    company: { id: number; name: string } | null;
    department_id: number | null;
    department: { id: number; name: string } | null;
    supervisor_id: number | null;
    supervisor: { id: number; name: string } | null;
    is_active: boolean;
};

type Props = {
    section: Section;
    students: StudentRow[];
};

export default function CoordinatorStudents() {
    const { section, students } = usePage<Props>().props;
    const [search, setSearch] = useState('');

    console.log('Coordinator students loaded', {
        section,
        studentCount: students.length,
    });

    const filteredStudents = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return students;
        }

        return students.filter((student) => {
            return (
                student.full_name.toLowerCase().includes(query) ||
                student.student_number.toLowerCase().includes(query) ||
                student.email.toLowerCase().includes(query) ||
                (student.company?.name ?? '').toLowerCase().includes(query)
            );
        });
    }, [students, search]);

    const unassignedCount = useMemo(
        () => students.filter((student) => !student.company_id).length,
        [students],
    );

    return (
        <>
            <Head title="Students" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Students"
                    description={
                        section
                            ? `View progress, documents, and OJT placement for ${section.display_name}.`
                            : 'You are not assigned to a section yet.'
                    }
                    icon={Users}
                    badgeText="Coordinator"
                />

                {!section ? (
                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardContent className="py-10 text-center text-muted-foreground">
                            Ask your dean to assign you to a section before you
                            can manage students.
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Card className="border-sidebar-border/70 shadow-sm">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="rounded-lg bg-brand/15 p-3">
                                        <Users className="size-5 text-brand" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {students.length}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Total students
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-sidebar-border/70 shadow-sm">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="rounded-lg bg-brand/15 p-3">
                                        <Building2 className="size-5 text-brand" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {students.length - unassignedCount}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Assigned to company
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="border-sidebar-border/70 shadow-sm">
                                <CardContent className="flex items-center gap-4 p-4">
                                    <div className="rounded-lg bg-amber-500/15 p-3">
                                        <Building2 className="size-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-bold">
                                            {unassignedCount}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Pending assignment
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="border-sidebar-border/70 shadow-sm">
                            <CardContent className="p-4">
                                <div className="relative mb-4 max-w-md">
                                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        placeholder="Search by name, student ID, email, or company..."
                                        className="pl-9"
                                    />
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/40 text-left">
                                                <th className="px-4 py-3 font-medium">
                                                    Student
                                                </th>
                                                <th className="px-4 py-3 font-medium">
                                                    Email
                                                </th>
                                                <th className="px-4 py-3 font-medium">
                                                    OJT Company
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
                                            {filteredStudents.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="px-4 py-8 text-center text-muted-foreground"
                                                    >
                                                        {search
                                                            ? 'No students match your search.'
                                                            : 'No students in this section yet.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                filteredStudents.map(
                                                    (student) => (
                                                        <tr
                                                            key={student.id}
                                                            className="border-b last:border-0"
                                                        >
                                                            <td className="px-4 py-3">
                                                                <div className="font-medium">
                                                                    {
                                                                        student.full_name
                                                                    }
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Student ID:{' '}
                                                                    {
                                                                        student.student_number
                                                                    }
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-muted-foreground">
                                                                {student.email}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                {student
                                                                    .company
                                                                    ?.name ?? (
                                                                    <span className="text-muted-foreground">
                                                                        Not
                                                                        assigned
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <Badge
                                                                    variant={
                                                                        student.is_active
                                                                            ? 'default'
                                                                            : 'secondary'
                                                                    }
                                                                    className={
                                                                        student.is_active
                                                                            ? 'bg-brand text-brand-foreground'
                                                                            : undefined
                                                                    }
                                                                >
                                                                    {student.is_active
                                                                        ? 'Active'
                                                                        : 'Inactive'}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <Button
                                                                    asChild
                                                                    variant="outline"
                                                                    size="sm"
                                                                >
                                                                    <Link
                                                                        href={show(
                                                                            student.id,
                                                                        )}
                                                                        prefetch
                                                                    >
                                                                        <Eye className="mr-1 size-3.5" />
                                                                        View
                                                                    </Link>
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ),
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </>
    );
}

CoordinatorStudents.layout = {
    breadcrumbs: [{ title: 'Students', href: studentsIndex().url }],
};
