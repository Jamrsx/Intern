import { cn } from '@/lib/utils';

const ratingOptions = [
    { value: '1', label: 'Poor' },
    { value: '2', label: 'Needs improvement' },
    { value: '3', label: 'Satisfactory' },
    { value: '4', label: 'Very good' },
    { value: '5', label: 'Outstanding' },
] as const;

type EvaluationRatingScaleProps = {
    value: string;
    onChange: (value: string) => void;
    idPrefix: string;
};

export function EvaluationRatingScale({
    value,
    onChange,
    idPrefix,
}: EvaluationRatingScaleProps) {
    const selected = ratingOptions.find((option) => option.value === value);

    console.log('Evaluation rating scale rendered', {
        idPrefix,
        value,
    });

    return (
        <div className="space-y-2">
            <div
                className="grid grid-cols-5 gap-2"
                role="radiogroup"
                aria-label="Rating from 1 to 5"
            >
                {ratingOptions.map((option) => {
                    const isSelected = value === option.value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            id={`${idPrefix}-${option.value}`}
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`${option.value} - ${option.label}`}
                            onClick={() => onChange(option.value)}
                            className={cn(
                                'flex min-h-11 flex-col items-center justify-center rounded-lg border px-1 py-2 text-sm font-semibold transition-colors',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
                                isSelected
                                    ? 'border-brand bg-brand text-brand-foreground shadow-sm'
                                    : 'border-input bg-background text-foreground hover:border-brand/40 hover:bg-brand/5',
                            )}
                        >
                            {option.value}
                        </button>
                    );
                })}
            </div>
            <p className="min-h-5 text-center text-xs text-muted-foreground">
                {selected
                    ? `${selected.value} — ${selected.label}`
                    : 'Tap a score from 1 to 5'}
            </p>
        </div>
    );
}
