import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { exportConsentData } from '../lib/consent-log';

interface GDPRActionsState {
  exporting: boolean;
  deleting: boolean;
  exportSuccess: boolean;
  deleteSuccess: boolean;
  error: string | null;
  showDeleteConfirm: boolean;
}

export default function GDPRActions() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [state, setState] = useState<GDPRActionsState>({
    exporting: false,
    deleting: false,
    exportSuccess: false,
    deleteSuccess: false,
    error: null,
    showDeleteConfirm: false,
  });

  /**
   * Export user data as JSON
   */
  const handleExportData = async () => {
    if (!user?.id) {
      setState((s) => ({ ...s, error: t('auth.notLoggedIn', 'Not logged in') }));
      return;
    }

    setState((s) => ({ ...s, exporting: true, error: null }));

    try {
      const userData: Record<string, any> = {
        profile: user,
        exportedAt: new Date().toISOString(),
      };

      // Fetch orders if available
      if (supabase) {
        try {
          const { data: orders } = await supabase
            .from('gastro_orders')
            .select('*')
            .eq('user_id', user.id);

          if (orders) userData.orders = orders;
        } catch (e) {
          console.warn('Could not fetch orders:', e);
        }

        // Fetch consent logs
        try {
          const consentData = exportConsentData();
          userData.consentLog = JSON.parse(consentData);
        } catch (e) {
          console.warn('Could not fetch consent logs:', e);
        }
      }

      // Create blob and download
      const json = JSON.stringify(userData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `meine-daten-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setState((s) => ({ ...s, exporting: false, exportSuccess: true }));

      // Reset success message after 3 seconds
      setTimeout(() => {
        setState((s) => ({ ...s, exportSuccess: false }));
      }, 3000);
    } catch (error: any) {
      setState((s) => ({
        ...s,
        exporting: false,
        error: error?.message || t('gdpr.exportError', 'Failed to export data'),
      }));
    }
  };

  /**
   * Delete user account and all associated data
   */
  const handleDeleteAccount = async () => {
    if (!user?.id) {
      setState((s) => ({ ...s, error: t('auth.notLoggedIn', 'Not logged in') }));
      return;
    }

    setState((s) => ({ ...s, deleting: true, error: null }));

    try {
      if (supabase) {
        // Delete orders
        try {
          await supabase
            .from('gastro_orders')
            .delete()
            .eq('user_id', user.id);
        } catch (e) {
          console.warn('Could not delete orders:', e);
        }

        // Delete user from auth
        await supabase.auth.admin.deleteUser(user.id);
      }

      setState((s) => ({
        ...s,
        deleting: false,
        deleteSuccess: true,
        showDeleteConfirm: false,
      }));

      // Logout user
      useAuthStore.setState({ user: null });

      // Redirect after 2 seconds
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (error: any) {
      setState((s) => ({
        ...s,
        deleting: false,
        error: error?.message || t('gdpr.deleteError', 'Failed to delete account'),
      }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Export Data Button */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Download className="text-sky-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-slate-900">
                {t('gdpr.exportTitle', 'Meine Daten herunterladen')}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {t(
                  'gdpr.exportDesc',
                  'Laden Sie Ihre persönlichen Daten als JSON-Datei herunter'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={handleExportData}
            disabled={state.exporting}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              state.exporting
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
            }`}
          >
            {state.exporting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-sky-400 border-t-sky-700 rounded-full animate-spin" />
                {t('common.loading')}
              </span>
            ) : (
              t('gdpr.download', 'Herunterladen')
            )}
          </button>
        </div>

        {state.exportSuccess && (
          <div className="flex items-center gap-2 mt-3 p-3 bg-emerald-50 rounded-lg text-emerald-700 text-sm">
            <CheckCircle size={16} />
            {t('gdpr.exportSuccess', 'Daten erfolgreich heruntergeladen')}
          </div>
        )}
      </div>

      {/* Delete Account Button */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Trash2 className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-slate-900">
                {t('gdpr.deleteTitle', 'Mein Konto löschen')}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {t(
                  'gdpr.deleteDesc',
                  'Löschen Sie Ihr Konto und alle zugehörigen Daten dauerhaft'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setState((s) => ({ ...s, showDeleteConfirm: true }))}
            className="px-4 py-2 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-all whitespace-nowrap"
          >
            {t('gdpr.delete', 'Löschen')}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {state.showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="text-red-600" size={24} />
              <h2 className="text-xl font-bold text-slate-900">
                {t('gdpr.confirmDelete', 'Konto wirklich löschen?')}
              </h2>
            </div>

            <div className="space-y-2 text-sm text-slate-600">
              <p>
                {t(
                  'gdpr.deleteWarning1',
                  'Folgende Daten werden dauerhaft gelöscht:'
                )}
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t('gdpr.deleteItem1', 'Ihr Kundenprofil')}</li>
                <li>{t('gdpr.deleteItem2', 'Alle Bestellungen und deren Details')}</li>
                <li>{t('gdpr.deleteItem3', 'Alle gespeicherten Einstellungen')}</li>
                <li>{t('gdpr.deleteItem4', 'Ihr Login-Zugang')}</li>
              </ul>
              <p className="mt-3 font-semibold text-red-600">
                {t('gdpr.deleteWarning2', 'Diese Aktion kann nicht rückgängig gemacht werden.')}
              </p>
            </div>

            {state.error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                {state.error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setState((s) => ({ ...s, showDeleteConfirm: false }))}
                className="flex-1 px-4 py-2 rounded-lg font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
              >
                {t('common.cancel', 'Abbrechen')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={state.deleting}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  state.deleting
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {state.deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {t('common.deleting')}
                  </span>
                ) : (
                  t('gdpr.confirmDelete', 'Ja, Konto löschen')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Message */}
      {state.deleteSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-700">
          <CheckCircle size={20} />
          <div>
            <p className="font-semibold">
              {t('gdpr.deleteSuccess', 'Konto gelöscht')}
            </p>
            <p className="text-sm">
              {t(
                'gdpr.deleteSuccessMsg',
                'Ihr Konto wurde erfolgreich gelöscht. Sie werden weitergeleitet...'
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
