import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send, MoreVertical, Shield, Flag, Ban, CheckCheck, Check } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id: number;
  matchId: number;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

interface MatchUser {
  id: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  isVerified?: string;
  profile?: {
    bio?: string;
  };
  photos?: Array<{ url: string }>;
}

export default function ChatPage() {
  const [, params] = useRoute("/chat/:matchId");
  const matchId = parseInt(params?.matchId || "0");
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: currentUser } = useQuery<{ id: string }>({
    queryKey: ['/api/user'],
  });

  const { data: matchData } = useQuery<{
    id: number;
    otherUser: MatchUser;
  }>({
    queryKey: ['/api/matches', matchId],
    enabled: !!matchId,
  });

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['/api/matches', matchId, 'messages'],
    enabled: !!matchId,
    refetchInterval: 3000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest('POST', `/api/matches/${matchId}/messages`, { content });
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ['/api/matches', matchId, 'messages'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  });

  const blockMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/users/${matchData?.otherUser?.id}/block`, {});
    },
    onSuccess: () => {
      toast({ title: "User blocked", description: "You won't see this user anymore" });
    }
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/users/${matchData?.otherUser?.id}/report`, { 
        reason: "Inappropriate behavior",
        details: "Reported from chat" 
      });
    },
    onSuccess: () => {
      toast({ title: "Report submitted", description: "Thank you for helping keep our community safe" });
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      sendMutation.mutate(message.trim());
    }
  };

  const otherUser = matchData?.otherUser;
  const userPhoto = otherUser?.photos?.[0]?.url || otherUser?.profileImageUrl;

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/matches">
              <Button variant="ghost" size="icon" data-testid="button-back-to-matches">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Avatar className="w-10 h-10">
              <AvatarImage src={userPhoto} />
              <AvatarFallback>{otherUser?.firstName?.[0] || "?"}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="font-semibold flex items-center gap-1">
                {otherUser?.firstName || "Match"}
                {otherUser?.isVerified === 'true' && (
                  <Shield className="w-4 h-4 text-blue-500" />
                )}
              </h1>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-chat-menu">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => reportMutation.mutate()}
                className="text-orange-600"
                data-testid="menu-item-report"
              >
                <Flag className="w-4 h-4 mr-2" />
                Report User
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => blockMutation.mutate()}
                className="text-red-600"
                data-testid="menu-item-block"
              >
                <Ban className="w-4 h-4 mr-2" />
                Block User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-muted-foreground mb-2">No messages yet</p>
            <p className="text-sm text-muted-foreground">
              Say hi to {otherUser?.firstName || "your match"}!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <Card
                  className={`max-w-[75%] px-4 py-2 ${
                    isMe
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                  data-testid={`message-${msg.id}`}
                >
                  <p className="break-words">{msg.content}</p>
                  <div className={`text-xs mt-1 flex items-center gap-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe && (
                      msg.readAt ? (
                        <CheckCheck className="w-3 h-3" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )
                    )}
                  </div>
                </Card>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </main>

      <footer className="sticky bottom-0 bg-background border-t p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
            data-testid="input-message"
          />
          <Button 
            type="submit" 
            disabled={!message.trim() || sendMutation.isPending}
            data-testid="button-send-message"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </footer>
    </div>
  );
}
