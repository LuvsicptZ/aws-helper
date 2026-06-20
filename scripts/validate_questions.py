from __future__ import annotations

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
QUESTIONS_PATH = ROOT / "data" / "questions.json"
EXPECTED_QUESTION_COUNT = 1019
CHOICE_KEYS = set("ABCDEF")


def answer_keys(answer: str | list[str] | None) -> list[str]:
    if answer is None:
        return []
    if isinstance(answer, str):
        return [answer]
    return answer


def main() -> None:
    questions = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))
    errors: list[str] = []
    warnings: list[str] = []

    if len(questions) != EXPECTED_QUESTION_COUNT:
        errors.append(f"Expected {EXPECTED_QUESTION_COUNT} questions, got {len(questions)}")

    ids = [question.get("id") for question in questions]
    expected_ids = list(range(1, len(questions) + 1))
    if ids != expected_ids:
        errors.append("Question ids are not sequential from 1")

    fingerprints: dict[str, int] = {}
    duplicate_fingerprints: list[tuple[int, int]] = []

    for question in questions:
        question_id = question.get("id")
        options = question.get("options") or {}
        answer = answer_keys(question.get("answer"))

        if not question.get("stem"):
            errors.append(f"Question {question_id} is missing stem")
        if len(options) < 3:
            errors.append(f"Question {question_id} has fewer than 3 options")
        empty_options = [key for key, value in options.items() if not value]
        if empty_options:
            warnings.append(f"Question {question_id} has empty option text: {empty_options}")
        if not answer:
            errors.append(f"Question {question_id} is missing answer")
        if not question.get("explanation"):
            errors.append(f"Question {question_id} is missing explanation")

        invalid_answers = [key for key in answer if key not in CHOICE_KEYS]
        if invalid_answers:
            errors.append(f"Question {question_id} has invalid answer keys: {invalid_answers}")

        missing_answer_options = [key for key in answer if key not in options]
        if missing_answer_options:
            errors.append(
                f"Question {question_id} answer keys are not present in options: {missing_answer_options}"
            )

        fingerprint = (
            (question.get("stem") or "")[:240]
            + json.dumps(options, ensure_ascii=False, sort_keys=True)
        )
        previous_id = fingerprints.get(fingerprint)
        if previous_id is not None:
            duplicate_fingerprints.append((previous_id, question_id))
        else:
            fingerprints[fingerprint] = question_id

    if duplicate_fingerprints:
        errors.append(f"Duplicate question fingerprints: {duplicate_fingerprints[:20]}")

    if errors:
        for error in errors:
            print(f"ERROR: {error}")
        raise SystemExit(1)

    for warning in warnings:
        print(f"WARNING: {warning}")

    print(f"Validated {len(questions)} questions")


if __name__ == "__main__":
    main()
