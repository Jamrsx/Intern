import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type AppModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
};

export function AppModal({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    className,
}: AppModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    'flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg',
                    className,
                )}
                showCloseButton
                overlayClassName="bg-clear bg-opacity-20 backdrop-blur-sm"
            >
                <DialogHeader className="shrink-0 border-b px-6 py-4">
                    <DialogTitle>{title}</DialogTitle>
                    {description && (
                        <DialogDescription>{description}</DialogDescription>
                    )}
                </DialogHeader>
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                    {children}
                </div>
                {footer ? (
                    <DialogFooter className="shrink-0 border-t px-6 py-4">
                        {footer}
                    </DialogFooter>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
