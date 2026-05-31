import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    buildEvaluationTemplateLayout,
    ratingScalePreview,
    textAreaRowGridClass,
} from '@/lib/evaluation-template-layout';
import { cn } from '@/lib/utils';

export type EvaluationTemplateDraftItem = {
    item_type: 'rating_question' | 'text_area';
    label: string;
    is_required: boolean;
};

export function emptyEvaluationTemplateItem(
    type: EvaluationTemplateDraftItem['item_type'],
): EvaluationTemplateDraftItem {
    return {
        item_type: type,
        label: '',
        is_required: true,
    };
}

function ItemTypeBadge({
    type,
}: {
    type: EvaluationTemplateDraftItem['item_type'];
}) {
    return (
        <Badge variant="secondary" className="shrink-0">
            {type === 'rating_question' ? 'Rating (1–5)' : 'Text area'}
        </Badge>
    );
}

function RatingScalePreview() {
    return (
        <div className="mt-3 rounded-md border border-dashed bg-background/80 px-3 py-2">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Supervisor view
            </p>
            <div className="flex flex-wrap gap-2">
                {ratingScalePreview.map((value) => (
                    <span
                        key={value}
                        className="inline-flex size-8 items-center justify-center rounded-full border bg-muted/40 text-xs font-medium text-muted-foreground"
                    >
                        {value}
                    </span>
                ))}
            </div>
        </div>
    );
}

type ItemCardProps = {
    item: EvaluationTemplateDraftItem;
    index: number;
    totalItems: number;
    errors: Record<string, string | undefined>;
    compact?: boolean;
    onMove: (index: number, direction: -1 | 1) => void;
    onUpdate: (index: number, patch: Partial<EvaluationTemplateDraftItem>) => void;
    onRemove: (index: number) => void;
};

function ItemEditorCard({
    item,
    index,
    totalItems,
    errors,
    compact = false,
    onMove,
    onUpdate,
    onRemove,
}: ItemCardProps) {
    return (
        <div
            className={cn(
                'flex h-full flex-col rounded-lg border bg-muted/20 p-4',
                item.item_type === 'rating_question' && 'w-full',
            )}
        >
            <div className="mb-3 flex items-center justify-between gap-2">
                <ItemTypeBadge type={item.item_type} />
                <div className="flex items-center gap-1">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={index === 0}
                        onClick={() => onMove(index, -1)}
                        aria-label="Move up"
                    >
                        <ArrowUp className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={index === totalItems - 1}
                        onClick={() => onMove(index, 1)}
                        aria-label="Move down"
                    >
                        <ArrowDown className="size-4" />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        onClick={() => onRemove(index)}
                        aria-label="Remove item"
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </div>

            <input
                type="hidden"
                name={`items[${index}][item_type]`}
                value={item.item_type}
            />
            <input
                type="hidden"
                name={`items[${index}][is_required]`}
                value={item.is_required ? '1' : '0'}
            />

            <div className="grid flex-1 gap-2">
                <Label htmlFor={`item-label-${index}`}>Label</Label>
                <Input
                    id={`item-label-${index}`}
                    name={`items[${index}][label]`}
                    value={item.label}
                    onChange={(event) =>
                        onUpdate(index, {
                            label: event.target.value,
                        })
                    }
                    placeholder={
                        item.item_type === 'rating_question'
                            ? 'e.g. Quality of work'
                            : compact
                              ? 'e.g. Strengths'
                              : 'e.g. Strengths and areas for improvement'
                    }
                />
                <InputError message={errors[`items.${index}.label`]} />
            </div>

            {item.item_type === 'rating_question' && <RatingScalePreview />}

            {item.item_type === 'text_area' && (
                <div className="mt-3 flex-1 rounded-md border border-dashed bg-background/80 px-3 py-6 text-center text-xs text-muted-foreground">
                    Text response area
                </div>
            )}

            <label className="mt-3 flex items-center gap-2 text-sm">
                <Checkbox
                    checked={item.is_required}
                    onCheckedChange={(checked) =>
                        onUpdate(index, {
                            is_required: checked === true,
                        })
                    }
                />
                Required
            </label>
        </div>
    );
}

type Props = {
    items: EvaluationTemplateDraftItem[];
    onChange: (items: EvaluationTemplateDraftItem[]) => void;
    errors: Record<string, string | undefined>;
};

export function EvaluationTemplateItemsEditor({
    items,
    onChange,
    errors,
}: Props) {
    const layoutRows = buildEvaluationTemplateLayout(items);

    const moveItem = (index: number, direction: -1 | 1) => {
        const nextIndex = index + direction;

        if (nextIndex < 0 || nextIndex >= items.length) {
            return;
        }

        const next = [...items];
        [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
        onChange(next);
    };

    const updateItem = (
        index: number,
        patch: Partial<EvaluationTemplateDraftItem>,
    ) => {
        onChange(
            items.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...patch } : item,
            ),
        );
    };

    const removeItem = (index: number) => {
        onChange(items.filter((_, itemIndex) => itemIndex !== index));
    };

    console.log('Evaluation template items editor rendered', {
        itemCount: items.length,
        layoutRowCount: layoutRows.length,
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        onChange([
                            ...items,
                            emptyEvaluationTemplateItem('rating_question'),
                        ])
                    }
                >
                    <Plus className="mr-1 size-4" />
                    Rating question
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        onChange([
                            ...items,
                            emptyEvaluationTemplateItem('text_area'),
                        ])
                    }
                >
                    <Plus className="mr-1 size-4" />
                    Text area
                </Button>
            </div>

            <p className="text-sm text-muted-foreground">
                Rating questions span the full width. Text areas sit side by
                side up to three columns per row.
            </p>

            {items.length === 0 ? (
                <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                    Add at least one rating question or text area.
                </p>
            ) : (
                <div className="space-y-4">
                    {layoutRows.map((row, rowIndex) => {
                        if (row.kind === 'rating') {
                            const item = items[row.index];

                            return (
                                <ItemEditorCard
                                    key={`rating-${row.index}`}
                                    item={item}
                                    index={row.index}
                                    totalItems={items.length}
                                    errors={errors}
                                    onMove={moveItem}
                                    onUpdate={updateItem}
                                    onRemove={removeItem}
                                />
                            );
                        }

                        return (
                            <div
                                key={`text-row-${rowIndex}-${row.indices.join('-')}`}
                                className={cn(
                                    'grid gap-4',
                                    textAreaRowGridClass(row.indices.length),
                                )}
                            >
                                {row.indices.map((itemIndex) => (
                                    <ItemEditorCard
                                        key={`text-${itemIndex}`}
                                        item={items[itemIndex]}
                                        index={itemIndex}
                                        totalItems={items.length}
                                        errors={errors}
                                        compact
                                        onMove={moveItem}
                                        onUpdate={updateItem}
                                        onRemove={removeItem}
                                    />
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}

            <InputError message={errors.items} />
        </div>
    );
}
