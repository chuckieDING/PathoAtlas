"""Pending-resources auditor.

Walks data/ and surfaces every entry that is missing one of:
  - sourceUrl (canonical source page)
  - viewUrl (downloadable PDF / HTML article)
  - actual image file on disk for a referenced image URL

The output is two files:
  - docs/pending-resources.md     human-readable, grouped, with
                                  admin-edit anchors when known
  - docs/pending-resources.json   machine-readable, same data flat

Run from repo root:
    python3 scripts/enhance/pending_resources.py            # write both
    python3 scripts/enhance/pending_resources.py --summary  # just totals
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
PUBLIC_DIR = ROOT / "public"
OUT_MD = ROOT / "docs" / "pending-resources.md"
OUT_JSON = ROOT / "docs" / "pending-resources.json"

# Severity mapping: how badly the user experience suffers when this is missing
SEV_HIGH = "🔴"     # blocking — user clicks button, nothing happens
SEV_MED = "🟡"      # degraded — content is there but no canonical link
SEV_LOW = "🟢"      # nice-to-have — internal note / metadata


def is_image_on_disk(url: str | None) -> bool:
    """Check if a /-rooted URL maps to an existing file under public/."""
    if not url or not url.startswith("/"):
        return False
    candidate = PUBLIC_DIR / url.lstrip("/")
    return candidate.is_file()


def add(items: list, sev: str, where: str, what: str, hint: str = ""):
    items.append({"sev": sev, "where": where, "what": what, "hint": hint})


# --- per-file collectors ---------------------------------------------


def scan_diseases() -> tuple[list, Counter]:
    items: list = []
    counts: Counter = Counter()
    for fn in sorted((DATA_DIR / "diseases").glob("*.json")):
        organ = fn.stem
        for d in json.load(fn.open(encoding="utf-8")):
            did = d.get("id")
            base = f"data/diseases/{organ}.json::{did}"
            for i, c in enumerate(d.get("expertConsensus") or []):
                if not c.get("sourceUrl"):
                    add(items, SEV_MED, f"{base}.expertConsensus[{i}]",
                        "缺 sourceUrl", c.get("title", "")[:60])
                    counts["disease.expertConsensus.sourceUrl"] += 1
                if not c.get("viewUrl"):
                    add(items, SEV_HIGH, f"{base}.expertConsensus[{i}]",
                        "缺 viewUrl (无可阅览 PDF)", c.get("title", "")[:60])
                    counts["disease.expertConsensus.viewUrl"] += 1
            for i, lit in enumerate(d.get("literature") or []):
                if not lit.get("sourceUrl"):
                    add(items, SEV_MED, f"{base}.literature[{i}]",
                        "缺 sourceUrl", lit.get("title", "")[:60])
                    counts["disease.literature.sourceUrl"] += 1
                if not lit.get("viewUrl"):
                    add(items, SEV_HIGH, f"{base}.literature[{i}]",
                        "缺 viewUrl (无可阅览 PDF)", lit.get("title", "")[:60])
                    counts["disease.literature.viewUrl"] += 1
            for i, img in enumerate(d.get("images") or []):
                url = img.get("url")
                if url and not is_image_on_disk(url):
                    add(items, SEV_HIGH, f"{base}.images[{i}]",
                        f"图片文件不存在：{url}", img.get("caption", "")[:60])
                    counts["disease.images.missing_file"] += 1
    return items, counts


def scan_markers() -> tuple[list, Counter]:
    items: list = []
    counts: Counter = Counter()
    for m in json.load((DATA_DIR / "markers.json").open(encoding="utf-8")):
        mid = m.get("id")
        base = f"data/markers.json::{mid}"
        for i, c in enumerate(m.get("expertConsensus") or []):
            if not c.get("sourceUrl"):
                add(items, SEV_MED, f"{base}.expertConsensus[{i}]",
                    "缺 sourceUrl", c.get("title", "")[:60])
                counts["marker.expertConsensus.sourceUrl"] += 1
            if not c.get("viewUrl"):
                add(items, SEV_HIGH, f"{base}.expertConsensus[{i}]",
                    "缺 viewUrl (无可阅览 PDF)", c.get("title", "")[:60])
                counts["marker.expertConsensus.viewUrl"] += 1
        for i, lit in enumerate(m.get("literature") or []):
            if not lit.get("sourceUrl"):
                add(items, SEV_MED, f"{base}.literature[{i}]",
                    "缺 sourceUrl", lit.get("title", "")[:60])
                counts["marker.literature.sourceUrl"] += 1
            if not lit.get("viewUrl"):
                add(items, SEV_HIGH, f"{base}.literature[{i}]",
                    "缺 viewUrl (无可阅览 PDF)", lit.get("title", "")[:60])
                counts["marker.literature.viewUrl"] += 1
        for i, si in enumerate(m.get("stainingImages") or []):
            if not si.get("images"):
                add(items, SEV_MED, f"{base}.stainingImages[{i}]",
                    f"染色状态未配图（{si.get('label', '?')}）",
                    si.get("description", "")[:60])
                counts["marker.stainingImages.empty"] += 1
    return items, counts


def scan_cases() -> tuple[list, Counter]:
    items: list = []
    counts: Counter = Counter()
    for c in json.load((DATA_DIR / "cases.json").open(encoding="utf-8")):
        cid = c.get("id")
        base = f"data/cases.json::{cid}"
        enh = c.get("_enhance_case_images") or {}
        for i, img in enumerate(enh.get("images") or []):
            url = img.get("url")
            if url and not is_image_on_disk(url):
                add(items, SEV_MED,
                    f"{base}.case_images[{i}]",
                    f"图片文件不存在：{url}",
                    f"[{img.get('type', '?')}] " + img.get("caption", "")[:60])
                counts["case.images.missing_file"] += 1
    return items, counts


def scan_special_stains() -> tuple[list, Counter]:
    items: list = []
    counts: Counter = Counter()
    for s in json.load((DATA_DIR / "special-stains.json").open(encoding="utf-8")):
        sid = s.get("id")
        base = f"data/special-stains.json::{sid}"
        enh = s.get("_enhance_special_stain_images") or {}
        for i, img in enumerate(enh.get("images") or []):
            url = img.get("url")
            if url and not is_image_on_disk(url):
                add(items, SEV_MED,
                    f"{base}.images[{i}]",
                    f"图片文件不存在：{url}",
                    img.get("caption", "")[:60])
                counts["special_stain.images.missing_file"] += 1
        if not enh.get("cnReagentVendors"):
            add(items, SEV_LOW,
                f"{base}",
                "缺国内试剂厂家清单",
                s.get("nameZh", ""))
            counts["special_stain.cn_vendors"] += 1
    return items, counts


def scan_frozen() -> tuple[list, Counter]:
    items: list = []
    counts: Counter = Counter()
    for f in json.load((DATA_DIR / "frozen-sections.json").open(encoding="utf-8")):
        fid = f.get("id")
        base = f"data/frozen-sections.json::{fid}"
        enh = f.get("_enhance_frozen_pitfall_image") or {}
        for i, img in enumerate(enh.get("pitfallImages") or []):
            url = img.get("url")
            if url and not is_image_on_disk(url):
                add(items, SEV_MED,
                    f"{base}.pitfallImages[{i}]",
                    f"图片文件不存在：{url}",
                    f"[{img.get('trapType', '?')}] " + img.get("caption", "")[:60])
                counts["frozen.pitfall_images.missing_file"] += 1
    return items, counts


def scan_cytology() -> tuple[list, Counter]:
    items: list = []
    counts: Counter = Counter()
    for c in json.load((DATA_DIR / "cytology.json").open(encoding="utf-8")):
        cid = c.get("id")
        base = f"data/cytology.json::{cid}"
        enh = c.get("_enhance_cytology_category_images") or {}
        for i, img in enumerate(enh.get("categoryImages") or []):
            url = img.get("url")
            if url and not is_image_on_disk(url):
                add(items, SEV_MED,
                    f"{base}.categoryImages[{i}]",
                    f"图片文件不存在：{url}",
                    f"[{img.get('categoryId', '?')}] " + img.get("caption", "")[:60])
                counts["cytology.category_images.missing_file"] += 1
    return items, counts


# --- main --------------------------------------------------------------


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--summary", action="store_true",
                    help="Print only the totals to stdout")
    args = ap.parse_args()

    all_items: list = []
    all_counts: Counter = Counter()
    for scanner in (scan_diseases, scan_markers, scan_cases,
                    scan_special_stains, scan_frozen, scan_cytology):
        items, counts = scanner()
        all_items.extend(items)
        all_counts.update(counts)

    sev_counts = Counter(it["sev"] for it in all_items)

    if args.summary:
        print("Pending resources by category:")
        for k, v in all_counts.most_common():
            print(f"  {k:<48} {v}")
        print(f"\nBy severity: 🔴 {sev_counts.get(SEV_HIGH, 0)}  "
              f"🟡 {sev_counts.get(SEV_MED, 0)}  "
              f"🟢 {sev_counts.get(SEV_LOW, 0)}  "
              f"= {len(all_items)} items")
        return 0

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(
        json.dumps({"counts": dict(all_counts), "items": all_items},
                   ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # Group by file path for the markdown
    by_file: dict[str, list[dict]] = defaultdict(list)
    for it in all_items:
        file_part = it["where"].split("::")[0]
        by_file[file_part].append(it)

    md = [
        "# 待补充资源清单",
        "",
        f"_当前共 **{len(all_items)}** 处待补充_  "
        f"🔴 阻塞 {sev_counts.get(SEV_HIGH, 0)} ·  "
        f"🟡 降级 {sev_counts.get(SEV_MED, 0)} ·  "
        f"🟢 元数据 {sev_counts.get(SEV_LOW, 0)}",
        "",
        "## 按类别汇总",
        "",
        "| 类别 | 数量 |",
        "|---|---:|",
    ]
    for k, v in all_counts.most_common():
        md.append(f"| `{k}` | {v} |")

    md += [
        "",
        "## 严重程度图例",
        "",
        "- 🔴 **阻塞**：用户点击「在线阅览」会显示灰色不可点 → 体验缺失",
        "- 🟡 **降级**：内容存在，但无官方源链接 → 用户可看不可溯",
        "- 🟢 **元数据**：仅缺辅助信息（试剂厂家等），不影响主流程",
        "",
        "## 修补指南",
        "",
        "1. **补 sourceUrl**：编辑 `data/<file>` 找到 `id`，加 `sourceUrl: 'https://...'`",
        "2. **补 viewUrl + PDF**：把 PDF 放进 `public/uploads/<scope>/`，再 `viewUrl: '/uploads/<scope>/file.pdf'`",
        "3. **补图片**：把 SVG/JPG/PNG 放在 `public/<dir>/<filename>`（路径与 url 字段一致）",
        "4. 或用 admin UI：`http://localhost:3000/admin` → 找到对应记录 → 上传 PDF / 输入 URL",
        "",
        "## 详细清单",
        "",
    ]

    for file_path, file_items in sorted(by_file.items()):
        md.append(f"### `{file_path}` — {len(file_items)} 处")
        md.append("")
        # Compact table
        md.append("| 严重 | 位置 | 缺什么 | 提示 |")
        md.append("|---|---|---|---|")
        for it in file_items[:50]:
            loc = it["where"][len(file_path) + 2:]  # strip 'file::' prefix
            hint = (it.get("hint") or "").replace("|", "\\|")
            md.append(f"| {it['sev']} | `{loc}` | {it['what']} | {hint} |")
        if len(file_items) > 50:
            md.append(f"| … | _and {len(file_items) - 50} more_ | | |")
        md.append("")

    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text("\n".join(md), encoding="utf-8")

    print(f"Wrote {OUT_MD.relative_to(ROOT)}")
    print(f"Wrote {OUT_JSON.relative_to(ROOT)}")
    print(f"Total: {len(all_items)} items "
          f"(🔴 {sev_counts.get(SEV_HIGH, 0)}  "
          f"🟡 {sev_counts.get(SEV_MED, 0)}  "
          f"🟢 {sev_counts.get(SEV_LOW, 0)})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
