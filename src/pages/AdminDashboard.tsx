import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Baby, Users, Shield, LogOut, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: usersData } = await supabase
      .from('profiles')
      .select(`
        *,
        roles:user_roles(role)
      `);

    const { data: childrenData } = await supabase
      .from('children')
      .select(`
        *,
        parents:parent_children(
          parent:profiles(full_name)
        )
      `);

    if (usersData) setUsers(usersData);
    if (childrenData) setChildren(childrenData);
  };

  const handleAddChild = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('childName') as string;

    const { error } = await supabase
      .from('children')
      .insert({ name });

    if (error) {
      toast.error('Kunne ikke legge til barn');
    } else {
      toast.success('Barn lagt til!');
      fetchData();
      e.currentTarget.reset();
    }

    setIsLoading(false);
  };

  const handleAssignRole = async (userId: string, role: string) => {
    setIsLoading(true);

    const { error } = await supabase
      .from('user_roles')
      .insert([{
        user_id: userId,
        role: role as 'parent' | 'employee' | 'admin',
      }]);

    if (error) {
      toast.error('Kunne ikke tildele rolle');
    } else {
      toast.success('Rolle tildelt!');
      fetchData();
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <div className="bg-card border-b shadow-sm">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Krysselista Admin</h1>
              <p className="text-sm text-muted-foreground">Administrator</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Brukere
            </TabsTrigger>
            <TabsTrigger value="children">
              <Baby className="w-4 h-4 mr-2" />
              Barn
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Brukerhåndtering</CardTitle>
                <CardDescription>
                  Administrer brukere og tildel roller (forelder, ansatt, admin)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-semibold">{user.full_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Roller: {user.roles?.map((r: any) => r.role).join(', ') || 'Ingen'}
                        </p>
                      </div>
                      <Select
                        onValueChange={(role) => handleAssignRole(user.id, role)}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Tildel rolle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="parent">Forelder</SelectItem>
                          <SelectItem value="employee">Ansatt</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="children" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Legg til nytt barn</CardTitle>
                <CardDescription>
                  Registrer barn i systemet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddChild} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="childName">Barnets navn</Label>
                    <Input
                      id="childName"
                      name="childName"
                      placeholder="F.eks. Emma Hansen"
                      required
                    />
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    <Plus className="w-4 h-4 mr-2" />
                    Legg til barn
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Registrerte barn</CardTitle>
                <CardDescription>
                  Oversikt over alle barn i systemet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h4 className="font-semibold">{child.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Foreldre: {child.parents?.map((p: any) => p.parent?.full_name).join(', ') || 'Ingen tilknyttet'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
