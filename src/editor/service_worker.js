// This module contains the editor service worker to run commands via messages.
//
// Uses a long-lived connection for the editor lifetime.
// This allows to determine when the editor shows up or goes away.
//
// Action: https://developer.chrome.com/docs/extensions/reference/action/
// Service workers: https://developer.chrome.com/docs/extensions/mv3/service_workers/
// Long-lived connections: https://developer.chrome.com/docs/extensions/mv3/messaging/#connect

import nano from '../nano.js'

// Adds items to the browser’s context menu.
// Reference: https://developer.chrome.com/docs/extensions/reference/contextMenus/
function createMenuItems() {
  chrome.contextMenus.create({
    id: 'open-nano',
    title: 'Open with nano',
    contexts: ['editable']
  })
}

// Handles the initial setup when the extension is first installed.
function onInstall() {
  createMenuItems()
}

// Handles the setup when the extension is updated to a new version.
function onUpdate(previousVersion) {
  createMenuItems()
}

// Handles a new connection when the editor shows up.
function onConnect(port) {
  port.onDisconnect.addListener(onDisconnect)
  port.onMessage.addListener(onMessage)
}

// Handles disconnection when the editor goes away.
function onDisconnect(port) {
}

// Handles message by using a discriminator field.
// Each message has a `type` field, and the rest of the fields, and their meaning, depend on its value.
// Reference: https://crystal-lang.org/api/master/JSON/Serializable.html#discriminator-field
// Handles a single command.
function onMessage(message, port) {
  nano.open(message.input).then((result) => port.postMessage(result))
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

// Handles the browser action.
function editTextArea() {
  // Open a channel to communicate with the service worker.
  const port = chrome.runtime.connect({ name: 'editor' })
  const activeElement = document.activeElement

  switch (activeElement.constructor) {
    case HTMLInputElement:
    case HTMLTextAreaElement:
      const boundSelection = activeElement.setSelectionRange.bind(activeElement, activeElement.selectionStart, activeElement.selectionEnd, activeElement.selectionDirection)
      port.onMessage.addListener((result) => {
        if (result.status === 0) {
          activeElement.value = result.output
          boundSelection()
          activeElement.dispatchEvent(new Event('input'))
        }
      })
      port.postMessage({
        type: 'open',
        input: activeElement.value
      })
      break

    default:
      port.disconnect()
  }
}

export default { createMenuItems, onInstall, onUpdate, onConnect, onAction, onMenuItemClicked }
