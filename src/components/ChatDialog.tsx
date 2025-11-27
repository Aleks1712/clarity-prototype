import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Send, Clock } from 'lucide-react';
import { chatMessageSchema } from '@/lib/validations';

interface ChatMessage {
  id: string;
  message: string;
  sender_id: string;
  sender_role: string;
  created_at: string;
  sender?: {
    full_name: string;
  };
}

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  childName: string;
  childPhoto?: string | null;
}

export function ChatDialog({ open, onOpenChange, childId, childName, childPhoto }: ChatDialogProps) {
  const { user, userRole } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open && childId) {
      fetchMessages();
      
      // Subscribe to new messages
      const channel = supabase
        .channel(`chat-${childId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `child_id=eq.${childId}`,
          },
          (payload) => {
            fetchMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, childId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:profiles!chat_messages_sender_id_fkey(full_name)
      `)
      .eq('child_id', childId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as any);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !userRole) return;

    // Validate message
    const validation = chatMessageSchema.safeParse({
      message: newMessage,
      childId,
    });

    if (!validation.success) {
      const firstError = validation.error.flatten().fieldErrors.message?.[0];
      toast.error(firstError || 'Ugyldig melding');
      return;
    }

    setIsSending(true);

    const { error } = await supabase.from('chat_messages').insert({
      child_id: childId,
      sender_id: user.id,
      sender_role: userRole,
      message: newMessage.trim(),
      conversation_id: childId, // Using child_id as conversation_id for simplicity
    });

    if (error) {
      toast.error('Kunne ikke sende melding');
    } else {
      setNewMessage('');
    }

    setIsSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={childPhoto || undefined} />
              <AvatarFallback>{childName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle>{childName}</DialogTitle>
              <p className="text-sm text-muted-foreground">Chat med barnehagen</p>
            </div>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                <Send className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Ingen meldinger ennå</p>
              <p className="text-xs text-muted-foreground mt-1">Send første melding!</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => {
                const isOwnMessage = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className={isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                        {msg.sender?.full_name?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {msg.sender?.full_name || 'Ukjent'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString('nb-NO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-2 ${
                          isOwnMessage
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Auto-delete warning */}
        <div className="px-6 py-2 bg-warning/10 border-t border-warning/20">
          <div className="flex items-center gap-2 text-xs text-warning">
            <Clock className="w-3 h-3" />
            <span>Meldinger slettes automatisk etter 24 timer (GDPR)</span>
          </div>
        </div>

        {/* Input Area */}
        <form onSubmit={handleSendMessage} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Skriv en melding..."
              disabled={isSending}
              maxLength={1000}
              className="flex-1"
            />
            <Button type="submit" disabled={!newMessage.trim() || isSending} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {newMessage.length}/1000 tegn
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
