import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { LogIn, LogOut, Clock, Users } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

interface Child {
  id: string;
  name: string;
  photo_url: string | null;
}

interface AttendanceLog {
  id: string;
  child_id: string;
  checked_in_at: string;
  checked_out_at: string | null;
  checked_in_by: string | null;
  checked_out_by: string | null;
}

export function AttendanceManager() {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();
    fetchTodaysAttendance();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_logs',
        },
        () => {
          fetchTodaysAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchChildren = async () => {
    try {
      const { data, error } = await supabase
        .from('children')
        .select('id, name, photo_url')
        .order('name');

      if (error) throw error;
      setChildren(data || []);
    } catch (error) {
      console.error('Error fetching children:', error);
      toast.error('Kunne ikke laste barn');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaysAttendance = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('attendance_logs')
        .select('*')
        .gte('checked_in_at', today.toISOString());

      if (error) throw error;
      setAttendanceLogs(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const getTodaysAttendance = (childId: string) => {
    const logs = attendanceLogs.filter((log) => log.child_id === childId);
    const latestLog = logs.sort(
      (a, b) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime()
    )[0];
    return latestLog;
  };

  const isCheckedIn = (childId: string) => {
    const attendance = getTodaysAttendance(childId);
    return attendance && !attendance.checked_out_at;
  };

  const handleCheckIn = async (childId: string, childName: string) => {
    try {
      const { error } = await supabase.from('attendance_logs').insert({
        child_id: childId,
        checked_in_by: user?.id,
        checked_in_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success(`${childName} krysset inn`);
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Kunne ikke krysse inn');
    }
  };

  const handleCheckOut = async (childId: string, childName: string) => {
    try {
      const attendance = getTodaysAttendance(childId);
      if (!attendance) {
        toast.error('Barnet er ikke krysset inn');
        return;
      }

      const { error } = await supabase
        .from('attendance_logs')
        .update({
          checked_out_at: new Date().toISOString(),
          checked_out_by: user?.id,
        })
        .eq('id', attendance.id);

      if (error) throw error;
      toast.success(`${childName} krysset ut`);
    } catch (error) {
      console.error('Error checking out:', error);
      toast.error('Kunne ikke krysse ut');
    }
  };

  const checkedInCount = children.filter((child) => isCheckedIn(child.id)).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Laster...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Oversikt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-primary">{checkedInCount}</div>
              <div className="text-sm text-muted-foreground">
                av {children.length} barn til stede
              </div>
            </div>
            <Clock className="w-12 h-12 text-primary/20" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alle barn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {children.map((child) => {
              const checkedIn = isCheckedIn(child.id);
              const attendance = getTodaysAttendance(child.id);

              return (
                <div
                  key={child.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={child.photo_url || undefined} />
                      <AvatarFallback>{child.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{child.name}</div>
                      {attendance && (
                        <div className="text-xs text-muted-foreground">
                          {checkedIn ? (
                            <>
                              Inn:{' '}
                              {format(new Date(attendance.checked_in_at), 'HH:mm', {
                                locale: nb,
                              })}
                            </>
                          ) : (
                            <>
                              Inn: {format(new Date(attendance.checked_in_at), 'HH:mm', { locale: nb })} 
                              {' • '}
                              Ut:{' '}
                              {format(new Date(attendance.checked_out_at!), 'HH:mm', {
                                locale: nb,
                              })}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {checkedIn ? (
                      <>
                        <Badge variant="default" className="bg-green-500">
                          Til stede
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckOut(child.id, child.name)}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Kryss ut
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="secondary">Hjemme</Badge>
                        <Button
                          size="sm"
                          onClick={() => handleCheckIn(child.id, child.name)}
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          Kryss inn
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
