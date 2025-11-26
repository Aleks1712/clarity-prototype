import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Baby } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'parent' | 'employee' | 'admin'>('parent');

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Velkommen tilbake!');
    }

    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    const { error } = await signUp(email, password, fullName);

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    // Update role if not default parent role
    if (selectedRole !== 'parent') {
      // Wait a bit for the user to be created
      setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .update({ role: selectedRole })
            .eq('user_id', user.id);

          if (roleError) {
            console.error('Error updating role:', roleError);
          }
        }
      }, 500);
    }

    toast.success('Konto opprettet! Logger inn...');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <Card className="w-full max-w-md glass relative z-10">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mb-2 shadow-glow">
            <Baby className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-primary bg-clip-text text-transparent">
            Krysselista
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Sikker og enkel henting fra barnehagen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 glass">
              <TabsTrigger value="signin" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                Logg inn
              </TabsTrigger>
              <TabsTrigger value="signup" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                Registrer
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email" className="text-foreground font-medium">E-post</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="deg@eksempel.no"
                    required
                    className="glass border-white/20 focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password" className="text-foreground font-medium">Passord</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    required
                    className="glass border-white/20 focus:border-primary/50"
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary hover:shadow-glow text-lg h-12" disabled={isLoading}>
                  {isLoading ? 'Logger inn...' : 'Logg inn'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-foreground font-medium">Fullt navn</Label>
                  <Input
                    id="signup-name"
                    name="fullName"
                    type="text"
                    placeholder="Ola Nordmann"
                    required
                    className="glass border-white/20 focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-foreground font-medium">E-post</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="deg@eksempel.no"
                    required
                    className="glass border-white/20 focus:border-primary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-foreground font-medium">Passord</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    required
                    className="glass border-white/20 focus:border-primary/50"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label className="text-foreground font-medium">Jeg er en</Label>
                  <RadioGroup value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)} className="space-y-2">
                    <div className="flex items-center space-x-2 glass p-3 rounded-lg border border-white/20">
                      <RadioGroupItem value="parent" id="role-parent" />
                      <Label htmlFor="role-parent" className="flex-1 cursor-pointer font-normal">
                        Forelder - Henter barn fra barnehagen
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 glass p-3 rounded-lg border border-white/20">
                      <RadioGroupItem value="employee" id="role-employee" />
                      <Label htmlFor="role-employee" className="flex-1 cursor-pointer font-normal">
                        Ansatt - Jobber i barnehagen
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 glass p-3 rounded-lg border border-white/20">
                      <RadioGroupItem value="admin" id="role-admin" />
                      <Label htmlFor="role-admin" className="flex-1 cursor-pointer font-normal">
                        Administrator - Administrerer systemet
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <Button type="submit" className="w-full bg-gradient-primary hover:shadow-glow text-lg h-12" disabled={isLoading}>
                  {isLoading ? 'Oppretter konto...' : 'Opprett konto'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
