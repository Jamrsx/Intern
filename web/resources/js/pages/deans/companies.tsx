import { Head } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import { PageHeader } from '@/components/superadmin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { index as deanCompaniesIndex } from '@/routes/deans/companies';

export default function DeanCompanies() {
    console.log('Dean Companies page loaded');

    return (
        <>
            <Head title="Companies" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Companies"
                    description="Create companies and departments for intern placement."
                    icon={Building2}
                />

                <Card className="border-sidebar-border/70">
                    <CardHeader>
                        <CardTitle>Coming next</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        This page will include: create company, create departments, and assign students.
                        <div className="mt-3 text-xs">
                            Route: {deanCompaniesIndex().url}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

DeanCompanies.layout = {
    breadcrumbs: [{ title: 'Companies', href: deanCompaniesIndex().url }],
};

