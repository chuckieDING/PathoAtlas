# PathoAtlas · 病理知识图谱

> 面向住院医师与年轻病理医生的、结构化、可互动、可协作维护的病理学习与参考平台。

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/tests-204%20passing-22c55e)](https://vitest.dev/)

---

## ✨ 核心特性

### 学习与参考

- **🔬 疾病图谱** — **128** 种疾病，按 **13** 大器官系统组织（乳腺 / 肺 / 胃肠 / 肝 / 肾 / 甲状腺 / 淋巴瘤 / 皮肤 / 妇科 / 泌尿 / CNS / 软组织 / 骨）；每个疾病 10 个 Tab：概述 / 大体 / 镜下 / 免疫组化 / 分子 / 特殊染色 / 鉴别 / **共识/指南** / 文献 / 临床
- **🧪 标记物数据库** — **49** 个免疫组化标记物 + **19** 种特殊染色，统一标记物目录双 tab 切换，详情页含机制概念图、克隆变体、对照组织、染色陷阱
- **⚖️ 鉴别诊断** — **18** 个场景 + **13** 个可视化流程图（SVG 决策树），点击疾病直接跳转详情
- **📊 分级分期系统** — **21** 个评分体系（Nottingham / Gleason / ISUP / FIGO / Bethesda / TNM / **CNLC / CGCA / 鼻咽中国分期** 等），配套交互式计算器挂载在疾病详情页
- **🔬 细胞病理** — **9** 个分类系统（Bethesda 甲状腺 / TBS 宫颈 / Paris 尿液 / Milan 唾液腺 / Yokohama 乳腺 / ROSE / 体腔积液 / IOS 胸腹水 / PSC 呼吸道）
- **❄️ 冰冻切片** — **15** 个术中会诊决策场景，含诊断陷阱 + 常见错误 + 报告模板
- **📋 取材规范** — **21** 种标本协议（墨水方案 / 切开方向 / 必取部位 / 冰冻注意 / 常见错误 + **国内规范要点 + 与 CAP 差异**）
- **🧬 分子病理** — **37** 个驱动基因/生物标志物，检测方法对比表 + 伴随诊断 CDx 矩阵 + **NMPA 批准试剂盒清单**
- **📝 CAP 同步报告** — **24** 个结构化肿瘤报告模板，可填写导出，附**国内《肿瘤病理诊断报告规范》对齐表**
- **🎓 虚拟病例** — **20** 个跨器官交互式病例（分难度 + 步进诊断 + 国内指南要点）
- **🛠️ IHC 组合构建器** — 4 步推导：选形态 → 选标记物 → 录入结果 → 排序鉴别清单（含**国内实验室常用套餐**）
- **📚 术语词汇表** — **358** 条病理学专业术语（8 大类别，中英文释义，含 WHO 5th 新实体）
- **🗺️ 学习路径** — Year 1-4 按年级 + 7 个专科路径
- **🇨🇳 国内增强** — 共识/指南分 🌐 WHO / 🇺🇸 美国 / 🇨🇳 国内（CSCO/CACA/卫健委/中华医学会）三源呈现；器官页含 NCCR 中国流行病学；分子页含 NMPA CDx 试剂盒

### 用户体验

- **🔐 Google 登录 + 独立进度** — 所有用户通过 Google 登录，每人独立的 XP / 掌握度 / 收藏 / 笔记（服务端持久化）
- **📝 复习测验** — 闪卡式间隔学习，按器官筛选 / 错题解析 / 错题复习模式
- **⭐ 收藏与笔记** — 在任意疾病/标记物页面浮动按钮收藏、写笔记，Markdown 一键导出
- **🔍 全文搜索** — 跨疾病、标记物、鉴别诊断的统一搜索
- **🎯 功能引导** — 新用户首次访问自动 6 步引导熟悉模块
- **🏆 成就系统** — 15 个成就徽章 + 连击统计 + 每日 XP 目标
- **🌗 暗黑/亮色主题** — 跟随系统并可手动切换

### 内容管理

- **🛠️ 通用内容管理后台** — `/admin` 全字段 CRUD，覆盖 **全部 14 类内容**（疾病 / 标记物 / 特殊染色 / 器官 / 鉴别场景 / 流程图 / 分期 / 病例 / 细胞学 / 冰冻切片 / 术语 / 取材 / 分子 / CAP 报告）
- **📝 双模式编辑** — schema 驱动表单编辑 + JSON 原始模式无缝切换
- **🎨 色板选择器** — 所有颜色字段支持 14 色预设色板 + hex 输入
- **🗺️ 可视化流程图编辑器** — 拖拽节点、连线、属性面板（鉴别流程图专用）
- **📋 CAP 报告三级嵌套编辑器** — template → sections → fields，字段类型感知（select 选项 / number 单位）
- **🖼️ 染色图管理** — IHC 标记物和特殊染色均支持按结果分组（阴/阳、0/1+/2+/3+）上传图片
- **📊 审计日志** — 所有 CRUD 操作记录到 JSONL
- **🔐 双通道授权** — Google OAuth 邮箱白名单（管理员）+ Bearer Token（外部 AI / 自动化）

---

## 📐 项目结构

```
PathoAtlas/
├── data/                              # 结构化 JSON 数据（种子模板，git 跟踪）
│   ├── organs.json                    # 13 个器官系统（+NCCR 中国流行病学）
│   ├── markers.json                   # 49 个 IHC 标记物
│   ├── special-stains.json            # 19 种特殊染色（+国内试剂厂家）
│   ├── differentials.json             # 18 个鉴别场景
│   ├── flowcharts.json                # 13 个鉴别流程图
│   ├── staging.json                   # 21 个分级分期系统（+CNLC/CGCA 等国内）
│   ├── cytology.json                  # 9 个细胞学分类（+国内对应共识）
│   ├── frozen-sections.json           # 15 个冰冻切片协议（+陷阱图 + 国内共识）
│   ├── grossing.json                  # 21 种取材规范（+国内规范要点）
│   ├── molecular.json                 # 37 个分子标志物（+NMPA CDx 试剂盒）
│   ├── cases.json                     # 20 个虚拟病例（+国内指南要点）
│   ├── curriculum.json                # 学习路径
│   ├── glossary.json                  # 358 条术语（+WHO 5th 新实体）
│   ├── synoptic-templates.json        # 24 个 CAP 报告模板（+国内规范对齐）
│   └── diseases/
│       └── *.json                     # 128 个疾病分 13 个器官文件
├── scripts/
│   └── enhance/                       # 数据补全流水线（Claude Code CLI 后端）
│       ├── generate_tasks.py          # 从 data/ 推导任务清单
│       ├── prompts.py                 # 37 个维度的 system prompt
│       ├── run.py                     # subprocess 调 claude -p（订阅计费）
│       ├── validate.py                # 校验器（年份/外国指南冒充等）
│       ├── merge.py                   # 原子写入 + 备份 + rollback
│       ├── apply_flowchart_patches.py # 流程图 patch 应用器
│       ├── import_new_entries.py      # 新记录智能合并
│       ├── review.py                  # 人工复核队列
│       ├── report.py                  # 进度仪表板
│       └── daemon.sh                  # 5 分钟一轮无人值守
├── data-runtime/                      # 运行时数据（gitignored，保留 admin 编辑）
│   └── users/<sha256(email)>/         # 每用户独立目录
│       ├── profile.json
│       ├── progress.json
│       ├── favorites.json
│       └── notes.json
├── public/
│   ├── diagrams/                      # 44 个病理形态 + 标记物机制 SVG
│   └── uploads/                       # admin 上传的图片/PDF
├── docs/
│   ├── ROADMAP.md                     # 产品路线图（Tier 1-3）
│   └── admin-api.md                   # 完整 API 文档
├── src/
│   ├── app/
│   │   ├── page.tsx                   # 首页 Dashboard
│   │   ├── login/                     # Google 登录页
│   │   ├── atlas/[organ]/[disease]/   # 疾病详情（10 Tab）
│   │   ├── markers/                   # IHC + 特殊染色 双 tab 目录
│   │   ├── markers/[id]/              # 标记物/染色详情（5 Tab）
│   │   ├── staging/                   # 分级分期系统查询
│   │   ├── differentials/             # 鉴别场景 + 流程图
│   │   ├── cyto/ frozen/ grossing/    # 专项模块
│   │   ├── molecular/ panel-builder/
│   │   ├── reports/ cases/ curriculum/
│   │   ├── glossary/ review/
│   │   ├── progress/ favorites/
│   │   ├── search/ help/ about/
│   │   ├── admin/                     # 内容管理后台
│   │   │   ├── contentSchemas.ts      # 12 模块字段 schema
│   │   │   ├── FormRenderer.tsx       # 通用表单
│   │   │   ├── ColorField.tsx         # 色板选择器
│   │   │   ├── FlowchartEditor.tsx    # 可视化流程图
│   │   │   └── ReportTemplateEditor.tsx  # CAP 报告编辑器
│   │   └── api/
│   │       ├── [all data routes]      # 16 个公开数据 API
│   │       ├── user/{progress,favorites,notes}/  # 用户数据 API
│   │       ├── auth/{login,callback,me,logout,dev-login}/  # OAuth 流
│   │       └── admin/
│   │           ├── disease | marker | upload | audit
│   │           └── content/[module]   # 通用 CRUD（11 个模块）
│   ├── lib/
│   │   ├── data.ts                    # 数据访问 + 类型定义
│   │   ├── dataDir.ts                 # 种子 → 运行时数据目录
│   │   ├── auth.ts                    # 双 session + Bearer 鉴权
│   │   ├── userStorage.ts             # 服务端用户文件存储
│   │   ├── userDataClient.ts          # 客户端用户数据 API 封装
│   │   ├── progress.ts                # 学习进度（内存缓存 + 服务端同步）
│   │   ├── audit.ts                   # 审计日志
│   │   └── markerDiagrams.ts          # 机制概念图清单
│   ├── components/
│   │   ├── Navbar.tsx FeatureGuide.tsx HomeGuide.tsx
│   │   ├── FlowchartRenderer.tsx ImageLightbox.tsx
│   │   ├── NotesAndFavorites.tsx ProgressWidgets.tsx
│   │   ├── useUser.ts useGuide.ts useProgress.ts useDiseaseIndex.ts
│   │   └── calculators/               # TNM/FIGO/Gleason/ISUP/Nottingham/Bethesda 计算器
│   └── middleware.ts                  # 全站登录门控 + admin 鉴权
├── tests/                             # Vitest 测试套件
│   ├── data-integrity.test.ts         # 数据完整性 + 交叉引用
│   ├── lib-*.test.ts                  # 单元测试
│   ├── api-routes.test.ts             # HTTP 集成测试
│   └── flowchart-overlap.test.ts
├── vitest.config.ts
└── package.json
```

---

## 🚀 快速开始

### 本地开发（零配置）

```bash
git clone https://github.com/chuckieDING/PathoAtlas.git
cd PathoAtlas
npm install
npm run dev
```

访问 http://localhost:3000

**Dev mode** 特性（未设置 `GOOGLE_CLIENT_ID` 时）：
- 所有页面开放，无需登录
- `/admin` 和 `/api/admin/*` 对本机开放
- 适合本地数据维护与 UI 调试

**配置 Google 登录** 后所有用户必须登录：

```bash
# .env.local
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
ADMIN_EMAILS=admin@example.com,manager@example.com
AUTH_SECRET=<openssl rand -base64 32>
```

dev 环境会自动以 `ADMIN_EMAILS` 第一个邮箱免密登录（`/api/auth/dev-login`），生产环境强制走 Google OAuth。

### 运行测试

```bash
npm test           # 单次运行全部测试
npm run test:watch # watch 模式
```

当前状态：**204 / 204 passing**

### 生产构建

```bash
npm run build
npm run start
```

### 数据补全流水线 `scripts/enhance/`

批量补全国内指南/共识/CDx 等 PathoAtlas 内容增强的脚本套件。**走 Claude Code CLI（Pro/Max 订阅），无需 API key**。

```bash
# 1. 一次性安装：claude auth login（已登录可跳过）

# 2. 生成任务清单（从当前 data/ 推导，已有内容自动跳过）
python3 scripts/enhance/generate_tasks.py

# 3. 估算成本 + 评估优先级
python3 scripts/enhance/plan.py --top 20

# 4. 跑批（推荐 daemon 无人值守，5 分钟一轮，遇限额自动退避）
nohup scripts/enhance/daemon.sh > daemon.log 2>&1 &

# 5. 验证 + 复核
python3 scripts/enhance/validate.py
python3 scripts/enhance/review.py        # 生成 docs/review-queue.md

# 6. 合并回数据文件（含原子写入 + 备份）
python3 scripts/enhance/merge.py          # dry-run
python3 scripts/enhance/merge.py --apply

# 7. 进度仪表板
python3 scripts/enhance/report.py
```

**消化暗数据**（接入新维度后清理 `_enhance_*` 字段）：

```bash
python3 scripts/enhance/apply_flowchart_patches.py --apply  # flowchart 节点/边 patch
python3 scripts/enhance/import_new_entries.py --apply       # 新记录入库
```

详见 `scripts/enhance/*.py` 注释。

---

## 🧱 数据模型

### Disease（疾病）

```ts
interface Disease {
  id: string;                      // kebab-case，例 lung-adenocarcinoma
  nameZh: string;
  nameEn: string;
  aliases: string[];
  organ: string;                   // 关联 organs.json 的 id
  category: 'malignant' | 'benign' | 'precancerous' | 'inflammatory' | 'other';

  // 文本字段（支持 Markdown）
  epidemiology: string;
  clinicalFeatures: string;
  grossPathology: string;
  grossDescription?: string;
  microscopy: string;
  molecularFeatures: string;
  grading: string;
  staging: string;
  prognosis: string;
  treatment: string;

  // 结构化字段
  keyFeatures: string[];
  ihcProfile: { marker: string; result: string; note: string }[];
  specialStainProfile?: { stain: string; result: string; note: string }[];
  differentialDiagnosis: string[];
  differentialDiagnosisNotes?: string;
  references: string[];

  // 多媒体
  images: DiseaseImage[];
  microscopyImages?: DiseaseImage[];
  grossImages?: DiseaseImage[];

  // 指南引用
  expertConsensus?: ConsensusItem[];
  literature?: LiteratureItem[];
}
```

### Marker（IHC 标记物 & 特殊染色）

```ts
interface Marker {
  id: string;
  nameZh: string;
  nameEn: string;
  abbreviation: string;
  category: string;                // 上皮/间叶/淋巴/激素/... (IHC) 或 多糖/微生物/... (特殊染色)
  cloneInfo: string;
  targetProtein: string;
  cellularLocalization: string;
  function: string;
  interpretation: string;
  clinicalSignificance: string;
  positiveIn: string[];
  negativeIn: string[];
  pitfalls: string;
  references: string[];

  expertConsensus?: ConsensusItem[];
  literature?: LiteratureItem[];

  // 克隆变体（IHC 专用）
  cloneVariants?: { clone: string; source: string; notes: string }[];
  controlTissue?: { positive: string; negative: string };
  artifacts?: string[];

  // 染色图框架（按结果分组）
  stainingImages?: {
    id: string;
    label: string;                 // 阴性 / 阳性 / 0 / 1+ / 2+ / 3+ ...
    description?: string;
    images: DiseaseImage[];
  }[];

  // 特殊染色独有
  positiveResult?: string;
  negativeResult?: string;
}
```

更多数据结构（ConsensusItem / LiteratureItem / DiseaseImage / Flowchart / StagingSystem 等）见 [`src/lib/data.ts`](src/lib/data.ts)。

---

## 🛠️ 内容管理后台 `/admin`

### 三大分类 Tab

- **疾病** — 13 个器官文件，全字段表单 + 图片上传（大体/镜下按放大倍数分组）+ PDF 共识/文献，**「共识/指南」按机构自动归入 WHO/美国/国内 三组**
- **标记物** — 双子 tab：
  - **免疫组化**：49 条记录 + 克隆变体 + 对照组织 + 染色图
  - **特殊染色**：19 条记录 + 染色图管理
- **其他模块** — 统一 schema 驱动界面管理 11 个内容模块：
  - 器官系统（实时 OrganIcon 预览）
  - 鉴别场景 / **鉴别流程图（可视化拖拽编辑器）**
  - 分期系统 / 虚拟病例 / 细胞病理 / 冰冻切片
  - 术语词汇表 / 取材规范 / 分子病理 / **CAP 报告（三级嵌套编辑器）**

### API 速览

#### 🔓 公开数据 API

| 端点 | 说明 |
|------|------|
| `GET /api/all-diseases` | 全部疾病 |
| `GET /api/disease?organ=&id=` | 单个疾病 |
| `GET /api/markers` `?id=` | 标记物列表/详情 |
| `GET /api/organs` `?id=` | 器官列表/详情 |
| `GET /api/search?q=` | 全文搜索 |
| `GET /api/stats` | 数据库统计 |
| `GET /api/differentials` | 鉴别场景 |
| `GET /api/flowcharts` | 鉴别流程图 |
| `GET /api/staging` | 分级分期系统 |
| `GET /api/special-stains` | 特殊染色 |
| `GET /api/cytology` `/api/frozen` `/api/grossing` `/api/molecular` | 专项模块 |
| `GET /api/glossary` `/api/cases` `/api/curriculum` `/api/reports` `/api/panel-builder` | 其他 |

#### 🔒 内容管理 API（需鉴权）

| 方法 | 端点 | 说明 |
|------|------|------|
| `POST/PUT/DELETE` | `/api/admin/disease` | 疾病 CRUD |
| `POST/PUT/DELETE` | `/api/admin/marker` | 标记物 CRUD |
| `GET/POST/PUT/DELETE` | `/api/admin/content/<module>` | 通用模块 CRUD |
| `POST` | `/api/admin/upload` | 图片/PDF 上传 |
| `GET` | `/api/admin/audit` | 审计日志查询 |

其中 `<module>` 支持：organs / differentials / flowcharts / staging / cases / cytology / frozen-sections / glossary / grossing / molecular / reports / special-stains

#### 👤 用户数据 API（登录后可访问）

| 方法 | 端点 | 说明 |
|------|------|------|
| `GET/PUT` | `/api/user/progress` | 学习进度（XP / 掌握度 / 连击） |
| `GET/PUT` | `/api/user/favorites` | 收藏（疾病 + 标记物） |
| `GET/PUT` | `/api/user/notes` | 笔记 |

完整说明见 [`docs/admin-api.md`](docs/admin-api.md)。

---

## 🔐 鉴权

### 用户登录（全站必需）

所有非管理员页面也需要 Google 登录：
- 访问任意页面 → 未登录跳转 `/login`
- Google OAuth → 写入 `pathoatlas-user-session` cookie (HMAC-SHA256, 7 天)
- `ADMIN_EMAILS` 中的邮箱额外下发 `pathoatlas-admin-session`

### 管理员（双通道）

`/api/admin/*` 端点支持：
1. **Google 登录 + ADMIN_EMAILS 白名单**（浏览器人工使用）
2. **Bearer Token**（外部 AI / 自动化）—— `Authorization: Bearer <ADMIN_API_TOKEN>`

### 配置

```bash
# .env.local
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
ADMIN_EMAILS=alice@example.com,bob@example.com
AUTH_SECRET=<openssl rand -base64 32>
ADMIN_API_TOKEN=<openssl rand -hex 32>   # 可选，供外部程序使用
```

在 Google Cloud Console 的 OAuth Client 里把 `https://<your-domain>/api/auth/callback` 加入 Authorized redirect URI。

### 安全细节

- Session cookie：`httpOnly` + `sameSite=lax` + `secure`（生产）+ HMAC-SHA256
- CSRF：OAuth state 一次性 cookie，callback 校验后清除
- `email_verified=false` 的 Google 账户被拒
- 配了 OAuth 但 `ADMIN_EMAILS` 为空 → 直接报 `no_admin_emails_configured`（不让任意 Google 账户进 admin）
- Bearer token 走 `crypto.timingSafeEqual`，防时序攻击
- 每用户数据目录名为 `sha256(email).slice(0,16)`，不泄露邮箱

---

## 💾 数据持久化

### 种子 + 运行时分离

- **`data/`** — git 跟踪的种子模板，版本控制
- **`data-runtime/`** — gitignored，首次启动自动从 `data/` 复制
- 效果：`git pull` 更新种子数据，`data-runtime/` 保留 admin 所有编辑

### 用户数据

- `data-runtime/users/<hash>/`：profile.json / progress.json / favorites.json / notes.json
- 原子写入（.tmp + rename）
- debounced 服务端同步（进度 500ms、收藏 300ms、笔记 500ms）

---

## 🧪 外部 AI 接入示例

```bash
export ADMIN_API_TOKEN="..."
export BASE="https://your-deployment.example.com"

# 创建一条新的鉴别场景
curl -X POST $BASE/api/admin/content/differentials \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entry": {
      "id": "myxoid-tumors",
      "titleZh": "黏液样肿瘤鉴别",
      "titleEn": "Myxoid Tumor Differentials",
      "description": "...",
      "diseases": ["myxoid-liposarcoma"],
      "keyMarkers": ["SMA", "Desmin", "S-100"],
      "algorithm": "..."
    }
  }'

# 更新已有疾病
curl -X PUT $BASE/api/admin/disease \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organ": "lung",
    "id": "lung-adenocarcinoma",
    "updates": { "epidemiology": "AI 修订..." }
  }'

# 上传图片
curl -X POST $BASE/api/admin/upload \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -F "file=@her2_3plus.jpg" \
  -F "scope=markers/her2/3+"
```

---

## 📚 数据来源

- **疾病文本** — WHO Classification of Tumours（5th Edition 系列）、AJCC TNM 第 8 版、NCCN / CSCO / ESMO 指南
- **IHC 标记物** — ASCO/CAP guidelines、CAP IHC QI Program、PathologyOutlines.com
- **特殊染色** — Bancroft 组化技术手册
- **分子病理** — COSMIC / TCGA / 各基因 FDA 批准的伴随诊断矩阵
- **图片** — Wikimedia Commons 等开放许可来源；每张图 `source` 字段标注

数据结构化为 JSON，纯文本 diff 易于多人协作。

---

## 🛣️ 技术栈

| 层 | 选型 |
|---|------|
| 框架 | Next.js 16（App Router + Server Components） |
| 语言 | TypeScript 5 |
| UI | React 19 + Tailwind CSS 4 |
| Markdown | react-markdown + remark-gfm |
| 鉴权 | 自实现 Google OAuth + HMAC session（零外部依赖） |
| 数据 | 文件系统 JSON（无数据库） |
| 测试 | Vitest + @testing-library/react + jsdom |
| 部署 | Vercel / Cloud Run / 任何 Node 平台 |

---

## 🤝 贡献

欢迎 PR：
- 新疾病条目（`data/diseases/<organ>.json` 或 admin 后台）
- 新 IHC 标记物 / 特殊染色
- 疾病/标记物的镜下/大体图、专家共识、文献
- Bug 修复与 UI 改进

提交前请确保：
- `npm test` 全部通过（现有 204 个用例 + 新增功能对应测试）
- `npx tsc --noEmit` 无新增错误
- JSON 文件可被 `JSON.parse` 解析
- 若改动涉及数据交叉引用，`disease.differentialDiagnosis` / `differentials.diseases` / `staging.applicableTo` 中的 ID 必须实际存在

---

## 📄 许可

代码部分采用 **MIT** 协议。

数据部分（疾病文本、IHC 判读等）来自公开权威指南并以教育用途整理，**不构成临床诊疗建议**，使用者应结合本地法规与所在机构的标准操作流程。

---

## 🔗 链接

- 项目仓库：https://github.com/chuckieDING/PathoAtlas
- **产品路线图**：[`docs/ROADMAP.md`](docs/ROADMAP.md)
- **API 文档**：[`docs/admin-api.md`](docs/admin-api.md)
