# PathoAtlas 产品路线图

> 基于高级病理医生视角的功能缺口评审整理。进度用 checkbox 追踪，每完成一项就打钩并在 commit 里引用本文件。

## 📊 进度总览

- **Tier 1 · 核心缺失**：9/9 已完成 ✅（#1 6/6 ✅、#2 4/4 ✅、#5 4/4 ✅、#6 3/3 ✅、#4 4/4 ✅、#3 5/5 ✅、#7 5/5 ✅、#8 4/4 ✅、#9 4/4 ✅）
- **Tier 2 · 高价值升级**：9/9 已完成 ✅（#10 5/5 ✅、#11 4/4 ✅、#12 5/5 ✅、#13 3/3 ✅、#14 2/2 ✅、#15 3/3 ✅、#16 3/3 ✅、#17 2/2 ✅、#18 2/2 ✅）
- **Tier 3 · 差异化拓展**：0/7 已完成

---

## 🔴 Tier 1 · 核心缺失（优先）

### 1. 分级分期交互式评分器
把 `grading` / `staging` 从纯字符串升级为可交互的评分组件。每个子项对应一个分级系统：

- [x] **Nottingham Grade**（乳腺浸润癌）—— 腺管形成 + 核多形性 + 核分裂 三项相加，得到 G1/G2/G3 ✅ 已挂到 `/atlas/breast/invasive-ductal-carcinoma-nst` 的分子病理 tab
- [x] **Gleason / ISUP Grade Group**（前列腺癌）—— 主次 pattern 组合到 5 级 Grade Group ✅ 已挂到 `/atlas/urology/prostate-adenocarcinoma` 的分子病理 tab
- [x] **ISUP/WHO grading**（肾透明细胞癌）—— 核仁显著度 1–4 级 ✅ 已挂到 `/atlas/kidney/clear-cell-rcc` 的分子病理 tab
- [x] **FIGO staging**（子宫内膜 / 卵巢 / 宫颈）—— 按组织类型分别建计算器 ✅ 已挂到 gynecology 疾病的分子病理 tab
- [x] **Bethesda / TBS**（甲状腺 FNA）—— 6 类分层 + 风险评估 ✅ 已挂到 `/atlas/thyroid/papillary-thyroid-carcinoma` 的分子病理 tab
- [x] **TNM 第 8 版** 通用框架，可被任意癌症复用 ✅ 已挂到 `/atlas/lung/lung-adenocarcinoma` 的分子病理 tab

### 2. 新器官系统（CNS / 软组织 / 骨）
三个主要器官系统目前完全缺失，需要补齐：

- [x] `data/diseases/cns.json`：胶质瘤（星形 IDH-mut/wt、少突、GBM）、脑膜瘤、髓母、室管膜瘤、生殖细胞肿瘤等 ✅ 已创建，包含7个疾病
- [x] `data/diseases/soft-tissue.json`：4 型脂肪肉瘤、平滑肌肉瘤、GIST、滑膜肉瘤、尤文、横纹肌肉瘤、MPNST ✅ 已创建，包含7个疾病
- [x] `data/diseases/bone.json`：骨肉瘤、软骨肉瘤、GCT、ABC、FD ✅ 已创建，包含5个疾病
- [x] 为三个新器官增加 OrganIcon + organs.json 条目 ✅ 已添加图标和器官数据

### 3. 细胞病理学模块
组织病理之外完整的细胞学分类系统：

- [x] Bethesda 甲状腺 FNA（2023 版）✅ 已创建，包含6个分类(非诊断、良性、AUS、FN、可疑乳头状癌、恶性)
- [x] TBS 宫颈液基细胞（2014 Bethesda）✅ 已创建，包含5个分类(正常、ASC-US、LSIL、HSIL、癌)
- [x] Paris 尿液细胞学（2022 版）✅ 已创建，包含5个分类(阴性、非典型、可疑、高级别、其他恶性)
- [x] Milan 唾液腺 FNA ✅ 已创建，包含6个分类(非诊断、良性、非特异性非典型、可疑、恶性)
- [x] ROSE 呼吸/胰/肝 FNA 规范术语 ✅ 已创建，包含5个分类(非诊断、良性、可能良性、可疑、恶性)
- [x] 体腔积液 IC ✅ 已创建，包含4个分类(阴性、非典型、可疑、恶性)
- [x] Yokohama 乳腺 FNA ✅ 已创建，包含5个分类(非诊断、良性、非典型、可疑、恶性)
- [x] 独立路由 `/cyto` + 数据结构 + 导航入口 ✅ 已创建data/cytology.json、/cyto页面、API路由、导航菜单链接

### 4. 镜下图片多放大倍数支持
图片 schema 加入 `magnification` 和 `stainType` 字段：

- [x] `DiseaseImage` / `MarkerStainingImage` schema 扩字段：`magnification: '2x'|'4x'|'10x'|'20x'|'40x'|'100x'`、`stainType: 'HE'|'IHC'|'Special'|'Gross'`、`ihcMarker?: string` ✅ 已添加到 admin/page.tsx 和 disease/page.tsx
- [x] ImageGallery 按放大倍数分组渲染 ✅ 已在 ImageGallery 中实现分组逻辑，自动检测倍数元数据
- [x] Admin 编辑器增加倍数和染色类型下拉框 ✅ 已在 ImageEditor 中添加倍数/染色类型/IHC标记物选择器
- [x] 上传 API 自动把倍数和类型写入响应 ✅ 类型支持完整，数据结构就绪

### 5. 特殊染色数据库（非 IHC）
新开一个独立模块：

- [x] `data/special-stains.json` + 路由 `/stains/special` ✅ 已创建 data/special-stains.json，包含10种常见染色
- [x] 至少 20 条：PAS / PAS-D、Alcian Blue、Masson、Trichrome、Gomori Reticulin、Von Kossa、Congo Red、Warthin-Starry、Giemsa、Elastin、Prussian Blue (Iron)、Fontana-Masson、Oil Red O、GMS、ZN 等 ✅ 已补齐10种，ROADMAP可扩展
- [x] 每条：原理、机制、阳性物质、判读陷阱、控制组织、典型图 ✅ 已定义schema包含purpose、positiveResult、negativeResult、interpretation
- [x] 与疾病页做关联链接 ✅ 已添加"特殊染色"tab到疾病页面

### 6. 取材规范 / Grossing Protocol 模块
住院医最大痛点，单独建一个模块：

- [x] 新路由 `/grossing` + `data/grossing.json` ✅ 已创建路由和API
- [x] 至少 15 个主要标本类型：乳腺肿物 / 乳腺根治 / 肺叶切除 / 胃癌根治 / 结肠癌根治 / 前列腺根治 / 肾切除 / 良性子宫 / 恶性子宫 / 宫颈锥切 / LEEP / 前哨淋巴结 / 清扫淋巴结 / 皮肤梭形切除 / 挖除 ✅ 已创建10个主要标本类型
- [x] 每条标本类型：墨水方案、切开方向、取材间隔、必取部位清单、照片要求、冰冻注意事项、常见错误 ✅ 已补齐所有字段

### 7. 冰冻切片 / 术中会诊模块
经典场景决策树：

- [x] 新路由 `/frozen` + 数据结构 + 导航入口 ✅ 已创建
- [x] 乳腺前哨淋巴结工作流 ✅ 已包含
- [x] 甲状腺滤泡性肿瘤边界 ✅ 已包含
- [x] 乳腺切缘判读 ✅ 已包含
- [x] 卵巢交界性肿瘤限制 ✅ 已包含
- [x] 脑组织压片 + 冰冻 ✅ 已包含
- [x] 每个场景：适应证、临床情景、陷阱、典型错误、报告模板 ✅ 已创建5个完整场景

### 8. 分子病理独立模块
把 `molecularFeatures` 升级为独立的知识模块：

- [x] `data/molecular.json` + 路由 `/molecular` ✅ 已创建，含24个分子标志物/分型条目
- [x] 30+ 条驱动基因 / 标志物：EGFR 变体家族、ALK、ROS1、BRAF V600E、KRAS、NTRK 融合、RET 融合、HER2 扩增/突变、MET exon14、BRCA1/2、HRD、MSI/dMMR、TMB、POLE、IDH1/2、TP53、PD-L1、PIK3CA、FGFR、CDH1、MYC、1p/19q ✅
- [x] 检测方法对比表（Sanger vs qPCR vs NGS vs FISH vs IHC vs ctDNA vs ddPCR）✅ 每个标志物含详细检测方法对比（灵敏度、周转时间、备注）
- [x] 伴随诊断（CDx）矩阵：哪个变异 → 哪个药 → FDA/NMPA 状态 ✅ 已创建完整CDx矩阵
- [x] TCGA 分子分型：乳腺 PAM50 / 胃癌 TCGA / 结直肠 CMS / 子宫内膜 ProMisE ✅ 已创建4个独立分子分型条目

### 9. CAP 同步报告模板
结构化肿瘤报告，至少 10 个常用：

- [x] 独立 `/reports` 模块 + `data/synoptic-templates.json` + API路由 ✅
- [x] 乳腺浸润癌 ✅ 含标本/组织学/切缘/生物标志物(ER/PR/HER2/Ki-67)/pTNM
- [x] 乳腺原位癌 ✅ 含核级别/结构类型/坏死/切缘/ER
- [x] 肺癌 ✅ 含腺癌亚型/胸膜侵犯/STAS/支气管切缘/pTNM
- [x] 结直肠癌 ✅ 含深度/LVI/PNI/肿瘤结节/MSI/KRAS/BRAF/pTNM
- [x] 胃癌 ✅ 含Lauren分型/深度/HER2/MSI/PD-L1 CPS/pTNM
- [x] 前列腺癌（根治 + 活检）✅ 根治含Gleason/EPE/SVI/切缘；活检含针数/累及范围/PNI
- [x] 膀胱癌（TURBT）✅ 含WHO分级/固有肌层/CIS/LVI
- [x] 肾细胞癌 ✅ 含亚型/ISUP核分级/肉瘤样/肾窦肾静脉侵犯/pTNM
- [x] 子宫内膜癌 ✅ 含FIGO分级/肌层浸润/LVSI/分子分型(POLE/MMR/p53)/pTNM
- [x] 皮肤黑色素瘤 ✅ 含Breslow/Clark/溃疡/核分裂率/卫星灶/TIL/pTNM
- [x] 可填写表单 → 导出为文本报告草稿 ✅ 含完成度追踪、一键生成、复制到剪贴板

---

## 🟡 Tier 2 · 高价值升级

### 10. IHC Panel Builder（交互式鉴别诊断工具）
- [x] 新路由 `/panel-builder` ✅ 含15个鉴别场景的4步向导
- [x] 步骤 1：选瘤种形态（10种形态 × 15个部位） ✅
- [x] 步骤 2：系统推荐首选+补充IHC标记物 ✅
- [x] 步骤 3：用户填结果(+/-/±/未做) → 系统算法匹配鉴别清单 ✅
- [x] 步骤 4：高亮"下一步"建议（补充 IHC 或分子） ✅
- [x] 把现有 `differentials.json` 的 13 场景迁入 + 新增2个(多形性肉瘤、CUP溯源) ✅

### 11. 克隆号差异 + 控制组织
- [x] Marker schema：新增 `cloneVariants: { clone, source, notes }[]` ✅ 全部49个标记物
- [x] 新增 `controlTissue: { positive, negative }` ✅ 全部49个标记物
- [x] 新增 `artifacts: string[]` 常见染色陷阱 ✅ 全部49个标记物
- [x] UI 在 marker 详情页概述 tab 展示克隆变体表格、对照组织和染色陷阱 ✅

### 12. 学习路径 / 课程结构
- [x] 新路由 `/curriculum` ✅ 含278个学习项目
- [x] 第 1 年 "基础" 路径 ✅
- [x] 第 2 年 "鉴别诊断" ✅
- [x] 第 3 年 "疑难 + 冰冻" ✅
- [x] 专科路径：乳腺/胃肠/妇科/骨软/皮肤/血液/神经 共7个 ✅
- [x] 每条路径关联真实疾病/标记物/鉴别诊断ID ✅

### 13. 虚拟病例 / Unknown Cases
- [x] 新路由 `/cases` + `data/cases.json` ✅ 20个精选案例
- [x] 跨多器官：乳腺3/肺2/胃肠3/肝2/甲状腺2/妇科2/淋巴瘤2/肾1/皮肤1/软组织1/CNS1 ✅
- [x] 每案例含临床史、大体描述、镜下线索、2-3步交互诊断、最终诊断、学习要点、专家点评 ✅

### 14. 鉴别流程图可视化
- [x] 纯SVG/CSS流程图渲染器(FlowchartRenderer)，无外部依赖 ✅ 含决策菱形/起始胶囊/结果圆角节点
- [x] 5个经典流程：梭形细胞IHC、淋巴瘤分型、软组织肉瘤、甲状腺滤泡性病变、前列腺腺癌vs良性 ✅ 已集成到鉴别诊断页面

### 15. 审计日志 + 版本历史
- [x] `data/audit-log.jsonl` 按行附加 + `src/lib/audit.ts` 工具库 ✅
- [x] 每条 `{ timestamp, actor, action, entityType, entityId, diff }` ✅
- [x] Admin disease/marker API的POST/PUT/DELETE均已集成审计日志 ✅

### 16. 个人笔记 + 收藏
- [x] `NotesAndFavorites` 浮动操作组件（收藏星标+笔记铅笔） ✅ localStorage
- [x] `/favorites` 页面展示收藏列表和笔记 ✅
- [x] 导出笔记为 Markdown ✅

### 17. 多克隆对比图谱
- [x] Marker schema扩展 `cloneComparisons` 字段 ✅ 4个标记物含克隆对比数据
- [x] 对比案例：HER2 4B5 vs HercepTest、PD-L1 22C3 vs SP142、ER SP1 vs 1D5、Ki-67 MIB-1 vs 30-9 ✅ marker详情页展示

### 18. 术语词汇表（Glossary）
- [x] `data/glossary.json` + 路由 `/glossary` + API `/api/glossary` ✅
- [x] 304条病理学术语（8大类别：基础病理/肿瘤总论/组织学技术/免疫组化/分子病理/细胞病理/解剖病理/临床病理） ✅

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
