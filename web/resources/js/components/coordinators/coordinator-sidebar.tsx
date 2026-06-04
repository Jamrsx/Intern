import { Link, usePage } from '@inertiajs/react';
import {
    Building2,
    Briefcase,
    ClipboardList,
    FileText,
    LayoutGrid,
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
import { dashboard } from '@/routes/coordinators';
import { index as coordinatorCompaniesIndex } from '@/routes/coordinators/companies';
import { index as coordinatorDocumentRequirementsIndex } from '@/routes/coordinators/document-requirements';
import { index as coordinatorEvaluationTemplatesIndex } from '@/routes/coordinators/evaluation-templates';
import { index as coordinatorStudentsIndex } from '@/routes/coordinators/students';
import { index as coordinatorSupervisorsIndex } from '@/routes/coordinators/supervisors';
import type { NavGroup } from '@/types';

type SharedEvaluationAlerts = {
    role: 'coordinator';
    awaiting_supervisor: number;
    new_completed_count: number;
    has_unread: boolean;
} | null;

function buildNavGroups(
    evaluationAlerts: SharedEvaluationAlerts,
): NavGroup[] {
    return [
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
        label: 'Interns',
        items: [
            {
                title: 'Students',
                href: coordinatorStudentsIndex(),
                icon: Users,
                badgeCount: evaluationAlerts?.new_completed_count ?? 0,
            },
            {
                title: 'Evaluation Sheets',
                href: coordinatorEvaluationTemplatesIndex(),
                icon: ClipboardList,
            },
            {
                title: 'Document Requirements',
                href: coordinatorDocumentRequirementsIndex(),
                icon: FileText,
            },
        ],
    },
    {
        label: 'OJT Partners',
        items: [
            {
                title: 'Companies',
                href: coordinatorCompaniesIndex(),
                icon: Building2,
            },
            {
                title: 'Supervisors',
                href: coordinatorSupervisorsIndex(),
                icon: Briefcase,
            },
        ],
    },
    ];
}

export function CoordinatorSidebar() {
    const evaluationAlerts = usePage<{ evaluationAlerts: SharedEvaluationAlerts }>()
        .props.evaluationAlerts;

    const navGroups = buildNavGroups(evaluationAlerts);

    console.log('Coordinator sidebar nav groups loaded', {
        groups: navGroups.map((group) => group.label),
        evaluationAlerts,
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
                                        Coordinator
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
