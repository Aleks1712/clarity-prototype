import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface TodaysAttendanceProps {
  childId: string;
}

interface AttendanceLog {
  checked_in_at: string;
  checked_out_at: string | null;
}

export function TodaysAttendance({ childId }: TodaysAttendanceProps) {
  const [attendance, setAttendance] = useState<AttendanceLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodaysAttendance();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('attendance-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_logs',
          filter: `child_id=eq.${childId}`,
        },
        () => {
          fetchTodaysAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [childId]);

  const fetchTodaysAttendance = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('attendance_logs')
        .select('checked_in_at, checked_out_at')
        .eq('child_id', childId)
        .gte('checked_in_at', today.toISOString())
        .order('checked_in_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setAttendance(data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">Laster...</div>
        </CardContent>
      </Card>
    );
  }

  if (!attendance) {
    return (
      <Card className="border-warning/20 bg-warning/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Oppmøte i dag
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Barnet er ikke krysset inn ennå i dag
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-success/20 bg-success/5">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Oppmøte i dag
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
            <LogIn className="w-4 h-4 text-success" />
          </div>
          <div>
            <div className="font-medium">Krysset inn</div>
            <div className="text-muted-foreground">
              {format(new Date(attendance.checked_in_at), 'HH:mm', { locale: nb })}
            </div>
          </div>
        </div>

        {attendance.checked_out_at ? (
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <LogOut className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <div className="font-medium">Krysset ut</div>
              <div className="text-muted-foreground">
                {format(new Date(attendance.checked_out_at), 'HH:mm', { locale: nb })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="font-medium text-primary">I barnehagen nå</div>
              <div className="text-xs text-muted-foreground">Venter på uthenting</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
