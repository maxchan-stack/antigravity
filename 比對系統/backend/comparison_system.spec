# -*- mode: python ; coding: utf-8 -*-
import sys
import os

block_cipher = None

# Define paths
backend_dir = os.path.abspath(os.getcwd())
frontend_dist = os.path.abspath(os.path.join(backend_dir, '..', 'frontend', 'dist'))

a = Analysis(
    ['start_app.py'],
    pathex=[backend_dir],
    binaries=[],
    datas=[
        (frontend_dist, 'dist'),  # Bundle frontend build
    ],
    hiddenimports=[
        'uvicorn.logging',
        'uvicorn.loops',
        'uvicorn.loops.auto',
        'uvicorn.protocols',
        'uvicorn.protocols.http',
        'uvicorn.protocols.http.auto',
        'uvicorn.lifespan',
        'uvicorn.lifespan.on',
        'duckduckgo_search',
        'googlesearch',
        'datasketch',
        'bs4',
        'requests',
        'python-multipart'
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='ComparisonSystem',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True, # Keep console for now to see logs (user can request windowed later)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='ComparisonSystem',
)
