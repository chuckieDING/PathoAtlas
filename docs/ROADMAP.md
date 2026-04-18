# PathoAtlas 产品路线图

> 基于高级病理医生视角的功能缺口评审整理。进度用 checkbox 追踪，每完成一项就打钩并在 commit 里引用本文件。

## 📊 进度总览

- **Tier 1 · 核心缺失**：9/9 已完成 ✅
- **Tier 2 · 高价值升级**：9/9 已完成 ✅
- **Tier 2.5 · 审计修复**：8/8 已完成 ✅（基于 2026-04-17 全量审计）
- **Tier 3 · 差异化拓展**：暂停 🔒（待 Tier 2.5 完成后评估）

---

## 🔴 Tier 1 · 核心缺失 — 全部完成 ✅

<details>
<summary>点击展开已完成的 Tier 1 详情</summary>

### 1. 分级分期交互式评分器
- [x] Nottingham Grade（乳腺）✅
- [x] Gleason / ISUP Grade Group（前列腺）✅
- [x] ISUP/WHO grading（肾透明细胞癌）✅
- [x] FIGO staging（子宫内膜/卵巢/宫颈）✅
- [x] Bethesda / TBS（甲状腺 FNA）✅
- [x] TNM 第 8 版通用框架 ✅

### 2. 新器官系统（CNS / 软组织 / 骨）
- [x] cns.json（7 个疾病）✅
- [x] soft-tissue.json（7 个疾病）✅
- [x] bone.json（5 个疾病）✅
- [x] OrganIcon + organs.json 条目 ✅

### 3. 细胞病理学模块
- [x] 7 个分类系统（Bethesda 甲状腺/TBS 宫颈/Paris 尿液/Milan 唾液腺/ROSE/体腔积液/Yokohama 乳腺）✅

### 4. 镜下图片多放大倍数支持
- [x] DiseaseImage schema 扩字段 ✅
- [x] ImageGallery 按放大倍数分组 ✅
- [x] Admin 编辑器增加倍数下拉框 ✅
- [x] 上传 API 自动写入类型 ✅

### 5. 特殊染色数据库
- [x] data/special-stains.json（10 种）✅
- [x] 每条含原理、阳性物质、判读、陷阱 ✅
- [x] 与疾病页关联 ✅

### 6. 取材规范模块
- [x] /grossing + data/grossing.json（11 个标本类型）✅

### 7. 冰冻切片模块
- [x] /frozen + 5 个场景 ✅

### 8. 分子病理模块
- [x] /molecular + 26 个标志物 ✅
- [x] 检测方法对比表 + CDx 矩阵 ✅

### 9. CAP 同步报告模板
- [x] /reports + 11 个模板 ✅

</details>

---

## 🟡 Tier 2 · 高价值升级 — 全部完成 ✅

<details>
<summary>点击展开已完成的 Tier 2 详情</summary>

### 10. IHC Panel Builder
- [x] /panel-builder 含 15 个鉴别场景的 4 步向导 ✅

### 11. 克隆号差异 + 控制组织
- [x] 49 个标记物全部补齐 cloneVariants / controlTissue / artifacts ✅

### 12. 学习路径
- [x] /curriculum 含 278 个学习项目 ✅

### 13. 虚拟病例
- [x] /cases 含 20 个跨器官案例 ✅

### 14. 鉴别流程图可视化
- [x] FlowchartRenderer + 5 个流程图 ✅

### 15. 审计日志
- [x] audit-log.jsonl + 审计工具库 ✅

### 16. 个人笔记 + 收藏
- [x] NotesAndFavorites + /favorites 页面 ✅

### 17. 多克隆对比图谱
- [x] 4 个标记物含克隆对比数据 ✅

### 18. 术语词汇表
- [x] /glossary 含 345 条术语 ✅

</details>

---

## 🔶 Tier 2.5 · 审计修复（P0/P1 优先级）

> 2026-04-17 全量审计发现的数据质量和功能缺陷。按临床影响排序。

### P0-1. 鉴别诊断交叉引用修复 ✅
13 个鉴别场景中 87 个疾病引用有 57 个 (65%) 指向不存在的疾病 ID → **已全部修复，0 断链**。

- [x] 新增 41 个疾病数据（soft-tissue +7, lymphoma +4, skin +7, thyroid +3, kidney +5, gynecology +3, gi +5, lung +3, liver +4）
- [x] 修正 8 个通用 ID 映射（breast-carcinoma→IDC-NST, lymphoma→dlbcl, 等）
- [x] 移除 2 个过于宽泛的引用（sugar-tumor, clear-cell-sarcoma）
- [x] 疾病总数：91 → 132

### P0-2. 疾病内容质量补充 ✅
- [x] 88 个疾病的 microscopy 和 epidemiology 内容补充（3 批并行处理）
- [x] 短镜下描述 82→2，短流行病学 88→2

### P0-3. 分期系统页面入口 ✅
- [x] 创建 `/staging` 页面（可折叠卡片展示 9 个分期系统，含评分标准表 + 分级结果 + 适用疾病链接）
- [x] 已有 `/api/staging` 路由

### P1-4. 特殊染色疾病关联扩充 ✅
- [x] 12 个疾病新增 specialStainProfile（肾脏、肝脏、淋巴瘤、消化道、皮肤、骨）
- [x] 覆盖 2→14 个疾病

### P1-5. 复习模块增强 ✅
- [x] 按器官筛选卡片范围（13 个器官 chip 选择器）
- [x] 答错后显示解析（知识点 + 详情页跳转链接）
- [x] "仅复习错题"模式（结果页一键进入错题复习）

### P1-6. 冰冻切片协议扩充 ✅
- [x] +5 新协议（淋巴结转移/甲状旁腺确认/脑肿瘤分级/肺楔切缘/软组织切缘）
- [x] 总数 5→10，页面兼容新旧字段名

### P1-7. 鉴别流程图补齐 ✅
- [x] +8 流程图（小圆蓝细胞/透明细胞/CK7+CK20-/CK7-CK20+/黑色素细胞/神经内分泌分级/腺鳞鉴别/RCC亚型）
- [x] 总数 5→13，覆盖全部 13 个鉴别场景

### P1-8. IHC 标记物平均覆盖度提升 ✅
- [x] 19 个恶性疾病 IHC 标记物补齐至 ≥5（soft-tissue 7, bone 2, gi 3, lung 1, cns 5, urology 1）
- [x] 剩余 13 个恶性疾病 <5 标记物（多为新增的罕见亚型，runtime 的 resolveOverlaps 可防止重叠）

---

## 🟢 Tier 3 · 差异化拓展 — 暂停 🔒

> 以下内容暂不实施，待 Tier 2.5 审计修复全部完成后重新评估优先级。

<details>
<summary>点击展开 Tier 3 内容（已冻结）</summary>

### 19. WSI viewer 整合
- [ ] 用 OpenSeadragon 嵌入全切片查看器
- [ ] 接入公开资源：PathPresenter / Leeds Virtual Pathology 等
- [ ] 长期支持 DICOM WSI 标准

### 20. AI 辅助判读
- [ ] 上传 ROI 图像 → 调用模型做核质比、细胞计数等预识别
- [ ] IHC 核染色定量化（简化版 QuPath）

### 21. WHO 分类版本追踪
- [ ] 条目加 `whoEdition` 标签
- [ ] 显示与上一版差异

### 22. 公开贡献流程
- [ ] 条目贡献者署名
- [ ] 提议式 diff 审核流程
- [ ] DOI 自动校验

### 23. PWA / 移动端离线
- [ ] 变成 PWA
- [ ] Service Worker 缓存染色图和核心数据
- [ ] 显微镜旁可用

### 24. 考试 / 认证模式
- [ ] 病理住院医结业考试模拟
- [ ] FRCPath / USMLE Path 题库
- [ ] 电子证书

### 25. 形态 pattern 查询
- [ ] 结构化查询语言：`spindle + storiform + CD34+ → SFT`
- [ ] 让文本搜索升级为"形态搜索"

</details>

---

## 📆 Tier 2.5 执行顺序

| 顺序 | 编号 | 任务 | 影响面 |
|------|------|------|--------|
| 1 | P0-1 | 鉴别诊断断链修复 | 13 场景 × 57 个断链 |
| 2 | P0-2 | 疾病内容质量补充 | 37 + 22 个疾病 |
| 3 | P0-3 | 分期系统页面入口 | 9 个分期系统 |
| 4 | P1-4 | 特殊染色关联扩充 | 30+ 疾病 |
| 5 | P1-5 | 复习模块增强 | 全局功能 |
| 6 | P1-6 | 冰冻切片扩充 | +5 方案 |
| 7 | P1-7 | 鉴别流程图补齐 | +8 流程图 |
| 8 | P1-8 | IHC 标记物覆盖度提升 | 91 个疾病 |

---

## 🔗 相关

- 功能现状：见 [README.md](../README.md)
- API 文档：见 [docs/admin-api.md](admin-api.md)
- 审评人视角：高级病理医生对整个系统的模块缺口分析（2026-04-17 全量审计）
