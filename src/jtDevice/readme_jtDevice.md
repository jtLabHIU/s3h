# jtDevice
# - Unite all call. -

## What is jtDevice

- all classes must extend the `jtDevice` class
- all objects on the same host must be created and managed with the same `jtDevServ`
- all objects must be communicated with the `jtDevServ` through a instance of `jtPortal`
- all objects must be under controlled by the `jtDevMaster`
    - please remember a `jtDevServ` must be not only SERVER for clients but also SERVANT of the `jtDevMaster`
- all objects are able to serialize by JSON stringify/functionify and send to or receive from everywhere
    - for security reasons, the `jtDevMaster` must allow administrators to control such object transfer activity
    - yep we can't make security perfect, we just aim to *NOT BE EASILY* abused
