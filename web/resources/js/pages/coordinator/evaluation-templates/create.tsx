import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import {
    emptyEvaluationTemplateItem,
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
    store,
} from '@/routes/coordinators/evaluation-templates';

type Section = {
    id: number;
    display_name: string;
};

type Props = {
    section: Section;
};

export default function CoordinatorEvaluationTemplateCreate({
    section,
}: Props) {
    const storeRoute = store();
    const [items, setItems] = useState<EvaluationTemplateDraftItem[]>([
        emptyEvaluationTemplateItem('rating_question'),
    ]);

    console.log('Coordinator evaluation template create page loaded', {
        section,
        itemCount: items.length,
    });

    return (
        <>
            <Head title="New Evaluation Sheet" />

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
                    title="New evaluation sheet"
                    description={`Build a reusable form for ${section.display_name}. Supervisors will answer these questions when you send an evaluation.`}
                    icon={ClipboardList}
                    badgeText="Coordinator"
                />

                <Card className="border-sidebar-border/70 shadow-sm">
                    <CardHeader>
                        <CardTitle>Sheet details</CardTitle>
                        <CardDescription>
                            Name your sheet and add rating questions or text
                            areas supervisors must complete.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form
                            action={storeRoute.url}
                            method={storeRoute.method}
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
                                                placeholder="e.g. Midterm Evaluation"
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
                                                placeholder="Brief note for supervisors"
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
                                                Add questions in the order
                                                supervisors should answer them.
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
                                            Create sheet
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

CoordinatorEvaluationTemplateCreate.layout = {
    breadcrumbs: [
        {
            title: 'Evaluation Sheets',
            href: evaluationTemplatesIndex(),
        },
        {
            title: 'New sheet',
            href: evaluationTemplatesIndex(),
        },
    ],
};
