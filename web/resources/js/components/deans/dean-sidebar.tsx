import { Link } from '@inertiajs/react';
import {
    Building2,
    Briefcase,
    CalendarDays,
    LayoutGrid,
    ListChecks,
    UserCog,
    Users,
} from 'lucide-react';
import { BrandLogoMark } from '@/components/brand-logo-mark';
import { NavGrouped } from '@/components/nav-grouped';
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
import type { NavGroup } from '@/types';

const navGroups: NavGroup[] = [
    {
        label: 'Overview',
        items: [
            {
                title: 'Dashboard',
                href: dashboard(),
                icon: LayoutGrid,
            },
        ],
    },
    {
        label: 'Academic Setup',
        items: [
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
        ],
    },
    {
        label: 'People',
        items: [
            {
                title: 'Students',
                href: deanStudentsIndex(),
                icon: Users,
            },
            {
                title: 'Coordinators',
                href: deanCoordinatorsIndex(),
                icon: UserCog,
            },
        ],
    },
    {
        label: 'OJT Partners',
        items: [
            {
                title: 'Companies',
                href: deanCompaniesIndex(),
                icon: Building2,
            },
            {
                title: 'Supervisors',
                href: deanSupervisorsIndex(),
                icon: Briefcase,
            },
        ],
    },
];

export function DeanSidebar() {
    console.log('Dean sidebar nav groups loaded', {
        groups: navGroups.map((group) => group.label),
    });

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <BrandLogoMark />
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
                <NavGrouped groups={navGroups} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
