# PathoAtlas 产品路线图

> 基于高级病理医生视角的功能缺口评审整理。进度用 checkbox 追踪，每完成一项就打钩并在 commit 里引用本文件。

## 📊 进度总览

- **Tier 1 · 核心缺失**：0/9 已完成（#1 进行中 1/6 子项 ✅）
- **Tier 2 · 高价值升级**：0/9 已完成
- **Tier 3 · 差异化拓展**：0/7 已完成

---

## 🔴 Tier 1 · 核心缺失（优先）

### 1. 分级分期交互式评分器
把 `grading` / `staging` 从纯字符串升级为可交互的评分组件。每个子项对应一个分级系统：

- [x] **Nottingham Grade**（乳腺浸润癌）—— 腺管形成 + 核多形性 + 核分裂 三项相加，得到 G1/G2/G3 ✅ 已挂到 `/atlas/breast/invasive-ductal-carcinoma-nst` 的分子病理 tab
- [x] **Gleason / ISUP Grade Group**（前列腺癌）—— 主次 pattern 组合到 5 级 Grade Group ✅ `/atlas/urology/prostate-adenocarcinoma`
- [x] **ISUP/WHO grading**（肾透明细胞癌）—— 核仁显著度 1–4 级 ✅ `/atlas/kidney/clear-cell-rcc` + `papillary-rcc`
- [ ] **FIGO staging**（子宫内膜 / 卵巢 / 宫颈）—— 按组织类型分别建计算器
- [ ] **Bethesda / TBS**（甲状腺 FNA）—— 6 类分层 + 风险评估
- [ ] **TNM 第 8 版** 通用框架，可被任意癌症复用

### 2. 新器官系统（CNS / 软组织 / 骨）
三个主要器官系统目前完全缺失，需要补齐：

- [ ] `data/diseases/cns.json`：胶质瘤（星形 IDH-mut/wt、少突、GBM）、脑膜瘤、髓母、室管膜瘤、生殖细胞肿瘤等
- [ ] `data/diseases/soft-tissue.json`：4 型脂肪肉瘤、平滑肌肉瘤、GIST、滑膜肉瘤、尤文、横纹肌肉瘤、MPNST
- [ ] `data/diseases/bone.json`：骨肉瘤、软骨肉瘤、GCT、ABC、FD
- [ ] 为三个新器官增加 OrganIcon + organs.json 条目

### 3. 细胞病理学模块
组织病理之外完整的细胞学分类系统：

- [ ] Bethesda 甲状腺 FNA（2023 版）
- [ ] TBS 宫颈液基细胞（2014 Bethesda）
- [ ] Paris 尿液细胞学（2022 版）
- [ ] Milan 唾液腺 FNA
- [ ] ROSE 呼吸/胰/肝 FNA 规范术语
- [ ] 体腔积液 IC
- [ ] Yokohama 乳腺 FNA
- [ ] 独立路由 `/cyto` + 数据结构 + 导航入口

### 4. 镜下图片多放大倍数支持
图片 schema 加入 `magnification` 和 `stainType` 字段：

- [x] `DiseaseImage` / `MarkerStainingImage` schema 扩字段：`magnification: '2x'|'4x'|'10x'|'20x'|'40x'|'100x'`、`stainType: 'HE'|'IHC'|'Special'|'Gross'`、`ihcMarker?: string` ✅
- [x] ImageGallery 按放大倍数分组渲染 ✅（有 mag 信息时按组显示，无则平铺兼容）
- [ ] Admin 编辑器增加倍数和染色类型下拉框
- [ ] 上传 API 自动把倍数和类型写入响应

### 5. 特殊染色数据库（非 IHC）
新开一个独立模块：

- [ ] `data/special-stains.json` + 路由 `/stains/special`
- [ ] 至少 20 条：PAS / PAS-D、Alcian Blue、Masson、Trichrome、Gomori Reticulin、Von Kossa、Congo Red、Warthin-Starry、Giemsa、Elastin、Prussian Blue (Iron)、Fontana-Masson、Oil Red O、GMS、ZN 等
- [ ] 每条：原理、机制、阳性物质、判读陷阱、控制组织、典型图
- [ ] 与疾病页做关联链接

### 6. 取材规范 / Grossing Protocol 模块
住院医最大痛点，单独建一个模块：

- [ ] 新路由 `/grossing` + `data/grossing.json`
- [ ] 至少 15 个主要标本类型：乳腺肿物 / 乳腺根治 / 肺叶切除 / 胃癌根治 / 结肠癌根治 / 前列腺根治 / 肾切除 / 良性子宫 / 恶性子宫 / 宫颈锥切 / LEEP / 前哨淋巴结 / 清扫淋巴结 / 皮肤梭形切除 / 挖除
- [ ] 每条标本类型：墨水方案、切开方向、取材间隔、必取部位清单、照片要求、冰冻注意事项、常见错误

### 7. 冰冻切片 / 术中会诊模块
经典场景决策树：

- [ ] 新路由 `/frozen` 或在疾病页加"冰冻"字段
- [ ] 乳腺前哨淋巴结工作流
- [ ] 甲状腺滤泡性肿瘤边界
- [ ] 乳腺切缘判读
- [ ] 卵巢交界性肿瘤限制
- [ ] 脑组织压片 + 冰冻
- [ ] 每个场景：适应证、陷阱、典型错误、报告模板

### 8. 分子病理独立模块
把 `molecularFeatures` 升级为独立的知识模块：

- [ ] `data/molecular.json` + 路由 `/molecular`
- [ ] 30+ 条驱动基因 / 标志物：EGFR 变体家族、ALK、ROS1、BRAF V600E、KRAS、NTRK 融合、RET 融合、HER2 扩增/突变、MET exon14、BRCA1/2、HRD、MSI/dMMR、TMB、POLE、IDH1/2、TP53 patterns 等
- [ ] 检测方法对比表（Sanger vs qPCR vs NGS vs FISH vs IHC 代理）
- [ ] 伴随诊断（CDx）矩阵：哪个变异 → 哪个药 → FDA/NMPA 状态
- [ ] TCGA 分子分型：乳腺 / 胃 / 结直肠 / 子宫内膜

### 9. CAP 同步报告模板
结构化肿瘤报告，至少 10 个常用：

- [ ] 疾病 schema 加 `synopticTemplate` 字段或独立 `/reports` 模块
- [ ] 乳腺浸润癌
- [ ] 乳腺原位癌
- [ ] 肺癌
- [ ] 结直肠癌
- [ ] 胃癌
- [ ] 前列腺癌（根治 + 活检）
- [ ] 膀胱癌（TURBT + 膀胱根治）
- [ ] 肾细胞癌
- [ ] 子宫内膜癌
- [ ] 卵巢癌
- [ ] 皮肤黑色素瘤
- [ ] 可填写表单 → 导出为文本报告草稿

---

## 🟡 Tier 2 · 高价值升级

### 10. IHC Panel Builder（交互式鉴别诊断工具）
- [ ] 新路由 `/panel-builder`
- [ ] 步骤 1：选瘤种形态（上皮样/梭形/小圆/多形性 × 部位）
- [ ] 步骤 2：系统推荐 3–8 个 IHC
- [ ] 步骤 3：用户填结果 → 系统给鉴别清单
- [ ] 步骤 4：高亮"下一步"建议（补充 IHC 或分子）
- [ ] 把现有 `differentials.json` 的 13 场景迁入

### 11. 克隆号差异 + 控制组织
- [ ] Marker schema：`cloneInfo` 从字符串改成 `{ clone, source, notes }[]`
- [ ] 新增 `controlTissue: { positive, negative }`
- [ ] 新增 `artifacts: string[]` 常见染色陷阱
- [ ] UI 在 marker 详情页用独立 section 展示

### 12. 学习路径 / 课程结构
- [ ] 新路由 `/curriculum`
- [ ] 第 1 年 "基础" 路径：正常组织 + 常见炎症 + 最常见 20 种肿瘤
- [ ] 第 2 年 "鉴别诊断"：按器官系统学 IHC panel
- [ ] 第 3 年 "疑难 + 冰冻"
- [ ] 专科路径：乳腺 / 胃肠 / 妇科 / 骨软 / 皮肤 / 血液 / 神经
- [ ] 每条路径 → N 个疾病 + M 个 markers + K 个案例

### 13. 虚拟病例 / Unknown Cases
- [ ] 新路由 `/cases` + `data/cases.json`
- [ ] 20 个精选案例（跨多器官）
- [ ] 每案例：临床史 + 影像 + 大体 + 低中高倍图 + 初步诊断输入 + IHC 结果 + 最终诊断 + 专家答案 + 知识链接

### 14. 鉴别流程图可视化
- [ ] 在疾病页的"鉴别要点"下方可选渲染 Mermaid / React Flow 图
- [ ] 至少 5 个经典流程：梭形细胞肿瘤 IHC、淋巴瘤分型、软组织肉瘤、甲状腺滤泡性病变、前列腺腺癌 vs 良性

### 15. 审计日志 + 版本历史
- [ ] `data/audit-log.jsonl` 按行附加
- [ ] 每条 `{ timestamp, actor, action, entity, diff }`
- [ ] Admin 页增加"历史"tab，支持还原到任意历史版本

### 16. 个人笔记 + 收藏
- [ ] 每个 disease/marker 条目支持私有笔记（localStorage）
- [ ] 收藏功能
- [ ] 导出笔记为 PDF / Markdown

### 17. 多克隆对比图谱
- [ ] Marker 染色图框架扩展，支持同一 marker、同一瘤种、不同克隆号的表现对比
- [ ] 例如：p53 DO-7 vs PAb1801 在 Barrett 异型增生

### 18. 术语词汇表（Glossary）
- [ ] `data/glossary.json` + 路由 `/glossary`
- [ ] 300+ 条病理学术语（中英文 + 定义 + 典型图 + 相关疾病）
- [ ] 全站文本自动识别术语并 tooltip

---

## 🟢 Tier 3 · 差异化拓展

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

---

## 📆 建议路线图（时间轴）

**Q1 · 补核心空白**
1. Nottingham Grade 计算器（#1 第一个子项）
2. 多倍数图片 schema（#4）
3. CNS + 软组织 + 骨 3 个 json 文件（#2）
4. 特殊染色 20 条（#5）

**Q2 · 实用工具化**
5. 取材规范 15 个标本类型（#6）
6. 冰冻切片 5 个场景（#7）
7. 剩余分级评分器：Gleason / ISUP / FIGO / Bethesda（#1）
8. CAP 同步报告 3–5 个（#9）

**Q3 · 互动教学**
9. IHC Panel Builder（#10）
10. 虚拟病例 20 个（#13）
11. 学习路径（#12）
12. 术语词汇表（#18）

**Q4 · 差异化**
13. 分子病理模块（#8）
14. 审计日志（#15）
15. WSI viewer 嵌入（#19）
16. 考试模式（#24）

---

## 🔗 相关

- 功能现状：见 [README.md](../README.md)
- API 文档：见 [docs/admin-api.md](admin-api.md)
- 审评人视角：高级病理医生对整个系统的模块缺口分析（conversation 2026-04 记录）
