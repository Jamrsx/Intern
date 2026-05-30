import CoordinatorLayoutTemplate from '@/layouts/coordinators/coordinator-layout';
import type { AppLayoutProps } from '@/types';

export default function CoordinatorLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <CoordinatorLayoutTemplate breadcrumbs={breadcrumbs}>
            {children}
        </CoordinatorLayoutTemplate>
    );
}
