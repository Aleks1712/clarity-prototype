import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, Shield, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { ConsentDialog } from './ConsentDialog';
import { useAuth } from '@/contexts/AuthContext';
import { authorizedPickupSchema, type AuthorizedPickupFormData } from '@/lib/validations';

interface AuthorizedPickup {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
  consent_given: boolean;
  consent_date: string | null;
  added_by: string | null;
}

interface AuthorizedPickupsManagerProps {
  childId: string;
  childName: string;
}

export function AuthorizedPickupsManager({ childId, childName }: AuthorizedPickupsManagerProps) {
  const { user } = useAuth();
  const [pickups, setPickups] = useState<AuthorizedPickup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [pendingPickup, setPendingPickup] = useState<AuthorizedPickupFormData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    phone: '',
  });

  useEffect(() => {
    fetchPickups();
  }, [childId]);

  const fetchPickups = async () => {
    const { data } = await supabase
      .from('authorized_pickups')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    if (data) {
      setPickups(data);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form data
    const validation = authorizedPickupSchema.safeParse(formData);

    if (!validation.success) {
      const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
      toast.error(firstError || 'Ugyldig data');
      return;
    }

    // Show consent dialog before adding
    setPendingPickup(validation.data);
    setShowConsentDialog(true);
  };

  const handleConfirmConsent = async () => {
    if (!pendingPickup || !user) return;

    setIsLoading(true);
    setShowConsentDialog(false);

    const { error } = await supabase.from('authorized_pickups').insert({
      child_id: childId,
      name: pendingPickup.name,
      relationship: pendingPickup.relationship,
      phone: pendingPickup.phone || null,
      consent_given: true,
      consent_date: new Date().toISOString(),
      added_by: user.id,
    });

    if (error) {
      toast.error('Kunne ikke legge til henteperson');
    } else {
      toast.success('Henteperson lagt til med samtykke', {
        description: `${pendingPickup.name} kan nå hente ${childName}`,
      });
      setFormData({ name: '', relationship: '', phone: '' });
      setShowAddForm(false);
      setPendingPickup(null);
      fetchPickups();
    }

    setIsLoading(false);
  };

  const handleRevokeConsent = async (pickupId: string, pickupName: string) => {
    if (!confirm(`Er du sikker på at du vil trekke tilbake samtykke for ${pickupName}?`)) {
      return;
    }

    setIsLoading(true);

    const { error } = await supabase
      .from('authorized_pickups')
      .delete()
      .eq('id', pickupId);

    if (error) {
      toast.error('Kunne ikke fjerne henteperson');
    } else {
      toast.success('Samtykke trukket tilbake', {
        description: `${pickupName} kan ikke lenger hente ${childName}`,
      });
      fetchPickups();
    }

    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Godkjente hentepersoner
            </CardTitle>
            <CardDescription>
              Administrer hvem som kan hente {childName}
            </CardDescription>
          </div>
          {!showAddForm && (
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Legg til
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-muted/50 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Navn *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="F.eks. Berit Hansen"
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="relationship">Relasjon *</Label>
              <Input
                id="relationship"
                value={formData.relationship}
                onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                placeholder="F.eks. Bestemor"
                required
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefonnummer (valgfritt)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="F.eks. 12345678"
                maxLength={15}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isLoading}>
                <Shield className="w-4 h-4 mr-2" />
                Fortsett til samtykke
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ name: '', relationship: '', phone: '' });
                }}
              >
                Avbryt
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {pickups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Ingen godkjente hentepersoner</p>
              <p className="text-sm">Legg til personer som kan hente {childName}</p>
            </div>
          ) : (
            pickups.map((pickup) => (
              <div
                key={pickup.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold">{pickup.name}</h4>
                    {pickup.consent_given ? (
                      <Badge variant="default" className="bg-success text-success-foreground">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Godkjent
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Clock className="w-3 h-3 mr-1" />
                        Venter
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{pickup.relationship}</p>
                  {pickup.phone && (
                    <p className="text-sm text-muted-foreground">Tlf: {pickup.phone}</p>
                  )}
                  {pickup.consent_date && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Samtykke gitt: {new Date(pickup.consent_date).toLocaleDateString('nb-NO')}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRevokeConsent(pickup.id, pickup.name)}
                  disabled={isLoading}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {pendingPickup && (
        <ConsentDialog
          open={showConsentDialog}
          onOpenChange={setShowConsentDialog}
          onConfirm={handleConfirmConsent}
          personName={pendingPickup.name}
          relationship={pendingPickup.relationship}
          childName={childName}
        />
      )}
    </Card>
  );
}
