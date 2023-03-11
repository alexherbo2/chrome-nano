// Opens specified input with the given text editor.
// Returns the command result with the file contents.
export async function nano(command, args, input) {
  return chrome.runtime.sendNativeMessage('shell', {
    command: 'sh',
    args: ['-c', `tmpdir=$(mktemp -d) file=$tmpdir/chrome-nano.txt && trap 'rm -Rf "$tmpdir"' EXIT && cat > "$file" && "$@" "$file" && [ $? -eq 0 ] && cat "$file"`, '--', command, ...args],
    input,
    output: true
  })
}

export default {
  command: 'xterm',
  args: ['-e', 'nano'],
  open(input) {
    return nano(this.command, this.args, input)
  }
}
