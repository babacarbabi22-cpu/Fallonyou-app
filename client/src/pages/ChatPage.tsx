import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send, MoreVertical, Shield, Flag, Ban, CheckCheck, Check, XCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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

type ActionType = "report" | "block" | "end" | null;

export default function ChatPage() {
  const [, params] = useRoute("/chat/:matchId");
  const matchId = parseInt(params?.matchId || "0");
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const t = useTranslation();
  const [, navigate] = useLocation();
  
  const [actionDialog, setActionDialog] = useState<ActionType>(null);
  const [selectedReason, setSelectedReason] = useState("");

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
    mutationFn: async (reason: string) => {
      await apiRequest('POST', `/api/users/${matchData?.otherUser?.id}/block`, { reason });
    },
    onSuccess: () => {
      toast({ title: t.chat.userBlocked, description: t.chat.thankYou });
      setActionDialog(null);
      setSelectedReason("");
      navigate("/matches");
    }
  });

  const reportMutation = useMutation({
    mutationFn: async (reason: string) => {
      await apiRequest('POST', `/api/users/${matchData?.otherUser?.id}/report`, { 
        reason,
        details: "Reported from chat" 
      });
    },
    onSuccess: () => {
      toast({ title: t.chat.reportSent, description: t.chat.thankYou });
      setActionDialog(null);
      setSelectedReason("");
    }
  });

  const endConversationMutation = useMutation({
    mutationFn: async (reason: string) => {
      await apiRequest('POST', `/api/matches/${matchId}/end`, { reason });
    },
    onSuccess: () => {
      toast({ title: t.chat.conversationEnded, description: t.chat.thankYou });
      setActionDialog(null);
      setSelectedReason("");
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      navigate("/matches");
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
                onClick={() => { setSelectedReason(""); setActionDialog("end"); }}
                data-testid="menu-item-end"
              >
                <XCircle className="w-4 h-4 mr-2" />
                {t.chat.endConversation}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => { setSelectedReason(""); setActionDialog("report"); }}
                className="text-orange-600"
                data-testid="menu-item-report"
              >
                <Flag className="w-4 h-4 mr-2" />
                {t.chat.report}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => { setSelectedReason(""); setActionDialog("block"); }}
                className="text-red-600"
                data-testid="menu-item-block"
              >
                <Ban className="w-4 h-4 mr-2" />
                {t.chat.block}
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

      <Dialog open={actionDialog === "report"} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.chat.reportReasons.title}</DialogTitle>
            <DialogDescription>{t.chat.selectReason}</DialogDescription>
          </DialogHeader>
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-3">
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => setSelectedReason("inappropriate")}>
              <RadioGroupItem value="inappropriate" id="report-inappropriate" />
              <Label htmlFor="report-inappropriate" className="cursor-pointer flex-1">{t.chat.reportReasons.inappropriate}</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => setSelectedReason("harassment")}>
              <RadioGroupItem value="harassment" id="report-harassment" />
              <Label htmlFor="report-harassment" className="cursor-pointer flex-1">{t.chat.reportReasons.harassment}</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => setSelectedReason("spam")}>
              <RadioGroupItem value="spam" id="report-spam" />
              <Label htmlFor="report-spam" className="cursor-pointer flex-1">{t.chat.reportReasons.spam}</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => setSelectedReason("fakeProfile")}>
              <RadioGroupItem value="fakeProfile" id="report-fake" />
              <Label htmlFor="report-fake" className="cursor-pointer flex-1">{t.chat.reportReasons.fakeProfile}</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => setSelectedReason("underage")}>
              <RadioGroupItem value="underage" id="report-underage" />
              <Label htmlFor="report-underage" className="cursor-pointer flex-1">{t.chat.reportReasons.underage}</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => setSelectedReason("other")}>
              <RadioGroupItem value="other" id="report-other" />
              <Label htmlFor="report-other" className="cursor-pointer flex-1">{t.chat.reportReasons.other}</Label>
            </div>
          </RadioGroup>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setActionDialog(null); setSelectedReason(""); }} data-testid="button-cancel-report">
              {t.chat.cancel}
            </Button>
            <Button 
              onClick={() => reportMutation.mutate(selectedReason)} 
              disabled={!selectedReason || reportMutation.isPending}
              data-testid="button-confirm-report"
            >
              {t.chat.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === "block"} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.chat.blockReasons.title}</DialogTitle>
            <DialogDescription>{t.chat.selectReason}</DialogDescription>
          </DialogHeader>
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-3">
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => setSelectedReason("noInterest")}>
              <RadioGroupItem value="noInterest" id="block-nointerest" />
              <Label htmlFor="block-nointerest" className="cursor-pointer flex-1">{t.chat.blockReasons.noInterest}</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => setSelectedReason("uncomfortable")}>
              <RadioGroupItem value="uncomfortable" id="block-uncomfortable" />
              <Label htmlFor="block-uncomfortable" className="cursor-pointer flex-1">{t.chat.blockReasons.uncomfortable}</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => setSelectedReason("inappropriate")}>
              <RadioGroupItem value="inappropriate" id="block-inappropriate" />
              <Label htmlFor="block-inappropriate" className="cursor-pointer flex-1">{t.chat.blockReasons.inappropriate}</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => setSelectedReason("spam")}>
              <RadioGroupItem value="spam" id="block-spam" />
              <Label htmlFor="block-spam" className="cursor-pointer flex-1">{t.chat.blockReasons.spam}</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => setSelectedReason("other")}>
              <RadioGroupItem value="other" id="block-other" />
              <Label htmlFor="block-other" className="cursor-pointer flex-1">{t.chat.blockReasons.other}</Label>
            </div>
          </RadioGroup>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setActionDialog(null); setSelectedReason(""); }} data-testid="button-cancel-block">
              {t.chat.cancel}
            </Button>
            <Button 
              variant="destructive"
              onClick={() => blockMutation.mutate(selectedReason)} 
              disabled={!selectedReason || blockMutation.isPending}
              data-testid="button-confirm-block"
            >
              {t.chat.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionDialog === "end"} onOpenChange={(open) => !open && setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.chat.endReasons.title}</DialogTitle>
            <DialogDescription>{t.chat.selectReason}</DialogDescription>
          </DialogHeader>
          <RadioGroup value={selectedReason} onValueChange={setSelectedReason} className="space-y-3">
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => setSelectedReason("alreadyMet")}>
              <RadioGroupItem value="alreadyMet" id="end-met" />
              <Label htmlFor="end-met" className="cursor-pointer flex-1">{t.chat.endReasons.alreadyMet}</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => setSelectedReason("noConnection")}>
              <RadioGroupItem value="noConnection" id="end-noconnection" />
              <Label htmlFor="end-noconnection" className="cursor-pointer flex-1">{t.chat.endReasons.noConnection}</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => setSelectedReason("foundSomeone")}>
              <RadioGroupItem value="foundSomeone" id="end-found" />
              <Label htmlFor="end-found" className="cursor-pointer flex-1">{t.chat.endReasons.foundSomeone}</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => setSelectedReason("notReady")}>
              <RadioGroupItem value="notReady" id="end-notready" />
              <Label htmlFor="end-notready" className="cursor-pointer flex-1">{t.chat.endReasons.notReady}</Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer" onClick={() => setSelectedReason("other")}>
              <RadioGroupItem value="other" id="end-other" />
              <Label htmlFor="end-other" className="cursor-pointer flex-1">{t.chat.endReasons.other}</Label>
            </div>
          </RadioGroup>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setActionDialog(null); setSelectedReason(""); }} data-testid="button-cancel-end">
              {t.chat.cancel}
            </Button>
            <Button 
              onClick={() => endConversationMutation.mutate(selectedReason)} 
              disabled={!selectedReason || endConversationMutation.isPending}
              data-testid="button-confirm-end"
            >
              {t.chat.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
