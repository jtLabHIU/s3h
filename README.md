# jtS3Helper
jtLab Scratch 3 Helper app
- work on Electron
- run in task tray
- communicate with Scratch 3 through WebSocket

## How to run
- `git clone https://github.com/jtLabHIU/s3h.git`
- `cd s3h`
- `npm install`
- modify `/node_modules/wifi-control/lib/win32.js` (see below)
- `electron .`

## modify wifi-control module
- add `chcp 437 & ` into before `netsh` of line 69 & 163

## further information
- [wifi-control](https://www.npmjs.com/package/wifi-control)
- [Tello SDK 2.0](https://dl-cdn.ryzerobotics.com/downloads/Tello/Tello%20SDK%202.0%20User%20Guide.pdf)
- [Tello binary command(Japanese)](https://qiita.com/mozzio369/items/a942a212c6b5d3fdeb48)

## my Memo
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

