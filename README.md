# Building libretro-atari800

### Downloading the code

```bash
cd ~/src 
git clone https://github.com/emscripten-core/emsdk
git clone https://github.com/libretro/libretro-atari800.git
git clone https://github.com/libretro/RetroArch
git clone https://github.com/gitGalu/aol-emu
```

### Installing emscripten sdk version 3.1.46

```bash
cd ~/src/emsdk 
./emsdk install 3.1.46
./emsdk activate 3.1.46
source ./emsdk_env.sh
```

### Installing development HTTP server

```bash
cd ~/src/aol-emu
npm install express
```

### Downloading ROMs for testing

```bash
cd ~/src/aol-emu
chmod +x download_atari_files.sh
./download_atari_files.sh
```

### Building libretro-atari800

```bash
cd ~/src/libretro-atari800 
emmake make -f Makefile platform=emscripten
mv atari800_libretro_emscripten.bc ../RetroArch/libretro_emscripten.bc
cd ../RetroArch
emmake make -f Makefile.emscripten LIBRETRO=atari800 -j all
mv atari800_libretro* ../aol-emu
```

### Running and testing

```bash
cd ~/src/aol-emu
node server.js
```
