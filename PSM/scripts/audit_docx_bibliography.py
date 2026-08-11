"""Check REFERENCES list vs in-text citations in report fyp 1.docx"""
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

paragraphs = []
for child in root.find("w:body", ns):
    if child.tag.split("}")[-1] == "p":
        paragraphs.append(get_text(child))

full_text = "\n".join(paragraphs)

# Split REFERENCES section
ref_start = None
for i, p in enumerate(paragraphs):
    if re.match(r"^REFERENCES\s*$", p.strip(), re.I):
        ref_start = i
        break

body_paras = paragraphs[:ref_start] if ref_start else paragraphs
ref_paras = paragraphs[ref_start + 1 :] if ref_start else []
body_text = "\n".join(body_paras).lower()
ref_text = "\n".join(ref_paras)

# Parse reference entries: Author et al. (year) or Author (year) at line start
ref_entries = []
for p in ref_paras:
    p = p.strip()
    if not p or len(p) < 20:
        continue
    # Skip subheadings
    if re.match(r"^(references|bibliography)\s*$", p, re.I):
        continue
    m = re.match(r"^([A-Z][A-Za-z\-]+(?:\s+et\s+al\.)?)", p)
    if m:
        author = m.group(1).strip()
        year_m = re.search(r"\((\d{4})\)", p)
        year = year_m.group(1) if year_m else "?"
        ref_entries.append({"line": p[:120], "author": author, "year": year, "raw": p})

# Also extract author (year) from reference lines for matching
def cite_patterns(author, year):
    patterns = []
    base = author.replace(" et al.", "").strip()
    surname = base.split()[-1] if base else author
    patterns.append(rf"\b{re.escape(author)}\s*\(\s*{year}\s*\)")
    patterns.append(rf"\b{re.escape(surname)}\s+et\s+al\.\s*\(\s*{year}\s*\)")
    patterns.append(rf"\b{re.escape(surname)}\s*\(\s*{year}\s*\)")
    if "et al" in author.lower():
        patterns.append(rf"\b{re.escape(surname)}\s+et\s+al\.\s*\(\s*{year}\s*\)")
    return patterns


print("=" * 60)
print("BIBLIOGRAPHY CITATION CHECK")
print("=" * 60)
if not ref_start:
    print("WARNING: No REFERENCES section found in document.")
else:
    print(f"REFERENCES section starts at paragraph {ref_start}")
    print(f"Reference entries parsed: {len(ref_entries)}")

uncited = []
cited = []
for entry in ref_entries:
    found = False
    for pat in cite_patterns(entry["author"], entry["year"]):
        if re.search(pat, body_text, re.I):
            found = True
            break
    # Special: Kak Norie primary data
    if "kak norie" in entry["raw"].lower():
        if "appendix b" in body_text or "google form" in body_text or "kak norie" in body_text:
            found = True
    if found:
        cited.append(entry)
    else:
        uncited.append(entry)

print(f"\nCited in body (author-year match): {len(cited)}")
print(f"NOT cited in body: {len(uncited)}")
if uncited:
    print("\n--- Uncited references (in list but no in-text citation found) ---")
    for e in uncited:
        print(f"  • {e['author']} ({e['year']})")
        print(f"    {e['line']}...")

# Reverse: in-text citations not in reference list
cite_in_body = set()
for m in re.finditer(r"\b([A-Z][a-zA-Z\-]+(?:\s+et\s+al\.)?)\s*\(\s*(\d{4})\s*\)", "\n".join(body_paras)):
    cite_in_body.add((m.group(1).strip(), m.group(2)))

ref_keys = set()
for e in ref_entries:
    ref_keys.add((e["author"].replace(" et al.", " et al.").strip(), e["year"]))
    surname = e["author"].replace(" et al.", "").split()[-1]
    ref_keys.add((surname, e["year"]))
    ref_keys.add((f"{surname} et al.", e["year"]))

orphan_cites = []
for author, year in sorted(cite_in_body):
    ok = False
    for e in ref_entries:
        if e["year"] != year:
            continue
        if author.lower() in e["author"].lower() or author.split()[0].lower() in e["author"].lower():
            ok = True
            break
        if author.replace(" et al.", "").split()[-1].lower() in e["raw"].lower():
            ok = True
            break
    if not ok:
        orphan_cites.append((author, year))

print("\n--- In-text citations that may be missing from REFERENCES ---")
if orphan_cites:
    for a, y in orphan_cites:
        print(f"  • {a} ({y})")
else:
    print("  None detected (author-year scan).")

# Chapter completeness
print("\n" + "=" * 60)
print("CHAPTER / STRUCTURE CHECK")
print("=" * 60)
chapters = []
for p in paragraphs:
    m = re.match(r"^CHAPTER\s+(\d+)\s*[\.:]\s*(.+)$", p.strip(), re.I)
    if m:
        chapters.append((int(m.group(1)), m.group(2).strip()))

for num, title in chapters:
    print(f"  Chapter {num}: {title}")

expected = {1, 2, 3, 4, 5, 6, 7}
found = {c[0] for c in chapters}
missing = expected - found
if missing:
    print(f"\nMISSING chapters: {sorted(missing)}")

# Methodology red flags
print("\n" + "=" * 60)
print("METHODOLOGY / TERMINOLOGY FLAGS")
print("=" * 60)
flags = [
    (r"\binterview\b", "Use 'questionnaire response' not 'interview'"),
    (r"supplementary\s+whatsapp", "WhatsApp is first contact, not supplementary"),
    (r"whatsapp\s+follow[- ]?up", "Wrong sequence — WhatsApp first, then Form"),
    (r"google\s+form\s+first", "Wrong sequence"),
    (r"table\s+2\.5\b.*schedule", "Table 2.5 may be research approach, not schedule"),
    (r"\bQDTS\s+v2\b", "Use QDTS only"),
    (r"native\s+pdf\s+generation", "OK if saying NOT included"),
]
body_joined = "\n".join(body_paras)
for pat, msg in flags:
    matches = list(re.finditer(pat, body_joined, re.I))
    if matches:
        print(f"  [{len(matches)}x] {msg}")
        for m in matches[:2]:
            start = max(0, m.start() - 40)
            snippet = body_joined[start : m.start() + 60].replace("\n", " ")
            print(f"       ...{snippet}...")
