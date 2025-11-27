import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Baby, Users, Shield, LogOut, Plus, Briefcase, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch profiles and roles separately since there's no FK relationship
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*');

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role');

    // Combine profiles with their roles
    if (profilesData && rolesData) {
      const usersWithRoles = profilesData.map(profile => ({
        ...profile,
        roles: rolesData.filter(r => r.user_id === profile.id).map(r => ({ role: r.role }))
      }));
      setUsers(usersWithRoles);
      
      // Filter employees (users with employee role)
      const employeeUsers = usersWithRoles.filter(u => 
        u.roles.some((r: any) => r.role === 'employee')
      );
      setEmployees(employeeUsers);
    }

    // Fetch children
    const { data: childrenData } = await supabase
      .from('children')
      .select('*');

    // Fetch parent-child relationships
    const { data: parentChildrenData } = await supabase
      .from('parent_children')
      .select('child_id, parent_id');

    // Fetch parent names
    const parentIds = [...new Set(parentChildrenData?.map(pc => pc.parent_id) || [])];
    const { data: parentProfiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', parentIds);

    // Combine children with their parents
    if (childrenData) {
      const childrenWithParents = childrenData.map(child => ({
        ...child,
        parents: parentChildrenData
          ?.filter(pc => pc.child_id === child.id)
          .map(pc => ({
            parent: parentProfiles?.find(p => p.id === pc.parent_id)
          })) || []
      }));
      setChildren(childrenWithParents);
    }
  };

  const handleAddChild = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('childName') as string;
    const parentEmail = formData.get('parentEmail') as string;

    try {
      // Insert child
      const { data: child, error: childError } = await supabase
        .from('children')
        .insert({ name })
        .select()
        .single();

      if (childError) throw childError;

      // Find parent by email
      if (parentEmail) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .ilike('full_name', `%${parentEmail}%`)
          .single();

        if (profile && child) {
          await supabase
            .from('parent_children')
            .insert({
              parent_id: profile.id,
              child_id: child.id,
              relationship: 'Forelder',
            });
        }
      }

      toast.success('Barn lagt til!');
      fetchData();
      e.currentTarget.reset();
    } catch (error: any) {
      toast.error('Kunne ikke legge til barn: ' + error.message);
    }

    setIsLoading(false);
  };

  const setupDemoData = async () => {
    setIsLoading(true);

    try {
      // Get first user (could be current user or any user)
      const { data: firstUser } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();

      if (!firstUser) throw new Error('Ingen brukere funnet');

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

      // Link first child to first user
      if (children && children.length > 0) {
        await supabase
          .from('parent_children')
          .insert({
            parent_id: firstUser.id,
            child_id: children[0].id,
            relationship: 'Forelder',
            is_primary: true,
          });

        // Add authorized pickups
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

      toast.success('Demodata opprettet!');
      fetchData();
    } catch (error: any) {
      toast.error('Kunne ikke opprette demodata: ' + error.message);
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

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsLoading(true);

    try {
      // Delete user roles first
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userToDelete.id);

      // Delete profile (this will cascade to related data)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;

      toast.success(`${userToDelete.name} er fjernet fra systemet`);
      fetchData();
    } catch (error: any) {
      toast.error('Kunne ikke fjerne bruker: ' + error.message);
    }

    setUserToDelete(null);
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Brukere
            </TabsTrigger>
            <TabsTrigger value="employees">
              <Briefcase className="w-4 h-4 mr-2" />
              Ansatte
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
                      <div className="flex items-center gap-2">
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setUserToDelete({ id: user.id, name: user.full_name })}
                          disabled={isLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Ansatte i barnehagen
                </CardTitle>
                <CardDescription>
                  Oversikt over alle ansatte (IT-ansvarlig og ledere har tilgang her)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {employees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Ingen ansatte registrert ennå.</p>
                    <p className="text-sm mt-2">
                      Tildel "Ansatt"-rolle til en bruker i Brukere-fanen.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {employees.map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center justify-between p-4 border rounded-lg bg-secondary/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{employee.full_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {employee.phone || 'Ingen telefon registrert'}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Roller: {employee.roles?.map((r: any) => r.role).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="children" className="space-y-4">
            {/* Quick Demo Setup */}
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Hurtigoppsett (Demo)
                </CardTitle>
                <CardDescription>
                  Opprett testdata med ett klikk for å teste systemet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={setupDemoData}
                  disabled={isLoading}
                  size="lg"
                  className="w-full"
                >
                  Opprett demodata (3 barn + koblinger)
                </Button>
              </CardContent>
            </Card>

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
                  <div className="space-y-2">
                    <Label htmlFor="parentEmail">Forelder (valgfritt)</Label>
                    <Input
                      id="parentEmail"
                      name="parentEmail"
                      placeholder="Søk etter forelder..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Skriv inn navn på forelder for å koble barnet
                    </p>
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

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker på at du vil fjerne denne brukeren?</AlertDialogTitle>
            <AlertDialogDescription>
              Du er i ferd med å fjerne <strong>{userToDelete?.name}</strong> fra systemet. 
              Dette vil også fjerne alle roller og tilknytninger. Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ja, fjern bruker
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
