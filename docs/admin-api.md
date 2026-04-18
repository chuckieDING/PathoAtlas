# PathoAtlas 内容管理 API

本文档描述 `/api/admin/*` 接口，供部署后的**外部 AI 产品**或自动化流程调用。

## 鉴权

两种方式任选其一：

### 1. 浏览器会话（人工使用）
访问 `/admin` → 通过 Google 登录 → 浏览器持有 session cookie（`pathoatlas-admin-session`），后续所有 `/api/admin/*` 请求自动带 cookie。该 cookie 通过 HMAC-SHA256 签名，有效期 7 天。

仅 `ADMIN_EMAILS` 环境变量里列出的 Google 账户可以登录。

### 2. Bearer Token（程序化调用）
在部署环境设置：

```
ADMIN_API_TOKEN=<一串长随机字符串>
```

调用方在每个请求头里带：

```
Authorization: Bearer <ADMIN_API_TOKEN>
```

即可跳过浏览器流程直接调用所有 `/api/admin/*` 端点。

> ⚠️ 这个 token 等同于指定 Google 账户的全部权限，请妥善保管，不要 commit 到代码仓库。建议定期通过修改环境变量轮换。

### 本地开发模式
如果 `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET` 和 `ADMIN_API_TOKEN` 全部为空（默认 dev 状态），middleware 自动放行，所有接口无需鉴权 —— 适合本地运行 `next dev`。

---

## 端点清单

所有 body 为 JSON，默认 `Content-Type: application/json`。

### Disease（疾病）

#### `POST /api/admin/disease` — 新建
```json
{
  "organ": "lung",
  "disease": {
    "id": "my-new-disease",
    "nameZh": "新疾病",
    "nameEn": "New Disease",
    "category": "malignant",
    "epidemiology": "...",
    "clinicalFeatures": "...",
    "grossPathology": "...",
    "grossDescription": "...",
    "microscopy": "...",
    "keyFeatures": ["要点1", "要点2"],
    "ihcProfile": [
      { "marker": "TTF-1", "result": "阳性", "note": "敏感标记" }
    ],
    "molecularFeatures": "...",
    "differentialDiagnosis": ["other-disease-id"],
    "grading": "...",
    "staging": "...",
    "prognosis": "...",
    "treatment": "...",
    "references": ["WHO 2021"]
  }
}
```

- `organ` 必须是 `data/organs.json` 中已定义的 id（如 `lung`、`breast`、`liver`）
- `disease.id` 必须为 kebab-case ASCII（正则 `^[a-z0-9][a-z0-9-]*$`），且在该器官文件内唯一
- 未提供的字段会用空值填充
- 返回 `{ ok: true, disease: {...} }`

#### `PUT /api/admin/disease` — 更新
```json
{
  "organ": "lung",
  "id": "lung-adenocarcinoma",
  "updates": {
    "grossDescription": "更新后的大体描述...",
    "keyFeatures": ["新要点1", "新要点2"]
  }
}
```

- `updates` 只需包含要改的字段，未提到的字段原样保留
- 可编辑字段白名单（22 项）：`nameZh`、`nameEn`、`aliases`、`category`、`epidemiology`、`clinicalFeatures`、`grossPathology`、`grossDescription`、`microscopy`、`keyFeatures`、`ihcProfile`、`molecularFeatures`、`differentialDiagnosis`、`grading`、`staging`、`prognosis`、`treatment`、`images`、`microscopyImages`、`grossImages`、`expertConsensus`、`literature`、`references`
- 返回 `{ ok: true, disease: {...} }`

#### `DELETE /api/admin/disease?organ=<organ>&id=<id>` — 删除
- 不可恢复
- 返回 `{ ok: true, removed: {...原记录} }`

### Marker（免疫组化标记物）

#### `POST /api/admin/marker`
```json
{
  "marker": {
    "id": "my-marker",
    "nameZh": "新标记物",
    "nameEn": "New Marker",
    "abbreviation": "NEW",
    "category": "上皮标记",
    "cellularLocalization": "核",
    "cloneInfo": "SP1",
    "targetProtein": "...",
    "normalExpression": "...",
    "function": "...",
    "interpretation": "...",
    "clinicalSignificance": "...",
    "positiveIn": ["..."],
    "negativeIn": ["..."],
    "relatedDrugs": ["..."],
    "pitfalls": "...",
    "references": ["..."]
  }
}
```

#### `PUT /api/admin/marker`
```json
{
  "id": "ki-67",
  "updates": {
    "interpretation": "更新后的判读标准...",
    "stainingImages": [
      { "id": "ki67-low", "label": "低 (<10%)", "description": "...", "images": [] }
    ]
  }
}
```

- 可编辑字段白名单（19 项）：`nameZh`、`nameEn`、`abbreviation`、`category`、`cloneInfo`、`targetProtein`、`cellularLocalization`、`normalExpression`、`function`、`interpretation`、`clinicalSignificance`、`positiveIn`、`negativeIn`、`relatedDrugs`、`pitfalls`、`references`、`expertConsensus`、`literature`、`stainingImages`

#### `DELETE /api/admin/marker?id=<id>`

### 文件上传

#### `POST /api/admin/upload` — 上传图片 / PDF
`multipart/form-data`:
- `file` — 文件内容
- `scope` — 存储子目录（如 `markers/ki-67/staining` 或 `diseases/lung-adenocarcinoma/literature/lit-001`）

返回：
```json
{
  "ok": true,
  "url": "/uploads/markers/ki-67/staining/1700000000-image.jpg",
  "size": 12345,
  "type": "image/jpeg"
}
```

把返回的 `url` 写入相应条目的 `images[].url` / `images[].fullUrl` / `viewUrl` 字段即可。

---

## 典型调用示例

### 用 Bearer Token 创建一个新疾病

```bash
curl -X POST https://your-deployment.example.com/api/admin/disease \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organ": "lung",
    "disease": {
      "id": "ai-generated-test",
      "nameZh": "AI 示例疾病",
      "nameEn": "AI Generated Test",
      "category": "other",
      "keyFeatures": ["由 AI 生成用于测试"]
    }
  }'
```

### 部分更新已有疾病

```bash
curl -X PUT https://your-deployment.example.com/api/admin/disease \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "organ": "lung",
    "id": "lung-adenocarcinoma",
    "updates": {
      "epidemiology": "AI 修订后的流行病学段落..."
    }
  }'
```

### 上传图片并写入标记物

```bash
# 1. 上传图片
UPLOAD=$(curl -sX POST https://your-deployment.example.com/api/admin/upload \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -F "file=@ki67_strong.jpg" \
  -F "scope=markers/ki-67/staining")
URL=$(echo $UPLOAD | jq -r .url)

# 2. 把返回的 url 写入 stainingImages 分组
curl -X PUT https://your-deployment.example.com/api/admin/marker \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg url "$URL" '{
    id: "ki-67",
    updates: {
      stainingImages: [{
        id: "ki67-high",
        label: "高表达 (>30%)",
        description: "弥漫核阳性",
        images: [{ url: $url, caption: "强阳性示例" }]
      }]
    }
  }')"
```

---

## 通用 Content API（其他 12 个模块）

非疾病/标记物的模块（器官、鉴别诊断、分期、病例等）统一通过一个通用路由管理：

```
GET    /api/admin/content/<module>           → 列表
POST   /api/admin/content/<module>           → 新建（body: { entry: { id, ... } }）
PUT    /api/admin/content/<module>           → 合并更新（body: { id, updates: {...} }）
DELETE /api/admin/content/<module>?id=<id>   → 删除
```

### 支持的模块

| Module key | 数据文件 | 内容 |
|------------|---------|------|
| `organs` | organs.json | 器官系统 |
| `differentials` | differentials.json | 鉴别诊断场景 |
| `flowcharts` | flowcharts.json | 鉴别流程图（SVG 节点/边） |
| `staging` | staging.json | 分级分期系统（Nottingham、TNM 等） |
| `cases` | cases.json | 虚拟病例 |
| `cytology` | cytology.json | 细胞病理分类系统（Bethesda、TBS 等） |
| `frozen-sections` | frozen-sections.json | 冰冻切片协议 |
| `glossary` | glossary.json | 术语词汇表 |
| `grossing` | grossing.json | 取材规范 |
| `molecular` | molecular.json | 分子病理标志物 |
| `reports` | synoptic-templates.json | CAP 同步报告模板 |
| `special-stains` | special-stains.json | 特殊染色 |

### 示例：添加一个鉴别诊断场景

```bash
curl -X POST https://your-deployment.example.com/api/admin/content/differentials \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entry": {
      "id": "pleomorphic-sarcoma",
      "titleZh": "多形性肉瘤鉴别",
      "titleEn": "Pleomorphic Sarcoma Differentials",
      "description": "...",
      "diseases": ["leiomyosarcoma", "malignant-peripheral-nerve-sheath-tumor"],
      "keyMarkers": ["SMA", "Desmin", "S-100", "MDM2"],
      "algorithm": "..."
    }
  }'
```

### 示例：更新一个分期系统

```bash
curl -X PUT https://your-deployment.example.com/api/admin/content/staging \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "breast-nottingham",
    "updates": {
      "description": "修订后的 Nottingham 评分说明"
    }
  }'
```

### 示例：删除一个术语

```bash
curl -X DELETE "https://your-deployment.example.com/api/admin/content/glossary?id=obsolete-term" \
  -H "Authorization: Bearer $ADMIN_API_TOKEN"
```

### 约束

- `entry.id` 必须匹配 `^[a-z0-9][a-z0-9-]*$`（字母数字 + 连字符）
- PUT 时 `id` 字段会被忽略（防止 ID 修改破坏交叉引用）
- POST 创建时如 id 已存在返回 409
- 所有 PUT/POST/DELETE 操作都会自动：
  1. 写入 `data-runtime/<file>.json`（原子替换）
  2. 清除内存 JSON 缓存
  3. 触发相关页面的 Next.js Router 缓存刷新
  4. 追加一条审计日志到 `data-runtime/audit-log.jsonl`

---

## 审计日志

所有 CRUD 操作自动写入 `data-runtime/audit-log.jsonl`，每行一条 JSON：

```json
{
  "timestamp": "2026-04-18T10:30:00.000Z",
  "actor": "chuckieding@gmail.com",
  "action": "update",
  "entityType": "disease",
  "entityId": "invasive-ductal-carcinoma-nst",
  "organ": "breast",
  "diff": { "microscopy": { "old": "...", "new": "..." } }
}
```

查询接口：

```
GET /api/admin/audit                    → 返回全部日志（最新在前）
```

---

## 错误响应

所有失败都返回 JSON `{ error: "..." }` 配合 HTTP 状态码：

| Status | 场景 |
|---|---|
| 400 | 缺字段 / id 格式错误 |
| 401 | 未鉴权 / session 过期 / bearer 不匹配 |
| 404 | organ 文件、module 或 id 不存在 |
| 409 | POST 新建时 id 冲突 |
| 500 | 服务端异常（磁盘写入失败等） |
