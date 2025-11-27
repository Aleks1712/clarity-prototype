import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Shield, AlertTriangle } from 'lucide-react';

interface ConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  personName: string;
  relationship: string;
  childName: string;
}

export function ConsentDialog({
  open,
  onOpenChange,
  onConfirm,
  personName,
  relationship,
  childName,
}: ConsentDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-warning" />
            </div>
            <AlertDialogTitle className="text-xl">
              Samtykke til henting
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-4 text-base">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="font-medium text-foreground">Du er i ferd med å godkjenne:</p>
              <div className="space-y-1 text-sm">
                <p><span className="font-semibold">Person:</span> {personName}</p>
                <p><span className="font-semibold">Relasjon:</span> {relationship}</p>
                <p><span className="font-semibold">Barn:</span> {childName}</p>
              </div>
            </div>

            <div className="flex gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-foreground">Viktig informasjon:</p>
                <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Ved å godkjenne gir du denne personen lov til å hente {childName}</li>
                  <li>Personalet vil sjekke legitimasjon ved henting</li>
                  <li>Du kan trekke tilbake samtykket når som helst</li>
                  <li>Dette lagres i henhold til GDPR-regler</li>
                </ul>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Ved å bekrefte samtykker du eksplisitt til at <strong>{personName}</strong> kan hente barnet ditt fra barnehagen.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-primary hover:bg-primary/90"
          >
            Jeg godkjenner og samtykker
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
