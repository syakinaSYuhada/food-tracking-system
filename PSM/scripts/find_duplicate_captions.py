import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict

path = Path(r"c:\Users\Admin\Downloads\report fyp 1.docx")
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def gt(elem):
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
        sequence.append(("p", gt(child)))
    elif tag == "tbl":
        sequence.append(("tbl", "[TABLE]"))

lot_start = lot_end = None
for i, (_, t) in enumerate(sequence):
    if t.strip().upper() == "LIST OF TABLES":
        lot_start = i
    if lot_start and t.strip().upper() == "LIST OF FIGURES":
        lot_end = i
        break

captions = defaultdict(list)
for i, (kind, text) in enumerate(sequence):
    if kind != "p" or not text:
        continue
    m = re.match(r"^Table\s+(\d+\.\d+)\s*:", text.strip(), re.I)
    if not m:
        continue
    num = m.group(1)
    if lot_start is not None and lot_end is not None and lot_start < i < lot_end:
        section = "LIST_OF_TABLES"
    elif lot_start is not None and i > lot_end:
        section = "BODY"
    else:
        section = "FRONT_MATTER"
    nxt = sequence[i + 1][0] if i + 1 < len(sequence) else None
    captions[num].append(
        {
            "i": i,
            "section": section,
            "above_table": nxt == "tbl",
            "text": text[:80],
        }
    )

print("DUPLICATE TABLE CAPTIONS — WHERE THEY ARE")
print("=" * 72)
for num in sorted(captions, key=lambda x: [int(p) for p in x.split(".")]):
    occ = captions[num]
    if len(occ) < 2:
        continue
    print(f"\nTable {num} ({len(occ)} times):")
    for j, o in enumerate(occ, 1):
        flag = "YES - real caption" if o["above_table"] else "NO - orphan/duplicate line"
        print(f"  {j}. [{o['section']}] paragraph index {o['i']}")
        print(f"     Directly above table? {flag}")
        print(f"     Text: {o['text']}")

print("\n" + "=" * 72)
print("ACTION GUIDE")
print("=" * 72)
print("LIST_OF_TABLES entries (front matter): KEEP — do not delete.")
print("In each chapter: KEEP only the caption line directly ABOVE the table.")
print("DELETE any second caption in BODY that is NOT directly above a table.\n")

body_dups = 0
for num, occ in captions.items():
    body = [o for o in occ if o["section"] == "BODY"]
    if len(body) > 1:
        body_dups += 1
        print(f"Table {num}: {len(body)} captions in body — delete extras without table below")

if body_dups == 0:
    print("No true duplicate captions inside chapter body.")
    print("The '23 duplicates' warning = List of Tables + chapter captions (normal Word setup).")
    print("Optional: if caption is NOT directly above table, move it — see 'NO - orphan' lines above.")
