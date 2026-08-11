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


with zipfile.ZipFile(path) as z:
    root = ET.fromstring(z.read("word/document.xml"))

sequence = []
for child in root.find("w:body", ns):
    tag = child.tag.split("}")[-1]
    if tag == "p":
        sequence.append(("p", get_text(child)))
    elif tag == "tbl":
        sequence.append(("tbl", "[TABLE]"))

# Skip front matter for body analysis - start from CHAPTER 1
start_idx = 0
for i, (_, text) in enumerate(sequence):
    if re.match(r"^CHAPTER\s+1\b", text.strip(), re.I):
        start_idx = i
        break

body = sequence[start_idx:]

# Find caption positions (second occurrence in body = real caption, skip LOT if before ch1)
table_caption_pos = {}
figure_caption_pos = {}
in_lot = False
in_lof = False
chapter = None

for i, (kind, text) in enumerate(body):
    if not text:
        continue
    u = text.strip().upper()
    if re.match(r"^CHAPTER\s+(\d+)", text.strip(), re.I):
        chapter = int(re.match(r"^CHAPTER\s+(\d+)", text.strip(), re.I).group(1))
    if u == "LIST OF TABLES":
        in_lot = True
        in_lof = False
        continue
    if u == "LIST OF FIGURES":
        in_lof = True
        in_lot = False
        continue
    if in_lot and re.match(r"^CHAPTER\s+\d", text, re.I):
        in_lot = False
    if in_lof and re.match(r"^CHAPTER\s+\d", text, re.I):
        in_lof = False

    if in_lot or in_lof:
        continue

    mt = re.match(r"^Table\s+(\d+\.\d+)\s*:", text, re.I)
    mf = re.match(r"^Figure\s+(\d+\.\d+)\s*:", text, re.I)
    if mt:
        num = mt.group(1)
        # keep last caption in body (real one near table)
        table_caption_pos[num] = i
    if mf:
        num = mf.group(1)
        figure_caption_pos[num] = i


def find_refs_before(pos, label):
    """Find all in-text refs to label before position pos."""
    pattern = re.compile(rf"\b{label}\s+(\d+\.\d+)\b", re.I)
    refs = {}
    for i in range(pos):
        _, text = body[i]
        if not text:
            continue
        # skip if this line IS the caption itself
        if re.match(rf"^{label}\s+\d+\.\d+\s*:", text.strip(), re.I):
            continue
        for m in pattern.finditer(text):
            num = m.group(1)
            if num not in refs:
                refs[num] = i
    return refs


# All refs in document (anywhere before caption)
def first_ref_pos(num, label, cap_pos):
    pattern = re.compile(rf"\b{label}\s+{re.escape(num)}\b", re.I)
    for i in range(cap_pos):
        _, text = body[i]
        if not text:
            continue
        if re.match(rf"^{label}\s+{re.escape(num)}\s*:", text.strip(), re.I):
            continue
        if pattern.search(text):
            return i
    return None


print("=" * 60)
print("TABLE REFERENCE CHECK (body chapters only)")
print("=" * 60)
table_issues = []
for num in sorted(table_caption_pos, key=lambda x: [int(p) for p in x.split(".")]):
    pos = table_caption_pos[num]
    ref_pos = first_ref_pos(num, "Table", pos)
    if ref_pos is None:
        table_issues.append((num, "NEVER referred in text before caption"))
    elif ref_pos > pos:
        table_issues.append((num, "Referenced AFTER caption (wrong order)"))
    else:
        pass  # OK

if not table_issues:
    print("All captioned tables have in-text reference BEFORE caption.")
else:
    for num, msg in table_issues:
        print(f"  Table {num}: {msg}")

print(f"\nCaptioned tables in body: {len(table_caption_pos)}")
print(f"Tables with issues: {len(table_issues)}")

print("\n" + "=" * 60)
print("FIGURE REFERENCE CHECK (body chapters only)")
print("=" * 60)
figure_issues = []
for num in sorted(figure_caption_pos, key=lambda x: [int(p) for p in x.split(".")]):
    pos = figure_caption_pos[num]
    ref_pos = first_ref_pos(num, "Figure", pos)
    if ref_pos is None:
        figure_issues.append((num, "NEVER referred in text before caption"))
    elif ref_pos > pos:
        figure_issues.append((num, "Referenced AFTER caption (wrong order)"))
    else:
        pass

if not figure_issues:
    print("All captioned figures have in-text reference BEFORE caption.")
else:
    for num, msg in figure_issues:
        print(f"  Figure {num}: {msg}")

print(f"\nCaptioned figures in body: {len(figure_caption_pos)}")
print(f"Figures with issues: {len(figure_issues)}")

# Also list which ARE referenced (summary)
print("\n" + "=" * 60)
print("DETAIL: first reference status per item")
print("=" * 60)
for label, caps, issues in [
    ("Table", table_caption_pos, table_issues),
    ("Figure", figure_caption_pos, figure_issues),
]:
    issue_nums = {x[0] for x in issues}
    for num in sorted(caps, key=lambda x: [int(p) for p in x.split(".")]):
        status = "MISSING REF" if num in issue_nums else "OK (referred before)"
        print(f"  {label} {num}: {status}")

# Find refs to tables/figures that don't exist as captions
print("\n" + "=" * 60)
print("ORPHAN IN-TEXT REFERENCES (ref but no caption in body)")
print("=" * 60)
all_cap_nums = set(table_caption_pos) | set(figure_caption_pos)
ref_pattern = re.compile(r"\b(Table|Figure)\s+(\d+\.\d+)\b", re.I)
orphans = {}
for i, (_, text) in enumerate(body):
    if not text or re.match(r"^(LIST OF TABLES|LIST OF FIGURES)", text, re.I):
        continue
    for m in ref_pattern.finditer(text):
        kind, num = m.group(1).title(), m.group(2)
        key = f"{kind} {num}"
        if num not in (table_caption_pos if kind == "Table" else figure_caption_pos):
            orphans.setdefault(key, []).append(text[:90])

for key in sorted(orphans, key=lambda x: [int(p.split()[1].split(".")[0]) for p in [x]][0]):
    print(f"  {key}: referenced but caption missing?")
    print(f"    e.g. \"{orphans[key][0]}...\"")

# Sample lines with first refs for missing ones
print("\n" + "=" * 60)
print("SUGGESTED: add intro sentence before these (missing refs)")
print("=" * 60)
for num, msg in table_issues + figure_issues:
    if "NEVER" in msg:
        kind = "Table" if num in table_caption_pos else "Figure"
        print(f"  Before {kind} {num}, add e.g.:")
        print(f'    \"{kind} {num} summarises ...\"')
