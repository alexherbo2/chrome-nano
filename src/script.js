// This module contains content script functions that run in the context of web pages.
// Reference: https://developer.chrome.com/docs/extensions/mv3/content_scripts/

// Edits the active text area with a text editor program—such as nano.
export async function editTextArea() {
  // Uses message passing to open the editor from the content script.
  const editTextArea = input => chrome.runtime.sendMessage({
    type: 'action',
    action: 'editTextArea',
    input
  })

  // Dispatches a paste event with the given text.
  const dispatchPaste = (eventTarget, text) => {
    const dataTransfer = new DataTransfer
    dataTransfer.setData('text/plain', text)

    eventTarget.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: dataTransfer,
        bubbles: true,
        cancelable: true
      })
    )
  }

  // Gets active element with shadow DOM support.
  // Implementation reference: https://github.com/lydell/LinkHints/blob/main/src/worker/ElementManager.ts
  const getActiveElement = documentOrShadowRoot => (
    documentOrShadowRoot.activeElement.shadowRoot
      ? getActiveElement(documentOrShadowRoot.activeElement.shadowRoot)
      : documentOrShadowRoot.activeElement
  )

  const activeElement = getActiveElement(document)
  const selection = window.getSelection()

  switch (true) {
    case activeElement instanceof HTMLInputElement:
    case activeElement instanceof HTMLTextAreaElement: {
      const selectedText = activeElement.value
      const commandResult = await editTextArea(selectedText)
      if (
        commandResult.status === 0 &&
        commandResult.output !== selectedText
      ) {
        activeElement.focus()
        activeElement.value = commandResult.output
        activeElement.dispatchEvent(new InputEvent('input'))
      }
      break
    }

    // Inserting text in content editable elements _usually works_ by dispatching a clipboard event, or
    // writing text to the system clipboard and let user paste it.
    case activeElement.isContentEditable: {
      const selection = window.getSelection()
      const ranges = Array(selection.rangeCount).fill(selection).map((selection, index) => selection.getRangeAt(index))
      selection.selectAllChildren(activeElement)
      const selectedText = selection.toString()
      selection.removeAllRanges()
      for (const range of ranges) {
        selection.addRange(range)
      }
      const commandResult = await editTextArea(selectedText)
      if (
        commandResult.status === 0 &&
        commandResult.output !== selectedText
      ) {
        activeElement.focus()
        selection.selectAllChildren(activeElement)
        // Note: Chrome won’t replace selected text properly without an event loop iteration.
        setTimeout(() => {
          dispatchPaste(activeElement, commandResult.output)
        }, 200)

        // Also write the command output to the system clipboard.
        navigator.clipboard.writeText(commandResult.output)
      }
      break
    }

    case selection.type === 'Range': {
      const selectedText = selection.toString()
      await editTextArea(selectedText)
      break
    }
  }
}
