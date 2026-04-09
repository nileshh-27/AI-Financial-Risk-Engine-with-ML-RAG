import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, X, MessageSquare, Loader2 } from "lucide-react";
import { requireSupabase } from "@/lib/supabase";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

export function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "Hello! I am your AI assistant. I'll be connected to the Risk Engine soon to provide deep insights. How can I help you today?",
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input,
            timestamp: new Date()
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsTyping(true);

        try {
            // Prepare messages for the API (only sending role and content)
            const apiMessages = [...messages, userMessage].map(m => ({
                role: m.role,
                content: m.content
            }));

            const supabase = requireSupabase();
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token || "";

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ messages: apiMessages })
            });

            if (!res.ok) throw new Error("Failed to get response");

            const data = await res.json();

            const botMessage: Message = {
                id: Date.now().toString(),
                role: data.message.role,
                content: data.message.content,
                timestamp: new Date()
            };

            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error(error);
            const errorMessage: Message = {
                id: Date.now().toString(),
                role: "assistant",
                content: "Sorry, I had trouble communicating with the Risk Engine AI. Please try again.",
                timestamp: new Date()
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <>
            {/* Chat Bot Button */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl transition-all duration-300 z-50 ${isOpen ? "bg-primary/80 hover:bg-primary rotate-90 scale-0 opacity-0" : "bg-primary hover:bg-primary/90 scale-100 opacity-100"
                    }`}
                size="icon"
            >
                <MessageSquare className="h-6 w-6 text-primary-foreground" />
            </Button>

            {/* Floating Chat Window */}
            <div
                className={`fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 w-[calc(100vw-3rem)] sm:w-96 transition-all duration-300 origin-bottom-right ${isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
                    }`}
            >
                <Card className="flex flex-col border-primary/20 bg-background/95 backdrop-blur-xl shadow-2xl h-[500px] overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />

                    <CardHeader className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-4 py-3 flex flex-row items-center gap-3 space-y-0 relative z-10 shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-base">Risk Assistant</CardTitle>
                            <CardDescription className="flex items-center gap-1.5 text-xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                Online
                            </CardDescription>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsOpen(false)}
                            className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted/50"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 flex flex-col relative z-10 overflow-hidden">
                        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                            <div className="space-y-4">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : "flex-row"
                                            }`}
                                    >
                                        <Avatar className="h-6 w-6 border border-primary/20 bg-background shadow-sm shrink-0 mt-1">
                                            {message.role === "assistant" ? (
                                                <AvatarFallback className="bg-primary/5 text-primary text-[10px]">
                                                    <Bot className="h-3 w-3" />
                                                </AvatarFallback>
                                            ) : (
                                                <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px]">
                                                    <User className="h-3 w-3" />
                                                </AvatarFallback>
                                            )}
                                        </Avatar>

                                        <div className={`flex flex-col gap-1 max-w-[85%] ${message.role === "user" ? "items-end" : "items-start"
                                            }`}>
                                            <div
                                                className={`px-3 py-2 rounded-2xl shadow-sm text-sm ${message.role === "user"
                                                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                                                    : "bg-muted/50 text-foreground border border-border/50 rounded-tl-sm backdrop-blur-sm"
                                                    }`}
                                            >
                                                {message.content}
                                            </div>
                                            <span className="text-[10px] text-muted-foreground opacity-70 px-1">
                                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="flex gap-3 flex-row">
                                        <Avatar className="h-6 w-6 border border-primary/20 bg-background shadow-sm shrink-0 mt-1">
                                            <AvatarFallback className="bg-primary/5 text-primary text-[10px]">
                                                <Bot className="h-3 w-3" />
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col gap-1 items-start">
                                            <div className="px-3 py-2 rounded-2xl shadow-sm text-sm bg-muted/50 text-foreground border border-border/50 rounded-tl-sm backdrop-blur-sm flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>

                        <div className="p-3 bg-background/80 backdrop-blur-md border-t border-border/50 shrink-0">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSend();
                                }}
                                className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-full border border-border/50 focus-within:ring-1 focus-within:ring-primary/50 transition-shadow transition-colors"
                            >
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="Ask a question..."
                                    className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground/50 px-3 h-8 text-sm"
                                />
                                <Button
                                    type="submit"
                                    size="icon"
                                    className="rounded-full h-8 w-8 shrink-0 bg-primary hover:bg-primary/90 shadow-md transition-transform active:scale-95"
                                    disabled={!input.trim() || isTyping}
                                >
                                    {isTyping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                    <span className="sr-only">Send</span>
                                </Button>
                            </form>
                            <div className="text-center mt-1.5">
                                <span className="text-[9px] text-muted-foreground/50 uppercase tracking-widest font-mono">
                                    AI can make mistakes. Verify important info.
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
