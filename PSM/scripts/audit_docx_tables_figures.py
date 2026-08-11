import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

path = Path(r"c:\Users\Admin\Downloads\report fyp 1.docx")
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def get_text(elem):
    parts = []
    for t in elem.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t"):
        if t.text:
            parts.append(t.text)
        if t.tail:
            parts.append(t.tail)
    return re.sub(r"\s+", " ", "".join(parts)).strip()


def is_bold(p):
    for r in p.findall("w:r", ns):
        rpr = r.find("w:rPr", ns)
        if rpr is not None and rpr.find("w:b", ns) is not None:
            return True
    return False


with zipfile.ZipFile(path) as z:
    root = ET.fromstring(z.read("word/document.xml"))

sequence = []
for child in root.find("w:body", ns):
    tag = child.tag.split("}")[-1]
    if tag == "p":
        sequence.append(("p", get_text(child), is_bold(child)))
    elif tag == "tbl":
        sequence.append(("tbl", None, False))

issues = []
body_table_caps = {}
body_figure_caps = {}

for i, (kind, text, bold) in enumerate(sequence):
    if kind != "p" or not text:
        continue
    mt = re.match(r"^Table\s+(\d+\.\d+)\s*:\s*(.+)$", text, re.I)
    mf = re.match(r"^Figure\s+(\d+\.\d+)\s*:\s*(.+)$", text, re.I)
    if mt:
        num, title = mt.group(1), mt.group(2)
        next_kind = sequence[i + 1][0] if i + 1 < len(sequence) else None
        if num in body_table_caps:
            issues.append(f"DUPLICATE table caption in body: Table {num}")
        body_table_caps[num] = title
        if next_kind != "tbl":
            issues.append(f"Table {num} caption NOT immediately before table (next={next_kind})")
        if not bold:
            issues.append(f"Table {num} caption may not be bold")
        if re.search(r"\d{1,3}$", title.strip()):
            issues.append(f"Table {num} title has page number glued: {title[:60]}")
    if mf:
        num, title = mf.group(1), mf.group(2)
        prev_kind = sequence[i - 1][0] if i > 0 else None
        if num in body_figure_caps:
            issues.append(f"DUPLICATE figure caption in body: Figure {num}")
        body_figure_caps[num] = title
        if prev_kind == "tbl":
            issues.append(f"Figure {num} caption immediately after TABLE")
        if not bold:
            issues.append(f"Figure {num} caption may not be bold")
        if re.search(r"\d{1,3}$", title.strip()):
            issues.append(f"Figure {num} title has page number glued: {title[:60]}")

in_lot = False
lot = []
lof = []
for kind, text, _ in sequence:
    if kind != "p" or not text:
        continue
    u = text.strip().upper()
    if u == "LIST OF TABLES":
        in_lot = "tables"
        continue
    if u == "LIST OF FIGURES":
        in_lot = "figures"
        continue
    if in_lot and re.match(r"^(CHAPTER|ABSTRACT|LIST OF|APPENDIX|REFERENCES)", text, re.I):
        in_lot = False
    if in_lot == "tables" and re.match(r"^Table\s+\d+\.\d+", text, re.I):
        lot.append(re.sub(r"\d{1,3}$", "", text.strip()).strip())
    if in_lot == "figures" and re.match(r"^Figure\s+\d+\.\d+", text, re.I):
        lof.append(re.sub(r"\d{1,3}$", "", text.strip()).strip())

lot_unique = []
for x in lot:
    if x not in lot_unique:
        lot_unique.append(x)
lof_unique = []
for x in lof:
    if x not in lof_unique:
        lof_unique.append(x)

lot_dict = {}
for e in lot_unique:
    m = re.match(r"^Table\s+(\d+\.\d+)\s*:\s*(.+)$", e, re.I)
    if m:
        lot_dict[m.group(1)] = m.group(2)

lof_dict = {}
for e in lof_unique:
    m = re.match(r"^Figure\s+(\d+\.\d+)\s*:\s*(.+)$", e, re.I)
    if m:
        lof_dict[m.group(1)] = m.group(2)

print("BODY TABLES:", len(body_table_caps), "| BODY FIGURES:", len(body_figure_caps))
print("LOT entries:", len(lot_unique), "| LOF entries:", len(lof_unique))
print("Total <tbl> elements:", sum(1 for k, _, _ in sequence if k == "tbl"))

print("\n=== LOT vs BODY TABLE ===")
for num in sorted(set(body_table_caps) | set(lot_dict), key=lambda x: [int(p) for p in x.split(".")]):
    if num not in body_table_caps:
        print(f"  LOT only: Table {num}: {lot_dict[num][:55]}")
    elif num not in lot_dict:
        print(f"  Body only: Table {num}: {body_table_caps[num][:55]}")
    elif body_table_caps[num].lower().strip() != lot_dict[num].lower().strip():
        print(f"  Mismatch Table {num}:")
        print(f"    Body: {body_table_caps[num][:65]}")
        print(f"    LOT:  {lot_dict[num][:65]}")

print("\n=== LOF vs BODY FIGURE ===")
for num in sorted(set(body_figure_caps) | set(lof_dict), key=lambda x: [int(p) for p in x.split(".")]):
    if num not in body_figure_caps:
        print(f"  LOF only: Figure {num}: {lof_dict[num][:55]}")
    elif num not in lof_dict:
        print(f"  Body only: Figure {num}: {body_figure_caps[num][:55]}")
    elif body_figure_caps[num].lower().strip() != lof_dict[num].lower().strip():
        print(f"  Mismatch Figure {num}:")
        print(f"    Body: {body_figure_caps[num][:65]}")
        print(f"    LOF:  {lof_dict[num][:65]}")

print("\n=== CH3 FIGURE ORDER CHECK ===")
ch3 = [(k, v) for k, v in sorted(body_figure_caps.items(), key=lambda x: [int(p) for p in x[0].split(".")]) if k.startswith("3.")]
for k, v in ch3:
    print(f"  Figure {k}: {v}")

print("\n=== ISSUES ===")
for x in issues:
    print(" ", x)
print("Total:", len(issues))
