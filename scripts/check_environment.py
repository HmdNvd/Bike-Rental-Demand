"""Check installed versions before loading the version-sensitive model artifact."""
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path


def main():
    requirements = Path(__file__).resolve().parents[1] / 'requirements.txt'
    mismatches = []
    for line in requirements.read_text(encoding='utf-8-sig').splitlines():
        if not line.strip() or line.startswith('#'):
            continue
        name, expected = line.split('==', 1)
        try:
            installed = version(name)
        except PackageNotFoundError:
            installed = 'missing'
        if installed != expected:
            mismatches.append(f'{name}: {installed} (required {expected})')
    if mismatches:
        print('Dependency setup needed:\n' + '\n'.join(mismatches))
        return 1
    print('Python environment matches the pinned requirements.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
