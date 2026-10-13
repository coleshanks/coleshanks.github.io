# DOOM on this site: what's here and under which terms

None of this folder is Cole Shanks's work, and the site's CC BY-NC 4.0 licence doesn't cover it.

## DOOM shareware (Episode 1, v1.9)

`doom.jsdos` holds the 21 files of DOOM v1.9 shareware (1995) by id Software, complete and byte-for-byte unchanged, plus two added files: `.jsdos/dosbox.conf`, which tells the emulator to start `DOOM.EXE`, and `DEFAULT.CFG`, DOOM's settings file, which picks the Sound Blaster for sound and music. id Software released the shareware episode to be copied and shared freely, unmodified and not for sale; its `README.TXT` asks that the shareware levels not be modified. The files came from the Internet Archive item [DOOM (Shareware Episode)](https://archive.org/details/DoomsharewareEpisode) (`DoomV1.9sw1995idSoftwareInc.action.zip`). DOOM is a trademark of id Software. The registered and commercial versions aren't here.

## js-dos 8.5.3

`js-dos/` holds the unchanged distribution files of [js-dos](https://js-dos.com) 8.5.3 by Alexander Guryanov (caiiiycuk), from the npm package `js-dos`: `js-dos.js`, `js-dos.css`, and in `emulators/` the DOSBox backend (`emulators.js`, `wdosbox.js`, `wdosbox.wasm`) and the zip library (`wlibzip.js`, `wlibzip.wasm`). js-dos is licensed under the GNU General Public License, version 2 ([GPL-2.0.txt](GPL-2.0.txt)). Source code: <https://github.com/caiiiycuk/js-dos> (branch `8.xx`).

## DOSBox

js-dos's emulator is [DOSBox](https://www.dosbox.com), compiled to WebAssembly. DOSBox is © the DOSBox Team and licensed under the GNU General Public License, version 2 ([GPL-2.0.txt](GPL-2.0.txt)). Source code: <https://sourceforge.net/projects/dosbox/>.

## The player page

`player.html`, which starts js-dos with the bundle, is Cole's site code.
