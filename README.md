# jtS3Helper
jtLab Scratch 3 Helper app
- work on Electron
- run in task tray
- communicate with Scratch 3 through WebSocket

# first step guide to build for Windows (with MSYS2)

- `mkdir jtScratch` on NTFS filesystem >5GB
- `cd jtScratch`
- `git clone https://github.com/jtLabHIU/scratch-vm.git`
- `cd scratch-vm`
- `npm install`
- `npm link`
- `cd ..`
- `git clone https://github.com/jtLabHIU/scratch-gui.git`
- `cd scratch-gui`
- `npm install`
- `npm link scratch-vm`
- `BUILD_MODE=dist STATIC_PATH=static npm run build`
- `npm link`
- `cd ..`
- `git clone https://github.com/jtLabHIU/scratch-desktop.git`
- `cd scratch-desktop`
- `npm install`
- `npm link scratch-gui`
- `npm run dist`
- `cd ..`
- `git clone https://github.com/jtLabHIU/s3h.git`
- `cd s3h`
- `npm install`
- modify `node_modules` which subscribe on files in `jts3h/src` folder
- (`cd ../scratch-gui; npm start` to run on browser)
- `npm run dist`
- run `jtS3H-win32-x64\jtS3H.exe`

## further information
- [wifi-control](https://www.npmjs.com/package/wifi-control)
- [Tello SDK 2.0](https://dl-cdn.ryzerobotics.com/downloads/Tello/Tello%20SDK%202.0%20User%20Guide.pdf)
- [Tello binary command(Japanese)](https://qiita.com/mozzio369/items/a942a212c6b5d3fdeb48)
- [ Scratch 3.0 Extension specification](https://github.com/LLK/scratch-vm/blob/develop/docs/extensions.md)

