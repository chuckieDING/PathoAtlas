/**
 * Form schema definitions for the generic content modules.
 * Each schema describes the fields and how they should be rendered
 * in the admin form. Nested fields (object arrays) have their own
 * itemSchema for row-level rendering.
 */

export type FieldType =
  | 'text'              // single-line string
  | 'textarea'          // multi-line string
  | 'select'            // dropdown with options
  | 'number'            // numeric input
  | 'color'             // hex color with swatch palette
  | 'string-array'      // list of strings (tag-like)
  | 'object-array'      // list of objects (nested form)
  | 'entity-ref'        // single reference to disease/marker/glossary with fuzzy search
  | 'entity-ref-array'; // list of entity references with fuzzy search

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
  placeholder?: string;
  required?: boolean;
  /** For object-array fields, the nested schema for each row */
  itemSchema?: FieldDef[];
  /** For textarea, row count hint */
  rows?: number;
  /** Help text shown below the field */
  help?: string;
  /** For entity-ref/entity-ref-array: the referenced entity kind */
  entityType?: 'disease' | 'marker' | 'glossary-term';
}

export interface ModuleSchema {
  /** Field list — the id field is always the first, auto-added, read-only */
  fields: FieldDef[];
}

const ORGAN_CATEGORY_OPTIONS = ['benign', 'malignant', 'precancerous', 'inflammatory', 'other'] as const;

// ── organs.json ─────────────────────────────────────────────

const organSchema: ModuleSchema = {
  fields: [
    { key: 'nameZh', label: '中文名', type: 'text', required: true },
    { key: 'nameEn', label: '英文名', type: 'text', required: true },
    { key: 'icon', label: '图标 emoji / 标记', type: 'text', placeholder: '例如：🔬 或 🫁', help: '实际页面图标按 organ id 在 OrganIcon 组件查找；此字段仅作数据标记' },
    { key: 'color', label: '主题色', type: 'color', placeholder: '#6366f1' },
    { key: 'description', label: '描述', type: 'textarea', rows: 3 },
    { key: 'commonStains', label: '常用染色', type: 'string-array' },
    { key: 'keyPatterns', label: '关键形态模式', type: 'string-array' },
  ],
};

// ── differentials.json ──────────────────────────────────────

const differentialSchema: ModuleSchema = {
  fields: [
    { key: 'titleZh', label: '中文标题', type: 'text', required: true },
    { key: 'titleEn', label: '英文标题', type: 'text', required: true },
    { key: 'description', label: '场景描述', type: 'textarea', rows: 3 },
    { key: 'diseases', label: '涉及疾病', type: 'entity-ref-array', entityType: 'disease', help: '搜索疾病中文名/英文名/ID 添加' },
    { key: 'keyMarkers', label: '关键标记物', type: 'string-array' },
    { key: 'algorithm', label: '诊断思路', type: 'textarea', rows: 6, help: '用分号分隔多个步骤' },
  ],
};

// ── flowcharts.json ────────────────────────────────────────

const flowchartSchema: ModuleSchema = {
  fields: [
    { key: 'titleZh', label: '标题', type: 'text', required: true },
    { key: 'relatedDifferentialId', label: '关联鉴别场景', type: 'text', help: '引用 differentials.json 中的 id（可手动输入或留空）' },
    {
      key: 'nodes', label: '节点', type: 'object-array',
      itemSchema: [
        { key: 'id', label: 'ID', type: 'text', required: true },
        { key: 'type', label: '类型', type: 'select', options: ['start', 'decision', 'result'] as const, required: true },
        { key: 'label', label: '标签', type: 'text', required: true },
        { key: 'x', label: 'X 坐标', type: 'number', required: true },
        { key: 'y', label: 'Y 坐标', type: 'number', required: true },
        { key: 'color', label: '颜色', type: 'color', placeholder: '#ef4444' },
      ],
    },
    {
      key: 'edges', label: '连线', type: 'object-array',
      itemSchema: [
        { key: 'from', label: '起点 ID', type: 'text', required: true },
        { key: 'to', label: '终点 ID', type: 'text', required: true },
        { key: 'label', label: '标签', type: 'text' },
      ],
    },
  ],
};

// ── staging.json ───────────────────────────────────────────

const stagingSchema: ModuleSchema = {
  fields: [
    { key: 'nameZh', label: '中文名', type: 'text', required: true },
    { key: 'nameEn', label: '英文名', type: 'text', required: true },
    { key: 'applicableTo', label: '适用疾病', type: 'entity-ref-array', entityType: 'disease' },
    { key: 'description', label: '描述', type: 'textarea', rows: 3 },
    {
      key: 'criteria', label: '评分标准', type: 'object-array',
      itemSchema: [
        { key: 'parameter', label: '参数', type: 'text', required: true },
        { key: 'score1', label: '1 分', type: 'text' },
        { key: 'score2', label: '2 分', type: 'text' },
        { key: 'score3', label: '3 分', type: 'text' },
        { key: 'description', label: '描述（或）', type: 'text' },
        { key: 'prognosis', label: '预后', type: 'text' },
      ],
    },
    {
      key: 'grades', label: '分级结果', type: 'object-array',
      itemSchema: [
        { key: 'grade', label: '级别', type: 'text', required: true },
        { key: 'totalScore', label: '总分区间', type: 'text' },
        { key: 'description', label: '描述', type: 'textarea', rows: 2 },
      ],
    },
  ],
};

// ── cases.json ─────────────────────────────────────────────

const caseSchema: ModuleSchema = {
  fields: [
    { key: 'titleZh', label: '标题', type: 'text', required: true },
    { key: 'difficulty', label: '难度', type: 'select', options: ['easy', 'medium', 'hard'] as const, required: true },
    { key: 'organ', label: '器官 ID', type: 'text', required: true },
    { key: 'clinicalHistory', label: '临床病史', type: 'textarea', rows: 4 },
    { key: 'grossDescription', label: '大体描述', type: 'textarea', rows: 3 },
    { key: 'microscopyClues', label: '镜下线索', type: 'string-array' },
    {
      key: 'steps', label: '诊断步骤', type: 'object-array',
      itemSchema: [
        { key: 'type', label: '类型', type: 'select', options: ['multiple-choice', 'marker-select'] as const, required: true },
        { key: 'question', label: '问题', type: 'textarea', rows: 2 },
        { key: 'explanation', label: '解析', type: 'textarea', rows: 3 },
      ],
      help: 'options/correctIndex 等复杂字段请切换 JSON 模式编辑',
    },
    { key: 'finalDiagnosis', label: '最终诊断', type: 'textarea', rows: 2 },
    { key: 'keyLearningPoints', label: '关键学习要点', type: 'string-array' },
    { key: 'expertCommentary', label: '专家点评', type: 'textarea', rows: 4 },
    { key: 'relatedDiseaseIds', label: '相关疾病', type: 'entity-ref-array', entityType: 'disease' },
    { key: 'relatedMarkerIds', label: '相关标记物', type: 'entity-ref-array', entityType: 'marker' },
  ],
};

// ── cytology.json ──────────────────────────────────────────

const cytologySchema: ModuleSchema = {
  fields: [
    { key: 'nameZh', label: '中文名', type: 'text', required: true },
    { key: 'nameEn', label: '英文名', type: 'text', required: true },
    { key: 'description', label: '描述', type: 'textarea', rows: 3 },
    {
      key: 'categories', label: '分类', type: 'object-array',
      itemSchema: [
        { key: 'categoryZh', label: '类别名', type: 'text', required: true },
        { key: 'malignancyRisk', label: '恶性风险', type: 'text' },
        { key: 'criteria', label: '诊断标准', type: 'textarea', rows: 3 },
        { key: 'management', label: '处理建议', type: 'textarea', rows: 2 },
        { key: 'notes', label: '备注', type: 'textarea', rows: 2 },
      ],
    },
  ],
};

// ── frozen-sections.json ───────────────────────────────────

const frozenSchema: ModuleSchema = {
  fields: [
    { key: 'nameZh', label: '中文名', type: 'text', required: true },
    { key: 'nameEn', label: '英文名', type: 'text', required: true },
    { key: 'indication', label: '适应证', type: 'textarea', rows: 2 },
    { key: 'clinicalScenario', label: '临床场景', type: 'textarea', rows: 3 },
    { key: 'intraoperativeApproach', label: '术中方法', type: 'string-array' },
    { key: 'diagnosticTraps', label: '诊断陷阱', type: 'string-array' },
    { key: 'commonErrors', label: '常见错误', type: 'string-array' },
    { key: 'reportingTemplate', label: '报告模板', type: 'textarea', rows: 5 },
  ],
};

// ── glossary.json ──────────────────────────────────────────

const glossarySchema: ModuleSchema = {
  fields: [
    { key: 'termZh', label: '中文术语', type: 'text', required: true },
    { key: 'termEn', label: '英文术语', type: 'text', required: true },
    { key: 'definition', label: '定义', type: 'textarea', rows: 4 },
    { key: 'category', label: '类别', type: 'select', options: [
      '基础病理', '肿瘤总论', '组织学技术', '免疫组化', '分子病理', '细胞病理', '解剖病理', '临床病理',
    ] as const },
    { key: 'synonyms', label: '同义词', type: 'string-array' },
    { key: 'relatedTerms', label: '相关术语', type: 'entity-ref-array', entityType: 'glossary-term' },
  ],
};

// ── grossing.json ──────────────────────────────────────────

const grossingSchema: ModuleSchema = {
  fields: [
    { key: 'nameZh', label: '中文名', type: 'text', required: true },
    { key: 'nameEn', label: '英文名', type: 'text', required: true },
    { key: 'indication', label: '适应证', type: 'textarea', rows: 2 },
    { key: 'inkScheme', label: '墨水方案', type: 'textarea', rows: 2 },
    { key: 'incisionDirection', label: '切开方向', type: 'textarea', rows: 2 },
    { key: 'samplingInterval', label: '取材间隔', type: 'textarea', rows: 2 },
    { key: 'mandatorySites', label: '必取部位', type: 'string-array' },
    { key: 'photoRequirements', label: '照片要求', type: 'textarea', rows: 2 },
    { key: 'frozenConsiderations', label: '冰冻注意事项', type: 'textarea', rows: 2 },
    { key: 'commonErrors', label: '常见错误', type: 'string-array' },
  ],
};

// ── molecular.json ─────────────────────────────────────────

const molecularSchema: ModuleSchema = {
  fields: [
    { key: 'geneSymbol', label: '基因符号', type: 'text', required: true, placeholder: 'EGFR / ALK / BRAF' },
    { key: 'nameZh', label: '中文名', type: 'text', required: true },
    { key: 'nameEn', label: '英文名', type: 'text', required: true },
    { key: 'category', label: '类别', type: 'text', placeholder: 'tyrosine-kinase / fusion / point-mutation 等' },
    { key: 'clinicalSignificance', label: '临床意义', type: 'textarea', rows: 4 },
    { key: 'associatedTumors', label: '相关肿瘤', type: 'string-array' },
    {
      key: 'variants', label: '变异谱', type: 'object-array',
      itemSchema: [
        { key: 'name', label: '变异名', type: 'text', required: true },
        { key: 'frequency', label: '频率', type: 'text' },
        { key: 'clinicalSignificance', label: '临床意义', type: 'textarea', rows: 2 },
      ],
    },
    {
      key: 'detectionMethods', label: '检测方法', type: 'object-array',
      itemSchema: [
        { key: 'method', label: '方法名', type: 'text', required: true },
        { key: 'sensitivity', label: '敏感度', type: 'text' },
        { key: 'turnaround', label: '周转时间', type: 'text' },
        { key: 'notes', label: '备注', type: 'textarea', rows: 2 },
      ],
    },
    { key: 'references', label: '参考文献', type: 'string-array' },
  ],
};

// ── reports (synoptic-templates.json) ──────────────────────

const reportsSchema: ModuleSchema = {
  fields: [
    { key: 'titleZh', label: '模板名', type: 'text', required: true },
    { key: 'organ', label: '器官', type: 'text' },
    { key: 'description', label: '描述', type: 'textarea', rows: 2 },
  ],
};

// ── special-stains.json ────────────────────────────────────

const specialStainSchema: ModuleSchema = {
  fields: [
    { key: 'nameZh', label: '中文名', type: 'text', required: true },
    { key: 'nameEn', label: '英文名', type: 'text', required: true },
    { key: 'abbreviation', label: '缩写', type: 'text' },
    { key: 'category', label: '类别', type: 'select', options: [
      '多糖染色', '结缔组织染色', '微生物染色', '矿物质染色', '蛋白质染色', '脂质染色',
    ] as const },
    { key: 'targetProtein', label: '检测靶物', type: 'text' },
    { key: 'cellularLocalization', label: '细胞定位', type: 'text' },
    { key: 'function', label: '原理', type: 'textarea', rows: 3 },
    { key: 'interpretation', label: '判读', type: 'textarea', rows: 3 },
    { key: 'clinicalSignificance', label: '临床意义', type: 'textarea', rows: 3 },
    { key: 'positiveResult', label: '阳性表现', type: 'text' },
    { key: 'negativeResult', label: '阴性表现', type: 'text' },
    { key: 'positiveIn', label: '阳性疾病', type: 'string-array' },
    { key: 'negativeIn', label: '阴性疾病', type: 'string-array' },
    { key: 'pitfalls', label: '陷阱', type: 'textarea', rows: 3 },
    { key: 'references', label: '参考文献', type: 'string-array' },
  ],
};

// ── Exported registry ──────────────────────────────────────

export const CONTENT_SCHEMAS: Record<string, ModuleSchema> = {
  organs: organSchema,
  differentials: differentialSchema,
  flowcharts: flowchartSchema,
  staging: stagingSchema,
  cases: caseSchema,
  cytology: cytologySchema,
  'frozen-sections': frozenSchema,
  glossary: glossarySchema,
  grossing: grossingSchema,
  molecular: molecularSchema,
  reports: reportsSchema,
  'special-stains': specialStainSchema,
};
