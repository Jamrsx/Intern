import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, ClipboardList, User } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EvaluationRatingScale } from '@/components/evaluation-rating-scale';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/superadmin/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    buildEvaluationTemplateLayout,
    textAreaRowGridClass,
} from '@/lib/evaluation-template-layout';
import { cn } from '@/lib/utils';
import { update as submitEvaluation } from '@/routes/supervisors/evaluations';
import { dashboard as supervisorDashboard } from '@/routes/supervisors';

type TemplateItem = {
    id: number;
    item_type: 'rating_question' | 'text_area';
    label: string;
    is_required: boolean;
};

type EvaluationTemplate = {
    id: number;
    name: string;
    description: string | null;
    items: TemplateItem[];
};

type InternDetail = {
    id: number;
    full_name: string;
    student_number: string;
    section: {
        display_name: string;
        school_year: string | null | undefined;
    } | null;
};

type Props = {
    evaluation: {
        id: number;
        opened_at: string;
        template: EvaluationTemplate | null;
    };
    intern: InternDetail;
};

type ResponseDraft = {
    item_id: number;
    rating?: string;
    text?: string;
};

function buildInitialResponses(template: EvaluationTemplate | null): ResponseDraft[] {
    if (!template) {
        return [];
    }

    return template.items.map((item) => ({
        item_id: item.id,
        rating: item.item_type === 'rating_question' ? '3' : undefined,
        text: item.item_type === 'text_area' ? '' : undefined,
    }));
}

export default function SupervisorEvaluationShow({ evaluation, intern }: Props) {
    const template = evaluation.template;
    const [responses, setResponses] = useState<ResponseDraft[]>(
        buildInitialResponses(template),
    );
    const [evaluationDate, setEvaluationDate] = useState(
        new Date().toISOString().slice(0, 10),
    );

    const submitRoute = submitEvaluation(evaluation.id);

    const responseIndexByItemId = useMemo(() => {
        return new Map(
            responses.map((response, index) => [response.item_id, index]),
        );
    }, [responses]);

    const templateLayoutRows = useMemo(() => {
        if (!template) {
            return [];
        }

        return buildEvaluationTemplateLayout(template.items);
    }, [template]);

    const updateResponse = (
        itemId: number,
        patch: Partial<Omit<ResponseDraft, 'item_id'>>,
    ) => {
        setResponses((current) =>
            current.map((response) =>
                response.item_id === itemId
                    ? { ...response, ...patch }
                    : response,
            ),
        );
    };

    console.log('Supervisor evaluation show page loaded', {
        evaluationId: evaluation.id,
        internId: intern.id,
        templateId: template?.id,
        itemCount: template?.items.length ?? 0,
    });

    return (
        <>
            <Head title={`Evaluate ${intern.full_name}`} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="-ml-2 w-fit"
                >
                    <Link href={supervisorDashboard()} prefetch>
                        <ArrowLeft className="mr-1 size-4" />
                        Back to dashboard
                    </Link>
                </Button>

                <PageHeader
                    title={`Evaluate ${intern.full_name}`}
                    description={
                        template
                            ? `${template.name}${template.description ? ` — ${template.description}` : ''}`
                            : 'Complete the evaluation form for this intern.'
                    }
                    icon={ClipboardList}
                    badgeText="Supervisor"
                />

                <Card className="border-sidebar-border/70 shadow-sm">
                    <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-3">
                                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand shadow-md">
                                    <User className="size-5 text-brand-foreground" />
                                </div>
                                <div>
                                    <CardTitle>{intern.full_name}</CardTitle>
                                    <CardDescription className="mt-1">
                                        {intern.student_number}
                                        {intern.section
                                            ? ` • ${intern.section.display_name}`
                                            : ''}
                                        {intern.section?.school_year
                                            ? ` • ${intern.section.school_year}`
                                            : ''}
                                    </CardDescription>
                                </div>
                            </div>
                            <Badge variant="secondary">Pending evaluation</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!template || template.items.length === 0 ? (
                            <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                                This evaluation sheet is no longer available.
                                Contact the coordinator if you need a new form.
                            </div>
                        ) : (
                            <Form
                                action={submitRoute.url}
                                method={submitRoute.method}
                                className="space-y-6"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        {templateLayoutRows.map((row, rowIndex) => {
                                            if (row.kind === 'rating') {
                                                const item =
                                                    template.items[row.index];
                                                const responseIndex =
                                                    responseIndexByItemId.get(
                                                        item.id,
                                                    ) ?? row.index;
                                                const response =
                                                    responses[responseIndex];

                                                return (
                                                    <div
                                                        key={`rating-${item.id}`}
                                                        className="grid gap-3 rounded-lg border bg-muted/20 p-4"
                                                    >
                                                        <Label>
                                                            {item.label}
                                                            {item.is_required && (
                                                                <span className="text-destructive">
                                                                    {' '}
                                                                    *
                                                                </span>
                                                            )}
                                                        </Label>
                                                        <input
                                                            type="hidden"
                                                            name={`responses[${responseIndex}][item_id]`}
                                                            value={item.id}
                                                        />
                                                        <input
                                                            type="hidden"
                                                            name={`responses[${responseIndex}][rating]`}
                                                            value={
                                                                response?.rating ??
                                                                '3'
                                                            }
                                                        />
                                                        <EvaluationRatingScale
                                                            idPrefix={`rating-${item.id}`}
                                                            value={
                                                                response?.rating ??
                                                                '3'
                                                            }
                                                            onChange={(rating) =>
                                                                updateResponse(
                                                                    item.id,
                                                                    { rating },
                                                                )
                                                            }
                                                        />
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div
                                                    key={`text-row-${rowIndex}`}
                                                    className={cn(
                                                        'grid gap-4',
                                                        textAreaRowGridClass(
                                                            row.indices.length,
                                                        ),
                                                    )}
                                                >
                                                    {row.indices.map(
                                                        (itemIndex) => {
                                                            const item =
                                                                template.items[
                                                                    itemIndex
                                                                ];
                                                            const responseIndex =
                                                                responseIndexByItemId.get(
                                                                    item.id,
                                                                ) ?? itemIndex;
                                                            const response =
                                                                responses[
                                                                    responseIndex
                                                                ];

                                                            return (
                                                                <div
                                                                    key={`text-${item.id}`}
                                                                    className="grid h-full gap-2 rounded-lg border bg-muted/20 p-4"
                                                                >
                                                                    <Label
                                                                        htmlFor={`text-${item.id}`}
                                                                    >
                                                                        {
                                                                            item.label
                                                                        }
                                                                        {item.is_required && (
                                                                            <span className="text-destructive">
                                                                                {' '}
                                                                                *
                                                                            </span>
                                                                        )}
                                                                    </Label>
                                                                    <input
                                                                        type="hidden"
                                                                        name={`responses[${responseIndex}][item_id]`}
                                                                        value={
                                                                            item.id
                                                                        }
                                                                    />
                                                                    <textarea
                                                                        id={`text-${item.id}`}
                                                                        name={`responses[${responseIndex}][text]`}
                                                                        rows={5}
                                                                        value={
                                                                            response?.text ??
                                                                            ''
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            updateResponse(
                                                                                item.id,
                                                                                {
                                                                                    text: event
                                                                                        .target
                                                                                        .value,
                                                                                },
                                                                            )
                                                                        }
                                                                        placeholder="Enter your response"
                                                                        className="flex min-h-[120px] w-full flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                                    />
                                                                </div>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            );
                                        })}

                                        <div className="grid max-w-sm gap-2">
                                            <Label htmlFor="evaluation_date">
                                                Evaluation date
                                            </Label>
                                            <Input
                                                id="evaluation_date"
                                                type="date"
                                                name="evaluation_date"
                                                value={evaluationDate}
                                                max={new Date()
                                                    .toISOString()
                                                    .slice(0, 10)}
                                                onChange={(event) =>
                                                    setEvaluationDate(
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={errors.evaluation_date}
                                            />
                                        </div>

                                        <InputError message={errors.responses} />

                                        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                asChild
                                            >
                                                <Link href={supervisorDashboard()}>
                                                    Cancel
                                                </Link>
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={processing}
                                                className="bg-brand text-brand-foreground hover:bg-brand-hover"
                                            >
                                                {processing && <Spinner />}
                                                Submit evaluation
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </Form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

SupervisorEvaluationShow.layout = {
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: supervisorDashboard(),
        },
        {
            title: 'Evaluation',
        },
    ],
};
