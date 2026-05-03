#!/usr/bin/env python3
"""
Build resume_chunks.json from canonical-profile.md for a resume-aware RAG system.

This script is intentionally dependency-free so it can run in a simple project,
CI job, or local Python environment.

Usage:
  python scripts/build_chunks.py \
    --input data/canonical-profile.md \
    --output data/resume_chunks.json
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

MAX_WORDS = 260
MIN_WORDS_TO_SPLIT = 330
OVERLAP_WORDS = 40

HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
FRONTMATTER_RE = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)
HORIZONTAL_RULE_RE = re.compile(r"^\s*---\s*$")


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "section"


def sha256_short(value: str, length: int = 12) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:length]


def normalize_text(text: str) -> str:
    """Remove Markdown horizontal rules and normalize excess blank lines."""
    lines = [line for line in text.splitlines() if not HORIZONTAL_RULE_RE.match(line)]
    cleaned = "\n".join(lines).strip()
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned


def parse_simple_frontmatter(markdown: str) -> tuple[dict[str, Any], str]:
    """
    Small YAML-ish parser for the simple frontmatter used in this file.

    For production YAML with nested objects, replace this with PyYAML.
    This dependency-free parser is enough for the current canonical profile.
    """
    match = FRONTMATTER_RE.match(markdown)
    if not match:
        return {}, markdown

    raw = match.group(1)
    body = markdown[match.end() :]
    metadata: dict[str, Any] = {}
    current_list_key: str | None = None

    for line in raw.splitlines():
        if not line.strip():
            continue

        if line.startswith("  - ") and current_list_key:
            metadata.setdefault(current_list_key, []).append(line[4:].strip())
            continue

        if ":" in line and not line.startswith(" "):
            key, val = line.split(":", 1)
            key = key.strip()
            val = val.strip()

            if val == "":
                metadata[key] = []
                current_list_key = key
            else:
                metadata[key] = val
                current_list_key = None

    return metadata, body


@dataclass
class Section:
    level: int
    title: str
    path: list[str]
    content: str


def parse_heading_sections(markdown_body: str) -> list[Section]:
    """
    Split Markdown into heading-based semantic sections.

    The section path follows Markdown heading nesting. Metadata inference later
    also uses numbering/title rules, so useful metadata still works even if a
    source file uses same-level numbered headings such as ## 5 and ## 5.1.
    """
    lines = markdown_body.splitlines()
    stack: list[tuple[int, str]] = []
    sections: list[Section] = []
    current_level = 0
    current_title = "Document Overview"
    current_path: list[str] = []
    buffer: list[str] = []

    def flush() -> None:
        text = normalize_text("\n".join(buffer))
        if text:
            sections.append(
                Section(
                    level=current_level,
                    title=current_title,
                    path=current_path.copy(),
                    content=text,
                )
            )

    for line in lines:
        match = HEADING_RE.match(line)
        if match:
            flush()
            buffer = []
            current_level = len(match.group(1))
            current_title = match.group(2).strip()

            while stack and stack[-1][0] >= current_level:
                stack.pop()
            stack.append((current_level, current_title))
            current_path = [title for _, title in stack]
        else:
            buffer.append(line)

    flush()
    return sections


def count_words(text: str) -> int:
    return len(re.findall(r"\b\S+\b", text))


def split_large_text(text: str, max_words: int = MAX_WORDS) -> list[str]:
    words = text.split()
    if len(words) <= MIN_WORDS_TO_SPLIT:
        return [text.strip()]

    chunks: list[str] = []
    start = 0

    while start < len(words):
        end = min(start + max_words, len(words))
        chunks.append(" ".join(words[start:end]).strip())

        if end == len(words):
            break

        start = max(0, end - OVERLAP_WORDS)

    return chunks


def context_blob(path: list[str], text: str) -> str:
    return (" > ".join(path) + "\n" + text).lower()


def infer_entity_type(path: list[str], text: str) -> str:
    blob = context_blob(path, text)

    if any(
        x in blob
        for x in [
            "tractor supply company",
            "southern california edison",
            "allstate corporation",
            "infosys ltd",
            "infosys limited",
            "consulting context",
            "enterprise client engagements",
            "tsc connect",
            "cma webview",
            "professional experience",
            "role metadata",
            "experience summary",
        ]
    ):
        return "professional_experience"

    if any(
        x in blob
        for x in [
            "resume-aware ai chatbot",
            "selected applied ai project",
            "independent project",
        ]
    ):
        return "project"

    if any(
        x in blob
        for x in [
            "research experience",
            "undergraduate researcher",
            "synthetic aperture radar",
            "hyperspectral imagery",
            "oil spill detection",
        ]
    ):
        return "research_experience"

    if "presentation" in blob or "engineering research symposium" in blob:
        return "presentation"

    if any(
        x in blob
        for x in [
            "education",
            "louisiana state university",
            "mississippi state university",
            "bachelor of science",
            "master of business administration",
        ]
    ):
        return "education"

    if any(
        x in blob
        for x in [
            "technical skills",
            "core expertise",
            "programming languages",
            "mobile and frontend",
            "backend and cloud",
            "testing and quality",
            "observability and performance",
        ]
    ):
        return "skills"

    if any(
        x in blob
        for x in [
            "certifications",
            "awards",
            "honors",
            "microsoft azure fundamentals",
            "infosys react professional",
        ]
    ):
        return "credential"

    if any(
        x in blob
        for x in [
            "persona",
            "response rules",
            "factual grounding",
            "do not invent",
            "fallback",
            "claim boundary",
            "claims to avoid",
            "retrieval and chunking guidance",
            "data maintenance rules",
        ]
    ):
        return "assistant_instruction"

    return "profile_context"


def infer_company(path: list[str], text: str) -> str | None:
    blob = " > ".join(path) + "\n" + text[:1200]
    companies = [
        "Tractor Supply Company",
        "Southern California Edison",
        "Allstate Corporation",
        "Infosys Ltd.",
        "Infosys Limited",
        "Mississippi State University",
        "Louisiana State University — Shreveport",
    ]
    for company in companies:
        if company in blob:
            return company
    return None


def infer_employer(path: list[str], text: str) -> str | None:
    blob = " > ".join(path) + "\n" + text[:1200].lower()
    if "infosys ltd." in blob or "infosys limited" in blob:
        return "Infosys Ltd."
    return None


def infer_product(path: list[str], text: str) -> str | None:
    blob = " > ".join(path) + "\n" + text[:1200]
    products = ["TSC Connect", "CMA WebView", "Resume-Aware AI Chatbot"]
    for product in products:
        if product in blob:
            return product
    return None


def infer_role(path: list[str], text: str) -> str | None:
    blob = " > ".join(path) + "\n" + text[:1200]
    roles = [
        "Technology Analyst / Software Engineer",
        "Associate Analyst",
        "Undergraduate Researcher",
    ]
    for role in roles:
        if role in blob:
            return role
    return None


def infer_date_range(path: list[str], text: str) -> str | None:
    blob = " > ".join(path) + "\n" + text[:1200]

    known_ranges = [
        "October 2019 – Present",
        "September 2024 – Present",
        "November 2020 – August 2024",
        "February 2020 – August 2020",
        "October 2019",
        "April 2018",
        "July 2025",
        "May 2019",
    ]

    for date_range in known_ranges:
        if date_range in blob:
            return date_range

    return None


def infer_tags(text: str, path: list[str]) -> list[str]:
    vocabulary = [
        "React Native",
        "React",
        "TypeScript",
        "JavaScript",
        "Kotlin",
        "Python",
        "TurboModules",
        "React Native New Architecture",
        "Bluetooth",
        "WebSocket",
        "Text-to-speech",
        "Audio recording",
        "Audio playback",
        "Android services",
        "Sensory",
        "Wake-word",
        "NLP",
        "GraphQL",
        "REST APIs",
        "WebView",
        "JWT",
        "CORS",
        "Dynatrace",
        "Quantum Metric",
        "Splunk",
        "Crashlytics",
        "Jest",
        "React Testing Library",
        "Vitest",
        "WCAG 2.1 AA",
        "WAVE",
        "Cloudflare Workers",
        "Cloudflare Pages",
        "Cloudflare KV",
        "Cloudflare R2",
        "OpenAI API",
        "Embeddings",
        "Retrieval-Augmented Generation",
        "RAG",
        "SAR imagery",
        "Hyperspectral imagery",
        "SVM",
        "Dimensionality reduction",
        "SiteCatalyst",
        "Postman",
        "Redux",
        "Redux-Saga",
        "React Router",
        "Tailwind CSS",
        "Jenkins",
        "GitHub Actions",
        "SonarQube",
    ]

    haystack = (" > ".join(path) + "\n" + text).lower()
    tags = []

    for item in vocabulary:
        if item.lower() in haystack:
            tags.append(item)

    return sorted(set(tags))


def infer_claim_sensitivity(text: str) -> str:
    if re.search(r"must not|do not invent|fallback|response rules", text, re.I):
        return "instructional"

    if re.search(
        r"preliminary|proposed|not completed|do not claim|claim boundary|claims to avoid",
        text,
        re.I,
    ):
        return "claim_boundary"

    if re.search(
        r"\bapproximately\b|\b\d+%\b|\b\d+\.\d+\b|\b\d{1,3}/\d{1,3}\b|\bGPA\b|\b2,000\+",
        text,
        re.I,
    ):
        return "metrics_present"

    return "standard"


def build_chunks(markdown: str, source_file: str = "canonical-profile.md") -> dict[str, Any]:
    frontmatter, body = parse_simple_frontmatter(markdown)
    sections = parse_heading_sections(body)

    chunks = []
    sequence = 1

    for section in sections:
        if not section.content.strip():
            continue

        pieces = split_large_text(section.content)

        for idx, piece in enumerate(pieces, start=1):
            section_path = section.path
            section_slug = slugify("-".join(section_path[-3:]))

            content_for_embedding = (
                f"Section path: {' > '.join(section_path)}\n\n" f"{piece.strip()}"
            ).strip()

            stable_basis = (
                f"{frontmatter.get('document_id', 'doc')}|"
                f"{frontmatter.get('version', '1.2.0')}|"
                f"{' > '.join(section_path)}|"
                f"{idx}|"
                f"{sha256_short(piece.strip(), 16)}"
            )
            chunk_id = f"dc-{sequence:04d}-{section_slug}-{sha256_short(stable_basis, 8)}"

            metadata = {
                "document_id": frontmatter.get(
                    "document_id", "deepak_chapagain_resume_rag_source_of_truth"
                ),
                "document_type": frontmatter.get(
                    "document_type", "canonical_profile_knowledge_base"
                ),
                "version": frontmatter.get("version", "1.0.0"),
                "owner": frontmatter.get("owner", "Deepak Chapagain"),
                "primary_employer": frontmatter.get("primary_employer"),
                "employment_start": frontmatter.get("employment_start"),
                "consulting_model": frontmatter.get("consulting_model"),
                "dataset_version": frontmatter.get("dataset_version"),
                "persona_mode": frontmatter.get("persona_mode", "first_person"),
                "source_file": source_file,
                "section_path": section_path,
                "section_title": section.title,
                "heading_level": section.level,
                "entity_type": infer_entity_type(section_path, piece),
                "company": infer_company(section_path, piece),
                "employer": infer_employer(section_path, piece),
                "product": infer_product(section_path, piece),
                "role": infer_role(section_path, piece),
                "date_range": infer_date_range(section_path, piece),
                "tags": infer_tags(piece, section_path),
                "claim_sensitivity": infer_claim_sensitivity(piece),
                "chunk_index": sequence,
                "part_index": idx,
                "word_count": count_words(piece),
                "content_hash": sha256_short(piece, 16),
            }

            chunks.append(
                {
                    "id": chunk_id,
                    "content": piece.strip(),
                    "content_for_embedding": content_for_embedding,
                    "metadata": metadata,
                }
            )
            sequence += 1

    return {
        "schema_version": "1.1.0",
        "generated_from": source_file,
        "chunking_strategy": {
            "type": "markdown_heading_semantic_chunks",
            "max_words": MAX_WORDS,
            "split_threshold_words": MIN_WORDS_TO_SPLIT,
            "overlap_words_for_large_sections": OVERLAP_WORDS,
            "preserve_heading_path": True,
            "embedding_text_includes_section_path": True,
            "horizontal_rules_removed": True,
            "metadata_inference": "heading_path_plus_content_rules",
        },
        "source_metadata": frontmatter,
        "chunk_count": len(chunks),
        "chunks": chunks,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to canonical Markdown profile")
    parser.add_argument("--output", required=True, help="Path to generated resume_chunks.json")
    args = parser.parse_args()

    input_path = Path(args.input)
    markdown = input_path.read_text(encoding="utf-8")
    result = build_chunks(markdown, source_file=input_path.name)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Generated {result['chunk_count']} chunks")
    print(f"Output: {output_path}")


if __name__ == "__main__":
    main()
