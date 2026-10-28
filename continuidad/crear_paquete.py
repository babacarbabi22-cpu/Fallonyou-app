#!/usr/bin/env python3
"""Copia puntual de código y guía; nunca exporta secretos ni datos de usuarios."""
import hashlib
import json
import re
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "generated-artifacts" / "continuidad"
DIRECTORIES = {"client", "server", "shared", "script", "scripts", "migrations", "ios", "android", "continuidad"}
ROOT_FILES = {
    "package.json", "package-lock.json", "tsconfig.json", "vite.config.ts",
    "tailwind.config.ts", "postcss.config.js", "components.json",
    "drizzle.config.ts", "capacitor.config.json", "codemagic.yaml",
    "PRIVACY_POLICY.md", "TERMS_OF_SERVICE.md", "design_guidelines.md",
    ".gitignore", ".replitignore",
}
BLOCKED_PARTS = {
    "node_modules", "Pods", ".gradle", "build", "dist", "__pycache__",
    ".git", ".env", "uploads", "DerivedData",
}
BLOCKED_SUFFIXES = {".p8", ".p12", ".pem", ".key", ".jks", ".keystore", ".mobileprovision", ".dump", ".backup"}
TEXT_SUFFIXES = {".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".yaml", ".yml", ".md", ".html", ".css", ".swift", ".xml", ".gradle", ".properties"}


def allowed(name):
    p = Path(name)
    if p.is_absolute() or ".." in p.parts or any(part in BLOCKED_PARTS for part in p.parts):
        return False
    if p.suffix.lower() in BLOCKED_SUFFIXES or p.name.startswith(".env") or p.name in {
        "testers.csv", "google-services.json", "local.properties", "key.properties", "INVENTARIO-PAQUETE.json",
    }:
        return False
    if "service-account" in p.name.lower() or "credentials" in p.name.lower():
        return False
    # Regenerar los archivos web nativos: no copiar compilados ni CSV privados.
    if name.startswith(("ios/App/App/public/", "android/app/src/main/assets/public/")):
        return False
    return p.parts[0] in DIRECTORIES or name in ROOT_FILES


def collect():
    is_repository = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], cwd=ROOT, capture_output=True, text=True,
    )
    if is_repository.returncode == 0 and Path(is_repository.stdout.strip()).resolve() == ROOT:
        result = subprocess.run(
            ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
            cwd=ROOT, check=True, capture_output=True,
        )
        names = {s for s in result.stdout.decode().split("\0") if s and allowed(s)}
    else:
        # Permite actualizar también una copia descargada que no tenga historial Git.
        names = {p.relative_to(ROOT).as_posix() for folder in DIRECTORIES
                 for p in (ROOT / folder).rglob("*") if p.is_file()
                 and allowed(p.relative_to(ROOT).as_posix())}
    # Vite está ignorado por un patrón heredado: incluirlo explícitamente.
    names.update(name for name in ROOT_FILES if (ROOT / name).is_file())
    for path in (ROOT / "continuidad").rglob("*"):
        if path.is_file() and allowed(path.relative_to(ROOT).as_posix()):
            names.add(path.relative_to(ROOT).as_posix())
    # Solo recursos utilizados por el código, nunca todas las capturas adjuntas.
    assets = set()
    for name in sorted(names):
        path = ROOT / name
        if path.suffix not in TEXT_SUFFIXES or not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        for match in re.findall(r"""(?:@assets/|/attached_assets/)([^'"\s)<>`]+)""", text):
            asset = Path("attached_assets") / match.split("?")[0]
            if ".." in asset.parts or not (ROOT / asset).is_file():
                raise ValueError("Recurso referenciado ausente o dinámico: " + asset.as_posix())
            assets.add(asset.as_posix())
    names.update(assets)
    files = []
    for name in sorted(names):
        path = ROOT / name
        if path.is_symlink():
            raise ValueError("No se permiten enlaces simbólicos: " + name)
        if not path.is_file():
            continue
        files.append((name, path.read_bytes()))
    return files


def check(files):
    # Comprobación limitada de formatos conocidos, NO certificación de seguridad.
    patterns = [
        rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE" + rb" KEY-----",
        rb"\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b",
        rb"\bgh[pousr]_[A-Za-z0-9]{25,}\b",
        rb"\bgithub_pat_[A-Za-z0-9_]{25,}\b",
        rb"\bAKIA[A-Z0-9]{16}\b",
        rb"postgres(?:ql)?://[^:\s/@]+:[^@\s]+@",
    ]
    for name, content in files:
        if any(re.search(pattern, content) for pattern in patterns):
            raise ValueError("Posible credencial literal: revisar de forma privada " + name)
        # No incluir punteros LFS sin su recurso real.
        if content.startswith(b"version https://git-lfs.github.com/spec/v1"):
            raise ValueError("Recurso LFS sin descargar: " + name)
    paths = {name for name, _ in files}
    for required in ("package.json", "package-lock.json", "vite.config.ts", "server/index.ts", "shared/schema.ts"):
        if required not in paths:
            raise ValueError("Falta un archivo esencial: " + required)


def main():
    files = collect()
    check(files)
    now = datetime.now(timezone.utc)
    stamp = now.strftime("%Y-%m-%d-%H%M%S")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    archive = OUTPUT / f"FallonYou-continuidad-{stamp}.zip"
    inventory = {
        "createdAtUtc": now.isoformat(),
        "scope": "Código actual y documentación; sin datos, secretos ni historial Git",
        "databaseIncluded": False,
        "userMediaIncluded": False,
        "secretsIncluded": False,
        "externalRestoreVerified": False,
        "credentialScan": "Comprobación limitada de patrones conocidos; no garantiza ausencia de toda información sensible",
        "files": [
            {"path": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
             "gitBlobSha": hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()}
            for name, data in files
        ],
    }
    with zipfile.ZipFile(archive, "x", compression=zipfile.ZIP_DEFLATED) as z:
        for name, data in files:
            z.writestr("FallonYou/" + name, data)
        z.writestr("FallonYou/continuidad/INVENTARIO-PAQUETE.json", json.dumps(inventory, indent=2, ensure_ascii=False))
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_suffix(".zip.sha256").write_text(f"{digest}  {archive.name}\n")
    archive.with_suffix(".inventario.json").write_text(json.dumps(inventory, indent=2, ensure_ascii=False))
    print(json.dumps({"zip": str(archive.relative_to(ROOT)), "files": len(files),
                      "bytes": archive.stat().st_size, "sha256": digest}, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, subprocess.CalledProcessError) as exc:
        print("No se creó el paquete. " + str(exc), file=sys.stderr)
        sys.exit(1)
