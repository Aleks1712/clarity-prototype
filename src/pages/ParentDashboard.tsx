import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Baby, Users, Clock, CheckCircle2, LogOut, Bell, BellOff } from 'lucide-react';
import { usePickupNotifications } from '@/hooks/usePickupNotifications';

interface Child {
  id: string;
  name: string;
  photo_url: string | null;
}

interface AuthorizedPickup {
  id: string;
  name: string;
  relationship: string;
}

export default function ParentDashboard() {
  const { user, signOut } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [authorizedPickups, setAuthorizedPickups] = useState<AuthorizedPickup[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );

  const { requestNotificationPermission } = usePickupNotifications();

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
  };

  useEffect(() => {
    if (user) {
      fetchChildren();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChild) {
      fetchAuthorizedPickups(selectedChild);
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('parent_children')
      .select(`
        child:children (
          id,
          name,
          photo_url
        )
      `)
      .eq('parent_id', user.id);

    if (data) {
      const childrenData = data.map((item: any) => item.child).filter(Boolean);
      setChildren(childrenData);
      if (childrenData.length > 0 && !selectedChild) {
        setSelectedChild(childrenData[0].id);
      }
    }
  };

  const fetchAuthorizedPickups = async (childId: string) => {
    const { data } = await supabase
      .from('authorized_pickups')
      .select('id, name, relationship')
      .eq('child_id', childId);

    if (data) {
      // Add parent as option
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user?.id)
        .single();

      const parentOption = {
        id: 'parent',
        name: profileData?.full_name || 'Meg selv',
        relationship: 'Forelder',
      };

      setAuthorizedPickups([parentOption, ...data]);
    }
  };

  const handleRequestPickup = async () => {
    if (!selectedChild || !selectedPickup || !user) return;

    setIsSubmitting(true);

    const pickupPerson = authorizedPickups.find(p => p.id === selectedPickup);

    const { error } = await supabase
      .from('pickup_logs')
      .insert({
        child_id: selectedChild,
        parent_id: user.id,
        pickup_person_name: pickupPerson?.name || '',
        pickup_person_id: selectedPickup === 'parent' ? null : selectedPickup,
        status: 'pending',
      });

    if (error) {
      toast.error('Kunne ikke sende hentingsvarsel');
    } else {
      toast.success('Hentingsvarsel sendt!', {
        description: 'Personalet vil godkjenne hentingen.',
      });
      setSelectedPickup('');
    }

    setIsSubmitting(false);
  };

  const currentChild = children.find(c => c.id === selectedChild);

  // Show setup prompt if no children
  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Ingen barn registrert</CardTitle>
            <CardDescription>
              Du har ikke barn tilknyttet kontoen din ennå.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              I en fullstendig versjon ville administrator registrert barn og koblet dem til foreldre.
              For demo kan du be administrator om å legge til demodata.
            </p>
            <Button onClick={signOut} variant="outline" className="w-full">
              Logg ut
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <div className="bg-card border-b shadow-sm">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Baby className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Krysselista</h1>
              <p className="text-sm text-muted-foreground">Forelder</p>
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

      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Children Selector - LARGE AND SIMPLE */}
        {children.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl transition-all min-w-[120px] ${
                  selectedChild === child.id
                    ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                    : 'bg-card hover:bg-accent border-2 border-transparent hover:border-primary/20'
                }`}
              >
                <Avatar className="w-20 h-20 ring-4 ring-background">
                  <AvatarImage src={child.photo_url || undefined} />
                  <AvatarFallback className="text-2xl">{child.name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-base font-bold whitespace-nowrap">{child.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Pickup Request Card - SIMPLIFIED 3-CLICK FLOW */}
        <Card className="border-2">
          <CardContent className="pt-6 space-y-6">
            {/* Current Child - LARGE */}
            {currentChild && (
              <div className="flex flex-col items-center gap-4 p-6 bg-primary/5 rounded-2xl">
                <Avatar className="w-24 h-24 ring-4 ring-primary/20">
                  <AvatarImage src={currentChild.photo_url || undefined} />
                  <AvatarFallback className="text-3xl">{currentChild.name[0]}</AvatarFallback>
                </Avatar>
                <h2 className="font-bold text-2xl">{currentChild.name}</h2>
                <Badge variant="outline" className="text-base px-4 py-1">
                  I barnehagen
                </Badge>
              </div>
            )}

            {/* Who Picks Up - LARGE BUTTONS */}
            <div className="space-y-3">
              <label className="text-lg font-bold">Hvem henter?</label>
              <Select value={selectedPickup} onValueChange={setSelectedPickup}>
                <SelectTrigger className="w-full h-16 text-lg border-2">
                  <SelectValue placeholder="Velg person" />
                </SelectTrigger>
                <SelectContent>
                  {authorizedPickups.map((pickup) => (
                    <SelectItem key={pickup.id} value={pickup.id} className="h-14 text-base">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <div className="font-bold">{pickup.name}</div>
                          <div className="text-sm text-muted-foreground">{pickup.relationship}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* MAIN ACTION BUTTON - EXTRA LARGE */}
            <Button
              onClick={handleRequestPickup}
              disabled={!selectedPickup || isSubmitting}
              className="w-full h-20 text-xl font-bold rounded-2xl"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-7 h-7 mr-3 animate-spin" />
                  Sender...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-7 h-7 mr-3" />
                  Hente barn
                </>
              )}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Personalet godkjenner før utlevering
            </p>
          </CardContent>
        </Card>

        {/* Info Card - SIMPLE 3-STEP */}
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-success">1</span>
                </div>
                <p className="text-sm font-medium">Velg</p>
              </div>
              <div>
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-success">2</span>
                </div>
                <p className="text-sm font-medium">Send</p>
              </div>
              <div>
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold text-success">3</span>
                </div>
                <p className="text-sm font-medium">Hent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
