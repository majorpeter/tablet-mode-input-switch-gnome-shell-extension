# Tablet Mode Input Switch GNOME Shell Extension

A GNOME shell extension that allows switching the laptop inputs (keyboard and touchpad) on/off from the Quick Settings (Wifi, BT etc.) panel.

## Motivation

My 2-in-1 laptop/tablet cannot detect when in tablet or tent mode due to lack of driver support under Linux, thus the keyboard and touchpad remain active when folded in these modes. This extension allows manually switching these inputs off or on from the shell using the touch screen only. (The same goes for detecting the orientation but that can be worked around via the [Screen Rotate extension](https://github.com/shyzus/gnome-shell-extension-screen-autorotate)).

## `setuid` requirement

Since Wayland has no support for switching input devices off as a regular user at the time of writing, a binary utility is required that runs as `root` and disables these devices on the kernel level. The `Make` sets up ownership and file mode as required, it needs `sudo`.

## Configuration

A `config.h` file is required that lists the event devices to be switched off, copy the `config.template.h` to get started. The model specific device names can be listed via

```sh
libinput list-devices
# alternatively
cat /sys/class/input/event*/device/name
```

(`xinput` won't be useful under Wayland.)

Use the test mode (`/util/input-evt-inhibitor --test`) to check whether the `config.h` is correct. This command disables the selected devices, waits for a bit and then re-enables them.

## Development

The extension can be tested in a separate GNOME shell with

```sh
dbus-run-session -- gnome-shell --nested --wayland
```

And enabled from a terminal **launched from this session** with

```sh
gnome-extensions enable tabletmodeinputswitch@majorpeter.github.com
```
