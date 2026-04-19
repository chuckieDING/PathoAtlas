'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { IconClipboard, IconSearch } from '@/components/Icon';

interface FieldOption { value: string; label: string }
interface TemplateField {
  id: string;
  label: string;
  labelEn: string;
  type: 'select' | 'text' | 'number' | 'boolean' | 'multiselect';
  options?: FieldOption[];
  required: boolean;
}
interface TemplateSection {
  id: string;
  title: string;
  fields: TemplateField[];
}
interface CnRegulationAlignItem {
  cnField: string;
  coveredBy: string | null;
}
interface SynopticTemplate {
  id: string;
  nameZh: string;
  nameEn: string;
  capProtocol: string;
  sections: TemplateSection[];
  /** Set by enhancement pipeline. Maps fields required by China's
   *  hospital reporting standard onto sections of the CAP protocol. */
  _enhance_synoptic_cn_align?: {
    capVersion?: string;
    cnRegulationAlign?: CnRegulationAlignItem[];
  };
}

type FormValues = Record<string, string | string[]>;

export default function ReportsPage() {
  const [templates, setTemplates] = useState<SynopticTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [exported, setExported] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(data => {
        const items = Array.isArray(data) ? data : [];
        setTemplates(items);
        if (items.length > 0) setSelectedId(items[0].id);
        setLoading(false);
      })
      .catch(() => { setTemplates([]); setLoading(false); });
  }, []);

  const selected = templates.find(t => t.id === selectedId);

  // Reset form when template changes
  useEffect(() => {
    setFormValues({});
    setExported(null);
  }, [selectedId]);

  const updateField = useCallback((fieldId: string, value: string | string[]) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
    setExported(null);
  }, []);

  const generateReport = useCallback(() => {
    if (!selected) return;
    const lines: string[] = [];
    lines.push(`=== ${selected.nameZh} / ${selected.nameEn} ===`);
    lines.push(`CAP Protocol: ${selected.capProtocol}`);
    lines.push(`报告生成时间: ${new Date().toLocaleString('zh-CN')}`);
    lines.push('');

    for (const section of selected.sections) {
      lines.push(`── ${section.title} ──`);
      for (const field of section.fields) {
        const val = formValues[field.id];
        let display = '';
        if (!val || (Array.isArray(val) && val.length === 0)) {
          display = field.required ? '[未填写 ⚠]' : '—';
        } else if (field.type === 'select' && field.options) {
          const opt = field.options.find(o => o.value === val);
          display = opt ? opt.label : String(val);
        } else if (field.type === 'multiselect' && field.options && Array.isArray(val)) {
          display = val.map(v => field.options!.find(o => o.value === v)?.label || v).join(', ');
        } else if (field.type === 'boolean') {
          display = val === 'true' ? '是' : val === 'false' ? '否' : String(val);
        } else {
          display = String(val);
        }
        lines.push(`  ${field.label} (${field.labelEn}): ${display}`);
      }
      lines.push('');
    }
    lines.push('---');
    lines.push('本报告由 PathoAtlas 同步报告模板生成，仅供参考。最终诊断以正式病理报告为准。');
    setExported(lines.join('\n'));
  }, [selected, formValues]);

  const copyToClipboard = useCallback(() => {
    if (exported) {
      navigator.clipboard.writeText(exported).catch(() => {});
    }
  }, [exported]);

  const completionPct = useMemo(() => {
    if (!selected) return 0;
    const requiredFields = selected.sections.flatMap(s => s.fields).filter(f => f.required);
    if (requiredFields.length === 0) return 100;
    const filled = requiredFields.filter(f => {
      const v = formValues[f.id];
      return v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
    });
    return Math.round((filled.length / requiredFields.length) * 100);
  }, [selected, formValues]);

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="animate-pulse" style={{ color: 'var(--fg-muted)' }}>加载中...</div></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <IconClipboard size={32} style={{ color: 'var(--accent)' }} />
          <h1 className="text-3xl font-bold" style={{ color: 'var(--fg)' }}>CAP 同步报告</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          结构化肿瘤病理报告模板。选择癌种，填写各项参数，生成标准化报告文本。覆盖 {templates.length} 个报告模板。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Template list sidebar */}
        <aside className="space-y-2">
          <h2 className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--accent)' }}>选择报告模板</h2>
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className="w-full text-left px-3 py-2.5 rounded-lg transition-colors"
              style={{
                background: selectedId === t.id ? 'rgba(99,102,241,0.15)' : 'transparent',
                border: selectedId === t.id ? '1px solid var(--accent)' : '1px solid transparent',
              }}
            >
              <div className="text-xs font-medium" style={{ color: selectedId === t.id ? 'var(--fg)' : 'var(--fg-muted)' }}>
                {t.nameZh}
              </div>
              <div className="text-[10px]" style={{ color: 'var(--fg-muted)', opacity: 0.7 }}>{t.nameEn}</div>
            </button>
          ))}
        </aside>

        {/* Form area */}
        <main>
          {selected ? (
            <div className="space-y-6">
              {/* Template header + progress */}
              <div className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--fg)' }}>{selected.nameZh}</h2>
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{selected.capProtocol}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs mb-1" style={{ color: 'var(--fg-muted)' }}>完成度</div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: 'var(--card-hover)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${completionPct}%`,
                            background: completionPct === 100 ? '#22c55e' : 'var(--accent)',
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold tabular-nums" style={{ color: completionPct === 100 ? '#22c55e' : 'var(--fg)' }}>
                        {completionPct}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* China regulatory alignment (enhancement) */}
              {selected._enhance_synoptic_cn_align?.cnRegulationAlign && selected._enhance_synoptic_cn_align.cnRegulationAlign.length > 0 && (
                <div className="rounded-xl p-5" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <h3 className="font-semibold text-sm mb-1 flex items-center gap-2" style={{ color: '#10b981' }}>
                    <span aria-hidden>🇨🇳</span> 国内《肿瘤病理诊断报告规范》对齐
                  </h3>
                  {selected._enhance_synoptic_cn_align.capVersion && (
                    <p className="text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
                      参照 CAP 版本：{selected._enhance_synoptic_cn_align.capVersion}
                    </p>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(16,185,129,0.2)' }}>
                          <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--fg)' }}>国内规范字段</th>
                          <th className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--fg)' }}>本模板覆盖</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selected._enhance_synoptic_cn_align.cnRegulationAlign.map((row, i) => (
                          <tr key={i} style={{ borderTop: i ? '1px dashed var(--border)' : undefined }}>
                            <td className="px-3 py-2" style={{ color: 'var(--fg)' }}>{row.cnField}</td>
                            <td className="px-3 py-2">
                              {row.coveredBy ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                                  {row.coveredBy}
                                </span>
                              ) : (
                                <span className="text-[10px] italic" style={{ color: '#ef4444' }}>未覆盖</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sections */}
              {selected.sections.map(section => (
                <div key={section.id} className="rounded-xl p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                  <h3 className="font-semibold text-sm mb-4" style={{ color: 'var(--accent)' }}>{section.title}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {section.fields.map(field => (
                      <FieldInput
                        key={field.id}
                        field={field}
                        value={formValues[field.id]}
                        onChange={v => updateField(field.id, v)}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* Actions */}
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={generateReport}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  生成报告文本
                </button>
                <button
                  onClick={() => { setFormValues({}); setExported(null); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: 'var(--card-hover)', color: 'var(--fg)', border: '1px solid var(--border)' }}
                >
                  清空表单
                </button>
              </div>

              {/* Export preview */}
              {exported && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--accent)' }}>
                  <div className="flex items-center justify-between px-4 py-2" style={{ background: 'var(--accent)', color: '#fff' }}>
                    <span className="text-xs font-semibold">报告预览</span>
                    <button onClick={copyToClipboard} className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(255,255,255,0.2)' }}>
                      复制到剪贴板
                    </button>
                  </div>
                  <pre
                    className="p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto"
                    style={{ background: 'var(--card)', color: 'var(--fg)' }}
                  >
                    {exported}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--fg-muted)' }}>请从左侧选择一个报告模板</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}) {
  const inputStyle = {
    background: 'var(--card-hover)',
    color: 'var(--fg)',
    border: '1px solid var(--border)',
  };

  return (
    <label className="block text-[11px]" style={{ color: 'var(--fg-muted)' }}>
      <span>
        {field.label}
        {field.required && <span style={{ color: '#ef4444' }}> *</span>}
      </span>
      <span className="text-[9px] ml-1 opacity-60">{field.labelEn}</span>

      {field.type === 'select' && field.options && (
        <select
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
          className="mt-1 w-full px-2.5 py-1.5 rounded-md outline-none text-xs"
          style={inputStyle}
        >
          <option value="">— 请选择 —</option>
          {field.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      )}

      {field.type === 'text' && (
        <input
          type="text"
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
          className="mt-1 w-full px-2.5 py-1.5 rounded-md outline-none text-xs"
          style={inputStyle}
        />
      )}

      {field.type === 'number' && (
        <input
          type="number"
          step="any"
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
          className="mt-1 w-full px-2.5 py-1.5 rounded-md outline-none text-xs"
          style={inputStyle}
        />
      )}

      {field.type === 'boolean' && (
        <select
          value={(value as string) || ''}
          onChange={e => onChange(e.target.value)}
          className="mt-1 w-full px-2.5 py-1.5 rounded-md outline-none text-xs"
          style={inputStyle}
        >
          <option value="">— 请选择 —</option>
          <option value="true">是</option>
          <option value="false">否</option>
        </select>
      )}

      {field.type === 'multiselect' && field.options && (
        <div className="mt-1 flex flex-wrap gap-1.5">
          {field.options.map(opt => {
            const selected = Array.isArray(value) && value.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const current = Array.isArray(value) ? value : [];
                  onChange(selected ? current.filter(v => v !== opt.value) : [...current, opt.value]);
                }}
                className="text-[10px] px-2 py-1 rounded-md transition-colors"
                style={{
                  background: selected ? 'rgba(99,102,241,0.12)' : 'var(--card-hover)',
                  border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                  color: selected ? 'var(--accent)' : 'var(--fg-muted)',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </label>
  );
}
