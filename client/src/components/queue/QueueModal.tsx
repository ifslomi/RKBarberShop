import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Activity } from "lucide-react";
import { QueueBoard } from "./QueueBoard";
import type { QueueItem, Barber } from "@/lib/types";

interface QueueModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  queue: QueueItem[];
  barbers: Barber[];
  loading?: boolean;
}

export function QueueModal({ open, onOpenChange, queue, barbers, loading }: QueueModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-card border-border/50 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Live Queue Board
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">
          Real-time walk-in queue status for each barber.
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="pt-2">
            <QueueBoard queue={queue} barbers={barbers} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
