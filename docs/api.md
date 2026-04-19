# PathoAtlas 公开 API

本文档描述所有公开 REST API 端点。这些接口均为 **GET 请求**，可自由调用（无需鉴权）。

所有响应格式为 JSON。

> 📝 **写入侧** API（创建 / 更新 / 删除 / 上传）见 [`admin-api.md`](./admin-api.md)。

> 🇨🇳 **国内增强字段**：部分响应可能含 `_enhance_*` 前缀字段（如 `_enhance_molecular_cn_cdx`、`_enhance_organ_epidemiology_cn`），由
> [`scripts/enhance/`](../scripts/enhance/) 流水线注入。前端组件可选择渲染或忽略，不影响核心字段。

---

## 端点清单

### 疾病相关

#### `GET /api/all-diseases` — 获取所有疾病
返回全库疾病列表（按器官分类）。

**响应示例**：
```json
{
  "lung": [
    {
      "id": "lung-adenocarcinoma",
      "nameZh": "肺腺癌",
      "nameEn": "Lung Adenocarcinoma",
      "category": "malignant",
      "epidemiology": "...",
      "clinicalFeatures": "...",
      "grossPathology": "...",
      "microscopy": "...",
      "keyFeatures": ["...", "..."],
      "ihcProfile": [...],
      "molecularFeatures": "...",
      "differentialDiagnosis": ["..."],
      "grading": "...",
      "staging": "TNM 第 8 版",
      "prognosis": "...",
      "treatment": "...",
      "images": [],
      "microscopyImages": [],
      "grossImages": [],
      "expertConsensus": "...",
      "literature": [...],
      "references": [...]
    },
    ...
  ],
  "breast": [...],
  ...
}
```

---

#### `GET /api/disease?organ=<organ>&id=<id>` — 获取单个疾病
按器官和 id 查询一个疾病的完整信息。

**参数**：
- `organ` — 器官 id（如 `lung`, `breast`）
- `id` — 疾病 id（如 `lung-adenocarcinoma`）

**响应**：单个疾病对象，或 `null`（404）

**示例**：
```bash
GET /api/disease?organ=lung&id=lung-adenocarcinoma
```

---

#### `GET /api/diseases-by-ids?ids=<id1>,<id2>,...` — 按 id 列表批量查询
给定一个逗号分隔的疾病 id 列表，返回对应的疾病对象数组。

**参数**：
- `ids` — 疾病 id 列表（逗号分隔，如 `lung-adenocarcinoma,breast-invasive-ductal-carcinoma`）

**响应**：疾病对象数组（顺序与输入相同）

**示例**：
```bash
GET /api/diseases-by-ids?ids=lung-adenocarcinoma,breast-invasive-ductal-carcinoma
```

---

#### `GET /api/organ?organ=<organ>` — 获取单个器官
按器官 id 查询该器官的完整信息（包含所有疾病、图标等）。

**参数**：
- `organ` — 器官 id

**响应示例**：
```json
{
  "id": "lung",
  "nameZh": "肺",
  "nameEn": "Lung",
  "icon": "IconLung",
  "color": "#3B82F6",
  "diseases": [
    { "id": "lung-adenocarcinoma", "nameZh": "肺腺癌", ... },
    ...
  ]
}
```

---

#### `GET /api/organs` — 获取所有器官列表
返回全部器官系统的基本信息（不含详细疾病列表）。

**响应示例**：
```json
[
  {
    "id": "lung",
    "nameZh": "肺",
    "nameEn": "Lung",
    "icon": "IconLung",
    "color": "#3B82F6"
  },
  {
    "id": "breast",
    "nameZh": "乳腺",
    "nameEn": "Breast",
    "icon": "IconBreast",
    "color": "#EC4899"
  },
  ...
]
```

---

### 标记物相关

#### `GET /api/markers` — 获取所有标记物
返回全库免疫组化标记物列表。

**响应示例**：
```json
[
  {
    "id": "ki-67",
    "nameZh": "Ki-67",
    "nameEn": "Ki-67",
    "abbreviation": "Ki-67",
    "category": "增殖标记",
    "cellularLocalization": "核",
    "cloneInfo": "SP6",
    "targetProtein": "增殖细胞核抗原（PCNA）",
    "normalExpression": "低表达（分生区）",
    "function": "细胞增殖指数",
    "interpretation": "...",
    "clinicalSignificance": "预后评估、治疗反应监测",
    "positiveIn": ["lung-adenocarcinoma", "..."],
    "negativeIn": ["..."],
    "relatedDrugs": [""],
    "pitfalls": "...",
    "stainingImages": [
      {
        "id": "ki67-high",
        "label": "高增殖 (>30%)",
        "description": "弥漫核阳性",
        "images": [
          {
            "url": "/uploads/markers/ki-67/staining/1700000000-image.jpg",
            "caption": "强阳性示例"
          }
        ]
      }
    ],
    "expertConsensus": "...",
    "literature": [...],
    "references": [...]
  },
  ...
]
```

---

#### `GET /api/marker?id=<id>` — 获取单个标记物
按 id 查询一个标记物的完整信息。

**参数**：
- `id` — 标记物 id（如 `ki-67`, `er`）

**响应**：单个标记物对象，或 `null`（404）

---

### 搜索

#### `GET /api/search?q=<query>` — 全文搜索
在疾病、标记物、器官等全库内容中进行模糊搜索。

**参数**：
- `q` — 查询关键词（至少 1 个字符）

**响应**：匹配结果数组

**响应示例**：
```json
[
  {
    "type": "disease",
    "organ": "lung",
    "id": "lung-adenocarcinoma",
    "nameZh": "肺腺癌",
    "nameEn": "Lung Adenocarcinoma"
  },
  {
    "type": "marker",
    "id": "ki-67",
    "nameZh": "Ki-67",
    "nameEn": "Ki-67"
  },
  ...
]
```

---

### 细胞病理学

#### `GET /api/cytology` — 获取所有细胞学分类系统
返回全库细胞学分类系统（Bethesda、TBS、Paris 等）。

**响应示例**：
```json
[
  {
    "id": "bethesda-thyroid-fna",
    "nameZh": "Bethesda 甲状腺 FNA（2023 版）",
    "nameEn": "Bethesda System for Thyroid Cytopathology",
    "description": "甲状腺细针穿刺的标准化报告系统...",
    "categories": [
      {
        "id": "nondiagnostic",
        "nameZh": "非诊断性",
        "nameEn": "Non-Diagnostic",
        "criteria": "细胞数量不足，<6 组优质滤泡细胞团...",
        "malignancyRisk": "1-3%",
        "management": "重复穿刺或超声引导下穿刺...",
        "notes": "最常见原因是采样不当"
      },
      ...
    ]
  },
  {
    "id": "tbs-cervical",
    "nameZh": "TBS 宫颈液基细胞（2014 Bethesda）",
    ...
  },
  ...
]
```

**系统列表**：
- `bethesda-thyroid-fna` — Bethesda 甲状腺 FNA
- `tbs-cervical` — TBS 宫颈液基细胞
- `paris-urine` — Paris 尿液细胞学
- `milan-salivary` — Milan 唾液腺 FNA
- `rose-fna` — ROSE 呼吸/胰/肝 FNA
- `body-cavity-ic` — 体腔积液 IC
- `yokohama-breast` — Yokohama 乳腺 FNA

---

### 冰冻切片 / 术中会诊

#### `GET /api/frozen` — 获取所有冰冻切片会诊场景
返回术中冰冻切片的经典会诊场景及决策树。

**响应示例**：
```json
[
  {
    "id": "breast-sentinel-lymph-node",
    "nameZh": "乳腺前哨淋巴结冰冻评估",
    "nameEn": "Breast Sentinel Lymph Node Intraoperative Assessment",
    "indication": "乳腺癌改良根治术中，评估前哨淋巴结(SLN)是否存在转移...",
    "clinicalScenario": "患者：乳腺浸润性导管癌，肿瘤≤2cm，腑窝超声阴性。术中进行前哨淋巴结映射和切除。",
    "intraoperativeApproach": [
      "切除SLN，通常为1-3个。",
      "术中冰冻切片评估是否存在转移...",
      ...
    ],
    "diagnosticTrap": [
      "**淋巴结副皮质增生**: 高度反应性淋巴结，可能被误认为是淋巴瘤或肿瘤浸润...",
      ...
    ],
    "typicalErrors": [
      "低估微转移的大小...",
      ...
    ],
    "reportingTemplate": "前哨淋巴结(SLN)冰冻评估：\n- SLN数量及部位\n- 转移情况：...\n..."
  },
  {
    "id": "thyroid-follicular-lesion",
    "nameZh": "甲状腺滤泡性肿瘤与界限评估",
    ...
  },
  ...
]
```

**场景列表**：
- `breast-sentinel-lymph-node` — 乳腺前哨淋巴结评估
- `thyroid-follicular-lesion` — 甲状腺滤泡性肿瘤评估
- `breast-margin-assessment` — 乳腺切缘评估
- `ovarian-borderline-tumor` — 卵巢交界性肿瘤
- `brain-tissue-crush-preparation` — 脑组织压片+冷冻

---

### 取材规范

#### `GET /api/grossing` — 获取所有取材规范
返回病理科不同标本类型的取材规范、墨水方案、切开方向等。

**响应示例**：
```json
[
  {
    "id": "breast-mass",
    "nameZh": "乳腺肿物",
    "nameEn": "Breast Mass",
    "inkScheme": "四色墨（深蓝/红/黄/绿）",
    "direction": "剖面切开，垂直于皮肤",
    "samplingInterval": "2-3mm",
    "essentialTake": [
      "肿瘤最大径三个部位(浅表、中心、深部)",
      "肿瘤与皮肤的关系",
      "肿瘤与乳头的距离",
      "周围正常乳腺组织(最少2块)"
    ],
    "photographyRequirements": "切面全景照片、标本编号、墨水标记清晰",
    "frozenSectionNotes": "通常不做冰冻，除非涉及切缘。若做冰冻应在肿瘤边缘取样。",
    "commonErrors": [
      "未全面评估肿瘤范围，遗漏卫星灶",
      "未标记深部切缘，影响T分期判定",
      "只取肿瘤中心，忽略边缘非典型增生区"
    ]
  },
  {
    "id": "breast-radical-mastectomy",
    "nameZh": "乳腺全切除术(根治/改良根治)",
    ...
  },
  ...
]
```

**标本类型示例**：
- `breast-mass` — 乳腺肿物
- `breast-radical-mastectomy` — 乳腺全切除
- `lung-lobectomy` — 肺叶切除
- `gastric-cancer-resection` — 胃癌根治
- `colorectal-cancer-resection` — 结直肠癌根治
- `prostate-radical-prostatectomy` — 前列腺根治
- `nephrectomy` — 肾切除
- `sentinel-lymph-node` — 前哨淋巴结
- `lymph-node-dissection` — 淋巴结清扫
- `skin-spindle-excision` — 皮肤梭形切除

---

### 统计数据

#### `GET /api/stats` — 获取数据库统计
返回疾病、标记物、器官等数量统计。

**响应示例**：
```json
{
  "totalDiseases": 156,
  "totalMarkers": 48,
  "totalOrgans": 15,
  "diseasesByOrgan": {
    "lung": 12,
    "breast": 18,
    "liver": 8,
    ...
  },
  "markersByCategory": {
    "增殖标记": 8,
    "上皮标记": 15,
    ...
  }
}
```

---

### 鉴别诊断 / 流程图

#### `GET /api/differentials`
鉴别诊断主题列表（含 `diseases[]` / `keyMarkers[]` / `algorithm`）。**18** 项。

#### `GET /api/flowcharts`
鉴别流程图（节点 + 边）。**13** 个流程图。

---

### 分子病理

#### `GET /api/molecular`
全部分子标志物。**37** 个驱动基因 / 生物标志物。每条含 `variants[]` / `detectionMethods[]` / `companionDiagnostics[]`。

可能含 `_enhance_molecular_cn_cdx`：NMPA 批准的伴随诊断试剂盒清单 + CSCO 推荐等级。

---

### 分级分期

#### `GET /api/staging`
全部分期分级系统。**21** 个（Nottingham / Gleason / FIGO / TNM / **CNLC / CGCA / 鼻咽中国 2017** 等）。

可能含 `_enhance_staging_cn_version`：国际对照与国内替代分期说明。

---

### 特殊染色

#### `GET /api/special-stains`
特殊染色参考库。**19** 种（PAS / AB / 网织 / 刚果红 / Masson / GMS 等）。

可能含 `_enhance_special_stain_images`：阳性 / 阴性样图 + 国内常用试剂厂家。

---

### IHC 套餐工具

#### `GET /api/panel-builder`
返回 `{ morphologyPatterns[], anatomicSites[], scenarios[] }`。每个 scenario 含 `firstLineMarkers[]` / `secondLineMarkers[]` / `rules[]`。

scenario 可能含 `_enhance_panel_cn_recommendation`：国内实验室一线 / 二线套餐。

---

### CAP 报告模板

#### `GET /api/reports`
全部结构化肿瘤报告模板。**24** 个，按器官（含国内特色器官根治标本）。每条含 `sections[].fields[]`。

可能含 `_enhance_synoptic_cn_align`：与国内《肿瘤病理诊断报告规范》字段对照。

---

### 虚拟病例

#### `GET /api/cases`
全部教学病例。**20** 个，分难度（easy/medium/hard）。每条含 `steps[]` 互动序列、`expertCommentary`。

可能含 `_enhance_case_cn_reference` / `_enhance_case_images`：国内指南要点 + 待补充的教学配图清单。

---

### 学习路径 / 课程

#### `GET /api/curriculum`
返回 `{ yearPaths[], specialtyPaths[] }`。Year 1-4 + 7 个专科路径。每个路径含 `modules[]`。

---

### 术语词汇表

#### `GET /api/glossary`
全部术语条目。**358** 条（含 WHO 5th 新实体）。每条含 `termZh / termEn / definition / category / relatedTerms / synonyms`。

---

## 错误响应

所有请求错误返回 JSON 配合适当的 HTTP 状态码：

| Status | 场景 | 响应示例 |
|---|---|---|
| 200 | 成功 | `[...]` 或 `{...}` |
| 400 | 缺少必要参数 | `{ "error": "Missing parameter: q" }` |
| 404 | 资源不存在 | `null` 或 `{ "error": "Not found" }` |
| 500 | 服务端错误 | `{ "error": "Internal server error" }` |

---

## 常见用例

### 1. 初始化前端应用
```bash
# 获取全部器官和标记物列表（用于导航/过滤）
GET /api/organs
GET /api/markers
```

### 2. 查询单个疾病
```bash
# 获取肺腺癌的完整信息
GET /api/disease?organ=lung&id=lung-adenocarcinoma
```

### 3. 全文搜索
```bash
# 搜索包含 "Ki-67" 的内容
GET /api/search?q=Ki-67
```

### 4. 获取细胞学分类
```bash
# 查看甲状腺细针穿刺的 Bethesda 分类
GET /api/cytology
```

### 5. 查看取材规范
```bash
# 获取乳腺肿物的标准取材方案
GET /api/grossing
```

### 6. 查询术中会诊
```bash
# 获取乳腺前哨淋巴结冰冻评估的决策树
GET /api/frozen
```

---

## 技术说明

- **动态缓存**：所有端点设置为 `force-dynamic`，确保管理员在后台更新内容后，API 立即反映更改（无需服务重启）。
- **CORS**：当前未限制，所有来源可调用。若需启用 CORS 策略，请参考 Next.js 文档。
- **分页**：暂无实现，大量查询时返回完整列表。若需分页，请提交 issue。
- **缓存控制**：客户端可根据需求在请求头添加 `Cache-Control: no-cache` 以跳过浏览器缓存。
