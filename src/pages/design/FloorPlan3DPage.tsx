import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FloorPlan3DViewer from '../../components/FloorPlan3DViewer';

export default function FloorPlan3DPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (id) {
      navigate(`/projects/${id}/design`);
    } else {
      navigate('/design');
    }
  };

  return (
    <div className="w-full h-[calc(100vh-64px)] bg-slate-900 relative overflow-hidden">
      <FloorPlan3DViewer projectId={id} onClose={handleGoBack} />

      {/* Title (bottom-right) */}
      <div className="absolute bottom-4 right-4 z-20 bg-slate-900/80 backdrop-blur border border-slate-700 rounded-lg px-4 py-2 text-slate-300 text-xs pointer-events-none">
        <p>{t('floorPlan3D.title', '3D Zemin Planı Görüntüleyicisi')}</p>
      </div>
    </div>
  );
}
