import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Flag, LayoutDashboard, LogOut, ShieldAlert } from "lucide-react";
import { useLocation } from "wouter";

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/studio" },
  { icon: ShieldAlert, label: "Listings", path: "/studio" },
  { icon: Flag, label: "Reports", path: "/studio" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  if (loading) return <div className="min-h-screen bg-[#080d1d]" />;
  if (!user)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080d1d] p-6 text-white">
        <div className="max-w-md rounded-[1.5rem] border border-white/10 bg-[#0c1326] p-8 text-center">
          <h1 className="font-serif text-3xl">Studio access</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Sign in to continue to the private operations workspace.
          </p>
          <Button
            onClick={() => startLogin()}
            className="mt-7 rounded-xl bg-[#e1c687] text-[#10172c] hover:bg-[#f0da9f]"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  return (
    <SidebarProvider>
      <Sidebar className="border-r border-white/8 bg-[#0a1022] text-white">
        <SidebarHeader className="px-5 py-6">
          <p className="font-serif text-xl">v3rya Studio</p>
          <p className="mt-1 text-[10px] font-medium tracking-[.16em] text-[#e1c687] uppercase">
            Private operations
          </p>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="px-3">
            {menuItems.map(item => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  isActive={location === item.path}
                  onClick={() => setLocation(item.path)}
                  className="h-11 text-slate-300 hover:bg-white/7 hover:text-white"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4">
          <p className="mb-3 truncate text-xs text-slate-500">
            {user.email || user.name || "Authorized administrator"}
          </p>
          <Button
            variant="ghost"
            onClick={logout}
            className="w-full justify-start text-slate-400 hover:bg-white/7 hover:text-white"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <main className="min-h-screen">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
