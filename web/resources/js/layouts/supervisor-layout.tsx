import SupervisorLayoutTemplate from '@/layouts/supervisors/supervisor-layout';
import type { AppLayoutProps } from '@/types';

export default function SupervisorLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <SupervisorLayoutTemplate breadcrumbs={breadcrumbs}>
            {children}
        </SupervisorLayoutTemplate>
    );
}
