# PathoAtlas · 病理知识图谱

> 面向住院医师与年轻病理医生的、结构化、可互动、可协作维护的病理学习与参考平台。

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8)](https://tailwindcss.com/)

---

## ✨ 核心特性

- **🔬 疾病图谱** — **72** 种常见疾病，按 **10** 大器官系统组织；每个疾病一组 9 个分页 Tab：概述 / 大体描述 / 镜下特征 / 免疫组化 / 分子病理 / 鉴别诊断 / 专家共识 / 文献参考 / 临床
- **🧪 标记物数据库** — **49** 个常用 IHC 标记物，独立详情页 + 5 Tab 视图（概述 / 判读 / 染色形态 / 专家共识 / 文献参考），含按结果分组的染色形态图框架（阴/阳、0/1+/2+/3+、低/中/高 等）
- **⚖️ 鉴别诊断** — **13** 个常见鉴别诊断场景与对应免疫组化套餐策略
- **📚 专家共识 + 文献参考** — 每条目支持「**源地址**」（出版商 DOI/原文页）+「**在线阅览**」（PubMed/摘要/PDF 预览）双链接
- **🖼️ 图片资源** — 镜下图、大体图分类管理；默认压缩图懒加载，点击「加载原图」按需切换高清版
- **📝 复习与进度** — 闪卡式复习、XP/掌握度/连击的轻量学习追踪
- **🔍 全文搜索** — 跨疾病、标记物、鉴别诊断的统一搜索
- **🛠️ 内容管理后台** — `/admin` 全字段 CRUD，所有前台展示的内容均可在线维护
- **🔐 双通道授权** — Google OAuth 邮箱白名单（人工）+ Bearer Token（外部 AI / 自动化），两者任一通过即可
- **🌗 暗黑/亮色主题** — 跟随系统并可手动切换

---

## 📐 项目结构

```
PathoAtlas/
├── data/                              # 结构化 JSON 数据（版本控制友好）
│   ├── organs.json                    # 器官系统元数据
│   ├── markers.json                   # 49 个 IHC 标记物
│   ├── staging.json                   # 分级分期系统
│   ├── differentials.json             # 鉴别诊断场景
│   └── diseases/
│       ├── breast.json | gi.json | gynecology.json | kidney.json
│       ├── liver.json  | lung.json | lymphoma.json | skin.json
│       ├── thyroid.json | urology.json    # 共 72 种疾病
├── public/
│   ├── diagrams/                      # 标记物机制概念 SVG
│   └── uploads/                       # 管理后台上传的图片/PDF 落点
├── docs/
│   └── admin-api.md                   # 外部 AI 调用方 API 文档
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── atlas/[organ]/[disease]/   # 疾病详情页（9 Tab）
│   │   ├── markers/                   # 卡片目录（搜索 + 分类 + 器官 chip）
│   │   ├── markers/[id]/              # 标记物详情页（5 Tab）
│   │   ├── differentials/ review/ progress/ search/ help/ about/
│   │   ├── admin/                     # 内容管理后台
│   │   └── api/
│   │       ├── disease | marker | organ | markers | organs
│   │       ├── all-diseases | diseases-by-ids | search | stats
│   │       ├── auth/{login,callback,me,logout}    # Google OAuth 流
│   │       └── admin/{disease,marker,upload}      # 受保护的 CRUD + 上传
│   ├── lib/
│   │   ├── data.ts                    # 数据访问层 + 类型定义
│   │   ├── auth.ts                    # HMAC 会话 + Bearer 鉴权
│   │   ├── markerDiagrams.ts          # 机制概念图清单
│   │   └── progress.ts                # 学习进度
│   ├── components/                    # 通用 UI 组件
│   └── middleware.ts                  # /api/admin/* 边缘鉴权
├── .env.local.example                 # 环境变量模板
└── package.json
```

---

## 🚀 快速开始

### 本地开发（无需任何凭据）

```bash
git clone https://github.com/chuckieding/pathoatlas.git
cd pathoatlas
npm install
npm run dev
```

访问 http://localhost:3000

> 默认 dev-mode：`/admin` 和所有 `/api/admin/*` 接口对本机开放，不需要登录。一旦在环境变量里设置了 `GOOGLE_CLIENT_ID` 或 `ADMIN_API_TOKEN`，鉴权会自动启用。

### 生产构建

```bash
npm run build
npm run start
```

---

## 🧱 数据模型

### Disease（疾病）

```ts
interface Disease {
  id: string;                      // kebab-case，例 lung-adenocarcinoma
  nameZh: string;                  // 中文名
  nameEn: string;                  // 英文名
  aliases: string[];               // 别名
  organ: string;                   // 关联 organs.json 的 id
  category: 'malignant' | 'benign' | 'precancerous' | 'inflammatory' | 'other';

  // 文本字段（支持 Markdown）
  epidemiology: string;
  clinicalFeatures: string;
  grossPathology: string;
  grossDescription?: string;       // 详细大体描述
  microscopy: string;              // 镜下特征
  molecularFeatures: string;
  grading: string;
  staging: string;
  prognosis: string;
  treatment: string;

  // 结构化字段
  keyFeatures: string[];
  ihcProfile: { marker: string; result: string; note: string }[];
  differentialDiagnosis: string[]; // 鉴别诊断的 disease.id 数组
  references: string[];

  // 多媒体
  images: DiseaseImage[];          // 兼容旧字段
  microscopyImages?: DiseaseImage[];
  grossImages?: DiseaseImage[];

  // 引用
  expertConsensus?: ConsensusItem[];
  literature?: LiteratureItem[];
}
```

### Marker（IHC 标记物）

```ts
interface Marker {
  id: string;
  nameZh: string;
  nameEn: string;
  abbreviation: string;
  category: '上皮标记' | '间叶标记' | '淋巴标记' | '激素受体' | '增殖标记' | '神经标记' | '分子标记' | '其他';
  cloneInfo: string;
  targetProtein: string;
  cellularLocalization: string;    // 核 / 胞浆 / 膜 / 核仁
  normalExpression: string;
  function: string;
  interpretation: string;          // 判读标准
  clinicalSignificance: string;
  positiveIn: string[];
  negativeIn: string[];
  relatedDrugs: string[];
  pitfalls: string;
  references: string[];

  expertConsensus?: ConsensusItem[];
  literature?: LiteratureItem[];

  // 染色形态图框架（按结果分组）
  stainingImages?: {
    id: string;
    label: string;                 // 阴性 / 阳性 / 0 / 1+ / 2+ / 3+ / 弱 / 中 / 强 ...
    description?: string;
    images: DiseaseImage[];
  }[];
}
```

### ConsensusItem / LiteratureItem

```ts
interface ConsensusItem {
  id: string;
  title: string;
  summary: string;
  organization?: string;           // WHO / NCCN / CSCO / ESMO ...
  year?: number;
  sourceUrl?: string;              // 出版商/原始发布页
  viewUrl?: string;                // 在线阅览（PubMed/摘要/PDF）
}

interface LiteratureItem {
  id: string;
  title: string;
  summary: string;
  authors?: string;
  journal?: string;
  year?: number;
  sourceUrl?: string;
  viewUrl?: string;
}
```

### DiseaseImage

```ts
interface DiseaseImage {
  url: string;                     // 默认压缩图 / 缩略图
  fullUrl?: string;                // 高清原图，按需加载
  caption: string;
  source?: string;                 // 来源标注（Wikimedia Commons / 自有库）
}
```

---

## 🛠️ 内容管理后台 `/admin`

`/admin` 是一个完整的 CRUD 后台，**所有在前台展示的字段都可以在线维护**：

### 功能
- ✅ **新建 / 修改 / 删除** 疾病和标记物
- ✅ 文本字段（流行病学、镜下特征、判读标准等）富文本编辑
- ✅ 字符串数组（别名、要点、表达谱等）chip 风格编辑器
- ✅ IHC 谱结构化行编辑（`marker / result / note`）
- ✅ **图片上传** — 拖拽 / 点选直传到 `public/uploads/<scope>/`，自动回填 URL
- ✅ **PDF 上传** — 共识/文献条目可直传 PDF，浏览器原生在线阅览
- ✅ **染色图分组维护** — 按结果（阴/阳、0~3+ 等）独立管理图片
- ✅ "保存全部" 一键 PUT；section 级保存按钮做精细更新
- ✅ Google 登录 / 登出 / 调用方身份显示

### API 一览（后台和外部调用统一）

| 方法 | 端点 | 说明 |
|---|---|---|
| `POST` | `/api/admin/disease` | 新建疾病 |
| `PUT` | `/api/admin/disease` | 更新指定疾病 |
| `DELETE` | `/api/admin/disease?organ=&id=` | 删除疾病 |
| `POST` | `/api/admin/marker` | 新建标记物 |
| `PUT` | `/api/admin/marker` | 更新指定标记物 |
| `DELETE` | `/api/admin/marker?id=` | 删除标记物 |
| `POST` | `/api/admin/upload` | 上传图片或 PDF（multipart/form-data） |

完整 schema 与 curl 示例见 [`docs/admin-api.md`](docs/admin-api.md)。

---

## 🔐 鉴权

`/admin` 页面与所有 `/api/admin/*` 端点支持**双通道**鉴权，任一通过即放行：

### 通道 1：Google OAuth（浏览器人工使用）
- 用户访问 `/admin` → 跳转 Google → 选账号 → 服务端校验邮箱在 `ADMIN_EMAILS` 白名单内 → 下发 HMAC-SHA256 签名的 session cookie（7 天有效）
- 自实现 OAuth 流，**零依赖**（不引入 NextAuth）
- 流程：`/api/auth/login` → Google → `/api/auth/callback` → set cookie

### 通道 2：Bearer Token（外部 AI / 自动化调用）
- 服务端配置 `ADMIN_API_TOKEN=<长随机字符串>`
- 调用方在每个请求头里带 `Authorization: Bearer <token>`
- 服务端 `crypto.timingSafeEqual` 常量时间比对

### 配置（部署时设置环境变量）

复制 [`.env.local.example`](.env.local.example) 为 `.env.local` 并填写：

```bash
# 部署的公开 URL（反代后必须设置，否则 OAuth redirect_uri 会错）
APP_URL=https://your-domain.com

# Google OAuth 2.0 Client（控制台：console.cloud.google.com）
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...

# 邮箱白名单（仅这些 Google 账户可登录 /admin）
ADMIN_EMAILS=alice@example.com,bob@example.com

# Session 签名密钥（openssl rand -base64 32）
AUTH_SECRET=<32+ 字节随机>

# 可选：外部程序化调用的 Bearer Token（openssl rand -hex 32）
ADMIN_API_TOKEN=<64 字符随机 hex>
```

在 Google Cloud Console 创建 OAuth 2.0 Client 时，**Authorized redirect URI** 必须填：
```
<APP_URL>/api/auth/callback
```
例如 `APP_URL=https://supercalifragilisticexpialidocious.cloud` 时，GCP 要登记 `https://supercalifragilisticexpialidocious.cloud/api/auth/callback`。

> 三个变量都不设置时进入 **dev-mode**，所有 `/api/admin/*` 对本机开放，方便本地开发。

### 安全细节
- Session cookie：`httpOnly` + `sameSite=lax` + `secure`（生产）+ HMAC-SHA256
- CSRF：OAuth state 用一次性 cookie，callback 校验后立刻清除
- `email_verified=false` 的 Google 账户被拒
- 配了 OAuth 但 `ADMIN_EMAILS` 为空时 **不会** 让任意 Google 账户进入，会直接报 `no_admin_emails_configured`
- Bearer token 比对走 `crypto.timingSafeEqual`，防时序攻击
- middleware 仅 matcher `/api/admin/:path*`，其他路由零开销

---

## 🧪 给外部 AI 的快速接入示例

```bash
# 设置环境变量（如何取值见 docs/admin-api.md）
export ADMIN_API_TOKEN="a3f9c1b7..."
export BASE="https://your-deployment.example.com"

# 创建一条新疾病
curl -X POST $BASE/api/admin/disease \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organ": "lung",
    "disease": {
      "id": "ai-test-disease",
      "nameZh": "AI 测试疾病",
      "nameEn": "AI Test Disease",
      "category": "other",
      "keyFeatures": ["AI 生成"]
    }
  }'

# 部分更新已有疾病
curl -X PUT $BASE/api/admin/disease \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organ": "lung",
    "id": "lung-adenocarcinoma",
    "updates": { "epidemiology": "AI 修订..." }
  }'

# 上传一张图片，把返回的 url 写入标记物染色分组
curl -X POST $BASE/api/admin/upload \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -F "file=@./her2_3plus.jpg" \
  -F "scope=markers/her2/3+"
```

完整字段清单与所有端点示例见 [`docs/admin-api.md`](docs/admin-api.md)。

---

## 📚 数据来源说明

- **疾病文本** — WHO Classification of Tumours（5th Edition 系列）、AJCC TNM 第 8 版、各专科 NCCN/CSCO/ESMO 指南
- **IHC 标记物** — ASCO/CAP guidelines、CAP IHC Quality Improvement Program、PathologyOutlines.com
- **图片占位** — 每个疾病/标记物预置图片框架，实际图片可通过 `/admin` 后台上传（推荐使用 Wikimedia Commons 等开放许可来源，并在 `source` 字段标注）

数据均为结构化 JSON，纯文本可在 git 中追踪 diff，便于多人协作维护。

---

## 🛣️ 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16 (App Router + Server Components) |
| 语言 | TypeScript 5 |
| UI | React 19 + Tailwind CSS 4 |
| Markdown | react-markdown + remark-gfm |
| 数据 | 静态 JSON 文件（无数据库） |
| 鉴权 | 自实现 Google OAuth + HMAC session（零外部依赖） |
| 部署 | Vercel / Cloud Run / 任何支持 Node 的平台 |

---

## 🤝 贡献

欢迎以 PR 形式补充：
- 新疾病条目（`data/diseases/<organ>.json` 增加一条记录）
- 新 IHC 标记物（`data/markers.json` 增加一条记录）
- 已有条目的镜下/大体图片、共识、文献
- Bug 修复与 UI 改进

每个 PR 请确保：
- `npx tsc --noEmit` 通过
- `npx next build` 通过
- JSON 文件可被 `python3 -c "import json; json.load(open('...'))"` 解析

---

## 📄 许可

代码部分采用 MIT 协议。

数据部分（疾病文本、IHC 判读等）来自公开权威指南并以教育用途整理，**不构成临床诊疗建议**，使用者应结合本地法规与所在机构的标准操作流程。

---

## 🔗 链接

- 项目仓库：https://github.com/chuckieding/pathoatlas
- API 文档：[`docs/admin-api.md`](docs/admin-api.md)
- 环境变量模板：[`.env.local.example`](.env.local.example)
