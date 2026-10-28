import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send, MoreVertical, Shield, Flag, Ban, CheckCheck, Check, XCircle, ImagePlus, X, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation, useI18n } from "@/lib/i18n";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useContentUploadConsent } from "@/components/ContentUploadConsent";
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
  imageUrl?: string | null;
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

async function uploadImageToGCS(file: File): Promise<string> {
  const res = await apiRequest('POST', '/api/uploads/request-url', {
    name: file.name,
    size: file.size,
    contentType: file.type,
  });
  const { uploadURL, objectPath } = await res.json();

  await fetch(uploadURL, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  return objectPath;
}

export default function ChatPage() {
  const [, params] = useRoute("/chat/:matchId");
  const matchId = parseInt(params?.matchId || "0");
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const requestConsent = useContentUploadConsent();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesViewport = useRef<HTMLElement>(null);
  const historyScroll = useRef<{ height: number; top: number } | null>(null);
  const chatOwner = useRef(String(matchId));
  chatOwner.current = String(matchId);
  const [history, setHistory] = useState<{ owner: string; items: Message[]; cursor?: string }>({ owner: String(matchId), items: [] });
  const { language } = useI18n();
  const olderCopy = { en: "Earlier messages", es: "Mensajes anteriores", fr: "Messages précédents", sv: "Tidigare meddelanden" }[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const { data: recentMessages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['/api/matches', matchId, 'messages'],
    enabled: !!matchId,
    queryFn: async ({ signal }) => {
      const owner = String(matchId);
      const response = await fetch(`/api/matches/${matchId}/messages`, { credentials: "include", signal });
      if (!response.ok) throw new Error("Unable to load messages");
      const items = await response.json() as Message[];
      const cursor = response.headers.get("X-Older-Cursor") || undefined;
      const priorRecent = queryClient.getQueryData<Message[]>(['/api/matches', matchId, 'messages']) ?? [];
      setHistory(previous => {
        if (chatOwner.current !== owner) return previous;
        if (previous.owner !== owner || (!previous.items.length && previous.cursor !== cursor)) return { owner, items: [], cursor };
        if (previous.items.length && items.length) {
          const known = new Set(previous.items.map(message => message.id));
          const evicted = priorRecent.filter(message => message.id < items[0].id && !known.has(message.id));
          if (evicted.length) return { ...previous, items: [...previous.items, ...evicted] };
        }
        return previous;
      });
      return items;
    },
    // Low-frequency recovery if a socket/relay event is lost during reconnect.
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  const messages = useMemo(() => {
    const items = history.owner === String(matchId) ? history.items : [];
    return [...new Map([...items, ...recentMessages].map(message => [message.id, message])).values()].sort((a, b) => a.id - b.id);
  }, [history, recentMessages, matchId]);
  const olderMessages = useMutation({
    mutationFn: async ({ owner, cursor }: { owner: string; cursor: string }) => {
      const response = await fetch(`/api/matches/${owner}/messages?before=${encodeURIComponent(cursor)}`, { credentials: "include" });
      if (!response.ok) throw new Error("Unable to load earlier messages");
      return { owner, items: await response.json() as Message[], cursor: response.headers.get("X-Older-Cursor") || undefined };
    },
    onSuccess: page => {
      if (chatOwner.current !== page.owner) return;
      const viewport = messagesViewport.current;
      if (viewport) historyScroll.current = { height: viewport.scrollHeight, top: viewport.scrollTop };
      setHistory(previous => ({ owner: page.owner, items: [...page.items, ...(previous.owner === page.owner ? previous.items : [])], cursor: page.cursor }));
    },
  });

  const handleTypingEvent = useCallback((userId: string) => {
    if (userId === currentUser?.id) return;
    setIsOtherTyping(true);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
  }, [currentUser?.id]);

  const { sendTyping, sendRead } = useChatSocket({
    matchId,
    onTyping: handleTypingEvent,
    enabled: !!matchId,
  });

  // Mark messages as read via WS when chat opens
  useEffect(() => {
    if (matchId) sendRead();
  }, [matchId, sendRead]);

  const sendMutation = useMutation({
    mutationFn: async ({ content, imageUrl }: { content: string; imageUrl?: string }) => {
      const res = await apiRequest('POST', `/api/matches/${matchId}/messages`, { content, imageUrl });
      return res.json();
    },
    onSuccess: (newMsg) => {
      setMessage("");
      setImagePreview(null);
      setImageFile(null);
      // Optimistically inject the sent message if WS hasn't already done it
      queryClient.setQueryData<Message[]>(
        ['/api/matches', matchId, 'messages'],
        (old = []) => old.some(m => m.id === newMsg.id) ? old : [...old, newMsg]
      );
    },
    onError: () => {
        toast({
          title: t.common.error,
          description: t.ui.chatUploadError,
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
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/daily-spark'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stories'] });
      queryClient.invalidateQueries({ queryKey: ['/api/premium/liked-by'] });
      queryClient.invalidateQueries({ queryKey: ['/api/super-likes/received'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
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
    if (historyScroll.current && messagesViewport.current) {
      const { height, top } = historyScroll.current;
      messagesViewport.current.scrollTop = top + messagesViewport.current.scrollHeight - height;
      historyScroll.current = null;
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: t.ui.chatImageOnly, description: t.ui.chatSelectImage, variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: t.ui.chatImageLarge, description: t.ui.chatMaxImage, variant: "destructive" });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    // Clear the input so same file can be re-selected
    e.target.value = '';
  };

  const handleSend = async () => {
    if (!message.trim() && !imageFile) return;

    let imageUrl: string | undefined;
    if (imageFile) {
      if (!(await requestConsent())) return;
      setIsUploadingImage(true);
      try {
        imageUrl = await uploadImageToGCS(imageFile);
      } catch {
        toast({ title: t.ui.chatUploadError, description: t.common.retry, variant: "destructive" });
        setIsUploadingImage(false);
        return;
      }
      setIsUploadingImage(false);
    }

    sendMutation.mutate({ content: message.trim(), imageUrl });
  };

  const otherUser = matchData?.otherUser;
  const userPhoto = otherUser?.photos?.[0]?.url || otherUser?.profileImageUrl;
  const isSending = sendMutation.isPending || isUploadingImage;

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

      <main ref={messagesViewport} className="flex-1 overflow-y-auto p-4 space-y-3">
        {history.owner === String(matchId) && history.cursor && (
          <Button
            variant="outline" className="w-full" data-testid="button-older-messages"
            disabled={olderMessages.isPending}
            onClick={() => olderMessages.mutate({ owner: String(matchId), cursor: history.cursor! })}
          >{olderMessages.isPending ? t.common.loading : olderMessages.isError ? t.common.retry : olderCopy}</Button>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">{t.ui.chatLoading}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-2 py-6 gap-5">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="text-3xl">👋</div>
              <p className="text-base font-semibold">
                {t.ui.chatStart.replace("{name}", otherUser?.firstName || t.matches.title)}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {t.ui.chatHint}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {[
                ["👋", t.ui.chatStarter1], ["🎉", t.ui.chatStarter2],
                ["✈️", t.ui.chatStarter3], ["🗺️", t.ui.chatStarter4],
                ["🎯", t.ui.chatStarter5], ["☕", t.ui.chatStarter6],
                ["🌍", t.ui.chatStarter7], ["🏔️", t.ui.chatStarter8],
              ].map(([emoji, text], i) => (
                <button
                  key={i}
                  onClick={() => setMessage(text.replace("{name}", otherUser?.firstName || ""))}
                  className="flex items-start gap-2.5 rounded-2xl px-4 py-3 text-left w-full transition-all active:scale-98"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                  data-testid={`starter-${i}`}
                >
                  <span className="text-base shrink-0 mt-0.5">{emoji}</span>
                  <p className="text-sm text-foreground/90 leading-snug">{text.replace("{name}", otherUser?.firstName || "")}</p>
                </button>
              ))}
            </div>
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
                  className={`max-w-[75%] overflow-hidden ${
                    msg.imageUrl && !msg.content ? "p-0" : "px-4 py-2"
                  } ${
                    isMe
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                  data-testid={`message-${msg.id}`}
                >
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                       alt={t.ui.chatSharedImage}
                      className={`max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${msg.content ? "mb-2 mt-1 mx-1" : "w-full"}`}
                      style={{ maxHeight: "280px", objectFit: "cover" }}
                      onClick={() => setLightboxUrl(msg.imageUrl!)}
                      data-testid={`message-image-${msg.id}`}
                    />
                  )}
                  {msg.content && (
                    <p className={`break-words ${msg.imageUrl ? "px-3 pb-1" : ""}`}>{msg.content}</p>
                  )}
                  <div className={`text-xs mt-1 flex items-center gap-1 ${msg.imageUrl && !msg.content ? "px-3 pb-2" : ""} ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
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

        {/* Typing indicator */}
        {isOtherTyping && (
          <div className="flex items-center gap-2 px-4 pb-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={matchData?.otherUser?.photos?.[0]?.url || matchData?.otherUser?.profileImageUrl} />
              <AvatarFallback className="text-[10px]">{matchData?.otherUser?.firstName?.[0]}</AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1 bg-muted rounded-2xl px-3 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </main>

      {/* Image preview strip */}
      {imagePreview && (
        <div className="px-4 pb-2 bg-background border-t pt-2">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt={t.ui.chatPreview}
              className="h-20 w-20 object-cover rounded-xl border-2 border-primary"
            />
            <button
              onClick={() => { setImagePreview(null); setImageFile(null); }}
              className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
              data-testid="button-remove-image-preview"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
           <p className="text-xs text-muted-foreground mt-1">{t.ui.chatImageReady}</p>
        </div>
      )}

      <footer className="sticky bottom-0 bg-background border-t p-4 pb-safe">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          data-testid="input-image-file"
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2 items-center"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            data-testid="button-attach-image"
            className="shrink-0 text-muted-foreground hover:text-primary"
          >
            <ImagePlus className="w-5 h-5" />
          </Button>
          <Input
            value={message}
            onChange={(e) => { setMessage(e.target.value); sendTyping(); }}
             placeholder={imageFile ? t.ui.chatOptionalText : t.chat.typeMessage}
            className="flex-1"
            data-testid="input-message"
          />
          <Button 
            type="submit" 
            disabled={(!message.trim() && !imageFile) || isSending}
            data-testid="button-send-message"
            className="shrink-0"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </form>
      </footer>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
          data-testid="lightbox-overlay"
        >
          <button
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxUrl}
             alt={t.ui.chatSharedImage}
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

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
