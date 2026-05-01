import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../stores/cartStore';
import type { EquipmentItem } from '../stores/equipmentStore';
import { ShoppingCart, Plus, Minus, Trash2 } from 'lucide-react';

interface Props {
  product: EquipmentItem;
  size?: 'sm' | 'md';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function CartQuantityButton({ product, size = 'sm', className = '', onClick }: Props) {
  const { t } = useTranslation();
  const { items, addItem, updateQuantity, removeItem } = useCartStore();
  const cartItem = items.find(i => i.product.id === product.id);
  const qty = cartItem?.quantity || 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);
  };

  if (qty === 0) {
    return (
      <button
        onClick={(e) => { handleClick(e); addItem(product); }}
        className={`flex items-center justify-center gap-1 font-bold transition-all ${
          size === 'sm'
            ? 'py-1.5 px-2 rounded-lg text-[10px]'
            : 'py-2.5 px-4 rounded-xl text-sm'
        } bg-red-50 text-[#7B1F26] hover:bg-[#7B1F26] hover:text-white ${className}`}
      >
        <ShoppingCart size={size === 'sm' ? 10 : 16} /> {t('cart.addToCart')}
      </button>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      onClick={e => e.stopPropagation()}
    >
      {/* Sepette label */}
      <div
        className={`flex items-center gap-1 font-bold ${
          size === 'sm'
            ? 'text-[10px] text-emerald-600'
            : 'text-xs text-emerald-600'
        }`}
      >
        <ShoppingCart size={size === 'sm' ? 10 : 14} />
        <span>{t('cart.inCart')}</span>
      </div>

      {/* Quantity controls */}
      <div
        className={`inline-flex items-center rounded-lg overflow-hidden border transition-all ${
          size === 'sm'
            ? 'h-7 text-[10px] border-emerald-200 bg-emerald-50'
            : 'h-10 text-sm border-emerald-300 bg-emerald-50'
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (qty <= 1) removeItem(product.id);
            else updateQuantity(product.id, qty - 1);
          }}
          className={`flex items-center justify-center hover:bg-emerald-200 transition-colors ${
            size === 'sm' ? 'w-6 h-7' : 'w-9 h-10'
          } ${qty <= 1 ? 'text-red-500 hover:bg-red-100' : 'text-emerald-700'}`}
        >
          {qty <= 1 ? <Trash2 size={size === 'sm' ? 10 : 14} /> : <Minus size={size === 'sm' ? 10 : 14} />}
        </button>
        <span className={`font-bold text-emerald-700 text-center ${size === 'sm' ? 'w-6' : 'w-8'}`}>
          {qty}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateQuantity(product.id, qty + 1);
          }}
          className={`flex items-center justify-center text-emerald-700 hover:bg-emerald-200 transition-colors ${
            size === 'sm' ? 'w-6 h-7' : 'w-9 h-10'
          }`}
        >
          <Plus size={size === 'sm' ? 10 : 14} />
        </button>
      </div>
    </div>
  );
}
