import { Head } from '@inertiajs/react';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/superadmin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { index as deanStudentsIndex } from '@/routes/deans/students';

export default function DeanStudents() {
    console.log('Dean Students page loaded');

    return (
        <>
            <Head title="Students" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Students"
                    description="Create and manage student accounts under your course."
                    icon={Users}
                />

                <Card className="border-sidebar-border/70">
                    <CardHeader>
                        <CardTitle>Coming next</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        This page will include: create student accounts, assign section, assign company/department,
                        and view student list.
                        <div className="mt-3 text-xs">
                            Route: {deanStudentsIndex().url}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

DeanStudents.layout = {
    breadcrumbs: [{ title: 'Students', href: deanStudentsIndex().url }],
};

