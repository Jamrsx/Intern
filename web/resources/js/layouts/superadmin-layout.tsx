import SuperAdminLayoutTemplate from '@/layouts/superadmin/superadmin-layout';
import type { BreadcrumbItem } from '@/types';

export default function SuperAdminLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    return (
        <SuperAdminLayoutTemplate breadcrumbs={breadcrumbs}>
            {children}
        </SuperAdminLayoutTemplate>
    );
}
