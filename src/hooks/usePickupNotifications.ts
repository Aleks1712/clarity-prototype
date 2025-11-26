import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export function usePickupNotifications() {
  const { userRole, user } = useAuth();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;

    // Only employees get push notifications
    if (userRole === 'employee') {
      // Subscribe to new pickup requests
      channelRef.current = supabase
        .channel('pickup-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'pickup_logs',
            filter: 'status=eq.pending',
          },
          async (payload) => {
            // Fetch child name for the notification
            const { data: childData } = await supabase
              .from('children')
              .select('name')
              .eq('id', payload.new.child_id)
              .single();

            const childName = childData?.name || 'Barn';
            const pickupPerson = payload.new.pickup_person_name;

            // Show notification
            toast.info('🔔 Ny henting meldt!', {
              description: `${childName} skal hentes av ${pickupPerson}`,
              duration: 8000,
              action: {
                label: 'Se detaljer',
                onClick: () => {
                  window.location.href = '/';
                },
              },
            });

            // Try to show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Ny henting meldt', {
                body: `${childName} skal hentes av ${pickupPerson}`,
                icon: '/favicon.ico',
                tag: payload.new.id,
              });
            }
          }
        )
        .subscribe();
    }

    // Parents get notifications when their pickup is approved
    if (userRole === 'parent') {
      channelRef.current = supabase
        .channel('parent-notifications')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'pickup_logs',
            filter: `parent_id=eq.${user.id}`,
          },
          async (payload) => {
            if (payload.new.status === 'approved') {
              const { data: childData } = await supabase
                .from('children')
                .select('name')
                .eq('id', payload.new.child_id)
                .single();

              const childName = childData?.name || 'Barnet';

              toast.success('✅ Henting godkjent!', {
                description: `${childName} er klar til henting`,
                duration: 8000,
              });

              // Browser notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Henting godkjent', {
                  body: `${childName} er klar til henting`,
                  icon: '/favicon.ico',
                  tag: payload.new.id,
                });
              }
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userRole, user]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Nettleseren støtter ikke varsler');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Varsler aktivert!');
        return true;
      }
    }

    toast.error('Varsler er blokkert i nettleseren');
    return false;
  };

  return { requestNotificationPermission };
}
