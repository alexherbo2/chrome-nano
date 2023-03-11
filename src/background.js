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

// Handles the initial setup when the extension is first installed or updated to a new version.
// Reference: https://developer.chrome.com/docs/extensions/reference/runtime/#event-onInstalled
function onInstalled(details) {
  switch (details.reason) {
    case 'install':
      onInstall()
      break
    case 'update':
      onUpdate(details.previousVersion)
      break
  }
  createMenuItems()
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
// Reference: https://developer.chrome.com/docs/extensions/reference/storage/#event-onChanged
function onOptionsChange(changes, areaName) {
  Object.assign(nano, changes.nano.newValue)
}

// Handles messages by using a discriminator field.
// Each message has a `type` field, and the rest of the fields, and their meaning, depend on its value.
// Reference: https://crystal-lang.org/api/master/JSON/Serializable.html#discriminator-field
function onMessage(message, sender, sendResponse) {
  switch (message.type) {
    case 'action':
      onActionMessage(message, sender, sendResponse)
      break
    default:
      sendResponse({ type: 'error', message: 'Unknown request' })
  }
  return true
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

// Handles the browser action on click.
// Reference: https://developer.chrome.com/docs/extensions/reference/action/#event-onClicked
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
// Reference: https://developer.chrome.com/docs/extensions/reference/contextMenus/#event-onClicked
function onMenuItemClicked(info, tab) {
  chrome.scripting.executeScript({
    target: {
      tabId: tab.id,
      frameIds: [info.frameId]
    },
    func: editTextArea
  })
}

// Edits text areas in webpages with a text editor program—such as nano.
// Uses message passing to open the editor from the content script.
async function editTextArea() {
  const editTextArea = input => chrome.runtime.sendMessage({
    type: 'action',
    action: 'editTextArea',
    input
  })
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
        commandResult.output.length > 0 && commandResult.output !== '\n' &&
        commandResult.output !== selectedText
      ) {
        activeElement.value = commandResult.output
        activeElement.dispatchEvent(new InputEvent('input'))
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

// Handles long-lived connections.
// Uses the channel name to distinguish different types of connections.
// Reference: https://developer.chrome.com/docs/extensions/mv3/messaging/#connect
function onConnect(port) {
  switch (port.name) {
    case 'options':
      optionsWorker.onConnect(port)
      break
    default:
      port.postMessage({ type: 'error', message: `Unknown type of connection: ${port.name}` })
  }
}

// Configure nano.
chrome.storage.sync.get(options => Object.assign(nano, options.nano))

// Set up listeners.
// Reference: https://developer.chrome.com/docs/extensions/mv3/service_workers/#listeners
chrome.runtime.onInstalled.addListener(onInstalled)
chrome.storage.onChanged.addListener(onOptionsChange)
chrome.action.onClicked.addListener(onAction)
chrome.contextMenus.onClicked.addListener(onMenuItemClicked)
chrome.runtime.onMessage.addListener(onMessage)
chrome.runtime.onConnect.addListener(onConnect)
