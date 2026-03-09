import sys
import os

block_cipher = None

# Assets to include
added_files = [
    ('dist', 'dist'),
    ('public', 'public'),
]

# Add Windows binaries if they exist
if os.path.exists('bin/windows'):
    added_files.append(('bin/windows', 'bin/windows'))

# Platform specific configuration
platform_pathex = []
platform_hiddenimports = [
    'webview', 
    'yt_dlp', 
    'chardet', 
    'charset_normalizer', 
    'jaraco.text', 
    'pkg_resources', 
    'platformdirs', 
    'packaging', 
    'more_itertools'
]

if sys.platform == 'linux':
    platform_pathex = ['/usr/lib/python3/dist-packages']
    platform_hiddenimports.append('gi')

a = Analysis(
    ['app.py'],
    pathex=platform_pathex,
    binaries=[],
    datas=added_files,
    hiddenimports=platform_hiddenimports,
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
    name='LumenGrabber',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['public/Lumen-Lab-Favicon-BG-Removed.png'],
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='LumenGrabber',
)
