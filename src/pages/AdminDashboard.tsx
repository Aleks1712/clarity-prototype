import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Baby, Users, Shield, LogOut, Plus, Briefcase, Trash2, X, Pencil, ClipboardList, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [children, setChildren] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [roleToRemove, setRoleToRemove] = useState<{ userId: string; userName: string; role: string } | null>(null);
  const [employeeToEdit, setEmployeeToEdit] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' });
  const [childToDelete, setChildToDelete] = useState<{ id: string; name: string } | null>(null);
  const [childToEdit, setChildToEdit] = useState<any | null>(null);
  const [childEditForm, setChildEditForm] = useState({ name: '', birth_date: '', notes: '' });
  const [newUserForm, setNewUserForm] = useState({ email: '', password: '', full_name: '' });
  const [showAddUserForm, setShowAddUserForm] = useState(false);

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

  const handleRemoveRole = async () => {
    if (!roleToRemove) return;
    
    setIsLoading(true);

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', roleToRemove.userId)
      .eq('role', roleToRemove.role as 'parent' | 'employee' | 'admin');

    if (error) {
      toast.error('Kunne ikke fjerne rolle: ' + error.message);
    } else {
      toast.success(`Rollen "${roleToRemove.role}" er fjernet fra ${roleToRemove.userName}`);
      fetchData();
    }

    setRoleToRemove(null);
    setIsLoading(false);
  };

  const handleEditEmployee = (employee: any) => {
    setEmployeeToEdit(employee);
    setEditForm({
      full_name: employee.full_name || '',
      phone: employee.phone || '',
    });
  };

  const handleUpdateEmployee = async () => {
    if (!employeeToEdit) return;
    
    setIsLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name,
        phone: editForm.phone,
      })
      .eq('id', employeeToEdit.id);

    if (error) {
      toast.error('Kunne ikke oppdatere ansatt: ' + error.message);
    } else {
      toast.success('Ansattinformasjon oppdatert!');
      fetchData();
    }

    setEmployeeToEdit(null);
    setIsLoading(false);
  };

  const handleEditChild = (child: any) => {
    setChildToEdit(child);
    setChildEditForm({
      name: child.name || '',
      birth_date: child.birth_date || '',
      notes: child.notes || '',
    });
  };

  const handleUpdateChild = async () => {
    if (!childToEdit) return;
    
    setIsLoading(true);

    const { error } = await supabase
      .from('children')
      .update({
        name: childEditForm.name,
        birth_date: childEditForm.birth_date || null,
        notes: childEditForm.notes || null,
      })
      .eq('id', childToEdit.id);

    if (error) {
      toast.error('Kunne ikke oppdatere barn: ' + error.message);
    } else {
      toast.success('Barnet er oppdatert!');
      fetchData();
    }

    setChildToEdit(null);
    setIsLoading(false);
  };

  const handleDeleteChild = async () => {
    if (!childToDelete) return;
    
    setIsLoading(true);

    try {
      // First delete related records
      await supabase
        .from('authorized_pickups')
        .delete()
        .eq('child_id', childToDelete.id);

      await supabase
        .from('pickup_logs')
        .delete()
        .eq('child_id', childToDelete.id);

      await supabase
        .from('chat_messages')
        .delete()
        .eq('child_id', childToDelete.id);

      await supabase
        .from('parent_children')
        .delete()
        .eq('child_id', childToDelete.id);

      // Then delete the child
      const { error } = await supabase
        .from('children')
        .delete()
        .eq('id', childToDelete.id);

      if (error) throw error;

      toast.success(`${childToDelete.name} er fjernet fra systemet`);
      fetchData();
    } catch (error: any) {
      toast.error('Kunne ikke fjerne barn: ' + error.message);
    }

    setChildToDelete(null);
    setIsLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Ikke innlogget');
      }

      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.id }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Kunne ikke fjerne bruker');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success(`${userToDelete.name} er fjernet fra systemet`);
      fetchData();
    } catch (error: any) {
      toast.error('Kunne ikke fjerne bruker: ' + error.message);
    }

    setUserToDelete(null);
    setIsLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Ikke innlogget');
      }

      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserForm.email,
          password: newUserForm.password,
          full_name: newUserForm.full_name,
          role: 'employee',
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Kunne ikke opprette bruker');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success(`Ansatt ${newUserForm.full_name} opprettet!`);
      setNewUserForm({ email: '', password: '', full_name: '' });
      setShowAddUserForm(false);
      fetchData();
    } catch (error: any) {
      toast.error('Kunne ikke opprette bruker: ' + error.message);
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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/employee')}>
              <ClipboardList className="w-4 h-4 mr-2" />
              Ansatt-dashbord
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
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
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-sm text-muted-foreground">Roller:</span>
                          {user.roles?.length > 0 ? (
                            user.roles.map((r: any) => (
                              <Badge
                                key={r.role}
                                variant="secondary"
                                className="cursor-pointer hover:bg-destructive/20 group"
                                onClick={() => setRoleToRemove({ userId: user.id, userName: user.full_name, role: r.role })}
                              >
                                {r.role}
                                <X className="w-3 h-3 ml-1 opacity-50 group-hover:opacity-100" />
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">Ingen</span>
                          )}
                        </div>
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

            {/* Add New Employee Button/Form */}
            {!showAddUserForm ? (
              <Button 
                onClick={() => setShowAddUserForm(true)} 
                className="w-full"
                variant="outline"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Legg til ny ansatt
              </Button>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5" />
                        Opprett ny ansatt
                      </CardTitle>
                      <CardDescription>
                        Legg til en ny ansatt i systemet
                      </CardDescription>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setShowAddUserForm(false)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="newUserName">Fullt navn</Label>
                        <Input
                          id="newUserName"
                          value={newUserForm.full_name}
                          onChange={(e) => setNewUserForm({ ...newUserForm, full_name: e.target.value })}
                          placeholder="Ola Nordmann"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newUserEmail">E-post</Label>
                        <Input
                          id="newUserEmail"
                          type="email"
                          value={newUserForm.email}
                          onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                          placeholder="ola@example.com"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newUserPassword">Passord</Label>
                        <Input
                          id="newUserPassword"
                          type="password"
                          value={newUserForm.password}
                          onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                          placeholder="Minst 6 tegn"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={isLoading}>
                        <Plus className="w-4 h-4 mr-2" />
                        Opprett ansatt
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowAddUserForm(false)}
                      >
                        Avbryt
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
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
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            Roller: {employee.roles?.map((r: any) => r.role).join(', ')}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditEmployee(employee)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
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
                        {child.birth_date && (
                          <p className="text-xs text-muted-foreground">
                            Fødselsdato: {child.birth_date}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditChild(child)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setChildToDelete({ id: child.id, name: child.name })}
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

      {/* Remove Role Confirmation Dialog */}
      <AlertDialog open={!!roleToRemove} onOpenChange={() => setRoleToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fjern rolle?</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil fjerne rollen <strong>"{roleToRemove?.role}"</strong> fra <strong>{roleToRemove?.userName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveRole}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Fjern rolle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Employee Dialog */}
      <AlertDialog open={!!employeeToEdit} onOpenChange={() => setEmployeeToEdit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rediger ansatt</AlertDialogTitle>
            <AlertDialogDescription>
              Oppdater informasjon for {employeeToEdit?.full_name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Navn</Label>
              <Input
                id="edit-name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefon</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="F.eks. 912 34 567"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateEmployee} disabled={isLoading}>
              Lagre endringer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Child Confirmation Dialog */}
      <AlertDialog open={!!childToDelete} onOpenChange={() => setChildToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker på at du vil fjerne dette barnet?</AlertDialogTitle>
            <AlertDialogDescription>
              Du er i ferd med å fjerne <strong>{childToDelete?.name}</strong> fra systemet. 
              Dette vil også fjerne alle tilknytninger og historikk. Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChild}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ja, fjern barn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Child Dialog */}
      <AlertDialog open={!!childToEdit} onOpenChange={() => setChildToEdit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rediger barn</AlertDialogTitle>
            <AlertDialogDescription>
              Oppdater informasjon for {childToEdit?.name}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-child-name">Navn</Label>
              <Input
                id="edit-child-name"
                value={childEditForm.name}
                onChange={(e) => setChildEditForm({ ...childEditForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-child-birthdate">Fødselsdato</Label>
              <Input
                id="edit-child-birthdate"
                type="date"
                value={childEditForm.birth_date}
                onChange={(e) => setChildEditForm({ ...childEditForm, birth_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-child-notes">Notater</Label>
              <Input
                id="edit-child-notes"
                value={childEditForm.notes}
                onChange={(e) => setChildEditForm({ ...childEditForm, notes: e.target.value })}
                placeholder="Evt. notater om barnet"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateChild} disabled={isLoading}>
              Lagre endringer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
