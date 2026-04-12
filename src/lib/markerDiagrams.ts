// Maps a marker id → conceptual mechanism diagram.
// Diagrams live under /public/diagrams/mechanism/*.svg and are drawn by the
// markers page inside the expanded detail view so learners can visualize the
// underlying biology (receptor signaling, filament networks, lineage factors…)
// rather than memorize purely textual attributes.

export interface MarkerDiagram {
  /** Absolute public URL of the SVG illustration. */
  url: string;
  /** Short title shown above the diagram in the UI. */
  title: string;
  /** Long-form caption rendered below the figure. */
  caption: string;
}

// Base folder — keeping as a const makes the mapping below compact.
const M = '/diagrams/mechanism';

/**
 * Shared library of mechanism figures. Multiple markers may reuse the same
 * diagram when they share biology (e.g. ER/PR both use the nuclear hormone
 * receptor illustration).
 */
const DIAGRAMS = {
  hormoneReceptor: {
    url: `${M}/er.svg`,
    title: '核激素受体信号',
    caption: '配体(E2/孕激素)进入细胞 → 受体二聚化入核 → 结合 ERE → 转录增殖基因。Allred / 百分比判读。',
  },
  her2: {
    url: `${M}/her2.svg`,
    title: 'HER2 受体酪氨酸激酶',
    caption: '基因扩增→膜过表达→配体非依赖性二聚化→RAS-MAPK / PI3K-AKT 激活。IHC 膜完整环染为 3+。',
  },
  ki67: {
    url: `${M}/ki-67.svg`,
    title: '细胞周期增殖指数',
    caption: 'Ki-67 在 G1/S/G2/M 期核阳性，G0 阴性；阳性百分比即增殖指数 PI。',
  },
  cytokeratin: {
    url: `${M}/cytokeratin.svg`,
    title: '角蛋白中间丝骨架',
    caption: '酸/碱性 CK 异型二聚体组成上皮细胞中间丝网络，锚定桥粒，维持机械完整性。',
  },
  eCadherin: {
    url: `${M}/e-cadherin.svg`,
    title: '钙依赖性细胞黏附',
    caption: '胞外段同种亲和偶联 + 胞内 α/β 连环蛋白锚定 F-actin；CDH1 失活 → 膜阳性丢失。',
  },
  myogenic: {
    url: `${M}/sma-desmin.svg`,
    title: '肌源性细胞骨架',
    caption: 'α-SMA 组装胞浆微丝；desmin 作为肌细胞中间丝标记骨骼/心/平滑肌分化。',
  },
  ckit: {
    url: `${M}/cd117.svg`,
    title: 'c-KIT Ⅲ 型 RTK',
    caption: 'GIST 多为 KIT exon 11 获得性突变 → 配体非依赖二聚化 → imatinib 可阻断。DOG1 辅助。',
  },
  neuralCrest: {
    url: `${M}/s-100.svg`,
    title: '神经嵴 Ca²⁺ 结合蛋白',
    caption: 'S-100 (核+胞浆) 标记黑色素细胞、施万细胞及朗格汉斯细胞等神经嵴/髓系树突细胞后代。',
  },
  lymphocyte: {
    url: `${M}/cd-lymphocyte.svg`,
    title: 'CD 分子谱系鉴定',
    caption: 'T 系以 CD3/CD5 为主、亚群 CD4/CD8；B 系以 CD20/CD79a/CD19 为主；淋巴瘤分型核心。',
  },
  checkpoint: {
    url: `${M}/pd-l1.svg`,
    title: 'PD-L1 / PD-1 检查点',
    caption: '肿瘤 PD-L1 与 T 细胞 PD-1 结合抑制 T 细胞激活；TPS/CPS 阈值指导免疫检查点抑制剂。',
  },
  neuroendocrine: {
    url: `${M}/synaptophysin.svg`,
    title: '神经内分泌分泌颗粒',
    caption: 'Syn 标记小突触样囊泡膜，CgA 位于大致密核心颗粒基质，胞浆颗粒状阳性提示 NET。',
  },
  ttf1: {
    url: `${M}/ttf-1.svg`,
    title: '谱系特异转录因子',
    caption: 'NKX2-1/TTF-1 为甲状腺与远端气道谱系核转录因子，鉴别原发灶。',
  },
} as const;

export const MARKER_DIAGRAMS: Record<string, MarkerDiagram> = {
  er: DIAGRAMS.hormoneReceptor,
  pr: DIAGRAMS.hormoneReceptor,
  her2: DIAGRAMS.her2,
  'ki-67': DIAGRAMS.ki67,
  ck7: DIAGRAMS.cytokeratin,
  ck20: DIAGRAMS.cytokeratin,
  'ck5-6': DIAGRAMS.cytokeratin,
  ck19: DIAGRAMS.cytokeratin,
  'e-cadherin': DIAGRAMS.eCadherin,
  sma: DIAGRAMS.myogenic,
  desmin: DIAGRAMS.myogenic,
  cd117: DIAGRAMS.ckit,
  dog1: DIAGRAMS.ckit,
  's-100': DIAGRAMS.neuralCrest,
  sox10: DIAGRAMS.neuralCrest,
  hmb45: DIAGRAMS.neuralCrest,
  'melan-a': DIAGRAMS.neuralCrest,
  cd3: DIAGRAMS.lymphocyte,
  cd5: DIAGRAMS.lymphocyte,
  cd10: DIAGRAMS.lymphocyte,
  cd20: DIAGRAMS.lymphocyte,
  cd30: DIAGRAMS.lymphocyte,
  cd15: DIAGRAMS.lymphocyte,
  bcl2: DIAGRAMS.lymphocyte,
  bcl6: DIAGRAMS.lymphocyte,
  'pd-l1': DIAGRAMS.checkpoint,
  synaptophysin: DIAGRAMS.neuroendocrine,
  'chromogranin-a': DIAGRAMS.neuroendocrine,
  cd56: DIAGRAMS.neuroendocrine,
  'ttf-1': DIAGRAMS.ttf1,
};

/** Returns the mechanism diagram for a given marker id, if any. */
export function getMarkerDiagram(markerId: string): MarkerDiagram | undefined {
  return MARKER_DIAGRAMS[markerId];
}

/** Total number of markers wired to a mechanism diagram. */
export const MARKERS_WITH_DIAGRAM = Object.keys(MARKER_DIAGRAMS).length;
