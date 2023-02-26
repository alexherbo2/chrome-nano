# nano for Chrome

A browser extension that lets you edit text areas in webpages with a text editor program—such as [nano].

[nano]: https://nano-editor.org

## Installation

Requires [chrome-shell] for running shell commands.

[chrome-shell]: https://github.com/taupiqueur/chrome-shell

### Nightly builds

Download the [Nightly builds].

[Nightly builds]: https://github.com/taupiqueur/chrome-nano/releases/nightly

### Build from source

Install [curl] and [Inkscape] to get and build the images.

[curl]: https://curl.se
[Inkscape]: https://inkscape.org

``` sh
git clone https://github.com/taupiqueur/chrome-nano.git
cd chrome-nano
make build
```

### Load an unpacked extension

1. Navigate to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the extension directory.

### Allow native messaging with the shell application

Copy the extension ID and run the following in your terminal.

```
chrome-shell install [--target=<platform>] [<extension-id>...]
```

Possible targets are `chrome`, `chrome-dev`, `chrome-beta`, `chrome-canary` and `chromium`.

## Documentation

See the [manual] for setup and usage instructions.

[Manual]: docs/manual.md

## Contributing

Report bugs on the [issue tracker],
ask questions on the [IRC channel],
send patches on the [mailing list].

[Issue tracker]: https://github.com/taupiqueur/chrome-nano/issues
[IRC channel]: https://web.libera.chat/gamja/#taupiqueur
[Mailing list]: https://github.com/taupiqueur/chrome-nano/pulls
