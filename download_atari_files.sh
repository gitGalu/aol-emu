#!/bin/sh

download() {
  url="$1"
  filename="$2"
  echo "Downloading '$filename'..."
  curl -L "$url" -o "$filename"
}

download "https://www.atarionline.pl/v01/emulator/ATARIBAS.ROM" "ATARIBAS.ROM"
download "https://www.atarionline.pl/v01/emulator/ATARIXL.ROM" "ATARIXL.ROM"
download "https://www.atarionline.pl/v01/emulator/ATARIOSA.ROM" "ATARIOSA.ROM"
download "https://www.atarionline.pl/v01/emulator/ATARIOSB.ROM" "ATARIOSB.ROM"
download "https://www.atarionline.pl/v01/kazip.php?ct=kazip&sub=A&title=+Alley+Cat&file=Alley+Cat+%28v8%29.xex" "Alley Cat (v8).xex"
download "https://www.atarionline.pl/v01/kazip.php?ct=kazip&sub=F&title=+Fred&file=Fred+%28v1%29.atr" "Fred (v1).atr"
download "https://www.atarionline.pl/demoscena/N/Numen%20(v1,320).atr" "Numen (v1,320).atr"