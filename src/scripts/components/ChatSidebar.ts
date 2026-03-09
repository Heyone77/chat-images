import {find, on} from '../utils/JqueryWrappers'
import {ensureUploadedQueue, getImageQueue, processDropAndPasteImages, removeAllFromQueue, SaveValueType} from '../processors/FileProcessor'
import {isVeriosnAfter13, t} from '../utils/Utils'
import {getUploadingStates} from './Loader'

let isSending = false

const imageTemplate = (imageProps: SaveValueType): string => `<div class="ci-message-image"><img src="${imageProps.imageSrc}" alt="${imageProps.name || t('unableToLoadImage')}"></div>`

const messageTemplate = (imageQueue: SaveValueType[]) => {
  const imageTemplates: string[] = imageQueue.map((imageProps: SaveValueType): string => imageTemplate(imageProps))
  return `<div class="ci-message">${imageTemplates.join('')}</div>`
}

const getChatMessageType = () => {
  const chatMessageType = isVeriosnAfter13() ? CONST.CHAT_MESSAGE_STYLES.OOC : CONST.CHAT_MESSAGE_TYPES.OOC
  return typeof chatMessageType !== 'undefined' ? chatMessageType : 1
}

const sendQueuedMessage = async (sidebar: JQuery) => {
  if (isSending) return

  const imageQueue = getImageQueue()
  if (!imageQueue.length) return

  isSending = true
  const uploadState = getUploadingStates(sidebar)
  uploadState.on()

  try {
    await ensureUploadedQueue(sidebar)

    const input = find('#chat-message', sidebar) as any
    const text: string = input?.val ? String(input.val() ?? '') : ''
    const content = text ? `${messageTemplate(imageQueue)}<div class="ci-notes">${text}</div>` : messageTemplate(imageQueue)

    const chatMessageData: Record<string, unknown> = {content}
    if (isVeriosnAfter13()) {
      chatMessageData.style = getChatMessageType()
      chatMessageData.author = (game as Game).user?.id
    } else {
      chatMessageData.type = getChatMessageType()
      chatMessageData.user = (game as Game).user?.id
    }

    await ChatMessage.create(chatMessageData as any)

    if (input?.val) input.val('')
    removeAllFromQueue(sidebar)
  } catch (error) {
    ui.notifications?.error(t('unableToLoadImage'))
    console.error('chat-images: failed to send image message', error)
  } finally {
    uploadState.off()
    isSending = false
  }
}

const pasteAndDropEventHandler = (sidebar: JQuery) => (evt: any) => {
  const originalEvent: ClipboardEvent | DragEvent = evt.originalEvent
  const eventData: DataTransfer | null = (originalEvent as ClipboardEvent).clipboardData || (originalEvent as DragEvent).dataTransfer
  if (!eventData) return

  processDropAndPasteImages(eventData, sidebar)
}

const submitHandler = (sidebar: JQuery) => async (evt: any) => {
  if (!getImageQueue().length) return

  evt.preventDefault()
  evt.stopPropagation()
  await sendQueuedMessage(sidebar)
}

const sendButtonClickHandler = (sidebar: JQuery) => async (evt: any) => {
  evt.preventDefault()
  evt.stopPropagation()
  await sendQueuedMessage(sidebar)
}

const enterFallbackHandler = (sidebar: JQuery) => async (evt: any) => {
  const original = evt.originalEvent || evt
  if (!original || original.key !== 'Enter') return
  if (original.shiftKey || original.ctrlKey || original.altKey || original.metaKey) return
  if (!getImageQueue().length) return

  evt.preventDefault()
  evt.stopPropagation()
  await sendQueuedMessage(sidebar)
}

export const isUploadAreaRendered = (sidebar: JQuery): boolean => {
  const uploadArea = find('#ci-chat-upload-area', sidebar)
  return !!uploadArea.length
}

export const initChatSidebar = (sidebar: JQuery) => {
  on(sidebar, 'paste drop', pasteAndDropEventHandler(sidebar))

  const chatFormQuery = isVeriosnAfter13() ? '.chat-form' : '#chat-form'
  const chatForm = find(chatFormQuery, sidebar)
  on(chatForm, 'submit', submitHandler(sidebar))

  const sendButton = find('#ci-send-images', sidebar)
  on(sendButton, 'click', sendButtonClickHandler(sidebar))

  const chatInput = find('#chat-message', sidebar)
  on(chatInput, 'keydown', enterFallbackHandler(sidebar))
}
