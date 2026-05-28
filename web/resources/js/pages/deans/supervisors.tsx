import { Head } from '@inertiajs/react';
import { BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/superadmin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { index as deanSupervisorsIndex } from '@/routes/deans/supervisors';

export default function DeanSupervisors() {
    console.log('Dean Supervisors page loaded');

    return (
        <>
            <Head title="Supervisors" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Supervisors"
                    description="Create supervisor accounts and assign them to company departments."
                    icon={BookOpen}
                />

                <Card className="border-sidebar-border/70">
                    <CardHeader>
                        <CardTitle>Coming next</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        This page will include: create supervisors and assign them to company + department.
                        <div className="mt-3 text-xs">
                            Route: {deanSupervisorsIndex().url}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

DeanSupervisors.layout = {
    breadcrumbs: [{ title: 'Supervisors', href: deanSupervisorsIndex().url }],
};

