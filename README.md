# jtS3Helper
jtLab Scratch 3 Helper app
- work on Electron
- run in task tray
- communicate with Scratch 3 through WebSocket

branches:
- Latest release branch: `dev191017`
- Current development branch: `dev_3.0`
- Current upstream version: 3.18.1 (2020/12/06)

for build the latest release branch, please checkout `jtScratch-desktop` branch on `scratch-gui` and `scratch-vm`

# first step guide to build for Windows (with Git for Windows SDK/MSYS2)

- run `npm install --global windows-build-tools` from Administrator PowerShell
- open `Git SDK 64-bit`
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
- `npm run dist` 　Even if you get a FATAL ERROR, it's okay as long as `npm start` works.
- `cd ..`
- `git clone https://github.com/jtLabHIU/s3h.git`
- `cd s3h`
- `git checkout dev191017` or latest release branch
- `npm install`   If you get build errors, install the latest LTS version of Node.js.
- add `chcp 437 & ` into before `netsh` of line 69 & 163 on `s3h/node_modules/wifi-control/lib/win32.js`
- modify 'name' and 'ssid' for your Tello ID in `async function startCommServ` on `s3h/src/startup.js`
- `npm run dist`
- run `jtS3H-win32-x64\jtS3H.exe`



## How to run
- `git clone https://github.com/jtLabHIU/s3h.git`
- `cd s3h`
- `npm install`
- modify `/node_modules/wifi-control/lib/win32.js` (see below)
- `npm start`(invoke Scratch that compiled static) or `npm run devserv`(use Scratch that running on webpack-dev-server)

see also `readme_scratch.md`

## modify wifi-control module
- add `chcp 437 & ` into before `netsh` of line 69 & 163

## webpack proxy
- add proxy entry into line 24 of `webpack.config.js` on `scratch-gui`
```
        proxy: {
            'jtS3H': {
                target: 'http://localhost:5963'
            }
        }
```

## further information
- [wifi-control](https://www.npmjs.com/package/wifi-control)
- [Tello SDK 2.0](https://dl-cdn.ryzerobotics.com/downloads/Tello/Tello%20SDK%202.0%20User%20Guide.pdf)
- [Tello binary command(Japanese)](https://qiita.com/mozzio369/items/a942a212c6b5d3fdeb48)
- [ Scratch 3.0 Extension specification](https://github.com/LLK/scratch-vm/blob/develop/docs/extensions.md)

## my Memo
- Tello vs Tello Edu
    - sdk?
        - unknown command: sdk? / 20

- chcp
    - 932 - Japanese Shift-JIS
    - 437 - English
    - 65001 - UTF-8
- arp -a
```
Interface: 192.168.10.2 --- 0x6
  Internet Address      Physical Address      Type
  192.168.10.1          60-60-1f-d2-d5-55     dynamic
  192.168.10.255        ff-ff-ff-ff-ff-ff     static

インターフェイス: 10.70.78.153 --- 0x5
  インターネット アドレス 物理アドレス           種類
  10.70.78.254          50-3d-e5-a0-0d-ff     動的
  10.70.78.255          ff-ff-ff-ff-ff-ff     静的
```

- ping -n 1 -w 4 192.168.10.1~254
```
Pinging 192.168.10.1 with 32 bytes of data:
Request timed out.

Ping statistics for 192.168.10.1:
    Packets: Sent = 1, Received = 0, Lost = 1 (100% loss),

Pinging 192.168.10.1 with 32 bytes of data:
Reply from 192.168.10.1: bytes=32 time=1ms TTL=255

Ping statistics for 192.168.10.1:
    Packets: Sent = 1, Received = 1, Lost = 0 (0% loss),
Approximate round trip times in milli-seconds:
    Minimum = 1ms, Maximum = 1ms, Average = 1ms


192.168.10.1 に ping を送信しています 32 バイトのデータ:
192.168.10.1 からの応答: バイト数 =32 時間 =1ms TTL=255

192.168.10.1 の ping 統計:
    パケット数: 送信 = 1、受信 = 1、損失 = 0 (0% の損失)、
ラウンド トリップの概算時間 (ミリ秒):
    最小 = 1ms、最大 = 1ms、平均 = 1ms

192.168.10.1 に ping を送信しています 32 バイトのデータ:
要求がタイムアウトしました。

192.168.10.1 の ping 統計:
    パケット数: 送信 = 1、受信 = 0、損失 = 1 (100% の損失)、
```

- ap command
send: ap ETROBO etrobocon_hkd
Response: OK,drone will reboot in 3s
Received 26 bytes from 192.168.10.1:8889

- multi tello
    - connect WiFi direct with the target Tello
    - send `ap SSID PASSWORD` command to tello
        - restart automatically as STA mode
    - ping to tello and mome IP and MAC pair
        - we can connect automatically that lookup with ARP command
    - sockCommand must listening different UDP port
    - all tello response to localhost:8889UDP only
        - these can recognize by IP address that tellos send

- todo 
limit 1 hop
scratch 1/2 helper compatible

- devSock
    - Tello can't reconnect to another UDP port, such make it by 0

- AP list auto-update on Windows
    - use [WlanScan.exe](https://superuser.com/questions/889414/force-refresh-re-scan-wireless-networks-from-command-line)
        - problem: it can't exit normaly

- jtMesh
    - Mesh is based upon remote sensor connections through port 42001
    - `scratch-vm/src/engine/variables.js`
    - packet: <size: 4 bytes><msg: size bytes>
    - Most message types contain human-readable strings made up of the following elements:
        - Unquoted single-word strings (cat, mouse-x)
        - Quoted strings ("a four word string", "embedded ""quotation marks"" are doubled")
        - Numbers (1, -1, 3.14, -1.2, .1, -.2)
        - Booleans (true or false)
        - Words and strings are encoded in UTF-8.
    - `sensor-update "note" 60 "seconds" 0.1`
    - `broadcast "play note"`
    - [Scratch 2.0 Extension Protcol](https://en.scratch-wiki.info/w/images/ExtensionsDoc.HTTP-9-11.pdf)

- Scratch3 /broadcast
    - broadcast(args, util) and broadcastAndWait(args, util) are defined in `scratch-vm/src/blocks/scratch3_event.js`
        - `args`:object
            - BROADCAST_OPTION
                - id: uid
                - name: message
        - `util`:BlockUtility   (engine/block-utility.js)
            - sequencer:Sequencer
            - thread:Thread
            - __proto__
                - target: this.thread.target: Target (engine/target.js)
                - startHats('event_whenbroadcastreceived', {BROADCAST_OPTION: broadcastOption});
                    - calls sequencer.runtime.startHats (engine/runtime.js)
- Scratch3 /sensorupdate
    - variable blocks are defined in `scratch-vm/src/blocks/scratch3_data.js`


## road to opencv

### for windows:

- download [cmake-3.16.0-rc4-win64-x64.zip](https://github.com/Kitware/CMake/releases/download/v3.16.0-rc2/cmake-3.16.0-rc2-win64-x64.zip) or latest one from [CMake website](https://cmake.org/download/)
- deflate into `$Pzenbu\cmake`
- open an **administrative Powershell** when you want to use `node-gyp` on Windows
- `Set-Item Env:Pzenbu "path\to\$Pzenbu"`
- `Set-Item Env:PATH "$Env:Pzenbu\node.js;$Env:Pzenbu\cmake\bin;$Env:PATH"`
- `cd path\to\your\workspace`
- `npm install -g windows-build-tools`
    - try `npm config get python` to check

### for mac

- download [cmake-3.16.0-rc4-Darwin-x86_64.dmg](https://github.com/Kitware/CMake/releases/download/v3.16.0-rc4/cmake-3.16.0-rc4-Darwin-x86_64.dmg) or latest one from [CMake website](https://cmake.org/download/)
- execute this file to mount as installer
- select `agree` button
- drag-and-drop `CMake` icon into `$Pzenbu`
- open the `Terminal`
- `Pzenbu="path/to/$Pzenbu"`
- `PATH="$Pzenbu/CMake.app/Contents/bin:$PATH"`

### for common

- `npm install -g node-gyp`
- add entry into `package.json`
```
  ,
  "opencv4nodejs": {
    "autoBuildOpencvVersion": "4.1.1"
  }
```
- `npm install --save opencv4nodejs`
- `git clone https://github.com/justadudewhohacks/opencv4nodejs.git`


- ToDo: electorn-rebuild
    - `cd ..`
    - `git clone https://github.com/justadudewhohacks/opencv-electron.git`
    - `cd opencv-electron/plain-js`
    - `npm install`

`.\ffmpeg -i udp://0.0.0.0:11111 -f sdl "tello"`
