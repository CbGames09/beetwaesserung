import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface PINDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  correctPIN: string;
}

export function PINDialog({ open, onClose, onSuccess, correctPIN }: PINDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);

      if (newPin.length === 4) {
        setTimeout(() => {
          if (newPin === correctPIN) {
            onSuccess();
            setPin("");
            setError(false);
          } else {
            setError(true);
            setTimeout(() => {
              setPin("");
              setError(false);
            }, 1000);
          }
        }, 100);
      }
    }
  };

  const handleClear = () => {
    setPin("");
    setError(false);
  };

  const handleCancel = () => {
    setPin("");
    setError(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-pin">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Lock className="h-5 w-5" />
            <span>PIN eingeben</span>
          </DialogTitle>
          <DialogDescription>
            Geben Sie Ihre 4-stellige PIN ein, um auf die Einstellungen zuzugreifen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex justify-center space-x-3">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-mono ${
                  error
                    ? "border-destructive bg-destructive/10"
                    : pin.length > idx
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/30"
                }`}
                data-testid={`pin-display-${idx}`}
              >
                {pin.length > idx && "•"}
              </div>
            ))}
          </div>

          {error && (
            <p className="text-sm text-destructive text-center font-medium" data-testid="text-pin-error">
              Falsche PIN. Bitte versuchen Sie es erneut.
            </p>
          )}

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                size="lg"
                className="h-16 text-xl font-semibold"
                onClick={() => handleNumberClick(num.toString())}
                disabled={pin.length >= 4}
                data-testid={`button-pin-${num}`}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outline"
              size="lg"
              className="h-16 text-xl font-semibold"
              onClick={handleClear}
              data-testid="button-pin-clear"
            >
              C
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-16 text-xl font-semibold"
              onClick={() => handleNumberClick("0")}
              disabled={pin.length >= 4}
              data-testid="button-pin-0"
            >
              0
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="h-16"
              onClick={handleCancel}
              data-testid="button-pin-cancel"
            >
              Abbrechen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
