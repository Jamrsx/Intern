import { Link, usePage } from '@inertiajs/react';
import { BrandLogoMark } from '@/components/brand-logo-mark';
import { LayoutGrid } from 'lucide-react';
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
import { dashboard } from '@/routes/supervisors';
import type { NavItem } from '@/types';

type SharedEvaluationAlerts = {
    role: 'supervisor';
    pending_count: number;
    new_count: number;
    has_unread: boolean;
} | null;

export function SupervisorSidebar() {
    const evaluationAlerts = usePage<{ evaluationAlerts: SharedEvaluationAlerts }>()
        .props.evaluationAlerts;

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
            badgeCount: evaluationAlerts?.pending_count ?? 0,
        },
    ];

    console.log('Supervisor sidebar evaluation alerts', evaluationAlerts);

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
                                        Supervisor
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
