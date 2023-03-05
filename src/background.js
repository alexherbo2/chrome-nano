// This module contains the background service worker to run commands via messages,
// using keyboard shortcuts or menu commands.
//
// Service workers: https://developer.chrome.com/docs/extensions/mv3/service_workers/
// Messaging: https://developer.chrome.com/docs/extensions/mv3/messaging/

import nano from './nano.js'
import optionsWorker from './options/service_worker.js'

// Retrieve the default config.
const configPromise = fetch('config.json').then(response => response.json())

// Adds items to the browser’s context menu.
// Reference: https://developer.chrome.com/docs/extensions/reference/contextMenus/
function createMenuItems() {
  chrome.contextMenus.create({
    id: 'open-nano',
    title: 'Open with nano',
    contexts: ['editable', 'selection']
  })
}

// Handles the initial setup when the extension is first installed.
async function onInstall() {
  const config = await configPromise
  await chrome.storage.sync.set(config)
}

// Handles the setup when the extension is updated to a new version.
async function onUpdate(previousVersion) {
  const config = await configPromise
  const options = await chrome.storage.sync.get()
  await chrome.storage.sync.set({ ...config, ...options })
}

// Handles option changes.
function onOptionsChange(changes, areaName) {
  Object.assign(nano, changes.nano.newValue)
}

// Handles action message.
function onActionMessage(message, sender, sendResponse) {
  switch (message.action) {
    case 'editTextArea':
      nano.open(message.input).then(sendResponse)
      break

    default:
      sendResponse({ type: 'error', message: `Unknown action: ${message.action}` })
  }
}

// Handles the browser action.
function onAction(tab) {
  chrome.scripting.executeScript({
    target: {
      tabId: tab.id,
      allFrames: true
    },
    func: editTextArea
  })
}

// Handles the context menu on click.
function onMenuItemClicked(info, tab) {
  chrome.scripting.executeScript({
    target: {
      tabId: tab.id,
      frameIds: [info.frameId]
    },
    func: editTextArea
  })
}

async function editTextArea() {
  const selection = window.getSelection()
  const ranges = Array(selection.rangeCount).fill(selection).map((selection, index) => selection.getRangeAt(index))
  const selectRanges = (selection, ranges) => {
    selection.removeAllRanges()
    for (const range of ranges) {
      selection.addRange(range)
    }
  }
  const boundRanges = selectRanges.bind(null, selection, ranges)
  const getActiveElement = (documentOrShadowRoot = document) => documentOrShadowRoot.activeElement.shadowRoot ? getActiveElement(documentOrShadowRoot.activeElement.shadowRoot) : documentOrShadowRoot.activeElement
  const activeElement = getActiveElement()

  switch (activeElement.constructor) {
    case HTMLInputElement:
    case HTMLTextAreaElement:
      const boundSelection = activeElement.setSelectionRange.bind(activeElement, activeElement.selectionStart, activeElement.selectionEnd, activeElement.selectionDirection)
      const result = await chrome.runtime.sendMessage({ type: 'action', action: 'editTextArea', input: activeElement.value })
      if (result.status === 0) {
        activeElement.value = result.output
        boundSelection()
        activeElement.dispatchEvent(new Event('input'))
      }
      break

    default: {
      if (activeElement.isContentEditable) {
        selection.selectAllChildren(activeElement)
        const selectedText = selection.toString()
        boundRanges()
        const result = await chrome.runtime.sendMessage({ type: 'action', action: 'editTextArea', input: selectedText })
        if (result.status === 0 && result.output.length > 0 && result.output !== '\n' && result.output !== selectedText) {
          activeElement.addEventListener('focus', event => navigator.clipboard.writeText(result.output), { once: true })
        }
      } else {
        const selection = window.getSelection()
        switch (selection.type) {
          case 'None':
          case 'Caret': {
            await chrome.runtime.sendMessage({ type: 'action', action: 'editTextArea' })
            break
          }
          case 'Range': {
            const selectedText = selection.toString()
            await chrome.runtime.sendMessage({ type: 'action', action: 'editTextArea', input: selectedText })
            break
          }
        }
      }
    }
  }
}

// Configure nano.
chrome.storage.sync.get(options => Object.assign(nano, options.nano))

// Handle the initial setup when the extension is first installed or updated to a new version.
// Reference: https://developer.chrome.com/docs/extensions/reference/runtime/#event-onInstalled
chrome.runtime.onInstalled.addListener((details) => {
  switch (details.reason) {
    case 'install':
      onInstall()
      break
    case 'update':
      onUpdate(details.previousVersion)
      break
  }
  createMenuItems()
})

// Handle option changes.
// Reference: https://developer.chrome.com/docs/extensions/reference/storage/#event-onChanged
chrome.storage.onChanged.addListener(onOptionsChange)

// Handle the browser action on click.
// Reference: https://developer.chrome.com/docs/extensions/reference/action/#event-onClicked
chrome.action.onClicked.addListener(onAction)

// Handle the context menu on click.
// Reference: https://developer.chrome.com/docs/extensions/reference/contextMenus/#event-onClicked
chrome.contextMenus.onClicked.addListener(onMenuItemClicked)

// Handle messages by using a discriminator field.
// Each message has a `type` field, and the rest of the fields, and their meaning, depend on its value.
// Reference: https://crystal-lang.org/api/master/JSON/Serializable.html#discriminator-field
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'action':
      onActionMessage(message, sender, sendResponse)
      break
    default:
      sendResponse({ type: 'error', message: 'Unknown request' })
  }
  return true
})

// Handle long-lived connections.
// Use the channel name to distinguish different types of connections.
// Reference: https://developer.chrome.com/docs/extensions/mv3/messaging/#connect
chrome.runtime.onConnect.addListener((port) => {
  switch (port.name) {
    case 'options':
      optionsWorker.onConnect(port)
      break
    default:
      port.postMessage({ type: 'error', message: `Unknown type of connection: ${port.name}` })
  }
})
