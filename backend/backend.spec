# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec file for The Program backend
Bundles FastAPI application with all dependencies into a standalone executable
"""

import sys
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

# Get the backend directory path
backend_dir = os.path.abspath('.')
app_dir = os.path.join(backend_dir, 'app')

# Collect all submodules for packages that use dynamic imports
hiddenimports = []
hiddenimports += collect_submodules('uvicorn')
hiddenimports += collect_submodules('uvicorn.loops')
hiddenimports += collect_submodules('uvicorn.protocols')
hiddenimports += collect_submodules('uvicorn.lifespan')
hiddenimports += collect_submodules('fastapi')
hiddenimports += collect_submodules('pydantic')
hiddenimports += collect_submodules('pydantic_core')
hiddenimports += collect_submodules('starlette')
hiddenimports += collect_submodules('sqlalchemy')
hiddenimports += collect_submodules('swisseph')
hiddenimports += collect_submodules('passlib')
hiddenimports += collect_submodules('jose')
hiddenimports += collect_submodules('jwt')
hiddenimports += ['app.main', 'app.core.config', 'app.core.database']

# Collect data files
datas = []

# Include all app package files
datas += [(app_dir, 'app')]

# Include pyswisseph data files (built-in ephemeris)
try:
    datas += collect_data_files('swisseph')
except Exception:
    pass

# Collect binary dependencies
binaries = []

# Analysis: Scan the main script and collect dependencies
a = Analysis(
    [os.path.join(backend_dir, 'main.py')],
    pathex=[backend_dir],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'pytest',
        'hypothesis',
        'numpy.distutils',
        '_pytest',
        'test',
        'tests'
    ],
    noarchive=False,
)

# PYZ: Create the archive of Python modules
pyz = PYZ(a.pure, a.zipped_data)

# EXE: Create the executable
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,  # Keep console for debugging
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
