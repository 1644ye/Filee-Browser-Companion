# Release 0.6.0 validation — 2026-10-31

Environment: Windows 11, Google Chrome 155, unmodified official Filee 2.2.0 Windows portable release. The official ZIP SHA256 was checked against its published checksum: `3e181d39a298105bef381b3fea64e6a08ff4d93416196517a21c22d65b5e6ac7`.

## Automated checks

- 58 Chrome DOM assertions passed: image selection (6), hero overlays (2), SVG styles/defs (26), SVG code selection (8), source-switching video drags (10), and exported SVG pixel/presentation-attribute checks (6).
- Background handler checks passed: signed URLs preserved, Save As and numbered conflicts requested, SVG filename, invalid schemes rejected, source errors and cancellation handled.
- JavaScript syntax checks passed.
- 7 official receiver protocol cases matched expectations using the final extension payloads and the official release Core DLL: image, SVG, selected SVG and MP4 accepted; extensionless, HLS and blob video rejected. Saved MP4 bytes matched the source fixture.
- Browser DOM assertions synthesize drag events; they do not prove Windows OLE drag behavior by themselves.

## Native manual chain with output verification

- With only official Filee running, the tester Ctrl-dragged the page SVG into the donut and selected PNG, then PDF. Filee's own log recorded both browser jobs. Both output files were inspected; a sampled gradient pixel was `(74,183,240,255)`. The PDF was rendered back to PNG using the official CLI and retained that color.
- The tester switched the same video element to the new blue clip and used the extension's Save original as menu. Chrome recorded the new signed URL, state `complete`, `exists: true`, and 2,294 bytes. The saved file matched the fixture byte-for-byte, decoded successfully with FFmpeg, and had SHA256 `dde84c46bc67c8007e212ac563ec4e5e32554890c2d5a9b77622b8ca080d2060`.
- The tester confirmed the SVG presentation-attribute variant displays its colors in their local Photos viewer.
- Two overlapping donuts were traced to the installed custom Filee and isolated official Filee both listening to Ctrl-drag. Repeating the test with one instance resolved it. The development launcher now refuses to start a second instance.

## Limits of this validation

Native video conversion through an FFmpeg donut preset was not separately exercised. Direct MP4 URI reception is covered by the official receiver protocol probe, and native original-video downloading is covered above. Streaming formats, authenticated/hotlink-protected media, all websites, macOS and Linux are not certified by these tests. The early test with two Filee processes is excluded as official compatibility evidence.

The release contains only the extension, instructions and license. It does not install or launch another Filee instance, nor include local test profiles, credentials or personal files.
