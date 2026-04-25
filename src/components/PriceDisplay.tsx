import React from 'react';

interface PriceDisplayProps {
  netPrice: number;
  vatRate?: number;
  showGross?: boolean;
  currency?: string;
  perUnit?: string;
  className?: string;
}

/**
 * PriceDisplay Component
 * Displays prices according to German PAngV (Preisangabenverordnung) regulations
 * Shows net price prominently for B2B, with VAT and shipping notices
 */
export default function PriceDisplay({
  netPrice,
  vatRate = 0.19,
  showGross = false,
  currency = 'EUR',
  perUnit,
  className = '',
}: PriceDisplayProps) {
  const vatAmount = Math.round(netPrice * vatRate * 100) / 100;
  const grossPrice = netPrice + vatAmount;

  const formatPrice = (price: number) => {
    return price.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const currencySymbol = currency === 'EUR' ? '€' : '$';

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Net Price - Always shown prominently */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-black text-slate-900">
          {formatPrice(netPrice)}
        </span>
        <span className="text-lg text-slate-600">{currencySymbol}</span>
        {perUnit && <span className="text-xs text-slate-500 ml-1">{perUnit}</span>}
      </div>

      {/* Gross Price Breakdown */}
      <div className="text-xs text-slate-500 space-y-0.5">
        <div>
          zzgl. {(vatRate * 100).toFixed(0)}% MwSt. (
          {formatPrice(vatAmount)} {currencySymbol})
        </div>
        <div>zzgl. Versandkosten</div>
      </div>

      {/* Show gross if requested */}
      {showGross && (
        <div className="pt-2 border-t border-slate-200 mt-2">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-700">Inkl. MwSt.:</span>
            <span className="text-lg font-bold text-slate-900">
              {formatPrice(grossPrice)} {currencySymbol}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
