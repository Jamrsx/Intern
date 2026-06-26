import { Link, usePage } from '@inertiajs/react';
import {
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
import { index as deanSchoolYearsIndex } from '@/routes/deans/school-years';
import { index as deanSectionsIndex } from '@/routes/deans/sections';
import { index as deanStudentsIndex } from '@/routes/deans/students';
import type { Auth, NavGroup } from '@/types';

function deanPortalRoleLabel(roleName: string | undefined): string {
    if (roleName === 'program_head') {
        return 'Program Head';
    }

    return 'Dean';
}

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
];

export function DeanSidebar() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const roleLabel = deanPortalRoleLabel(auth.user?.role?.name);

    console.log('Dean sidebar nav groups loaded', {
        groups: navGroups.map((group) => group.label),
        role: auth.user?.role?.name,
        roleLabel,
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
                                        {roleLabel}
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
