import { Head } from '@inertiajs/react';
import { ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/superadmin/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { index as deanSectionsIndex } from '@/routes/deans/sections';

export default function DeanSections() {
    console.log('Dean Sections page loaded');

    return (
        <>
            <Head title="Sections" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Sections"
                    description="Create sections and assign coordinators and students."
                    icon={ListChecks}
                />

                <Card className="border-sidebar-border/70">
                    <CardHeader>
                        <CardTitle>Coming next</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        This page will include: create section, assign coordinator, and assign students to section.
                        <div className="mt-3 text-xs">
                            Route: {deanSectionsIndex().url}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

DeanSections.layout = {
    breadcrumbs: [{ title: 'Sections', href: deanSectionsIndex().url }],
};

