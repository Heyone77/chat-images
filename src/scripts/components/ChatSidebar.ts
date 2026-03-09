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
  const chatMessageType = isVeriosnAfter13() ?
      CONST.CHAT_MESSAGE_STYLES.OOC :
      CONST.CHAT_MESSAGE_TYPES.OOC
  return typeof chatMessageType !== 'undefined' ? chatMessageType : 1
}

const pasteAndDropEventHandler = (sidebar: JQuery) => (evt: any) => {
  const originalEvent: ClipboardEvent | DragEvent = evt.originalEvent
  const eventData: DataTransfer | null = (originalEvent as ClipboardEvent).clipboardData || (originalEvent as DragEvent).dataTransfer
  if (!eventData) return

  processDropAndPasteImages(eventData, sidebar)
}

const submitHandler = (sidebar: JQuery) => async (evt: any) => {
  if (isSending) return

  const imageQueue = getImageQueue()
  if (!imageQueue.length) return // пусть Foundry отправляет обычное сообщение

  // Мы отправляем сами
  evt.preventDefault()
  evt.stopPropagation()

  isSending = true
  const uploadState = getUploadingStates(sidebar)
  uploadState.on()

  try {
    // дождаться загрузки всех File-элементов очереди
    await ensureUploadedQueue(sidebar)

    const input = find('#chat-message', sidebar) as any
    const text: string = input?.val ? String(input.val() ?? '') : ''
    const content = text ?
        `${messageTemplate(imageQueue)}<div class="ci-notes">${text}</div>` :
        messageTemplate(imageQueue)

    await ChatMessage.create({
      content,
      type: getChatMessageType(),
      user: (game as Game).user?.id,
    })

    // очистить поле ввода
    if (input?.val) input.val('')

    removeAllFromQueue(sidebar)  } catch (error) {
    ui.notifications?.error(t('unableToLoadImage'))
    console.error('chat-images: failed to send image message', error)
  } finally {
    uploadState.off()
    isSending = false
  }
}

export const isUploadAreaRendered = (sidebar: JQuery): boolean => {
  const uploadArea = find('#ci-chat-upload-area', sidebar)
  return !!uploadArea.length
}

export const initChatSidebar = (sidebar: JQuery) => {
  // paste/drop
  on(sidebar, 'paste drop', pasteAndDropEventHandler(sidebar))

  // submit (кнопка/enter)
  const chatFormQuery = isVeriosnAfter13() ? '.chat-form' : '#chat-form'
  const chatForm = find(chatFormQuery, sidebar)
  on(chatForm, 'submit', submitHandler(sidebar))
}



