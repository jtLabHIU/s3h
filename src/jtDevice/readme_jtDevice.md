# jtDevice
# - Unite all call. -

## What is jtDevice

- all classes (without `jtDevicefactory`) must extend the `jtDevice` class
- all objects on the same host must be hosted by the same `jtDevice` class
- all objects on the same host must be created by the same `jtDeviceFactory` class
- all objects on the same host must be managed by the same instance of `jtDevServ` device
- all objects must be communicated with the `jtDevServ` through a instance of `jtPortal`
- all objects must be under controlled by the `jtDevMaster`
    - please remember a `jtDevServ` must be not only SERVER for clients but also SERVANT of the `jtDevMaster`
- all objects are able to serialize by JSON stringify/functionify and send to or receive from everywhere
    - for security reasons, the `jtDevMaster` must allow administrators to control such object transfer activity
    - yep we can't make security perfect, we just aim to *NOT BE EASILY* abused
