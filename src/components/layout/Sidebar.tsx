import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Users,
  Clock,
  Calendar,
  X,
  Building2,
  Briefcase,
  Settings,
  ChevronDown,
  ChevronRight,
  Tag,
  History as HistoryIcon,
  Megaphone,
  CalendarOff,
  Receipt,
  UserCheck,
  Layers,
  // LineChart,
} from "lucide-react";
import { cn } from "../../lib/utils";
import Button from "../common/Button";

const DRAWER_WIDTH = 260;
const HEADER_HEIGHT = 64; // 4rem = 64px

interface SidebarProps {
  mobileOpen: boolean;
  handleDrawerToggle: () => void;
}

const menuItems = [
  // { text: "Dashboard", icon: LayoutDashboard, path: "/" },
  { text: "Announcements", icon: Megaphone, path: "/announcements" },
  { text: "Users", icon: Users, path: "/users" },
  { text: "Clients", icon: Users, path: "/clients" },
  {
    text: "Organization",
    icon: Settings,
    path: "/admin",
    isSection: true,
    children: [
      { text: "Office Locations", icon: Building2, path: "/admin/locations" },
      { text: "Departments", icon: Layers, path: "/admin/departments" },
      { text: "Designations", icon: Briefcase, path: "/admin/designations" },
      { text: "Holidays", icon: Calendar, path: "/admin/holidays" },
      { text: "Leave Types", icon: Tag, path: "/admin/leave-types" },
      { text: "Leave Balances", icon: HistoryIcon, path: "/admin/leave-balances" },
      { text: "Reimbursement Types", icon: Tag, path: "/admin/reimbursement-types" },
      { text: "Roles", icon: UserCheck, path: "/admin/roles" },
    ],
  },
  { text: "Attendance", icon: Clock, path: "/attendance" },
  { text: "Schedule", icon: Calendar, path: "/schedule" },
  { text: "Leave", icon: CalendarOff, path: "/leave" },
  { text: "Reimbursements", icon: Receipt, path: "/reimbursements" },
  // { text: "Reports", icon: LineChart, path: "/reports" },
];

const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  handleDrawerToggle,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Organization: true, // Keep it open by default
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (mobileOpen) {
      handleDrawerToggle();
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-gradient-to-b from-primary to-primary-dark text-white">
      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path ||
            (item.children?.some(child => location.pathname === child.path));

          if (item.isSection && item.children) {
            const isOpen = openSections[item.text];
            return (
              <div key={item.text} className="mb-1">
                <Button
                  variant="ghost"
                  onClick={() => toggleSection(item.text)}
                  className={cn(
                    "w-full flex items-center justify-between px-5 py-3 transition-all duration-200 hover:bg-white/10 group rounded-none h-auto",
                    isActive ? "text-white" : "text-white/70 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "text-accent")} />
                    <span className={cn("text-sm font-bold tracking-tight uppercase", isActive && "text-white")}>{item.text}</span>
                  </div>
                  {isOpen ? <ChevronDown className="w-4 h-4 opacity-50" /> : <ChevronRight className="w-4 h-4 opacity-50" />}
                </Button>
                {isOpen && (
                  <div className="mt-1 space-y-1 bg-black/10">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = location.pathname === child.path;
                      return (
                        <Button
                          key={child.text}
                          variant="ghost"
                          onClick={() => handleNavigation(child.path)}
                          className={cn(
                            "w-full flex items-center gap-4 pl-12 pr-5 py-2.5 text-left transition-all duration-200 border-l-4 rounded-none h-auto justify-start",
                            isChildActive
                              ? "bg-white/10 border-accent text-white font-bold"
                              : "border-transparent text-white/60 hover:text-white hover:bg-white/5"
                          )}
                        >
                          <ChildIcon className={cn("w-4 h-4", isChildActive && "text-accent")} />
                          <span className="text-sm font-normal">{child.text}</span>
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Button
              key={item.text}
              variant="ghost"
              onClick={() => handleNavigation(item.path)}
              className={cn(
                "w-full flex items-center gap-4 px-5 py-3.5 text-left transition-all duration-200",
                "border-l-4 hover:bg-white/10 group rounded-none h-auto justify-start",
                isActive
                  ? "bg-white/15 border-accent font-bold text-white shadow-inner"
                  : "border-transparent text-white/80 hover:text-white",
              )}
            >
              <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive && "text-accent")} />
              <span className="text-sm font-medium tracking-wide">{item.text}</span>
            </Button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <p className="text-xs text-white/40 text-center">
          &copy; {new Date().getFullYear()} Codec IT
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile drawer backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          style={{ top: HEADER_HEIGHT }}
          onClick={handleDrawerToggle}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed left-0 bottom-0 z-40 transform transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ top: HEADER_HEIGHT, width: DRAWER_WIDTH }}
      >
        <div className="absolute top-2 right-2 md:hidden z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDrawerToggle}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors h-auto w-auto"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-white" />
          </Button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop permanent drawer - starts below header */}
      <aside
        className="hidden md:block fixed left-0 bottom-0 z-30 shadow-xl"
        style={{ top: HEADER_HEIGHT, width: DRAWER_WIDTH }}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
