// Maps a marker id → its own conceptual mechanism diagram.
// Each marker has a *unique* SVG so visitors don't see the same picture
// repeated across multiple cards. Diagrams live under
// /public/diagrams/mechanism/*.svg and are rendered by the markers page
// inside the expanded detail view so learners can visualize the
// underlying biology (receptor signaling, filament networks, lineage
// factors…) rather than memorize purely textual attributes.

export interface MarkerDiagram {
  /** Absolute public URL of the SVG illustration. */
  url: string;
  /** Short title shown above the diagram in the UI. */
  title: string;
  /** Long-form caption rendered below the figure. */
  caption: string;
}

const M = '/diagrams/mechanism';

// One entry per marker. Captions are concise so the figure + text fit in
// a single scroll of the expanded marker card.
export const MARKER_DIAGRAMS: Record<string, MarkerDiagram> = {
  er: {
    url: `${M}/er.svg`,
    title: 'ER · 核激素受体信号',
    caption: 'E2 入胞 → ER 二聚化入核 → 结合 ERE → 转录增殖基因。Allred / 百分比判读。',
  },
  pr: {
    url: `${M}/pr.svg`,
    title: 'PR · ER 下游孕激素受体',
    caption: 'PR 是 ER 通路下游靶基因，PR-A/PR-B 异构体。PR 阳性提示 ER 通路功能正常。',
  },
  her2: {
    url: `${M}/her2.svg`,
    title: 'HER2 · 受体酪氨酸激酶',
    caption: '基因扩增→膜过表达→配体非依赖性二聚化→RAS-MAPK / PI3K-AKT 激活。IHC 膜完整环染为 3+。',
  },
  'ki-67': {
    url: `${M}/ki-67.svg`,
    title: 'Ki-67 · 细胞周期增殖指数',
    caption: 'Ki-67 在 G1/S/G2/M 期核阳性，G0 阴性；阳性百分比即增殖指数 PI。',
  },
  ck7: {
    url: `${M}/ck7.svg`,
    title: 'CK7 · 腺上皮/导管角蛋白',
    caption: '乳腺/肺/子宫/胆管/胰腺导管 + 尿路上皮。CK7 胞浆阳性环绕腺腔。',
  },
  ck20: {
    url: `${M}/ck20.svg`,
    title: 'CK20 · 肠/尿路 + Merkel',
    caption: '肠腺癌、尿路上皮癌、胆管癌阳性；Merkel 细胞癌呈特征性核旁点状着色。',
  },
  'ck5-6': {
    url: `${M}/ck5-6.svg`,
    title: 'CK5/6 · 基底/鳞状',
    caption: '鳞癌 / 基底样乳腺癌 / 肌上皮 / 间皮阳性；鉴别肺鳞癌与腺癌的关键。',
  },
  ck19: {
    url: `${M}/ck19.svg`,
    title: 'CK19 · 胆管 + PTC',
    caption: '胆管细胞/肝内胆管癌阳性；甲状腺乳头癌 PTC 阳性、良性滤泡病变阴性。',
  },
  'e-cadherin': {
    url: `${M}/e-cadherin.svg`,
    title: 'E-cadherin · 钙依赖黏附',
    caption: '胞外同种亲和 + 胞内 α/β 连环蛋白锚定 F-actin；CDH1 失活 → 膜阳性丢失。',
  },
  sma: {
    url: `${M}/sma.svg`,
    title: 'SMA · α-平滑肌肌动蛋白',
    caption: '平滑肌 / 肌上皮 / 肌纤维母细胞胞浆阳性；组成细薄微丝。',
  },
  desmin: {
    url: `${M}/desmin.svg`,
    title: 'Desmin · 肌细胞中间丝',
    caption: '连接 Z 线形成肌节横向骨架；骨骼/心/平滑肌阳性；肌上皮常阴性。',
  },
  cd117: {
    url: `${M}/cd117.svg`,
    title: 'CD117 (c-KIT) · Ⅲ 型 RTK',
    caption: 'GIST 多为 KIT exon 11 获得性突变 → 配体非依赖二聚化 → imatinib 阻断。',
  },
  dog1: {
    url: `${M}/dog1.svg`,
    title: 'DOG1 · 钙激活 Cl⁻ 通道',
    caption: 'ANO1 氯离子通道，Cajal 间质细胞及 GIST 阳性；对 KIT 阴性 PDGFRA 型亦阳性。',
  },
  's-100': {
    url: `${M}/s-100.svg`,
    title: 'S-100 · 神经嵴 Ca²⁺ 结合蛋白',
    caption: '核 + 胞浆染色。涵盖黑色素细胞、施万细胞、朗格汉斯细胞等神经嵴/髓系树突细胞。',
  },
  sox10: {
    url: `${M}/sox10.svg`,
    title: 'SOX10 · 神经嵴核转录因子',
    caption: 'HMG-box 转录因子；较 S-100 更特异；去分化黑色素瘤 / 乳腺肌上皮均阳性。',
  },
  hmb45: {
    url: `${M}/hmb45.svg`,
    title: 'HMB-45 · 前黑素体 gp100',
    caption: '识别 Ⅱ 期前黑素体 PMEL/gp100 抗原，胞浆颗粒状；梭形细胞黑色素瘤可阴性。',
  },
  'melan-a': {
    url: `${M}/melan-a.svg`,
    title: 'Melan-A (MART-1) · 黑素体膜蛋白',
    caption: '黑素体膜蛋白，敏感性 >90%；与 HMB-45 互补使用。',
  },
  cd3: {
    url: `${M}/cd3.svg`,
    title: 'CD3 · TCR 信号复合体',
    caption: 'CD3εγδ 亚基 + ζζ 胞内 ITAM；所有 T 系阳性；外周 T 细胞淋巴瘤首选。',
  },
  cd5: {
    url: `${M}/cd5.svg`,
    title: 'CD5 · pan-T + 异常 B 系',
    caption: 'T 系弥漫阳性；B 系 CD5+ → CLL/SLL (CD23+) · 套细胞淋巴瘤 (cyclinD1+)。',
  },
  cd10: {
    url: `${M}/cd10.svg`,
    title: 'CD10 (CALLA) · 中性内肽酶',
    caption: '生发中心 B (FL/BL/DLBCL-GCB) + 前 B 急性白血病 + 肾近曲小管 + 子宫间质。',
  },
  cd20: {
    url: `${M}/cd20.svg`,
    title: 'CD20 · B 系 4 次跨膜',
    caption: 'MS4A1 家族 4 次跨膜 B 细胞标记；Rituximab 靶点；浆细胞瘤阴性。',
  },
  cd30: {
    url: `${M}/cd30.svg`,
    title: 'CD30 · TNFR 活化标记',
    caption: 'cHL R-S 细胞、ALCL、部分 DLBCL 阳性；Brentuximab-vedotin (MMAE) 靶点。',
  },
  cd15: {
    url: `${M}/cd15.svg`,
    title: 'CD15 · Lewis X 碳水化合物',
    caption: '中性粒细胞 + cHL R-S 膜 & 核旁 Golgi 点状；与 CD30 并用确诊 cHL。',
  },
  bcl2: {
    url: `${M}/bcl2.svg`,
    title: 'BCL2 · 抗凋亡蛋白',
    caption: '线粒体外膜阻断 BAX/BAK，保留 Cyt-C；FL t(14;18) >90% 阳性；反应性 GC 阴性。',
  },
  bcl6: {
    url: `${M}/bcl6.svg`,
    title: 'BCL6 · 生发中心转录因子',
    caption: '核染色；POZ/BTB + 锌指结构域；GCB-DLBCL 分型核心 (CD10+/BCL6+/MUM1-)。',
  },
  'pd-l1': {
    url: `${M}/pd-l1.svg`,
    title: 'PD-L1 · 免疫检查点配体',
    caption: '肿瘤 PD-L1 与 T 细胞 PD-1 结合抑制 T 激活；TPS/CPS 阈值指导 ICIs。',
  },
  synaptophysin: {
    url: `${M}/synaptophysin.svg`,
    title: 'Synaptophysin · 小突触样囊泡',
    caption: 'SLMV 膜整合蛋白；胞浆弥漫细颗粒阳性；NE 分化首选筛查。',
  },
  'chromogranin-a': {
    url: `${M}/chromogranin-a.svg`,
    title: 'Chromogranin A · LDCV 基质',
    caption: '大致密核心颗粒酸性糖蛋白基质；特异性优于 Syn；颗粒稀少的 SCLC 可假阴性。',
  },
  cd56: {
    url: `${M}/cd56.svg`,
    title: 'CD56 (NCAM) · 同源黏附分子',
    caption: 'NK/T 系 + 神经内分泌 (SCLC/NET) + 髓母细胞瘤 + 部分多发性骨髓瘤。',
  },
  'ttf-1': {
    url: `${M}/ttf-1.svg`,
    title: 'TTF-1 · 谱系特异转录因子',
    caption: 'NKX2-1 为甲状腺与远端气道谱系核转录因子，鉴别原发灶。',
  },
};

/** Returns the mechanism diagram for a given marker id, if any. */
export function getMarkerDiagram(markerId: string): MarkerDiagram | undefined {
  return MARKER_DIAGRAMS[markerId];
}

/** Total number of markers wired to a mechanism diagram. */
export const MARKERS_WITH_DIAGRAM = Object.keys(MARKER_DIAGRAMS).length;
