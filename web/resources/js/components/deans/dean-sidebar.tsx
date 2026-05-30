import { Link } from '@inertiajs/react';
import { BookOpen, Building2, CalendarDays, LayoutGrid, ListChecks, UserCog, Users } from 'lucide-react';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes/deans';
import { index as deanCoordinatorsIndex } from '@/routes/deans/coordinators';
import { index as deanCompaniesIndex } from '@/routes/deans/companies';
import { index as deanSchoolYearsIndex } from '@/routes/deans/school-years';
import { index as deanSectionsIndex } from '@/routes/deans/sections';
import { index as deanStudentsIndex } from '@/routes/deans/students';
import { index as deanSupervisorsIndex } from '@/routes/deans/supervisors';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'School Years',
        href: deanSchoolYearsIndex(),
        icon: CalendarDays,
    },
    {
        title: 'Sections',
        href: deanSectionsIndex(),
        icon: ListChecks,
    },
    {
        title: 'Coordinators',
        href: deanCoordinatorsIndex(),
        icon: UserCog,
    },
    {
        title: 'Students',
        href: deanStudentsIndex(),
        icon: Users,
    },
    {
        title: 'Companies',
        href: deanCompaniesIndex(),
        icon: Building2,
    },
    {
        title: 'Supervisors',
        href: deanSupervisorsIndex(),
        icon: BookOpen,
    },
];

export function DeanSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-brand">
                                    <BookOpen className="size-4 text-brand-foreground" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">
                                        OCC Intern
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        Dean
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

