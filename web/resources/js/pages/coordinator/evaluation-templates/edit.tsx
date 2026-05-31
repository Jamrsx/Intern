import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import {
    EvaluationTemplateItemsEditor,
    type EvaluationTemplateDraftItem,
} from '@/components/coordinators/evaluation-template-items-editor';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/superadmin/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    index as evaluationTemplatesIndex,
    update,
} from '@/routes/coordinators/evaluation-templates';

type Section = {
    id: number;
    display_name: string;
};

type TemplateItem = {
    id: number;
    sort_order: number;
    item_type: 'rating_question' | 'text_area';
    label: string;
    is_required: boolean;
};

type TemplateDetail = {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    has_been_used: boolean;
    items_count: number;
    items: TemplateItem[];
};

type Props = {
    section: Section;
    template: TemplateDetail;
};

export default function CoordinatorEvaluationTemplateEdit({
    section,
    template,
}: Props) {
    const [items, setItems] = useState<EvaluationTemplateDraftItem[]>(
        template.items.map((item) => ({
            item_type: item.item_type,
            label: item.label,
            is_required: item.is_required,
        })),
    );

    console.log('Coordinator evaluation template edit page loaded', {
        section,
        templateId: template.id,
        itemCount: items.length,
    });

    return (
        <>
            <Head title={`Edit ${template.name}`} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="-ml-2 w-fit"
                >
                    <Link href={evaluationTemplatesIndex()} prefetch>
                        <ArrowLeft className="mr-1 size-4" />
                        Back to evaluation sheets
                    </Link>
                </Button>

                <PageHeader
                    title={`Edit ${template.name}`}
                    description={`Update this sheet before it is sent to supervisors in ${section.display_name}.`}
                    icon={ClipboardList}
                    badgeText="Coordinator"
                />

                <Card className="border-sidebar-border/70 shadow-sm">
                    <CardHeader>
                        <CardTitle>Sheet details</CardTitle>
                        <CardDescription>
                            Changes apply only to sheets that have not been sent
                            yet.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form
                            action={update(template.id).url}
                            method={update(template.id).method}
                            className="space-y-6"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="grid gap-2 md:col-span-2">
                                            <Label htmlFor="name">
                                                Sheet name
                                            </Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                defaultValue={template.name}
                                            />
                                            <InputError message={errors.name} />
                                        </div>

                                        <div className="grid gap-2 md:col-span-2">
                                            <Label htmlFor="description">
                                                Description (optional)
                                            </Label>
                                            <textarea
                                                id="description"
                                                name="description"
                                                rows={3}
                                                defaultValue={
                                                    template.description ?? ''
                                                }
                                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            />
                                            <InputError
                                                message={errors.description}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <h3 className="text-base font-semibold">
                                                Form items
                                            </h3>
                                            <p className="text-sm text-muted-foreground">
                                                Reorder, edit, or remove items
                                                before sending this sheet.
                                            </p>
                                        </div>

                                        <EvaluationTemplateItemsEditor
                                            items={items}
                                            onChange={setItems}
                                            errors={errors}
                                        />
                                    </div>

                                    <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            asChild
                                        >
                                            <Link href={evaluationTemplatesIndex()}>
                                                Cancel
                                            </Link>
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={
                                                processing ||
                                                items.length === 0
                                            }
                                            className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                        >
                                            {processing && <Spinner />}
                                            Save changes
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

CoordinatorEvaluationTemplateEdit.layout = {
    breadcrumbs: [
        {
            title: 'Evaluation Sheets',
            href: evaluationTemplatesIndex(),
        },
        {
            title: 'Edit sheet',
            href: evaluationTemplatesIndex(),
        },
    ],
};
