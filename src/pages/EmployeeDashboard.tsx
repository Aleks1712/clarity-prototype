import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Baby, Clock, CheckCircle2, XCircle, LogOut, Bell, BellOff } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePickupNotifications } from '@/hooks/usePickupNotifications';

interface PickupRequest {
  id: string;
  child_id: string;
  pickup_person_name: string;
  status: string;
  requested_at: string;
  child: {
    name: string;
    photo_url: string | null;
  };
  parent: {
    full_name: string;
  };
}

export default function EmployeeDashboard() {
  const { signOut } = useAuth();
  const [pendingPickups, setPendingPickups] = useState<PickupRequest[]>([]);
  const [approvedPickups, setApprovedPickups] = useState<PickupRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  
  const { requestNotificationPermission } = usePickupNotifications();

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
  };

  useEffect(() => {
    fetchPickups();

    // Set up realtime subscription
    const channel = supabase
      .channel('pickup-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_logs',
        },
        () => {
          fetchPickups();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPickups = async () => {
    const { data: pending } = await supabase
      .from('pickup_logs')
      .select(`
        *,
        child:children (name, photo_url),
        parent:profiles!pickup_logs_parent_id_fkey (full_name)
      `)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    const { data: approved } = await supabase
      .from('pickup_logs')
      .select(`
        *,
        child:children (name, photo_url),
        parent:profiles!pickup_logs_parent_id_fkey (full_name)
      `)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(10);

    if (pending) setPendingPickups(pending as any);
    if (approved) setApprovedPickups(approved as any);
  };

  const handleApprove = async (pickupId: string) => {
    setIsLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('pickup_logs')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      })
      .eq('id', pickupId);

    if (error) {
      toast.error('Kunne ikke godkjenne henting');
    } else {
      toast.success('Henting godkjent!');
    }

    setIsLoading(false);
  };

  const handleReject = async (pickupId: string) => {
    setIsLoading(true);

    const { error } = await supabase
      .from('pickup_logs')
      .update({
        status: 'rejected',
      })
      .eq('id', pickupId);

    if (error) {
      toast.error('Kunne ikke avvise henting');
    } else {
      toast.success('Henting avvist');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <div className="bg-card border-b shadow-sm">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <Baby className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Krysselista</h1>
              <p className="text-sm text-muted-foreground">Ansatt</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!notificationsEnabled && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleEnableNotifications}
                title="Aktiver varsler"
              >
                <BellOff className="w-5 h-5" />
              </Button>
            )}
            {notificationsEnabled && (
              <Button
                variant="outline"
                size="icon"
                className="bg-success/10 border-success/20"
                title="Varsler aktivert"
              >
                <Bell className="w-5 h-5 text-success" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="relative">
              Ventende
              {pendingPickups.length > 0 && (
                <Badge variant="destructive" className="ml-2 px-2 py-0.5 text-xs">
                  {pendingPickups.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Godkjente</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingPickups.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">Ingen ventende hentinger</h3>
                  <p className="text-sm text-muted-foreground">
                    Alle hentingsforespørsler er behandlet
                  </p>
                </CardContent>
              </Card>
            ) : (
              pendingPickups.map((pickup) => (
                <Card key={pickup.id} className="border-l-8 border-l-warning shadow-lg">
                  <CardContent className="pt-6 space-y-6">
                    {/* Child Info - LARGE */}
                    <div className="flex items-center gap-6">
                      <Avatar className="w-24 h-24 ring-4 ring-warning/20">
                        <AvatarImage src={pickup.child.photo_url || undefined} />
                        <AvatarFallback className="text-3xl">
                          {pickup.child.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-bold text-2xl mb-2">{pickup.child.name}</h3>
                        <div className="space-y-1">
                          <p className="text-base">
                            <span className="text-muted-foreground">Hentes av:</span>{' '}
                            <span className="font-bold">{pickup.pickup_person_name}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Meldt: {new Date(pickup.requested_at).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-warning text-warning-foreground px-4 py-2 text-base">
                        <Clock className="w-4 h-4 mr-2" />
                        NY
                      </Badge>
                    </div>

                    {/* Action Buttons - EXTRA LARGE */}
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleApprove(pickup.id)}
                        disabled={isLoading}
                        className="flex-1 h-16 text-lg font-bold bg-success hover:bg-success/90"
                        size="lg"
                      >
                        <CheckCircle2 className="w-6 h-6 mr-2" />
                        Godkjenn
                      </Button>
                      <Button
                        onClick={() => handleReject(pickup.id)}
                        disabled={isLoading}
                        variant="outline"
                        className="h-16 px-6 border-2 border-destructive/20 hover:bg-destructive/10"
                        size="lg"
                      >
                        <XCircle className="w-6 h-6 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedPickups.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <Bell className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">Ingen godkjente hentinger ennå</h3>
                  <p className="text-sm text-muted-foreground">
                    Godkjente hentinger vil vises her
                  </p>
                </CardContent>
              </Card>
            ) : (
              approvedPickups.map((pickup) => (
                <Card key={pickup.id} className="border-l-4 border-l-success">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={pickup.child.photo_url || undefined} />
                          <AvatarFallback>{pickup.child.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg mb-1">{pickup.child.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            Hentet av: <span className="font-semibold text-foreground">{pickup.pickup_person_name}</span>
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-success text-white">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Godkjent
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
