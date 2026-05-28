import DeanLayoutTemplate from '@/layouts/deans/dean-layout';
import type { BreadcrumbItem } from '@/types';

export default function DeanLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    return <DeanLayoutTemplate breadcrumbs={breadcrumbs}>{children}</DeanLayoutTemplate>;
}

