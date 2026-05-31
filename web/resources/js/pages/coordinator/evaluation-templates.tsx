import { Head, Link, router } from '@inertiajs/react';
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/superadmin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
    create as createEvaluationTemplate,
    destroy,
    edit as editEvaluationTemplate,
    index as evaluationTemplatesIndex,
} from '@/routes/coordinators/evaluation-templates';

type TemplateRow = {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    has_been_used: boolean;
    items_count: number;
};

type Section = {
    id: number;
    display_name: string;
};

type Props = {
    section: Section | null;
    templates: TemplateRow[];
};

export default function CoordinatorEvaluationTemplates({
    section,
    templates,
}: Props) {
    const [deactivatingId, setDeactivatingId] = useState<number | null>(null);

    console.log('Coordinator evaluation templates loaded', {
        section,
        templateCount: templates.length,
    });

    const handleDeactivate = (template: TemplateRow) => {
        if (
            !confirm(
                `Deactivate "${template.name}"? You will not be able to send it to supervisors anymore.`,
            )
        ) {
            return;
        }

        setDeactivatingId(template.id);
        router.delete(destroy(template.id).url, {
            preserveScroll: true,
            onFinish: () => setDeactivatingId(null),
        });
    };

    const activeTemplates = templates.filter((template) => template.is_active);

    return (
        <>
            <Head title="Evaluation Sheets" />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    title="Evaluation Sheets"
                    description={
                        section
                            ? `Build reusable evaluation forms for ${section.display_name}. Sheets are private to your section.`
                            : 'You are not assigned to a section yet.'
                    }
                    icon={ClipboardList}
                    badgeText="Coordinator"
                    action={
                        section ? (
                            <Button
                                asChild
                                className="bg-brand text-brand-foreground hover:bg-brand-hover"
                            >
                                <Link href={createEvaluationTemplate()}>
                                    <Plus className="mr-2 size-4" />
                                    New sheet
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />

                {!section ? (
                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardContent className="py-10 text-center text-muted-foreground">
                            Ask your dean to assign you to a section before you
                            can create evaluation sheets.
                        </CardContent>
                    </Card>
                ) : templates.length === 0 ? (
                    <Card className="border-sidebar-border/70 shadow-sm">
                        <CardContent className="py-10 text-center">
                            <p className="text-muted-foreground">
                                No evaluation sheets yet. Create one for midterm,
                                final, or other review periods.
                            </p>
                            <Button
                                asChild
                                className="mt-4 bg-brand text-brand-foreground hover:bg-brand-hover"
                            >
                                <Link href={createEvaluationTemplate()}>
                                    <Plus className="mr-2 size-4" />
                                    Create your first sheet
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {templates.map((template) => (
                            <Card
                                key={template.id}
                                className="border-sidebar-border/70 shadow-sm"
                            >
                                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-lg font-semibold">
                                                {template.name}
                                            </h2>
                                            {!template.is_active && (
                                                <Badge variant="secondary">
                                                    Inactive
                                                </Badge>
                                            )}
                                            {template.has_been_used && (
                                                <Badge variant="secondary">
                                                    Sent before
                                                </Badge>
                                            )}
                                        </div>
                                        {template.description && (
                                            <p className="text-sm text-muted-foreground">
                                                {template.description}
                                            </p>
                                        )}
                                        <p className="text-sm text-muted-foreground">
                                            {template.items_count} item
                                            {template.items_count === 1
                                                ? ''
                                                : 's'}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {template.is_active &&
                                            !template.has_been_used && (
                                                <Button
                                                    asChild
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    <Link
                                                        href={editEvaluationTemplate(
                                                            template.id,
                                                        )}
                                                    >
                                                        <Pencil className="mr-1 size-4" />
                                                        Edit
                                                    </Link>
                                                </Button>
                                            )}
                                        {template.is_active && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={
                                                    deactivatingId ===
                                                    template.id
                                                }
                                                onClick={() =>
                                                    handleDeactivate(template)
                                                }
                                            >
                                                {deactivatingId ===
                                                template.id ? (
                                                    <Spinner />
                                                ) : (
                                                    <Trash2 className="mr-1 size-4" />
                                                )}
                                                Deactivate
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {section && activeTemplates.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                        {activeTemplates.length} active sheet
                        {activeTemplates.length === 1 ? '' : 's'} available when
                        sending evaluations to supervisors.
                    </p>
                )}
            </div>
        </>
    );
}

CoordinatorEvaluationTemplates.layout = {
    breadcrumbs: [
        {
            title: 'Evaluation Sheets',
            href: evaluationTemplatesIndex(),
        },
    ],
};
