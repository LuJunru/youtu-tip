#!/usr/bin/env python3
"""
Quick verification script for Tip debug report pickle files.

Usage:
    python scripts/verify_debug_reports.py [REPORT_DIR]

The script scans the report directory (default: ~/Library/Caches/Tip/debug-reports),
loads every *.pkl file and checks the essential keys to ensure the data
looks complete. A short summary for each report will be printed.
"""

from __future__ import annotations

import argparse
import pickle
from pathlib import Path

REQUIRED_SESSION_KEYS = {
    'session_id',
    'intent',
    'messages',
}


def load_report(path: Path) -> dict:
    with path.open('rb') as handle:
        return pickle.load(handle)


def validate_report(data: dict) -> list[str]:
    warnings: list[str] = []
    missing = [key for key in ('report_id', 'created_at', 'issue', 'session') if key not in data]
    if missing:
        warnings.append(f"missing root keys: {missing}")
    session = data.get('session') or {}
    missing_session = [key for key in REQUIRED_SESSION_KEYS if key not in session]
    if missing_session:
        warnings.append(f"session missing keys: {missing_session}")
    messages = session.get('messages')
    if not isinstance(messages, list) or len(messages) == 0:
        warnings.append('session contains no messages')
    return warnings


def summarize_report(path: Path, data: dict) -> str:
    session = data['session']
    message_count = len(session['messages'])
    selection = session.get('selection')
    capture_state = 'yes' if data.get('capture') else 'no'
    preview_state = 'yes' if data.get('selection_preview') else 'no'
    return (
        f"- {path.name}\n"
        f"  issue       : {data['issue']}\n"
        f"  session     : {session['session_id']} (intent: {session.get('intent')})\n"
        f"  messages    : {message_count} entries\n"
        f"  selection   : {'present' if selection else 'missing'}\n"
        f"  capture img : {capture_state}, preview: {preview_state}\n"
    )


def print_messages(session: dict) -> None:
    messages = session.get('messages') or []
    if not messages:
        print('  messages   : none')
        return
    print('  messages   :')
    for index, message in enumerate(messages, 1):
        role = message.get('role')
        content = (message.get('content') or '').rstrip()
        print(f'    [{index}] {role}:')
        print('      ' + '\n      '.join(content.splitlines() or ['(empty)']))
        print()


def print_intent_candidates(session: dict) -> None:
    candidates = session.get('intent_candidates') or []
    if not candidates:
        print('  intent candidates: none')
        return
    print('  intent candidates:')
    for idx, candidate in enumerate(candidates, 1):
        print(f'    {idx}. {candidate}')


def main() -> None:
    parser = argparse.ArgumentParser(description='Verify Tip debug report pickle files.')
    parser.add_argument(
        'report_dir',
        nargs='?',
        default='~/Library/Caches/Tip/debug-reports',
        help='directory containing debug-report-*.pkl files',
    )
    args = parser.parse_args()
    report_dir = Path(args.report_dir).expanduser()
    if not report_dir.exists():
        raise SystemExit(f'report directory not found: {report_dir}')

    report_files = sorted(report_dir.glob('debug-report-*.pkl'))
    if not report_files:
        raise SystemExit(f'no debug-report-*.pkl files in {report_dir}')

    print(f'Inspecting {len(report_files)} debug report(s) in {report_dir}')
    for path in report_files:
        try:
            data = load_report(path)
            warnings = validate_report(data)
            summary = summarize_report(path, data)
            print(summary)
            session = data.get('session') or {}
            print_messages(session)
            print_intent_candidates(session)
            if warnings:
                print('  WARNINGS:')
                for note in warnings:
                    print(f'    - {note}')
        except Exception as exc:  # noqa: BLE001
            raise SystemExit(f'Failed to validate {path.name}: {exc}') from exc


if __name__ == '__main__':
    main()
