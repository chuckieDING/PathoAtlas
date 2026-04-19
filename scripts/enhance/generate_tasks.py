"""Regenerate docs/enhancement-tasks.json from the current data/ state.

Run after dedupe / data edits to keep the task list in sync with reality.
Tasks are emitted in stable ID order so diffs between runs are small.
"""

from __future__ import annotations

import json
import os
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
OUT = ROOT / "docs" / "enhancement-tasks.json"


def load(rel: str):
    with (DATA / rel).open(encoding="utf-8") as f:
        return json.load(f)


_counter = [0]


def nid() -> str:
    _counter[0] += 1
    return f"T{_counter[0]:04d}"


def task(**kw) -> dict:
    """Emit a task record with taskId assigned."""
    return {"taskId": nid(), **kw}


CN_GUIDELINE_KEYWORDS = ["CSCO", "CACA", "卫健委", "国家卫生健康",
                          "中国临床肿瘤学会", "中国抗癌协会", "诊疗规范",
                          "诊疗指南", "[国内指南]"]
CN_CONSENSUS_KEYWORDS = ["中华医学会", "中华病理学", "中国医师协会",
                          "专家共识", "[国内共识]"]


def has_cn_guideline_ref(refs: list[str]) -> bool:
    """Strict: only matches actual Chinese *guidelines* (CSCO/卫健委/CACA)."""
    return any(
        any(k in r for k in CN_GUIDELINE_KEYWORDS) for r in refs or []
    )


def has_cn_consensus_ref(refs: list[str]) -> bool:
    """Strict: only matches actual Chinese *consensus* documents."""
    return any(
        any(k in r for k in CN_CONSENSUS_KEYWORDS) for r in refs or []
    )


def marker_has_cn_consensus(m: dict) -> bool:
    """Check expertConsensus[] for a Chinese entry (by org or title)."""
    for c in m.get("expertConsensus") or []:
        blob = (c.get("organization", "") + " " + c.get("title", ""))
        if any(k in blob for k in CN_CONSENSUS_KEYWORDS + ["CSCO", "CACA"]):
            return True
    return False


def marker_has_cn_literature(m: dict) -> bool:
    for x in m.get("literature") or []:
        blob = (x.get("title", "") + " " + x.get("journal", ""))
        if "中华" in blob or "中国" in blob or "临床与实验病理学杂志" in blob:
            return True
    return False


def glossary_term_is_complete(g: dict) -> bool:
    """Gaps: missing synonyms or relatedTerms."""
    return bool(g.get("synonyms")) and bool(g.get("relatedTerms"))


def build() -> list[dict]:
    tasks: list[dict] = []

    # ---------- diseases ----------
    for fn in sorted(os.listdir(DATA / "diseases")):
        organ = fn.replace(".json", "")
        arr = load(f"diseases/{fn}")
        for d in arr:
            did = d["id"]
            name = d.get("nameZh")
            nen = d.get("nameEn")
            imgs = len(d.get("images") or [])
            refs = d.get("references") or []
            has_cn_gl = has_cn_guideline_ref(refs)
            has_cn_cons = has_cn_consensus_ref(refs)
            # images (only if < 2)
            if imgs < 2:
                tasks.append(task(
                    targetType="disease",
                    targetFile=f"data/diseases/{fn}",
                    targetId=did, targetNameZh=name, targetNameEn=nen,
                    dimension="images", currentCount=imgs,
                    requested="补充 2-4 张低倍+高倍镜下形态学图片（或 SVG 示意图），每张含 caption；优先展示特征性结构",
                    outputSchema={"images": [
                        {"url": "string", "caption": "string（中文含放大倍数/特征）"}]},
                ))
            # cn_guideline — skip if already has a Chinese guideline ref
            if not has_cn_gl:
                tasks.append(task(
                    targetType="disease", targetFile=f"data/diseases/{fn}",
                    targetId=did, targetNameZh=name, targetNameEn=nen,
                    dimension="cn_guideline", currentCount=0,
                    requested="补充 1-3 条国内权威指南引用（CSCO / 卫健委诊疗规范 / 中华医学会分会）",
                    outputSchema={"references_cn_guideline": [
                        {"title": "string", "org": "string",
                         "year": "int", "url": "string|null"}]},
                ))
            # cn_consensus — skip if already has Chinese consensus ref
            if not has_cn_cons:
                tasks.append(task(
                    targetType="disease", targetFile=f"data/diseases/{fn}",
                    targetId=did, targetNameZh=name, targetNameEn=nen,
                    dimension="cn_consensus", currentCount=0,
                    requested="补充 1-2 条国内专家共识（中华病理学杂志 / CSCO / CACA）",
                    outputSchema={"references_cn_consensus": [
                        {"title": "string", "org": "string", "year": "int",
                         "summary": "string(≤150字)", "url": "string|null"}]},
                ))
            # description_expand
            micro = d.get("microscopy") or ""
            if len(micro) < 200:
                tasks.append(task(
                    targetType="disease", targetFile=f"data/diseases/{fn}",
                    targetId=did, targetNameZh=name, targetNameEn=nen,
                    dimension="description_expand", currentCount=len(micro),
                    requested="扩写 microscopy 至 300-500 字",
                    outputSchema={"microscopy": "string"},
                ))

    # ---------- markers ----------
    markers = load("markers.json")
    for m in markers:
        mid, abbr = m["id"], m["abbreviation"]
        name = m.get("nameZh")
        for si in m.get("stainingImages", []) or []:
            if not si.get("images"):
                tasks.append(task(
                    targetType="marker", targetFile="data/markers.json",
                    targetId=mid, targetNameZh=name, targetAbbr=abbr,
                    stainingState=si.get("label"), stainingStateId=si.get("id"),
                    dimension="staining_image", currentCount=0,
                    requested=f'为 {abbr} 的 {si.get("label")!r} 状态补 1-2 张 IHC 样图',
                    outputSchema={"images": [
                        {"url": "string", "caption": "string"}]},
                ))
        if not marker_has_cn_consensus(m):
            tasks.append(task(
                targetType="marker", targetFile="data/markers.json",
                targetId=mid, targetNameZh=name, targetAbbr=abbr,
                dimension="cn_consensus", currentCount=0,
                requested=f"补 {abbr} 在国内的共识/规范",
                outputSchema={"expertConsensus_cn": [
                    {"id": "string", "title": "string", "summary": "string",
                     "organization": "string", "year": "int",
                     "sourceUrl": "string|null"}]},
            ))
        if not marker_has_cn_literature(m):
            tasks.append(task(
                targetType="marker", targetFile="data/markers.json",
                targetId=mid, targetNameZh=name, targetAbbr=abbr,
                dimension="cn_literature", currentCount=0,
                requested=f"补 {abbr} 国内核心期刊 1-2 篇文献",
                outputSchema={"literature_cn": [
                    {"title": "string", "authors": "string",
                     "journal": "string", "year": "int",
                     "doi": "string|null"}]},
            ))

    # ---------- cases ----------
    for c in load("cases.json"):
        if not c.get("expertCommentary") or len(c.get("expertCommentary", "")) < 50:
            tasks.append(task(
                targetType="case", targetFile="data/cases.json",
                targetId=c["id"], targetNameZh=c.get("titleZh"),
                dimension="case_expert_commentary",
                requested="扩写 expertCommentary 至 150-300 字",
                outputSchema={"expertCommentary": "string"}))
        tasks.append(task(
            targetType="case", targetFile="data/cases.json",
            targetId=c["id"], targetNameZh=c.get("titleZh"),
            dimension="case_images",
            requested="补 gross + LP + HP + IHC 配图",
            outputSchema={"images": [
                {"url": "string", "caption": "string",
                 "type": "gross|LP|HP|IHC"}]}))
        tasks.append(task(
            targetType="case", targetFile="data/cases.json",
            targetId=c["id"], targetNameZh=c.get("titleZh"),
            dimension="case_cn_reference",
            requested="匹配 1-2 条国内指南/共识要点",
            outputSchema={"cnReferences": [
                {"title": "string", "org": "string", "year": "int",
                 "relevantPoint": "string"}]}))

    # ---------- curriculum ----------
    curr = load("curriculum.json")
    for track_key in ("yearPaths", "specialtyPaths"):
        for path in curr.get(track_key) or []:
            for mod in path.get("modules") or []:
                tasks.append(task(
                    targetType="curriculum", targetFile="data/curriculum.json",
                    targetId=f'{path["id"]}::{mod["id"]}',
                    targetNameZh=f'{path.get("titleZh")} / {mod.get("titleZh")}',
                    dimension="curriculum_learning_objectives",
                    requested="补 learningObjectives(3-6)/recommendedHours/assessmentPoints",
                    outputSchema={"learningObjectives": ["string"],
                                  "recommendedHours": "int",
                                  "assessmentPoints": ["string"]}))
    tasks.append(task(
        targetType="curriculum", targetFile="data/curriculum.json",
        targetId="__root__", targetNameZh="课程大纲顶层",
        dimension="curriculum_cn_align",
        requested="对齐住培/专培病理大纲",
        outputSchema={"alignment": [
            {"cnStandardSection": "string", "coveredBy": "string|null",
             "gapNote": "string"}]}))

    # ---------- cytology ----------
    for x in load("cytology.json"):
        tasks.append(task(
            targetType="cytology", targetFile="data/cytology.json",
            targetId=x["id"], targetNameZh=x.get("nameZh"),
            dimension="cytology_category_images",
            requested="为 categories 每类补代表图 + 判读要点",
            outputSchema={"categoryImages": [
                {"categoryId": "string", "url": "string",
                 "caption": "string"}]}))
        tasks.append(task(
            targetType="cytology", targetFile="data/cytology.json",
            targetId=x["id"], targetNameZh=x.get("nameZh"),
            dimension="cytology_cn_consensus",
            requested="匹配国内细胞学共识",
            outputSchema={"cnConsensus": [
                {"title": "string", "org": "string",
                 "year": "int", "summary": "string"}]}))

    for mid, name in [("tbs-cervical", "宫颈 TBS 2014/2023 版"),
                       ("paris-urine", "尿液 Paris 分类"),
                       ("yokohama-breast", "乳腺 Yokohama 系统"),
                       ("milan-salivary", "唾液腺 Milan 系统"),
                       ("ios-serous", "胸腹水 International System"),
                       ("papsociety-resp", "呼吸道 PSC 分类")]:
        tasks.append(task(
            targetType="cytology", targetFile="data/cytology.json",
            targetId=mid, targetNameZh=name,
            dimension="cytology_new_entry",
            requested=f"新增 {name}",
            outputSchema={"id": "string", "nameZh": "string",
                          "categories": [
                              {"id": "string", "nameZh": "string",
                               "riskOfMalignancy": "string",
                               "management": "string"}]}))

    # ---------- differentials ----------
    for x in load("differentials.json"):
        tasks.append(task(
            targetType="differential",
            targetFile="data/differentials.json",
            targetId=x["id"], targetNameZh=x.get("titleZh"),
            dimension="diff_comparison_table",
            requested="生成鉴别横向对照表",
            outputSchema={"comparisonTable": {
                "columns": ["string"],
                "rows": [{"diseaseId": "string", "cells": ["string"]}]}}))

    for mid, name in [("small-round-blue-cell", "小圆蓝细胞肿瘤鉴别"),
                       ("clear-cell-tumors", "透明细胞肿瘤鉴别"),
                       ("epithelioid-tumors", "上皮样肿瘤鉴别"),
                       ("papillary-thyroid-mimics", "甲状腺乳头状癌形态拟态"),
                       ("signet-ring-cell", "印戒细胞癌来源鉴别"),
                       ("metastasis-unknown-primary", "转移癌未知原发")]:
        tasks.append(task(
            targetType="differential",
            targetFile="data/differentials.json",
            targetId=mid, targetNameZh=name,
            dimension="diff_new_entry",
            requested=f"新增鉴别主题「{name}」",
            outputSchema={"id": "string", "titleZh": "string",
                          "diseases": ["string"],
                          "keyMarkers": ["string"],
                          "algorithm": "string"}))

    # ---------- flowcharts ----------
    for x in load("flowcharts.json"):
        tasks.append(task(
            targetType="flowchart", targetFile="data/flowcharts.json",
            targetId=x["id"], targetNameZh=x.get("titleZh"),
            dimension="flowchart_validate",
            requested="按最新指南核对 nodes/edges",
            outputSchema={"patch": {"addNodes": [{}],
                                     "addEdges": [{}],
                                     "updateNodes": [{}]}}))

    # ---------- frozen-sections ----------
    for x in load("frozen-sections.json"):
        tasks.append(task(
            targetType="frozen", targetFile="data/frozen-sections.json",
            targetId=x["id"], targetNameZh=x.get("nameZh"),
            dimension="frozen_pitfall_image",
            requested="补陷阱/假阳/假阴图 2-3 张 + 国内共识要点",
            outputSchema={"pitfallImages": [
                {"url": "string", "caption": "string",
                 "trapType": "string"}],
                "cnConsensusNote": "string"}))

    for mid, name in [("parathyroid-intraop", "甲状旁腺术中冰冻"),
                       ("ovarian-mass", "卵巢肿物术中冰冻"),
                       ("pancreatic-margin", "胰腺手术切缘冰冻"),
                       ("liver-mass", "肝肿物术中冰冻"),
                       ("lymph-node-unknown", "不明来源淋巴结冰冻")]:
        tasks.append(task(
            targetType="frozen", targetFile="data/frozen-sections.json",
            targetId=mid, targetNameZh=name,
            dimension="frozen_new_entry",
            requested=f"新增「{name}」冰冻场景",
            outputSchema={"id": "string", "indication": "string",
                          "intraoperativeApproach": "string",
                          "diagnosticTrap": "string",
                          "reportingTemplate": "string"}))

    # ---------- glossary ----------
    glos = load("glossary.json")
    tasks.append(task(
        targetType="glossary", targetFile="data/glossary.json",
        targetId="__audit__", targetNameZh="术语表审计",
        currentCount=len(glos),
        dimension="glossary_audit",
        requested="审计 345 条术语",
        outputSchema={"patches": [
            {"id": "string",
             "fieldUpdates": {"termEn": "string?",
                              "synonyms": "array?",
                              "relatedTerms": "array?"}}]}))
    for term_id in ["mesenchymal-chondrosarcoma", "smarca4-deficient-tumor",
                     "bcor-sarcoma", "ccnb3-sarcoma", "nut-carcinoma",
                     "sinonasal-undifferentiated-carcinoma",
                     "dicer1-associated-tumor",
                     "enteropathy-associated-tcell-lymphoma",
                     "monomorphic-epitheliotropic-itcl",
                     "high-grade-b-cell-lymphoma-11q",
                     "mitf-family-translocation-rcc",
                     "eosinophilic-solid-cystic-rcc",
                     "elongated-spindle-cell-sft"]:
        tasks.append(task(
            targetType="glossary", targetFile="data/glossary.json",
            targetId=term_id, targetNameZh=term_id,
            dimension="glossary_new_term",
            requested="新增 WHO 5th 新实体术语",
            outputSchema={"id": "string", "termZh": "string",
                          "termEn": "string", "definition": "string",
                          "category": "string"}))

    # ---------- grossing ----------
    for x in load("grossing.json"):
        tasks.append(task(
            targetType="grossing", targetFile="data/grossing.json",
            targetId=x["id"], targetNameZh=x.get("nameZh"),
            dimension="grossing_cn_protocol",
            requested="对齐国内取材规范",
            outputSchema={"cnProtocolNotes": "string",
                          "differencesFromCAP": "string"}))

    for mid, name in [("whipple", "胰十二指肠切除"),
                       ("gastrectomy", "胃癌根治标本"),
                       ("colectomy", "结直肠癌根治"),
                       ("hysterectomy-with-adnexa", "子宫+双附件"),
                       ("radical-prostatectomy", "根治性前列腺切除"),
                       ("pulmonary-lobectomy", "肺叶切除"),
                       ("radical-nephrectomy", "根治性肾切除"),
                       ("pancreatic-distal", "胰体尾切除"),
                       ("hepatectomy", "肝部分切除"),
                       ("thyroidectomy", "甲状腺切除")]:
        tasks.append(task(
            targetType="grossing", targetFile="data/grossing.json",
            targetId=mid, targetNameZh=name,
            dimension="grossing_new_entry",
            requested=f"新增「{name}」取材规范",
            outputSchema={"id": "string", "inkScheme": "string",
                          "incisionDirection": "string",
                          "samplingInterval": "string",
                          "mandatorySites": ["string"],
                          "commonErrors": ["string"]}))

    # ---------- molecular ----------
    for x in load("molecular.json"):
        tasks.append(task(
            targetType="molecular", targetFile="data/molecular.json",
            targetId=x["id"], targetNameZh=x.get("nameZh"),
            dimension="molecular_cn_cdx",
            requested="补 NMPA CDx + CSCO 推荐等级",
            outputSchema={"nmpaCdxKits": [
                {"brand": "string", "platform": "string",
                 "nmpaApprovalYear": "int"}],
                "cscoRecommendation": {"level": "string",
                                       "year": "int"}}))

    for mid, name in [("kras-mutations", "KRAS 突变"),
                       ("nras-mutations", "NRAS 突变"),
                       ("idh1-idh2", "IDH1/IDH2"),
                       ("fgfr-alterations", "FGFR 改变"),
                       ("ntrk-fusions", "NTRK 融合"),
                       ("ret-alterations", "RET 改变"),
                       ("met-exon14", "MET exon14 跳跃"),
                       ("ros1-fusions", "ROS1 融合"),
                       ("alk-fusions", "ALK 融合"),
                       ("brca1-brca2", "BRCA1/2 HRD"),
                       ("msi-mmr", "MSI/MMR"),
                       ("tmb", "TMB"), ("hrd-score", "HRD"),
                       ("pten-loss", "PTEN 缺失"),
                       ("tert-promoter", "TERT 启动子")]:
        tasks.append(task(
            targetType="molecular", targetFile="data/molecular.json",
            targetId=mid, targetNameZh=name,
            dimension="molecular_new_entry",
            requested=f"新增「{name}」，覆盖 NMPA CDx",
            outputSchema={"id": "string", "geneSymbol": "string",
                          "variants": [{}],
                          "companionDiagnostics": [{}]}))

    # ---------- organs ----------
    for x in load("organs.json"):
        tasks.append(task(
            targetType="organ", targetFile="data/organs.json",
            targetId=x["id"], targetNameZh=x.get("nameZh"),
            dimension="organ_epidemiology_cn",
            requested="补国家癌症中心 NCCR 流行病学数据",
            outputSchema={"cnEpidemiology": {
                "incidencePer100k": "float",
                "mortalityPer100k": "float",
                "year": "int",
                "maleFemaleRatio": "string",
                "hotspotRegions": ["string"]}}))

    # ---------- panel-builder ----------
    pb = load("panel-builder.json")
    for group_key, items in pb.items():
        for it in items:
            tasks.append(task(
                targetType="panel", targetFile="data/panel-builder.json",
                targetId=f'{group_key}::{it["id"]}',
                targetNameZh=it.get("nameZh"),
                dimension="panel_cn_recommendation",
                requested="补国内 IHC 套餐推荐",
                outputSchema={"panels": {
                    "firstLine": ["markerId"],
                    "secondLine": ["markerId"],
                    "costNote": "string"}}))

    # ---------- special-stains ----------
    for x in load("special-stains.json"):
        tasks.append(task(
            targetType="special_stain", targetFile="data/special-stains.json",
            targetId=x["id"], targetNameZh=x.get("nameZh"),
            dimension="special_stain_images",
            requested="补阳性/阴性样图 + 国内试剂厂家",
            outputSchema={"images": [
                {"stateId": "string", "url": "string",
                 "caption": "string"}],
                "cnReagentVendors": ["string"]}))

    for mid, name in [("ab-ph2.5", "AB-pH2.5 阿尔辛蓝"),
                       ("ab-pas", "AB/PAS 双染"),
                       ("mucicarmine", "粘液胭脂红"),
                       ("reticulin", "Gomori 网织纤维"),
                       ("congo-red", "刚果红（淀粉样）"),
                       ("ziehl-neelsen", "抗酸染色"),
                       ("gram", "革兰染色"),
                       ("gms", "GMS 六胺银"),
                       ("prussian-blue", "普鲁士蓝"),
                       ("orcein", "地衣红"),
                       ("fontana-masson", "Fontana-Masson"),
                       ("melanin-bleach", "黑色素漂白")]:
        tasks.append(task(
            targetType="special_stain", targetFile="data/special-stains.json",
            targetId=mid, targetNameZh=name,
            dimension="special_stain_new_entry",
            requested=f"新增「{name}」",
            outputSchema={"id": "string", "nameZh": "string",
                          "interpretation": "string",
                          "positiveIn": ["string"],
                          "pitfalls": "string"}))

    # ---------- staging ----------
    for x in load("staging.json"):
        tasks.append(task(
            targetType="staging", targetFile="data/staging.json",
            targetId=x["id"], targetNameZh=x.get("nameZh"),
            dimension="staging_cn_version",
            requested="核对 AJCC/UICC + 国内替代分期",
            outputSchema={"verifiedAgainst": "string",
                          "cnAlternative": {
                              "name": "string",
                              "keyDifferences": "string"}}))

    for mid, name in [("liver-cnlc", "肝癌 CNLC"),
                       ("gastric-cgca", "胃癌中国分期"),
                       ("nasopharynx-cn-2017", "鼻咽癌 2017 中国分期"),
                       ("lung-iaslc-9", "肺癌 IASLC 第 9 版"),
                       ("colorectal-ajcc8", "结直肠癌 AJCC 8th"),
                       ("breast-ajcc8", "乳腺 AJCC 8th 预后"),
                       ("prostate-grade-group", "前列腺 Grade Group"),
                       ("kidney-isup", "肾癌 ISUP/WHO 核分级"),
                       ("cervical-figo-2018", "宫颈癌 FIGO 2018"),
                       ("ovarian-figo-2014", "卵巢癌 FIGO 2014"),
                       ("endometrial-figo-2023", "子宫内膜癌 FIGO 2023"),
                       ("thyroid-ajcc8", "甲状腺癌 AJCC 8th")]:
        tasks.append(task(
            targetType="staging", targetFile="data/staging.json",
            targetId=mid, targetNameZh=name,
            dimension="staging_new_entry",
            requested=f"新增分期「{name}」",
            outputSchema={"id": "string",
                          "applicableTo": ["string"],
                          "criteria": [{}],
                          "grades": [{}]}))

    # ---------- synoptic ----------
    for x in load("synoptic-templates.json"):
        tasks.append(task(
            targetType="synoptic",
            targetFile="data/synoptic-templates.json",
            targetId=x["id"], targetNameZh=x.get("nameZh"),
            dimension="synoptic_cn_align",
            requested="对齐 CAP + 国内报告规范",
            outputSchema={"capVersion": "string",
                          "cnRegulationAlign": [
                              {"cnField": "string",
                               "coveredBy": "string|null"}]}))
    for mid, name in [("gastric-resection", "胃癌根治报告"),
                       ("colorectal-resection", "结直肠癌根治报告"),
                       ("prostate-biopsy", "前列腺穿刺报告"),
                       ("prostate-radical", "前列腺根治报告"),
                       ("lung-resection", "肺癌切除报告"),
                       ("liver-resection", "肝切除报告"),
                       ("pancreatic-resection", "胰腺切除报告"),
                       ("endometrial-resection", "子宫内膜癌根治报告"),
                       ("ovarian-resection", "卵巢癌减灭报告"),
                       ("melanoma-excision", "黑色素瘤切除报告"),
                       ("soft-tissue-resection", "软组织肉瘤切除报告"),
                       ("lymphoma-diagnostic", "淋巴瘤诊断报告"),
                       ("bladder-cystectomy", "膀胱根治报告"),
                       ("kidney-nephrectomy", "肾切除报告")]:
        tasks.append(task(
            targetType="synoptic",
            targetFile="data/synoptic-templates.json",
            targetId=mid, targetNameZh=name,
            dimension="synoptic_new_entry",
            requested=f"新增「{name}」模板",
            outputSchema={"id": "string", "capProtocol": "string",
                          "sections": [{}]}))

    # ---------- cross-module ----------
    for cid, name, desc in [
        ("xref-diseases-molecular", "跨表引用-分子", "disease.molecularFeatures ↔ molecular.json"),
        ("xref-diseases-markers", "跨表引用-IHC", "disease.ihcProfile ↔ markers.abbreviation"),
        ("xref-diff-flowchart", "鉴别-流程图配对", "differentials ↔ flowcharts"),
        ("xref-case-synoptic", "病例-模板", "case diagnosis ↔ synoptic"),
        ("i18n-en-coverage", "英文字段覆盖", "nameZh ↔ nameEn"),
        ("schema-validation", "JSON Schema 校验", "为每个 data/*.json 写 schema"),
        ("image-licensing", "图片版权元数据", "新增图片 source/license 字段"),
        ("cn-guideline-registry", "国内指南注册表",
         "建立 data/cn-guidelines.json 集中维护"),
    ]:
        tasks.append(task(
            targetType="cross", targetFile=None,
            targetId=cid, targetNameZh=name,
            dimension="cross_integrity", requested=desc))

    return tasks


def main() -> int:
    tasks = build()
    dim_cnt = Counter(t["dimension"] for t in tasks)
    type_cnt = Counter(t["targetType"] for t in tasks)
    doc = {
        "generatedAt": __import__("datetime").date.today().isoformat(),
        "totalTasks": len(tasks),
        "byDimension": dict(dim_cnt),
        "byTargetType": dict(type_cnt),
        "tasks": tasks,
    }
    with OUT.open("w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
    print(f"Wrote {OUT} with {len(tasks)} tasks")
    print("\nBy dimension (top 15):")
    for k, v in sorted(dim_cnt.items(), key=lambda x: -x[1])[:15]:
        print(f"  {k:<32} {v}")
    return 0


if __name__ == "__main__":
    import sys as _s
    _s.exit(main())
