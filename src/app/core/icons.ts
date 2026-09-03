import { importProvidersFrom } from '@angular/core';
import {
  LucideAngularModule,
  // Every key below is referenced by MATERIAL_ICON_MAP in ds-icon, or used
  // directly by a ds-* component. An icon missing from this pick() list renders
  // as NOTHING at runtime — silently. IconComponent dev-warns when that happens.
  ArrowLeft, ArrowRight, ArrowUpDown, BadgeCheck, Ban, BookOpen, Calendar, Check, CheckCircle,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, Clock, CreditCard,
  Crosshair, Download, Eye, EyeOff, FileText, FlaskConical, GitMerge, Globe, Handshake,
  HeartPulse, History, Info, KeyRound, Languages, LayoutDashboard, Link, Loader,
  Lock, LogIn, LogOut, MapPin, MapPinOff, Megaphone, Menu, MessageCircle,
  MessagesSquare, MessageSquarePlus, Microscope, Minus, MousePointerClick, Navigation, Paperclip, PenLine,
  Phone, Plus, RefreshCw, Route, Search, Send, Share2, Shield, ShieldCheck, Siren, Sparkles,
  Star, Stethoscope, Store, Tag, TrendingUp, User, UserCheck, UserPlus, Users, Utensils, Wallet,
  X, Zap,
} from 'lucide-angular';

export const icons = {
  ArrowLeft, ArrowRight, ArrowUpDown, BadgeCheck, Ban, BookOpen, Calendar, Check, CheckCircle,
  ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, Clock, CreditCard,
  Crosshair, Download, Eye, EyeOff, FileText, FlaskConical, GitMerge, Globe, Handshake,
  HeartPulse, History, Info, KeyRound, Languages, LayoutDashboard, Link, Loader,
  Lock, LogIn, LogOut, MapPin, MapPinOff, Megaphone, Menu, MessageCircle,
  MessagesSquare, MessageSquarePlus, Microscope, Minus, MousePointerClick, Navigation, Paperclip, PenLine,
  Phone, Plus, RefreshCw, Route, Search, Send, Share2, Shield, ShieldCheck, Siren, Sparkles,
  Star, Stethoscope, Store, Tag, TrendingUp, User, UserCheck, UserPlus, Users, Utensils, Wallet,
  X, Zap,
};

/**
 * Registered icon names, kebab-cased exactly as LucideAngularModule.pick()
 * derives them from the keys above. Used by IconComponent's dev-mode check.
 *
 * NOTE the subtlety this encodes: pick() names an icon after its OBJECT KEY,
 * not its lucide filename. `CheckCircle` is an alias for the file
 * `circle-check-big`, but registers as "check-circle". Always target the key.
 */
export const REGISTERED_ICON_NAMES = new Set(
  Object.keys(icons).map((k) =>
    k
      // camel/Pascal boundary: ArrowLeft -> Arrow-Left
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      // letter->digit boundary: Share2 -> Share-2, Volume2 -> Volume-2.
      // Without this the check reports a false "not registered" for every
      // numbered icon even though it renders perfectly.
      .replace(/([a-zA-Z])(\d)/g, '$1-$2')
      .toLowerCase(),
  ),
);

export const provideIcons = () => importProvidersFrom(LucideAngularModule.pick(icons));
