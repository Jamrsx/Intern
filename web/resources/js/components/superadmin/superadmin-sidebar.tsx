import { Link } from '@inertiajs/react';
import { BrandLogoMark } from '@/components/brand-logo-mark';
import { BookOpen, LayoutGrid, Users } from 'lucide-react';
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
import { dashboard as superAdminDashboard } from '@/routes/superadmin';
import { index as deansIndex } from '@/routes/superadmin/deans';
import { index as coursesIndex } from '@/routes/superadmin/courses';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: superAdminDashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Deans',
        href: deansIndex(),
        icon: Users,
    },
    {
        title: 'Courses',
        href: coursesIndex(),
        icon: BookOpen,
    },
];

export function SuperAdminSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={superAdminDashboard()} prefetch>
                                <BrandLogoMark />
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">
                                        OCC Intern
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        Super Admin
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
