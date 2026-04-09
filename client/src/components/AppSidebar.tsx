import { Link, useLocation } from "wouter";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger
} from "@/components/ui/sidebar";
import { LayoutDashboard, ShieldCheck, Wallet, ReceiptText, Bell, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
    { href: "/", label: "Overview", icon: LayoutDashboard },
    { href: "/risk", label: "Risk Engine", icon: ShieldCheck },
    { href: "/portfolio", label: "Portfolio", icon: Wallet },
    { href: "/transactions", label: "Transactions", icon: ReceiptText },
    { href: "/alerts", label: "Alerts", icon: Bell },
    { href: "/profile", label: "Profile", icon: User },
];

function isActive(pathname: string, href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
}

export function AppSidebar() {
    const { user, signOut } = useAuth();
    const [location] = useLocation();

    return (
        <Sidebar variant="inset" collapsible="icon">
            <SidebarContent>
                <div className="flex h-16 items-center px-4 font-mono font-bold text-xl tracking-tight text-white mb-4 mt-2">
                    <span className="text-primary mr-1">RISK</span>.ENGINE
                </div>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton asChild isActive={isActive(location, item.href)} tooltip={item.label}>
                                        <Link href={item.href}>
                                            <a className="flex items-center gap-3">
                                                <item.icon className="h-4 w-4" />
                                                <span>{item.label}</span>
                                            </a>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="p-4 border-t border-sidebar-border">
                {user && (
                    <div className="flex flex-col gap-2">
                        <div className="text-xs text-sidebar-foreground truncate px-2">{user.email}</div>
                        <button
                            onClick={signOut}
                            className="flex items-center gap-2 text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground px-2 py-1 transition-colors"
                        >
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                )}
            </SidebarFooter>
        </Sidebar>
    );
}

// Create a wrapper for private routes
export function PrivateLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <div className="flex min-h-screen w-full bg-transparent selection:bg-primary/20">
                <AppSidebar />
                <main className="flex-1 overflow-x-hidden min-h-screen border-l border-sidebar-border/30 bg-transparent shadow-xl shadow-black/10 relative z-10">
                    <div className="h-14 border-b border-white/5 px-4 flex items-center bg-transparent backdrop-blur-md sticky top-0 z-40">
                        <SidebarTrigger />
                    </div>
                    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
                        {children}
                    </div>
                </main>
            </div>
        </SidebarProvider>
    );
}
