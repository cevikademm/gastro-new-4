/**
 * EU 2026 Withdrawal/Cancellation Button
 * Legally required for 14-day withdrawal period for B2C consumers
 * ONLY shown for B2C orders (no company/VAT ID)
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw, Download, X } from 'lucide-react';
import { Order } from '../stores/orderStore';
import { useAuthStore } from '../stores/authStore';

interface WithdrawalButtonProps {
  order: Order;
}

export default function WithdrawalButton({ order }: WithdrawalButtonProps) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [showModal, setShowModal] = useState(false);

  // Check if order is within 14-day withdrawal period
  const orderDate = new Date(order.created_at);
  const now = new Date();
  const daysElapsed = Math.floor(
    (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysRemaining = 14 - daysElapsed;
  const isWithdrawalPeriodActive = daysRemaining > 0;

  // Only show for B2C (no company/VAT ID)
  const isB2C = !user?.company || user.company === '';

  if (!isB2C || !isWithdrawalPeriodActive) {
    return null;
  }

  // Generate withdrawal form
  const generateWithdrawalForm = () => {
    const form = `
WIDERRUFSFORMULAR / WITHDRAWAL FORM

Empfänger / Recipient:
2MC Werbung & Gastro GmbH
Musterstraße 12
10115 Berlin, Deutschland
info@2mcgastro.de
+49 30 1234 5678

Bestellung / Order: ${order.order_number}
Bestelldatum / Order Date: ${orderDate.toLocaleDateString('de-DE')}

Hiermit widerrufe ich den Kauf folgender Produkte:
I hereby withdraw from the purchase of the following products:

${order.items.map((item) => `- ${item.name} (${item.quantity}x) - €${item.price}`).join('\n')}

Gesamtbetrag / Total: €${order.total_price}

Name: ${user?.fullName || ''}
Adresse / Address: ${user?.address || ''}
E-Mail: ${user?.email || ''}
Telefon / Phone: ${user?.phone || ''}

Datum / Date: _________________
Unterschrift / Signature: _____________________________

---

Hinweise zum Widerrufsrecht:
- Widerruf muss innerhalb von 14 Tagen erfolgen
- Per Post, E-Mail oder dieses Formular an Verkäufer senden
- Im Falle eines wirksamen Widerrufs erhalten Sie Ihr Geld zurück
- Sie tragen die Kosten für die Rücksendung

Notes on right of withdrawal:
- Withdrawal must be made within 14 days
- Send by post, email or this form to the seller
- In case of valid withdrawal, you will receive a refund
- You bear the cost of return shipping
    `;
    return form;
  };

  const downloadWithdrawalForm = () => {
    const form = generateWithdrawalForm();
    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(form)
    );
    element.setAttribute(
      'download',
      `Widerruf_${order.order_number}_${new Date().toISOString().slice(0, 10)}.txt`
    );
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-amber-500 text-amber-700 hover:bg-amber-50 font-bold text-sm transition-colors"
        title={t('withdrawal.title', 'Rücktrittsrecht - 14 Tage Widerruf')}
      >
        <RotateCcw size={16} />
        {t('withdrawal.button', 'Widerrufen')} ({daysRemaining} {t('common.days')})
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl space-y-6 p-6 max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-on-surface flex items-center gap-2">
                <RotateCcw size={20} className="text-amber-600" />
                {t('withdrawal.formTitle', 'Widerrufsformular')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-surface-container-high rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* Info Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
              <p className="font-bold mb-2">{t('withdrawal.infoTitle', 'Ihr Widerrufsrecht')}</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>{t('withdrawal.info1', 'Sie haben das Recht, diesen Kauf innerhalb von 14 Tagen zu widerrufen')}</li>
                <li>{t('withdrawal.info2', 'Die Frist beginnt am Tag der Bestellung')}</li>
                <li>{t('withdrawal.info3', 'Sie müssen die Produkte in originalem Zustand zurückgeben')}</li>
                <li>{t('withdrawal.info4', 'Sie tragen die Kosten für die Rücksendung')}</li>
                <li>{t('withdrawal.info5', 'Geld wird nach Erhalt der Rückware erstattet')}</li>
              </ul>
            </div>

            {/* Order Details */}
            <div className="bg-surface-container-lowest rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">{t('common.orderNumber')}:</span>
                <span className="font-mono font-bold">{order.order_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">{t('common.date')}:</span>
                <span>{orderDate.toLocaleDateString('de-DE')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">{t('common.total')}:</span>
                <span className="font-bold">€{order.total_price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">{t('common.daysRemaining')}:</span>
                <span className="font-bold text-amber-600">{daysRemaining} {t('common.days')}</span>
              </div>
            </div>

            {/* Withdrawal Instructions */}
            <div className="bg-surface-container rounded-lg p-4 space-y-3 text-sm">
              <p className="font-bold text-on-surface">{t('withdrawal.instructions', 'Anleitung zum Widerrufen:')}</p>
              <ol className="list-decimal list-inside space-y-2 text-on-surface-variant text-xs">
                <li>{t('withdrawal.step1', 'Füllen Sie das Widerrufsformular aus und unterschreiben Sie es')}</li>
                <li>{t('withdrawal.step2', 'Senden Sie es per E-Mail an info@2mcgastro.de oder per Post')}</li>
                <li>{t('withdrawal.step3', 'Packen Sie die Produkte sicher ein und senden Sie sie zurück')}</li>
                <li>{t('withdrawal.step4', 'Nach Erhalt erhalten Sie Ihr Geld zurück (bis 30 Tage)')}</li>
              </ol>
            </div>

            {/* Items List */}
            <div className="bg-surface-container-lowest rounded-lg p-4">
              <p className="font-bold text-sm text-on-surface mb-3">{t('common.products')}:</p>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {order.items.map((item) => (
                  <div key={item.product_id} className="flex justify-between text-xs">
                    <span className="text-on-surface-variant">{item.name}</span>
                    <span className="font-mono">{item.quantity}x €{item.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={downloadWithdrawalForm}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-surface-container-high hover:bg-surface-container text-primary font-bold text-sm transition-colors"
              >
                <Download size={16} />
                {t('withdrawal.download', 'Formular herunterladen')}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-outline-variant/30 text-on-surface-variant font-bold text-sm hover:bg-surface-container-low transition-colors"
              >
                {t('common.close')}
              </button>
            </div>

            {/* Contact Info */}
            <div className="text-xs text-on-surface-variant border-t border-outline-variant/20 pt-4">
              <p className="font-bold mb-2">{t('withdrawal.contactInfo', 'Kontakt für Widerruf:')}</p>
              <p>2MC Werbung & Gastro GmbH</p>
              <p>Musterstraße 12, 10115 Berlin</p>
              <p>E-Mail: info@2mcgastro.de</p>
              <p>Telefon: +49 30 1234 5678</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
