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

async function editTextArea(tab) {
  const [{ documentId, result: [selector, input] }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: getTextInput
  })
  const commandResult = await this.open(input)
  if (commandResult.status === 0) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id, documentIds: [documentId] },
      func: setTextOutput,
      args: [selector, commandResult.output]
    })
  }
}

function getTextInput() {
  const computeSelector = element => (
    element === document.documentElement
      ? document.documentElement.tagName
      : `${computeSelector(element.parentElement)} > :nth-child(${Array.from(element.parentElement.children).indexOf(element) + 1})`
  )
  return [computeSelector(document.activeElement), document.activeElement.value]
}

function setTextOutput(selector, output) {
  const activeElement = document.querySelector(selector)
  const boundSelection = activeElement.setSelectionRange.bind(activeElement, activeElement.selectionStart, activeElement.selectionEnd, activeElement.selectionDirection)
  activeElement.value = output
  boundSelection()
  activeElement.dispatchEvent(new Event('input'))
}

export default {
  command: 'xterm',
  args: ['-e', 'nano'],
  editTextArea,
  open(input) {
    return nano(this.command, this.args, input)
  }
}
