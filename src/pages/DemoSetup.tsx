import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database, Loader2 } from 'lucide-react';

export default function DemoSetup() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const setupDemoData = async () => {
    if (!user) return;
    
    setIsLoading(true);

    try {
      // Insert demo children
      const { data: children, error: childrenError } = await supabase
        .from('children')
        .insert([
          { name: 'Emma Hansen', birth_date: '2019-03-15' },
          { name: 'Lucas Olsen', birth_date: '2020-07-22' },
          { name: 'Sofia Berg', birth_date: '2018-11-08' },
        ])
        .select();

      if (childrenError) throw childrenError;

      // Link first child to current user
      if (children && children.length > 0) {
        const { error: linkError } = await supabase
          .from('parent_children')
          .insert({
            parent_id: user.id,
            child_id: children[0].id,
            relationship: 'Forelder',
            is_primary: true,
          });

        if (linkError) throw linkError;

        // Add authorized pickups for the child
        await supabase
          .from('authorized_pickups')
          .insert([
            {
              child_id: children[0].id,
              name: 'Mormor Anne',
              relationship: 'Besteforelder',
              phone: '987 65 432',
            },
            {
              child_id: children[0].id,
              name: 'Tante Lisa',
              relationship: 'Tante',
              phone: '456 78 901',
            },
          ]);
      }

      toast.success('Demodata opprettet!', {
        description: 'Du kan nå teste alle funksjoner',
      });
      
      window.location.reload();
    } catch (error: any) {
      toast.error('Kunne ikke opprette demodata', {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>Sett opp demodata</CardTitle>
          <CardDescription>
            Vil du opprette testdata for å prøve systemet?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <p className="font-medium">Dette vil opprette:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>3 demo-barn</li>
              <li>1 barn koblet til din konto</li>
              <li>2 godkjente hentere</li>
            </ul>
          </div>

          <Button
            onClick={setupDemoData}
            disabled={isLoading}
            className="w-full h-12"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Oppretter...
              </>
            ) : (
              'Opprett demodata'
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Hopp over
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
