import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Coins,
  LayoutDashboard,
  type LucideIcon,
  Package,
  PlusCircle,
  Receipt,
  Search,
  Settings,
  ShoppingCart,
  Star,
  Truck,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { Role } from "@/lib/generated/prisma/enums";

export type NavItem = {
  href: string;
  /** Key into the `nav` namespace of the message catalogs. */
  labelKey: string;
  icon: LucideIcon;
  /** Which counter, if any, feeds this item's badge. */
  badge?: "notifications" | "offers" | "jobs";
};

export type NavSection = {
  titleKey: string;
  items: NavItem[];
};

export const NAV: Record<Role, NavSection[]> = {
  OWNER: [
    {
      titleKey: "sectionMain",
      items: [
        { href: "/owner", labelKey: "owner.home", icon: LayoutDashboard },
        { href: "/owner/equipment", labelKey: "owner.equipment", icon: Truck },
        {
          href: "/owner/equipment/new",
          labelKey: "owner.register",
          icon: PlusCircle,
        },
        { href: "/owner/calendar", labelKey: "owner.calendar", icon: CalendarDays },
        {
          href: "/owner/bookings",
          labelKey: "owner.bookings",
          icon: ClipboardList,
          badge: "offers",
        },
        { href: "/owner/earnings", labelKey: "owner.earnings", icon: Coins },
      ],
    },
  ],
  OPERATOR: [
    {
      titleKey: "sectionOperator",
      items: [
        { href: "/operator", labelKey: "operator.profile", icon: UserRound },
        {
          href: "/operator/jobs",
          labelKey: "operator.jobs",
          icon: ClipboardList,
          badge: "jobs",
        },
        { href: "/operator/academy", labelKey: "operator.academy", icon: BookOpen },
        { href: "/operator/income", labelKey: "operator.income", icon: Wallet },
      ],
    },
  ],
  COMPANY: [
    {
      titleKey: "sectionCompany",
      items: [
        { href: "/company", labelKey: "company.search", icon: Search },
        { href: "/company/orders/new", labelKey: "company.create", icon: PlusCircle },
        {
          href: "/company/orders",
          labelKey: "company.orders",
          icon: ClipboardList,
          badge: "offers",
        },
        { href: "/company/progress", labelKey: "company.progress", icon: BadgeCheck },
        { href: "/company/reviews", labelKey: "company.reviews", icon: Star },
      ],
    },
  ],
  ADMIN: [
    {
      titleKey: "sectionAdmin",
      items: [
        { href: "/admin", labelKey: "admin.dashboard", icon: LayoutDashboard },
        { href: "/admin/users", labelKey: "admin.users", icon: Users },
        { href: "/admin/transactions", labelKey: "admin.transactions", icon: Receipt },
        { href: "/admin/academy", labelKey: "admin.academy", icon: BookOpen },
        { href: "/admin/store", labelKey: "admin.store", icon: Package },
      ],
    },
  ],
};

/** Appended to every role's sidebar. */
export const SHARED_ITEMS: NavItem[] = [
  { href: "/store", labelKey: "store", icon: ShoppingCart },
];

export const ADMIN_SETTINGS: NavItem = {
  href: "/admin/settings",
  labelKey: "admin.settings",
  icon: Settings,
};
