import { Head, Link, usePage } from '@inertiajs/react';
import { BookOpen, GraduationCap, UserCog, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboard as superAdminDashboard } from '@/routes/superadmin';
import { index as deansIndex } from '@/routes/superadmin/deans';
import { index as coursesIndex } from '@/routes/superadmin/courses';
import type { Auth } from '@/types';

type Stats = {
    courses: number;
    active_courses: number;
    deans: number;
    unassigned_courses: number;
};

type Props = {
    stats: Stats;
};

export default function SuperAdminDashboard({ stats }: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;

    console.log('SuperAdmin dashboard loaded', { stats, user: auth.user });

    const statCards = [
        {
            label: 'Total Courses',
            value: stats.courses,
            description: `${stats.active_courses} active`,
            icon: BookOpen,
            iconBg: 'bg-brand/20',
            iconColor: 'text-brand',
        },
        {
            label: 'Deans',
            value: stats.deans,
            description: 'Assigned dean accounts',
            icon: Users,
            iconBg: 'bg-emerald-500/20',
            iconColor: 'text-emerald-600',
        },
        {
            label: 'Unassigned Courses',
            value: stats.unassigned_courses,
            description: 'Courses without a dean',
            icon: UserCog,
            iconBg: 'bg-amber-500/20',
            iconColor: 'text-amber-600',
        },
    ];

    return (
        <>
            <Head title="Super Admin Dashboard" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="relative overflow-hidden rounded-2xl bg-brand p-6 text-brand-foreground shadow-lg md:p-8">
                    <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            <img
                                src="/OCC%20logo.webp"
                                alt="OCC Logo"
                                className="size-16 rounded-xl bg-white/40 object-contain p-2"
                            />
                            <div>
                                <Badge className="mb-2 border-brand-foreground/20 bg-white/40 text-brand-foreground hover:bg-white/40">
                                    Super Admin
                                </Badge>
                                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                    Welcome back, {auth.user.name}
                                </h1>
                                <p className="mt-1 text-sm text-brand-foreground/80">
                                    Manage deans, courses, and OJT program
                                    settings.
                                </p>
                            </div>
                        </div>
                        <GraduationCap className="absolute -right-4 -bottom-4 size-32 text-brand-foreground/10 md:size-40" />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {statCards.map((card) => (
                        <Card
                            key={card.label}
                            className="border-sidebar-border/70 shadow-sm"
                        >
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {card.label}
                                </CardTitle>
                                <div
                                    className={`rounded-lg p-2 ${card.iconBg}`}
                                >
                                    <card.icon
                                        className={`size-4 ${card.iconColor}`}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-3xl font-bold">
                                    {card.value}
                                </p>
                                <CardDescription className="mt-1">
                                    {card.description}
                                </CardDescription>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="border-sidebar-border/70">
                        <CardHeader>
                            <CardTitle>Quick actions</CardTitle>
                            <CardDescription>
                                Common tasks for Super Admin
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 sm:grid-cols-2">
                            <Link
                                href={deansIndex()}
                                className="rounded-xl border border-brand/40 bg-brand/10 p-4 transition hover:border-brand hover:shadow-md"
                            >
                                <Users className="mb-2 size-5 text-brand" />
                                <p className="font-medium">Manage Deans</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Create dean accounts and assign them to
                                    courses.
                                </p>
                            </Link>
                            <Link
                                href={coursesIndex()}
                                className="rounded-xl border border-brand/40 bg-brand/10 p-4 transition hover:border-brand hover:shadow-md"
                            >
                                <BookOpen className="mb-2 size-5 text-brand" />
                                <p className="font-medium">Manage Courses</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Add courses and set required OJT hours.
                                </p>
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="border-sidebar-border/70">
                        <CardHeader>
                            <CardTitle>Your responsibilities</CardTitle>
                            <CardDescription>
                                Based on the intern tracking plan
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3 text-sm text-muted-foreground">
                                <li className="flex gap-2">
                                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                                    Create and manage dean accounts
                                </li>
                                <li className="flex gap-2">
                                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                                    Create courses and assign deans per course
                                </li>
                                <li className="flex gap-2">
                                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                                    Oversee the OJT program across all courses
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

SuperAdminDashboard.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: superAdminDashboard(),
        },
    ],
};
