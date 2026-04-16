'use client';

import { useEffect, useState, useMemo } from 'react';
import { IconBrain, IconSearch } from '@/components/Icon';

interface FrozenSection {
  id: string;
  nameZh: string;
  nameEn: string;
  indication: string;
  clinicalScenario: string;
  intraoperativeApproach: string[];
  diagnosticTrap: string[];
  typicalErrors: string[];
  reportingTemplate: string;
}

export default function FrozenSectionPage() {
  const [sections, setSections] = useState<FrozenSection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/frozen');
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];
        setSections(items);
        if (items.length > 0) {
          setSelectedId(data[0].id);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredSections = useMemo(() => {
    return sections.filter(s =>
      s.nameZh.toLowerCase().includes(search.toLowerCase()) ||
      s.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      s.indication.toLowerCase().includes(search.toLowerCase())
    );
  }, [sections, search]);

  const selectedSection = sections.find(s => s.id === selectedId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          <p className="mt-4 text-fg-muted">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-card">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <IconBrain size={32} style={{ color: 'var(--accent)' }} />
            <h1 className="text-4xl font-bold text-fg">术中冻存切片</h1>
          </div>
          <p className="text-fg-muted">Intraoperative Frozen Section Consultation</p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Left Sidebar */}
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="搜索..."
                aria-label="搜索冻存切片"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-border rounded-lg text-fg placeholder-fg-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <IconSearch size={20} style={{ position: 'absolute', right: 12, top: 10, color: 'var(--fg-muted)' }} />
            </div>

            {/* Sections List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setSelectedId(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedId === section.id
                      ? 'bg-accent text-white'
                      : 'bg-white text-fg hover:bg-gray-100 border border-border'
                  }`}
                >
                  <div className="font-semibold text-sm">{section.nameZh}</div>
                  <div className={`text-xs mt-1 ${selectedId === section.id ? 'text-white/80' : 'text-fg-muted'}`}>
                    {section.nameEn}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Content */}
          <div className="space-y-6">
            {selectedSection ? (
              <>
                {/* Title */}
                <div className="border-b border-border pb-4">
                  <h2 className="text-2xl font-bold text-fg mb-2">{selectedSection.nameZh}</h2>
                  <p className="text-fg-muted text-sm">{selectedSection.nameEn}</p>
                </div>

                {/* Indication */}
                <div className="bg-white rounded-lg border border-border p-4">
                  <h3 className="font-bold text-fg mb-2 flex items-center gap-2">
                    <span className="text-accent">📋</span> 适应证
                  </h3>
                  <p className="text-fg-muted text-sm leading-relaxed">{selectedSection.indication}</p>
                </div>

                {/* Clinical Scenario */}
                <div className="bg-white rounded-lg border border-border p-4">
                  <h3 className="font-bold text-fg mb-2 flex items-center gap-2">
                    <span className="text-blue-500">🏥</span> 临床情景
                  </h3>
                  <p className="text-fg-muted text-sm leading-relaxed">{selectedSection.clinicalScenario}</p>
                </div>

                {/* Intraoperative Approach */}
                <div className="bg-white rounded-lg border border-border p-4">
                  <h3 className="font-bold text-fg mb-3 flex items-center gap-2">
                    <span className="text-green-500">✓</span> 术中处理方案
                  </h3>
                  <ul className="space-y-2">
                    {selectedSection.intraoperativeApproach.map((item, idx) => (
                      <li key={idx} className="text-fg-muted text-sm leading-relaxed pl-4 border-l-2 border-accent/30">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Diagnostic Trap */}
                <div className="bg-red-50 rounded-lg border border-red-200 p-4">
                  <h3 className="font-bold text-red-900 mb-3 flex items-center gap-2">
                    <span className="text-red-500">⚠️</span> 诊断陷阱
                  </h3>
                  <ul className="space-y-2">
                    {selectedSection.diagnosticTrap.map((item, idx) => (
                      <li key={idx} className="text-red-800 text-sm leading-relaxed pl-4 border-l-2 border-red-300">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Typical Errors */}
                <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                  <h3 className="font-bold text-yellow-900 mb-3 flex items-center gap-2">
                    <span className="text-yellow-600">❌</span> 常见错误
                  </h3>
                  <ul className="space-y-2">
                    {selectedSection.typicalErrors.map((item, idx) => (
                      <li key={idx} className="text-yellow-800 text-sm leading-relaxed pl-4 border-l-2 border-yellow-300">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Reporting Template */}
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                  <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="text-blue-500">📝</span> 报告模板
                  </h3>
                  <pre className="text-blue-800 text-xs whitespace-pre-wrap font-mono leading-relaxed p-3 bg-white rounded border border-blue-200">
                    {selectedSection.reportingTemplate}
                  </pre>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-96">
                <p className="text-fg-muted">请选择一个冻存切片场景</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
