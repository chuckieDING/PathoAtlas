import Link from 'next/link';
import { getOrgans, getDiseasesByOrgan } from '@/lib/data';
import { IconMicroscope } from '@/components/Icon';

export default function AtlasPage() {
  const organs = getOrgans();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--fg)' }}>
        <IconMicroscope size={24} style={{ color: '#6366f1' }} />
        <span>病理图谱</span>
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--fg-muted)' }}>选择器官系统，浏览相关疾病的病理学特征</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {organs.map(organ => {
          const diseases = getDiseasesByOrgan(organ.id);
          const malignant = diseases.filter(d => d.category === 'malignant').length;
          const benign = diseases.filter(d => d.category === 'benign').length;

          return (
            <Link key={organ.id} href={`/atlas/${organ.id}`}
              className="rounded-2xl p-6 border transition-all hover:shadow-lg"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', textDecoration: 'none' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="text-4xl">{organ.icon}</div>
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}>
                  {diseases.length} 种疾病
                </span>
              </div>
              <h2 className="text-lg font-bold mb-1" style={{ color: organ.color }}>{organ.nameZh}</h2>
              <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>{organ.nameEn}</p>
              <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--fg-muted)' }}>{organ.description}</p>

              <div className="flex gap-2 text-xs">
                {malignant > 0 && <span className="badge badge-malignant">{malignant} 恶性</span>}
                {benign > 0 && <span className="badge badge-benign">{benign} 良性</span>}
                {diseases.length - malignant - benign > 0 && (
                  <span className="badge badge-other">{diseases.length - malignant - benign} 其他</span>
                )}
              </div>

              {organ.commonStains.length > 0 && (
                <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>常用染色</div>
                  <div className="flex flex-wrap gap-1">
                    {organ.commonStains.slice(0, 5).map(s => (
                      <span key={s} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--card-hover)', color: 'var(--fg-muted)' }}>{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
