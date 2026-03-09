import {before, create, find, on} from '../utils/JqueryWrappers'
import {isVeriosnAfter13, t} from '../utils/Utils'
import {removeAllFromQueue} from '../processors/FileProcessor'

const createUploadArea = (): JQuery =>
  create(`
    <div id="ci-chat-upload-area" class="hidden">
      <div class="ci-upload-area-images"></div>
      <div class="ci-upload-actions">
        <a id="ci-send-images" title="${t('sendButtonTitle')}"><i class="fa-solid fa-paper-plane"></i></a>
        <i class="ci-clear-all fa-solid fa-trash" title="${t('clearButtonTitle')}"></i>
      </div>
    </div>`)

export const initUploadArea = (sidebar: JQuery) => {
  const uploadArea = createUploadArea()

  const chatMessage: JQuery = find('#chat-message', sidebar)
  if (chatMessage && chatMessage[0]) {
    before(chatMessage, uploadArea)
  } else {
    const selector = isVeriosnAfter13() ? '.chat-controls' : '#chat-controls'
    let chatControls = find(selector, sidebar)

    if (!chatControls || !chatControls[0]) chatControls = find(selector)
    if (chatControls && chatControls[0]) before(chatControls, uploadArea)
  }

  const clearBtn = find('.ci-clear-all', uploadArea)
  on(clearBtn, 'click', () => removeAllFromQueue(sidebar))
}
