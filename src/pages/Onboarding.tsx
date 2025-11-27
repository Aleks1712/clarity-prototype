import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Baby } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectRole = async () => {
    if (!user) return;

    setIsLoading(true);

    // User can only register as parent (security fix)
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: 'parent',
      });

    if (error) {
      toast.error('Kunne ikke velge rolle');
      setIsLoading(false);
      return;
    }

    toast.success('Rolle valgt! Laster inn...');
    
    // Reload to fetch new role
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Baby className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Velkommen til Krysselista!</CardTitle>
          <CardDescription>
            Fullfør registreringen for å komme i gang
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Parent Role Card */}
          <div className="p-6 rounded-xl border-2 border-primary bg-primary/5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Baby className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-1">Forelder</h3>
                <p className="text-sm text-muted-foreground">
                  Du registreres som forelder og kan sende henteforespørsler for dine barn.
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="glass p-4 rounded-xl border border-primary/20 text-sm">
            <p className="mb-2">
              <span className="font-semibold text-foreground">Som forelder kan du:</span>
            </p>
            <ul className="space-y-1 text-muted-foreground ml-4">
              <li>• Sende henteforespørsler</li>
              <li>• Chatte med barnehagen</li>
              <li>• Se historikk over hentinger</li>
            </ul>
            <p className="text-xs mt-3 text-primary border-t border-primary/20 pt-3">
              📌 <strong>Trenger du ansatt- eller admin-tilgang?</strong>
              <br />
              Kontakt barnehagens administrator for å få tildelt riktig rolle.
            </p>
          </div>

          <Button
            onClick={handleSelectRole}
            disabled={isLoading}
            className="w-full h-14 text-lg bg-gradient-primary hover:shadow-glow"
            size="lg"
          >
            {isLoading ? 'Lagrer...' : 'Fortsett som forelder'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
