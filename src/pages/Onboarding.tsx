import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Baby, Users, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const roles = [
  {
    value: 'parent',
    label: 'Forelder',
    icon: Baby,
    description: 'Jeg skal melde henting av mitt barn',
    color: 'primary',
  },
  {
    value: 'employee',
    label: 'Ansatt',
    icon: Users,
    description: 'Jeg jobber i barnehagen og skal godkjenne hentinger',
    color: 'secondary',
  },
  {
    value: 'admin',
    label: 'Administrator',
    icon: Shield,
    description: 'Jeg skal administrere systemet',
    color: 'destructive',
  },
];

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectRole = async () => {
    if (!selectedRole || !user) return;

    setIsLoading(true);

    // Remove existing parent role
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', user.id)
      .eq('role', 'parent');

    // Add selected role
    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role: selectedRole as 'parent' | 'employee' | 'admin',
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
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Baby className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Velkommen til Krysselista!</CardTitle>
          <CardDescription>
            Velg din rolle for å komme i gang
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {roles.map((role) => {
              const Icon = role.icon;
              const isSelected = selectedRole === role.value;
              
              return (
                <button
                  key={role.value}
                  onClick={() => setSelectedRole(role.value)}
                  className={`p-6 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? `border-${role.color} bg-${role.color}/5`
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                    isSelected ? `bg-${role.color}/10` : 'bg-muted'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      isSelected ? `text-${role.color}` : 'text-muted-foreground'
                    }`} />
                  </div>
                  <h3 className="font-semibold mb-2">{role.label}</h3>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </button>
              );
            })}
          </div>

          <Button
            onClick={handleSelectRole}
            disabled={!selectedRole || isLoading}
            className="w-full h-12"
            size="lg"
          >
            {isLoading ? 'Lagrer...' : 'Fortsett'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Dette er en demo. I produksjon ville admin-godkjenning vært påkrevd.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
