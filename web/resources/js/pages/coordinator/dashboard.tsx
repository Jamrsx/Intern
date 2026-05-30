import { Head, Link, usePage } from '@inertiajs/react';
import { Building2, LayoutGrid, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { dashboard as coordinatorDashboard } from '@/routes/coordinators';
import { index as coordinatorStudentsIndex } from '@/routes/coordinators/students';
import type { Auth } from '@/types';

type Section = {
    id: number;
    name: string;
    display_name: string;
    school_year: string | null | undefined;
    course: {
        code: string;
        name: string;
        required_hours: number;
    };
} | null;

type Props = {
    auth: Auth;
    section: Section;
    stats: {
        students: number;
        assigned: number;
        unassigned: number;
    };
};

export default function CoordinatorDashboard() {
    const { auth, section, stats } = usePage<Props>().props;

    console.log('Coordinator dashboard loaded', { user: auth.user, section, stats });

    return (
        <>
            <Head title="Coordinator Dashboard" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="rounded-2xl bg-brand p-6 text-brand-foreground shadow-lg md:p-8">
                    <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                        Welcome back, {auth.user.name}
                    </h1>
                    <p className="mt-1 text-sm text-brand-foreground/80">
                        Oversee your section&apos;s interns and assign them to OJT companies.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Assigned Section
                            </CardTitle>
                            <div className="rounded-lg bg-brand/15 p-2">
                                <LayoutGrid className="size-4 text-brand" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {section ? (
                                <>
                                    <p className="text-lg font-semibold">
                                        {section.display_name}
                                    </p>
                                    <CardDescription className="mt-1">
                                        {section.course.name} • {section.school_year}
                                    </CardDescription>
                                </>
                            ) : (
                                <CardDescription>
                                    No section assigned yet. Ask your dean to assign you to a section.
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
                                Interns in your section
                            </CardDescription>
                        </CardContent>
                    </Card>

                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Assigned
                            </CardTitle>
                            <div className="rounded-lg bg-brand/15 p-2">
                                <Building2 className="size-4 text-brand" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{stats.assigned}</p>
                            <CardDescription className="mt-1">
                                Placed in a company
                            </CardDescription>
                        </CardContent>
                    </Card>

                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                Unassigned
                            </CardTitle>
                            <div className="rounded-lg bg-amber-500/15 p-2">
                                <Building2 className="size-4 text-amber-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{stats.unassigned}</p>
                            <CardDescription className="mt-1">
                                Need company placement
                            </CardDescription>
                        </CardContent>
                    </Card>
                </div>

                {section && stats.unassigned > 0 && (
                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardHeader>
                            <CardTitle>Pending placements</CardTitle>
                            <CardDescription>
                                {stats.unassigned} student(s) still need an OJT company assignment.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                asChild
                                className="bg-brand text-brand-foreground hover:bg-brand-hover"
                            >
                                <Link href={coordinatorStudentsIndex()} prefetch>
                                    Manage students
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </>
    );
}

CoordinatorDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: coordinatorDashboard(),
        },
    ],
};
