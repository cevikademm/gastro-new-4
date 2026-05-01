import { useTranslation } from 'react-i18next';
import { useUIStore } from '../stores/uiStore';
import { X, CheckCheck, Bell, AlertTriangle, Info, CheckCircle } from 'lucide-react';

export default function NotificationPanel() {
  const { t } = useTranslation();
  const { notifications, notificationPanelOpen, toggleNotificationPanel, markRead, markAllRead } = useUIStore();

  if (!notificationPanelOpen) return null;

  const typeIcons = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertTriangle,
  };
  const typeColors = {
    info: 'text-primary',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    error: 'text-error',
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={toggleNotificationPanel} />
      <div className="absolute top-14 -right-4 sm:right-0 w-[calc(100vw-2rem)] sm:w-80 max-h-[70vh] bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/20 z-50 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-outline-variant/10">
          <h3 className="font-headline font-bold text-sm text-primary flex items-center gap-2">
            <Bell size={16} /> {t('notifications.title')}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
              <CheckCheck size={14} /> {t('notifications.markAllRead')}
            </button>
            <button onClick={toggleNotificationPanel} className="p-1 hover:bg-surface-container-high rounded-full">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-on-surface-variant">{t('notifications.noNotifications')}</div>
          ) : (
            notifications.map((n) => {
              const Icon = typeIcons[n.type];
              return (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left p-4 border-b border-outline-variant/5 hover:bg-surface-container-high transition-colors ${!n.read ? 'bg-primary-fixed/5' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon size={16} className={`mt-0.5 shrink-0 ${typeColors[n.type]}`} />
                    <div>
                      <p className={`text-sm ${!n.read ? 'font-bold' : 'font-medium'} text-on-surface`}>{n.title}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{n.message}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
