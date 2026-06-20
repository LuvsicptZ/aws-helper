from __future__ import annotations

from collections import Counter
from pathlib import Path
import json
import re

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "data" / "raw" / "AWS-SAA-C03.pdf"
EXTRACTED_TEXT_PATH = ROOT / "data" / "raw" / "extracted.txt"
QUESTIONS_PATH = ROOT / "data" / "questions.json"
REPORT_PATH = ROOT / "data" / "parse-report.json"
EXPECTED_QUESTION_COUNT = 1019
MANUAL_OPTION_OVERRIDES = {
    416: {
        "A": '{"Effect":"Allow","Action":"s3:DeleteObject","Resource":"arn:aws:s3:::bucket-name"}',
        "B": '{"Effect":"Allow","Action":"s3:*","Resource":"arn:aws:s3:::bucket-name"}',
        "C": '{"Effect":"Allow","Action":"s3:*","Resource":"arn:aws:s3:::bucket-name/*"}',
        "D": '{"Effect":"Allow","Action":"s3:DeleteObject","Resource":"arn:aws:s3:::bucket-name/*"}',
    }
}

QUESTION_START_RE = re.compile(r"(?m)^\s*(\d{1,4})\.(?=[A-Z])")
PAGE_RE = re.compile(r"===== PAGE (\d+) =====")
OPTION_RE = re.compile(
    r"(?ms)^\s*([A-F])\s*[、銆]\s*(.*?)(?=^\s*[A-F]\s*[、銆]|\n\s*答案\s*[:：]|$)"
)

def extract_pages(pdf_path: Path) -> list[str]:
    pages: list[str] = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            pages.append(text)

    return pages

def write_extracted_text() -> None:
    pages = extract_pages(PDF_PATH)

    output = []
    for index, text in enumerate(pages, start=1):
        print(f"Page {index}: {len(text)} chars")
        output.append(f"\n===== PAGE {index} =====\n{text}")

    EXTRACTED_TEXT_PATH.write_text("\n".join(output), encoding="utf-8")


def clean_text(value: str) -> str:
    value = PAGE_RE.sub(" ", value)
    value = value.replace("\u3000", " ")
    value = re.sub(r"[ \t\r\f\v]+", " ", value)
    value = re.sub(r"\s*\n\s*", " ", value)
    return value.strip()


def source_page_at(text: str, position: int) -> int | None:
    page = None
    for match in PAGE_RE.finditer(text):
        if match.start() > position:
            break
        page = int(match.group(1))
    return page


def has_question_shape(block: str, min_options: int = 3) -> bool:
    options = set(re.findall(r"(?m)^\s*([A-F])\s*[、銆]", block))
    answer_pos = block.find("答案")
    first_option_positions = [
        pos
        for key in "ABCDEF"
        for pos in (block.find(f"{key}、"), block.find(f"{key}銆"))
        if pos != -1
    ]
    first_option_pos = min(first_option_positions, default=-1)
    return (
        len(options) >= min_options
        and answer_pos != -1
        and first_option_pos != -1
        and first_option_pos < answer_pos
    )


def find_question_starts(text: str) -> list[re.Match[str]]:
    candidates = list(QUESTION_START_RE.finditer(text))
    candidate_positions = [match.start() for match in candidates] + [len(text)]

    likely_indexes: set[int] = set()
    for index, match in enumerate(candidates):
        block = text[match.start() : candidate_positions[index + 1]]
        if has_question_shape(block):
            likely_indexes.add(index)

    # Some explanations contain numbered list items at the start of a line.
    # Those can split one real question into two candidate blocks. Add back any
    # candidate that has options and becomes complete before the next likely start.
    for index, match in enumerate(candidates):
        if index in likely_indexes:
            continue

        next_likely_index = next(
            (other for other in range(index + 1, len(candidates)) if other in likely_indexes),
            None,
        )
        if next_likely_index is None:
            continue

        block = text[match.start() : candidates[next_likely_index].start()]
        if has_question_shape(block):
            likely_indexes.add(index)

    return [candidates[index] for index in sorted(likely_indexes)]


def parse_answer(block: str) -> str | list[str] | None:
    match = re.search(r"答案\s*[:：]\s*([A-F](?:\s*[,，、/ ]?\s*[A-F])*)", block)
    if not match:
        return None

    keys = re.findall(r"[A-F]", match.group(1))
    if not keys:
        return None
    return keys[0] if len(keys) == 1 else keys


def parse_question_block(
    block: str, question_id: int, source_number: int, source_page: int | None
) -> dict:
    block_without_pages = PAGE_RE.sub("\n", block).strip()

    answer_marker = re.search(r"\n\s*答案\s*[:：]", block_without_pages)
    answer_start = answer_marker.start() if answer_marker else len(block_without_pages)
    before_answer = block_without_pages[:answer_start]

    option_matches = list(OPTION_RE.finditer(before_answer))
    first_option_start = option_matches[0].start() if option_matches else len(before_answer)
    stem = re.sub(r"^\s*\d{1,4}\.", "", before_answer[:first_option_start], count=1).strip()

    options = {match.group(1): clean_text(match.group(2)) for match in option_matches}

    explanation = ""
    explanation_match = re.search(r"解\s*析\s*[:：]\s*(.*)", block_without_pages, re.S)
    if explanation_match:
        explanation = clean_text(explanation_match.group(1))

    if question_id in MANUAL_OPTION_OVERRIDES:
        options = MANUAL_OPTION_OVERRIDES[question_id]

    return {
        "id": question_id,
        "sourceNumber": source_number,
        "stem": clean_text(stem),
        "options": options,
        "answer": parse_answer(block_without_pages),
        "explanation": explanation,
        "sourcePage": source_page,
    }


def build_report(questions: list[dict]) -> dict:
    ids = [question["id"] for question in questions]
    source_numbers = [question["sourceNumber"] for question in questions]
    source_counts = Counter(source_numbers)

    fingerprints: dict[str, list[int]] = {}
    for question in questions:
        fingerprint = (
            question["stem"][:240]
            + json.dumps(question["options"], ensure_ascii=False, sort_keys=True)
        )
        fingerprints.setdefault(fingerprint, []).append(question["id"])

    duplicate_fingerprints = [
        values for values in fingerprints.values() if len(values) > 1 and values[0] != values[-1]
    ]

    return {
        "totalQuestions": len(questions),
        "expectedQuestions": EXPECTED_QUESTION_COUNT,
        "idsAreSequential": ids == list(range(1, len(questions) + 1)),
        "sourceNumberDuplicates": {
            str(number): count for number, count in source_counts.items() if count > 1
        },
        "missingStem": [q["id"] for q in questions if not q["stem"]],
        "missingOptions": [q["id"] for q in questions if len(q["options"]) < 3],
        "emptyOptionText": [
            q["id"]
            for q in questions
            if any(not value for value in q["options"].values())
        ],
        "missingAnswer": [q["id"] for q in questions if not q["answer"]],
        "missingExplanation": [q["id"] for q in questions if not q["explanation"]],
        "answerNotInOptions": [
            q["id"]
            for q in questions
            if q["answer"]
            and any(
                key not in q["options"]
                for key in ([q["answer"]] if isinstance(q["answer"], str) else q["answer"])
            )
        ],
        "duplicateFingerprints": duplicate_fingerprints,
    }


def parse_questions() -> tuple[list[dict], dict]:
    if not EXTRACTED_TEXT_PATH.exists():
        write_extracted_text()

    text = EXTRACTED_TEXT_PATH.read_text(encoding="utf-8")
    starts = find_question_starts(text)
    positions = [match.start() for match in starts] + [len(text)]

    questions = []
    for index, match in enumerate(starts, start=1):
        block = text[match.start() : positions[index]]
        questions.append(
            parse_question_block(
                block=block,
                question_id=index,
                source_number=int(match.group(1)),
                source_page=source_page_at(text, match.start()),
            )
        )

    return questions, build_report(questions)


def main() -> None:
    questions, report = parse_questions()
    QUESTIONS_PATH.write_text(
        json.dumps(questions, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    REPORT_PATH.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Parsed {len(questions)} questions")
    print(f"Wrote {QUESTIONS_PATH}")
    print(f"Wrote {REPORT_PATH}")
    if len(questions) != EXPECTED_QUESTION_COUNT:
        raise SystemExit(f"Expected {EXPECTED_QUESTION_COUNT} questions")


if __name__ == "__main__":
    main()
