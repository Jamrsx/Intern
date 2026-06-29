import { Link, usePage } from '@inertiajs/react';
import {
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
import type { Auth, NavGroup } from '@/types';
import { dashboard } from '@/routes/programhead';
import { index as coordinatorsIndex } from '@/routes/programhead/coordinators';
import { index as sectionsIndex } from '@/routes/programhead/sections';
import { index as studentsIndex } from '@/routes/programhead/students';

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
                title: 'Sections',
                href: sectionsIndex(),
                icon: ListChecks,
            },
        ],
    },
    {
        label: 'People',
        items: [
            {
                title: 'Students',
                href: studentsIndex(),
                icon: Users,
            },
            {
                title: 'Coordinators',
                href: coordinatorsIndex(),
                icon: UserCog,
            },
        ],
    },
];

export function ProgramHeadSidebar() {
    const { auth } = usePage<{ auth: Auth }>().props;

    console.log('Program Head sidebar loaded', {
        groups: navGroups.map((group) => group.label),
        user: auth.user?.email,
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
                                        Program Head
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
