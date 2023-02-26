// Opens specified input with the given text editor.
// Reads input from standard input and opens the results in the default text editor.
// Also useful for piping output to open and having it open in the default text editor.
// Returns the command result.
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
