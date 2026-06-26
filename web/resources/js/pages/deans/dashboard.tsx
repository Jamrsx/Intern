import { Head, usePage } from '@inertiajs/react';
import { BookOpen, GraduationCap, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard as deanDashboard } from '@/routes/deans';
import type { Auth } from '@/types';

type CourseMajor = {
    id: number;
    code: string | null;
    name: string;
    display_name: string;
};

type Course = {
    id: number;
    code: string;
    name: string;
    required_hours: number;
    is_active: boolean;
    portal_role?: 'dean' | 'program_head';
    major?: CourseMajor | null;
} | null;

type Props = {
    auth: Auth;
    course: Course;
    stats: {
        students: number;
    };
};

export default function DeanDashboard() {
    const { auth, course, stats } = usePage<Props>().props;

    const isProgramHead = course?.portal_role === 'program_head';
    const scopeLabel = isProgramHead
        ? course?.major?.display_name ?? 'your program'
        : course?.code ?? 'your course';

    console.log('Dean dashboard loaded', {
        user: auth.user,
        course,
        stats,
        portalRole: course?.portal_role,
    });

    return (
        <>
            <Head title={isProgramHead ? 'Program Head Dashboard' : 'Dean Dashboard'} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="rounded-2xl bg-brand p-6 text-brand-foreground shadow-lg md:p-8">
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                        Welcome back, {auth.user.name}
                    </h1>
                    <p className="mt-1 text-sm text-brand-foreground/80">
                        {isProgramHead
                            ? `Manage students, sections, and coordinators for ${scopeLabel}.`
                            : 'Manage students, sections, coordinators, and school years for your assigned course.'}
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {isProgramHead ? 'Assigned Program' : 'Assigned Course'}
                            </CardTitle>
                            <div className="rounded-lg bg-brand/15 p-2">
                                {isProgramHead ? (
                                    <GraduationCap className="size-4 text-brand" />
                                ) : (
                                    <BookOpen className="size-4 text-brand" />
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {course ? (
                                <>
                                    <p className="text-lg font-semibold">
                                        {isProgramHead
                                            ? course.major?.display_name ?? course.code
                                            : course.code}
                                    </p>
                                    <CardDescription className="mt-1">
                                        {isProgramHead
                                            ? `${course.name} • ${course.required_hours} hrs`
                                            : `${course.name} • ${course.required_hours} hrs`}
                                    </CardDescription>
                                </>
                            ) : (
                                <CardDescription>
                                    No course or program assigned yet. Ask Super Admin to assign you.
                                </CardDescription>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Students
                            </CardTitle>
                            <div className="rounded-lg bg-brand/15 p-2">
                                <Users className="size-4 text-brand" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{stats.students}</p>
                            <CardDescription className="mt-1">
                                {isProgramHead
                                    ? `Students under ${scopeLabel}`
                                    : 'Total students under your course'}
                            </CardDescription>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

DeanDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: deanDashboard(),
        },
    ],
};
