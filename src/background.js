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
    contexts: ['editable']
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

// Handles the browser action.
async function onAction(tab) {
  const [injectionResult] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const computeSelector = element => (
        element === document.documentElement
          ? document.documentElement.tagName
          : `${computeSelector(element.parentElement)} > :nth-child(${Array.from(element.parentElement.children).indexOf(element) + 1})`
      )
      return [computeSelector(document.activeElement), document.activeElement.value]
    }
  })
  const [uniqueSelector, input] = injectionResult.result
  const commandResult = await nano.open(input)

  if (commandResult.status !== 0) {
    return
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id, documentIds: [injectionResult.documentId] },
    func: (uniqueSelector, output) => {
      const activeElement = document.querySelector(uniqueSelector)
      const boundSelection = activeElement.setSelectionRange.bind(activeElement, activeElement.selectionStart, activeElement.selectionEnd, activeElement.selectionDirection)
      activeElement.value = output
      boundSelection()
      activeElement.dispatchEvent(new Event('input'))
    },
    args: [uniqueSelector, commandResult.output]
  })
}

// Handles the context menu on click.
function onMenuItemClicked(info, tab) {
  onAction(tab)
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
