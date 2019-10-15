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
13:30~14:20 last 10 min

- devSock
    - Tello can't reconnect to another UDP port, such make it by 0
