import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Menu,
  LogOut,
  // User,
  // Settings,
  Bell,
  ChevronDown,
  Globe,
  User as UserIcon,
  // Clock,
  // Calendar,
  // UserPlus,
  // FileText,
} from "lucide-react";
import Button from "../common/Button";
import Avatar from "../common/Avatar";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { logout } from "../../store/slices/authSlice";
import { setTimezoneView } from "../../store/slices/uiSlice";
import { cn } from "../../lib/utils";
import logoStatic from "../../assets/icon.png";

interface HeaderProps {
  handleDrawerToggle: () => void;
}

interface NotificationDropdownProps {
  notificationDropdownOpen: boolean;
  setNotificationDropdownOpen: (open: boolean) => void;
  setUserDropdownOpen: (open: boolean) => void;
  // unreadCount: number;
  notificationDropdownRef: React.RefObject<HTMLDivElement | null>;
  navigate: (path: string) => void;
}

interface UserDropdownProps {
  userDropdownOpen: boolean;
  setUserDropdownOpen: (open: boolean) => void;
  setNotificationDropdownOpen: (open: boolean) => void;
  userName: string;
  userEmail: string;
  profilePicture?: string;
  userDropdownRef: React.RefObject<HTMLDivElement | null>;
  navigate: (path: string) => void;
  handleLogout: () => void;
}

// Dummy notification data
// const notifications = [
//   {
//     id: 1,
//     type: "leave",
//     icon: Calendar,
//     iconBg: "bg-blue-100 text-blue-600",
//     title: "Leave Request",
//     message: "John Doe requested 3 days leave",
//     time: "5 min ago",
//     unread: true,
//   },
//   {
//     id: 2,
//     type: "attendance",
//     icon: Clock,
//     iconBg: "bg-orange-100 text-orange-600",
//     title: "Late Check-in",
//     message: "Sarah Wilson checked in late today",
//     time: "1 hour ago",
//     unread: true,
//   },
//   {
//     id: 3,
//     type: "new_employee",
//     icon: UserPlus,
//     iconBg: "bg-green-100 text-green-600",
//     title: "New Employee",
//     message: "Mike Johnson joined Engineering team",
//     time: "2 hours ago",
//     unread: false,
//   },
//   {
//     id: 4,
//     type: "document",
//     icon: FileText,
//     iconBg: "bg-purple-100 text-purple-600",
//     title: "Document Updated",
//     message: "Employee handbook has been updated",
//     time: "1 day ago",
//     unread: false,
//   },
// ];

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notificationDropdownOpen,
  setNotificationDropdownOpen,
  setUserDropdownOpen,
  // unreadCount,
  notificationDropdownRef,
  navigate,
}) => (
  <div className="relative" ref={notificationDropdownRef}>
    <Button
      variant="ghost"
      onClick={() => {
        setNotificationDropdownOpen(!notificationDropdownOpen);
        setUserDropdownOpen(false);
      }}
      className={cn(
        "relative p-2.5 rounded-xl transition-colors group h-auto w-auto",
        notificationDropdownOpen ? "bg-muted" : "hover:bg-muted",
      )}
    >
      <Bell className="w-6 h-6 text-foreground-secondary group-hover:text-foreground transition-colors" />
      {/* {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-error rounded-full flex items-center justify-center text-[10px] font-bold text-white">
          {unreadCount}
        </span>
      )} */}
    </Button>

    {notificationDropdownOpen && (
      <div className="absolute right-0 mt-2 w-80 bg-surface rounded-2xl shadow-xl border border-border overflow-hidden z-50">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {/* {unreadCount > 0 && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
              {unreadCount} new
            </span>
          )} */}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {/* {notifications.map((notification) => {
            const Icon = notification.icon;
            return (
              <Button
                key={notification.id}
                variant="ghost"
                onClick={() => setNotificationDropdownOpen(false)}
                className={cn(
                  "w-full flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors text-left h-auto rounded-none justify-start",
                  notification.unread && "bg-primary/5",
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    notification.iconBg,
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {notification.title}
                    </p>
                    {notification.unread && (
                      <span className="w-2 h-2 bg-primary rounded-full" />
                    )}
                  </div>
                  <p className="text-sm text-foreground-secondary truncate">
                    {notification.message}
                  </p>
                  <p className="text-xs text-foreground-tertiary mt-1">
                    {notification.time}
                  </p>
                </div>
              </Button>
            );
          })} */}
        </div>

        <div className="px-4 py-3 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => {
              setNotificationDropdownOpen(false);
              navigate("/notifications");
            }}
            className="w-full text-center text-sm font-medium text-primary hover:text-primary-dark transition-colors h-9"
          >
            View all notifications
          </Button>
        </div>
      </div>
    )}
  </div>
);

const UserDropdown: React.FC<UserDropdownProps> = ({
  userDropdownOpen,
  setUserDropdownOpen,
  setNotificationDropdownOpen,
  userName,
  userEmail,
  profilePicture,
  userDropdownRef,
  // navigate,
  handleLogout,
}) => (
  <div className="relative" ref={userDropdownRef}>
    <Button
      variant="ghost"
      onClick={() => {
        setUserDropdownOpen(!userDropdownOpen);
        setNotificationDropdownOpen(false);
      }}
      className={cn(
        "flex items-center gap-3 py-1.5 pl-1.5 pr-3 rounded-xl transition-all h-auto",
        "hover:bg-muted",
        userDropdownOpen && "bg-muted",
      )}
    >
      <Avatar
        src={profilePicture}
        firstName={userName.split(" ")[0]}
        lastName={userName.split(" ")[1]}
        size="sm"
      />

      <div className="text-left hidden lg:block">
        <p className="text-sm font-medium text-foreground leading-tight">
          {userName}
        </p>
        <p className="text-xs text-foreground-secondary capitalize">
          {userEmail.split("@")[0]}
        </p>
      </div>

      <ChevronDown
        className={cn(
          "w-4 h-4 text-foreground-secondary transition-transform duration-200",
          userDropdownOpen && "rotate-180",
        )}
      />
    </Button>

    {userDropdownOpen && (
      <div className="absolute right-0 mt-2 w-64 bg-surface rounded-2xl shadow-xl border border-border overflow-hidden z-50">
        <div className="px-4 py-4 bg-muted/50">
          <div className="flex items-center gap-3">
            <Avatar
              src={profilePicture}
              firstName={userName.split(" ")[0]}
              lastName={userName.split(" ")[1]}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">
                {userName}
              </p>
              <p className="text-sm text-foreground-secondary truncate">
                {userEmail}
              </p>
            </div>
          </div>
        </div>

        {/* <div className="py-2">
          <Button
            variant="ghost"
            onClick={() => {
              setUserDropdownOpen(false);
              navigate("/profile");
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors h-auto rounded-none justify-start"
            startIcon={<User className="w-4 h-4 text-foreground-secondary" />}
          >
            My Profile
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setUserDropdownOpen(false);
              navigate("/settings");
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors h-auto rounded-none justify-start"
            startIcon={<Settings className="w-4 h-4 text-foreground-secondary" />}
          >
            Settings
          </Button>
        </div> */}

        <div className="border-t border-border" />

        <div className="py-2">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error/5 transition-colors h-auto rounded-none justify-start"
            startIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out
          </Button>
        </div>
      </div>
    )}
  </div>
);

const TimezoneToggle: React.FC = () => {
  const dispatch = useAppDispatch();
  const timezoneView = useAppSelector((state) => state.ui.timezoneView);

  return (
    <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border/50">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => dispatch(setTimezoneView('admin'))}
        className={cn(
          "h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all gap-1.5",
          timezoneView === 'admin'
            ? "bg-surface shadow-sm text-primary border border-border/50"
            : "text-foreground-secondary hover:text-foreground"
        )}
      >
        <Globe className="w-3 h-3" />
        Admin
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => dispatch(setTimezoneView('employee'))}
        className={cn(
          "h-7 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all gap-1.5",
          timezoneView === 'employee'
            ? "bg-surface shadow-sm text-primary border border-border/50"
            : "text-foreground-secondary hover:text-foreground"
        )}
      >
        <UserIcon className="w-3 h-3" />
        User
      </Button>
    </div>
  );
};

const Header: React.FC<HeaderProps> = ({ handleDrawerToggle }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] =
    useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await dispatch(logout());
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
      if (
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target as Node)
      ) {
        setNotificationDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const userName = user ? `${user.personalInfo.firstName} ${user.personalInfo.lastName}` : "User";
  const userEmail = user?.personalInfo?.email || "";
  const profilePicture = user?.personalInfo?.profilePicture;

  // const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-surface border-b border-border shadow-sm">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">
        {/* Left side - Logo & Branding */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDrawerToggle}
            className="md:hidden p-2 rounded-xl hover:bg-muted transition-colors h-auto w-auto"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-foreground" />
          </Button>

          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src={logoStatic}
              alt="Codec IT"
              className="w-10 h-10 rounded-xl shadow-sm"
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground leading-tight">
                Codec IT 
              </h1>
              <p className="text-xs text-foreground-secondary">
                HR Management System
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <TimezoneToggle />
          </div>

          <NotificationDropdown
            notificationDropdownOpen={notificationDropdownOpen}
            setNotificationDropdownOpen={setNotificationDropdownOpen}
            setUserDropdownOpen={setUserDropdownOpen}
            // unreadCount={unreadCount}
            notificationDropdownRef={notificationDropdownRef}
            navigate={navigate}
          />
          <div className="w-px h-8 bg-border mx-1 md:mx-2" />
          <UserDropdown
            userDropdownOpen={userDropdownOpen}
            setUserDropdownOpen={setUserDropdownOpen}
            setNotificationDropdownOpen={setNotificationDropdownOpen}
            userName={userName}
            userEmail={userEmail}
            profilePicture={profilePicture}
            userDropdownRef={userDropdownRef}
            navigate={navigate}
            handleLogout={handleLogout}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
