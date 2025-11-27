import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Baby, Users, Clock, CheckCircle2, LogOut, Bell, BellOff, MessageCircle, Shield, Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePickupNotifications } from '@/hooks/usePickupNotifications';
import { ChatDialog } from '@/components/ChatDialog';
import { AuthorizedPickupsManager } from '@/components/AuthorizedPickupsManager';

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
  const { t } = useLanguage();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [authorizedPickups, setAuthorizedPickups] = useState<AuthorizedPickup[]>([]);
  const [selectedPickup, setSelectedPickup] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastPickup, setLastPickup] = useState<{ name: string; time: string } | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'
  );
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(15);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  const { requestNotificationPermission } = usePickupNotifications();

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
  };

  useEffect(() => {
    if (user) {
      fetchChildren();
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('requires_approval')
      .eq('id', user.id)
      .single();

    if (data) {
      setRequiresApproval(data.requires_approval);
    }
  };

  const handleToggleApproval = async (checked: boolean) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ requires_approval: checked })
      .eq('id', user.id);

    if (error) {
      toast.error('Kunne ikke oppdatere innstilling');
    } else {
      setRequiresApproval(checked);
      toast.success(
        checked 
          ? 'Henting krever nå godkjenning fra personalet' 
          : 'Henting godkjennes automatisk'
      );
    }
  };

  useEffect(() => {
    if (selectedChild) {
      fetchAuthorizedPickups(selectedChild);
      fetchLastPickup(selectedChild);
    }
  }, [selectedChild]);

  const fetchLastPickup = async (childId: string) => {
    const { data } = await supabase
      .from('pickup_logs')
      .select('pickup_person_name, approved_at')
      .eq('child_id', childId)
      .eq('status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      setLastPickup({
        name: data.pickup_person_name,
        time: new Date(data.approved_at).toLocaleDateString('nb-NO', { 
          day: 'numeric', 
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        })
      });
    }
  };

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
      .eq('child_id', childId)
      .eq('consent_given', true); // Only show consented pickups

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

    setCurrentStep(2);
    setIsSubmitting(true);

    const pickupPerson = authorizedPickups.find(p => p.id === selectedPickup);
    const estimatedArrival = new Date();
    estimatedArrival.setMinutes(estimatedArrival.getMinutes() + estimatedMinutes);

    // Check if approval is required or auto-approve
    const status = requiresApproval ? 'pending' : 'approved';
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('pickup_logs')
      .insert({
        child_id: selectedChild,
        parent_id: user.id,
        pickup_person_name: pickupPerson?.name || '',
        pickup_person_id: selectedPickup === 'parent' ? null : selectedPickup,
        status: status,
        estimated_arrival_time: estimatedArrival.toISOString(),
        approved_at: requiresApproval ? null : now,
        approved_by: requiresApproval ? null : user.id,
      });

    if (error) {
      toast.error('Kunne ikke sende forespørsel');
      setCurrentStep(1);
    } else {
      setCurrentStep(3);
      if (requiresApproval) {
        toast.success('Henteforespørsel sendt til godkjenning!', {
          description: `Venter på bekreftelse fra personalet`,
        });
      } else {
        toast.success('Henting bekreftet!', {
          description: `Anslått ankomst: ${estimatedMinutes} min`,
        });
      }
      setSelectedPickup('');
      // Reset to step 1 after 3 seconds
      setTimeout(() => setCurrentStep(1), 3000);
    }

    setIsSubmitting(false);
  };

  const currentChild = children.find(c => c.id === selectedChild);

  // Show setup prompt if no children
  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="glass border-b">
          <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Baby className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">Krysselista</h1>
                <p className="text-sm text-muted-foreground">Forelder</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="hover:scale-105 transition-transform">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="container max-w-2xl mx-auto px-4 py-8">
          <Card className="glass">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
                <Baby className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-2xl">Ingen barn registrert</CardTitle>
                <CardDescription className="text-base">
                  Du har ikke barn tilknyttet kontoen din ennå.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="glass p-4 rounded-xl border border-white/20 space-y-3">
                <h3 className="font-semibold text-foreground">Kom i gang:</h3>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">1.</span>
                    <span>Kontakt barnehagens administrator for å registrere ditt barn</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">2.</span>
                    <span>Administrator kobler ditt barn til din bruker</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-primary">3.</span>
                    <span>Du kan da begynne å sende henteforespørsler</span>
                  </li>
                </ol>
              </div>
              
              <Button 
                onClick={() => window.location.href = '/demo-setup'} 
                className="w-full bg-gradient-accent hover:shadow-glow"
                size="lg"
              >
                Last inn demodata for testing
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                Demodata lar deg teste systemet med eksempel-barn og hentere
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-card via-card to-card/95 border-b shadow-soft backdrop-blur-sm">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-glow-primary">
              <Baby className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">{t('appName')}</h1>
              <p className="text-sm text-muted-foreground">{t('parent')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            {!notificationsEnabled && (
              <Button
                variant="outline"
                size="icon"
                onClick={handleEnableNotifications}
                title={t('enableNotifications')}
                className="hover:scale-105 transition-transform"
              >
                <BellOff className="w-5 h-5" />
              </Button>
            )}
            {notificationsEnabled && (
              <Button
                variant="outline"
                size="icon"
                className="bg-success/10 border-success/20 hover:bg-success/20 hover:scale-105 transition-all"
                title={t('notificationsEnabled')}
              >
                <Bell className="w-5 h-5 text-success" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={signOut} className="hover:scale-105 transition-transform">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Children Selector - LARGE AND BEAUTIFUL */}
        {children.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl transition-all min-w-[120px] hover:scale-105 ${
                  selectedChild === child.id
                    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-glow-primary scale-105'
                    : 'bg-card hover:bg-accent border-2 border-transparent hover:border-primary/20 shadow-soft'
                }`}
              >
                <Avatar className="w-20 h-20 ring-4 ring-background shadow-lg">
                  <AvatarImage src={child.photo_url || undefined} />
                  <AvatarFallback className="text-2xl">{child.name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-base font-bold whitespace-nowrap">{child.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Progress Steps */}
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-card to-primary/5">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between relative">
              {/* Progress Line */}
              <div className="absolute top-6 left-0 right-0 h-1 bg-muted -z-10">
                <div 
                  className="h-full bg-gradient-to-r from-success to-success/80 transition-all duration-500"
                  style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                />
              </div>
              
              {/* Step 1: Velg */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  currentStep >= 1 
                    ? 'bg-gradient-to-br from-success to-success/80 text-white shadow-glow-success scale-110' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <Users className="w-6 h-6" />
                </div>
                <p className={`text-sm font-bold mt-2 ${currentStep >= 1 ? 'text-success' : 'text-muted-foreground'}`}>
                  1. Velg
                </p>
              </div>

              {/* Step 2: Send */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  currentStep >= 2 
                    ? 'bg-gradient-to-br from-success to-success/80 text-white shadow-glow-success scale-110' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {currentStep === 2 && isSubmitting ? (
                    <Clock className="w-6 h-6 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6" />
                  )}
                </div>
                <p className={`text-sm font-bold mt-2 ${currentStep >= 2 ? 'text-success' : 'text-muted-foreground'}`}>
                  2. Send
                </p>
              </div>

              {/* Step 3: Hent */}
              <div className="flex flex-col items-center flex-1">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  currentStep >= 3 
                    ? 'bg-gradient-to-br from-success to-success/80 text-white shadow-glow-success scale-110' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <Baby className="w-6 h-6" />
                </div>
                <p className={`text-sm font-bold mt-2 ${currentStep >= 3 ? 'text-success' : 'text-muted-foreground'}`}>
                  3. Hent
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pickup Request Card - POLISHED DESIGN */}
        <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
          <CardContent className="pt-6 space-y-6">
            {/* Current Child - LARGE & BEAUTIFUL */}
            {currentChild && (
              <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent rounded-3xl border border-primary/10">
                <div className="relative">
                  <Avatar className="w-28 h-28 ring-4 ring-primary/20 shadow-glow-primary">
                    <AvatarImage src={currentChild.photo_url || undefined} />
                    <AvatarFallback className="text-4xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                      {currentChild.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-success rounded-full flex items-center justify-center shadow-glow-success border-4 border-background">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h2 className="font-bold text-3xl">{currentChild.name}</h2>
                <Badge variant="outline" className="text-base px-4 py-1.5 bg-success/10 border-success/20 text-success font-semibold">
                  I barnehagen
                </Badge>
              </div>
            )}

            {/* Estimated Arrival Time */}
            <div className="space-y-3">
              <label className="text-lg font-bold">Anslått ankomst</label>
              <Select value={estimatedMinutes.toString()} onValueChange={(v) => setEstimatedMinutes(parseInt(v))}>
                <SelectTrigger className="w-full h-14 text-base border-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Om 5 minutter</SelectItem>
                  <SelectItem value="10">Om 10 minutter</SelectItem>
                  <SelectItem value="15">Om 15 minutter</SelectItem>
                  <SelectItem value="20">Om 20 minutter</SelectItem>
                  <SelectItem value="30">Om 30 minutter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Who Picks Up - LARGE BUTTONS */}
            <div className="space-y-3">
              <label className="text-lg font-bold">Hvem henter?</label>
              
              {/* Quick selection buttons for first 3 people */}
              <div className="grid grid-cols-3 gap-2">
                {authorizedPickups.slice(0, 3).map((pickup) => (
                  <button
                    key={pickup.id}
                    onClick={() => setSelectedPickup(pickup.id)}
                    className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                      selectedPickup === pickup.id
                        ? 'bg-primary text-primary-foreground border-primary shadow-glow-primary'
                        : 'bg-card border-border hover:border-primary/30 shadow-soft'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        selectedPickup === pickup.id ? 'bg-primary-foreground/20' : 'bg-primary/10'
                      }`}>
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-sm">{pickup.name.split(' ')[0]}</div>
                        <div className="text-xs opacity-70">{pickup.relationship}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Show select if more than 3 people */}
              {authorizedPickups.length > 3 && (
                <Select value={selectedPickup} onValueChange={setSelectedPickup}>
                  <SelectTrigger className="w-full h-14 text-base border-2">
                    <SelectValue placeholder="Eller velg annen person" />
                  </SelectTrigger>
                  <SelectContent>
                    {authorizedPickups.slice(3).map((pickup) => (
                      <SelectItem key={pickup.id} value={pickup.id} className="h-12 text-base">
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5" />
                          <div className="text-left">
                            <div className="font-bold">{pickup.name}</div>
                            <div className="text-xs text-muted-foreground">{pickup.relationship}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* MAIN ACTION BUTTON - EXTRA LARGE & BEAUTIFUL */}
            <Button
              onClick={handleRequestPickup}
              disabled={!selectedPickup || isSubmitting}
              className="w-full h-20 text-xl font-bold rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all bg-gradient-to-r from-primary to-primary/90"
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
              {requiresApproval 
                ? 'Personalet må godkjenne før henting' 
                : 'Henting godkjennes automatisk'}
            </p>
          </CardContent>
        </Card>

        {/* Approval Settings Card */}
        <Card className="border-2 border-primary/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('approvalSettings')}</CardTitle>
                <CardDescription>
                  {t('approvalDescription')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <div className="space-y-1 flex-1">
                <Label htmlFor="requires-approval" className="text-base font-semibold cursor-pointer">
                  {t('requiresApproval')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {requiresApproval 
                    ? t('requiresApprovalOn')
                    : t('requiresApprovalOff')}
                </p>
              </div>
              <Switch
                id="requires-approval"
                checked={requiresApproval}
                onCheckedChange={handleToggleApproval}
                className="ml-4"
              />
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-semibold text-primary">{t('security')}</p>
                  <p className="text-muted-foreground">
                    {t('securityNote')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Button */}
        <Button
          onClick={() => setIsChatOpen(true)}
          variant="outline"
          className="w-full h-16 text-lg border-2 hover:border-primary"
          size="lg"
        >
          <MessageCircle className="w-6 h-6 mr-3" />
          {t('chatWithKindergarten')}
        </Button>

        {/* Authorized Pickups Manager */}
        {currentChild && (
          <AuthorizedPickupsManager
            childId={currentChild.id}
            childName={currentChild.name}
          />
        )}

        {/* Last Pickup Info */}
        {lastPickup && (
          <Card className="bg-muted/30 border-muted">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Siste henting</p>
                    <p className="text-xs text-muted-foreground">
                      {lastPickup.name} • {lastPickup.time}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Chat Dialog */}
      {currentChild && (
        <ChatDialog
          open={isChatOpen}
          onOpenChange={setIsChatOpen}
          childId={currentChild.id}
          childName={currentChild.name}
          childPhoto={currentChild.photo_url}
        />
      )}
    </div>
  );
}
