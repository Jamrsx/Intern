type ItemWithType = {
    item_type: string;
};

export type EvaluationTemplateLayoutRow =
    | { kind: 'rating'; index: number }
    | { kind: 'text_row'; indices: number[] };

export function buildEvaluationTemplateLayout<T extends ItemWithType>(
    items: T[],
): EvaluationTemplateLayoutRow[] {
    const rows: EvaluationTemplateLayoutRow[] = [];
    let textBuffer: number[] = [];

    const flushTextRows = () => {
        while (textBuffer.length > 0) {
            rows.push({
                kind: 'text_row',
                indices: textBuffer.splice(0, 3),
            });
        }
    };

    for (let index = 0; index < items.length; index++) {
        if (items[index].item_type === 'text_area') {
            textBuffer.push(index);
            continue;
        }

        flushTextRows();
        rows.push({ kind: 'rating', index });
    }

    flushTextRows();

    return rows;
}

export function textAreaRowGridClass(columnCount: number): string {
    if (columnCount <= 1) {
        return 'grid-cols-1';
    }

    if (columnCount === 2) {
        return 'grid-cols-1 sm:grid-cols-2';
    }

    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
}

export const ratingScalePreview = ['1', '2', '3', '4', '5'] as const;
