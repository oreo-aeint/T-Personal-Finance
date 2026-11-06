import React from 'react';
import {
  Utensils,
  Home,
  Train,
  Smartphone,
  ShoppingBag,
  HeartPulse,
  BookOpen,
  Film,
  Sparkles,
  MoreHorizontal,
  Briefcase,
  Gift,
  Coins,
  DollarSign,
  Coffee,
  Car,
  Wifi,
  Plane,
  Tag,
  CreditCard,
  LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Utensils,
  Home,
  Train,
  Smartphone,
  ShoppingBag,
  HeartPulse,
  BookOpen,
  Film,
  Sparkles,
  MoreHorizontal,
  Briefcase,
  Gift,
  Coins,
  DollarSign,
  Coffee,
  Car,
  Wifi,
  Plane,
  Tag,
  CreditCard,
};

interface CategoryIconProps {
  name?: string;
  size?: number;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  name = 'Tag',
  size = 18,
  className = '',
}) => {
  const IconComponent = ICON_MAP[name] || Tag;
  return <IconComponent size={size} className={className} />;
};

export const AVAILABLE_ICONS = [
  'Utensils',
  'Home',
  'Train',
  'Smartphone',
  'ShoppingBag',
  'HeartPulse',
  'BookOpen',
  'Film',
  'Sparkles',
  'Briefcase',
  'Gift',
  'Coins',
  'Coffee',
  'Car',
  'Wifi',
  'Plane',
  'MoreHorizontal',
];
