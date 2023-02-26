# Manual

## Usage

`Alt+Space` (`Ctrl+Space` on Windows) is the main keyboard shortcut.

Use it to search and activate suggestions.

### Configure keyboard shortcuts

Navigate to `chrome://extensions/shortcuts` to configure keyboard shortcuts.

### Configure the dynamic menu program

You can also configure the dynamic menu program by importing and exporting settings
in the **Options** page—Right-click the nano toolbar button and select **Options**.

Example configuration:

``` json
{
  "nano": {
    "command": "nano",
    "args": []
  }
}
```

``` json
{
  "nano": {
    "command": "sh",
    "args": [
      "-c",
      "cat > /tmp/stdin && alacritty -e sh -c 'fzy < /tmp/stdin > /tmp/stdout' && [ -s /tmp/stdout ] && cat /tmp/stdout"
    ]
  }
}
```

Make sure the commands are in your `PATH`.

On macOS, you can set the `PATH` environment variable for all services through [launchctl].

``` sh
sudo launchctl config user path "$PATH"
```

[launchctl]: https://ss64.com/osx/launchctl.html
