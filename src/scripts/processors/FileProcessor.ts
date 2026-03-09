import {FilePickerImplementation, ORIGIN_FOLDER, randomString, t, userCanUpload} from '../utils/Utils'
import {addClass, append, create, find, on, remove, removeClass} from '../utils/JqueryWrappers'
import imageCompression from 'browser-image-compression'
import {getSetting} from '../utils/Settings'

export type SaveValueType = {
  type?: string,
  name?: string,
  file?: File,
  imageSrc: string | ArrayBuffer | null,
  id: string,
}

const RESTRICTED_DOMAINS = ['static.wikia']
const domParser = new DOMParser()

let imageQueue: SaveValueType[] = []

const isFileImage = (file: File | DataTransferItem) => file.type && file.type.startsWith('image/')

const isBlobUrl = (src: unknown): src is string => typeof src === 'string' && src.startsWith('blob:')

const safeRevokeObjectUrl = (src: unknown) => {
  if (!isBlobUrl(src)) return
  try {
    URL.revokeObjectURL(src)
  } catch (_) {/* ignore */}
}

const createImagePreview = ({imageSrc, id}: SaveValueType): JQuery => create(
    `<div id="${id}" class="ci-upload-area-image">
      <i class="ci-remove-image-icon fa-regular fa-circle-xmark"></i>
      <img class="ci-image-preview" src="${String(imageSrc)}" alt="${t('unableToLoadImage')}"/>
   </div>`
)

const addEventToRemoveButton = (removeButton: JQuery, saveValue: SaveValueType, uploadArea: JQuery) => {
  const removeEventHandler = () => {
    const image = find(`#${saveValue.id}`, uploadArea)
    remove(image)

    // revoke blob url to avoid memory leak
    if (saveValue.file) safeRevokeObjectUrl(saveValue.imageSrc)

    imageQueue = imageQueue.filter((imgData: SaveValueType) => saveValue.id !== imgData.id)
    if (imageQueue.length) return

    addClass(uploadArea, 'hidden')
  }
  on(removeButton, 'click', removeEventHandler)
}

/**
 * Upload a File-based queue item to Foundry and return its stored path.
 * NOTE: FilePickerImplementation is a class (eslint new-cap) so we instantiate it.
 */
const uploadImage = async (saveValue: SaveValueType): Promise<string> => {
  const generateFileName = (sv: SaveValueType) => {
    const {type, name, id} = sv
    const fileExtension: string =
        name?.substring(name.lastIndexOf('.'), name.length) ||
        type?.replace('image/', '.') ||
        '.jpeg'
    return `${id}${fileExtension}`
  }

  try {
    const newName = generateFileName(saveValue)

    const compressedImage = await imageCompression(saveValue.file as File, {
      maxSizeMB: 1.5,
      useWebWorker: true,
      alwaysKeepResolution: true,
    })

    const newImage = new File([compressedImage as File], newName, {type: saveValue.type})

    const uploadLocation = getSetting('uploadLocation')

    // @ts-ignore
    const filePicker = FilePickerImplementation() as any

    // @ts-ignore
    const imageLocation = await filePicker.upload(
        ORIGIN_FOLDER,
        uploadLocation,
        newImage,
        {},
        {notify: false},
    )

    if (!imageLocation || !(imageLocation as FilePicker.UploadReturn)?.path) {
      // fallback: keep current src
      return saveValue.imageSrc as string
    }
    return (imageLocation as FilePicker.UploadReturn).path
  } catch (e) {
    return saveValue.imageSrc as string
  }
}

/**
 * LAZY: just add preview and queue. No upload here.
 */
const addImageToQueue = async (saveValue: SaveValueType, sidebar: JQuery) => {
  const uploadArea: JQuery = find('#ci-chat-upload-area', sidebar)
  if (!uploadArea || !uploadArea[0]) return

  // show preview from blob url (fast) if it is a File
  if (saveValue.file) {
    if (!userCanUpload()) return

    // Use object URL to avoid base64 memory spike in UI
    saveValue.imageSrc = URL.createObjectURL(saveValue.file)
  }

  const imagePreview = createImagePreview(saveValue)
  if (!imagePreview || !imagePreview[0]) return

  removeClass(uploadArea, 'hidden')
  const imagesContainer: JQuery = find('.ci-upload-area-images', uploadArea)
  append(imagesContainer[0] ? imagesContainer : uploadArea, imagePreview)
  imageQueue.push(saveValue)

  const removeButton = find('.ci-remove-image-icon', imagePreview)
  addEventToRemoveButton(removeButton, saveValue, uploadArea)
}

const imagesFileReaderHandler = (file: File, sidebar: JQuery) => async (_evt: Event) => {
  // We no longer need FileReader result for preview; blob URL will be used.
  const saveValue: SaveValueType = {type: file.type, name: file.name, imageSrc: '', id: randomString(), file}
  await addImageToQueue(saveValue, sidebar)
}

export const processImageFiles = (files: FileList | File[], sidebar: JQuery) => {
  for (let i = 0; i < files.length; i++) {
    const file: File = files[i]
    if (!isFileImage(file)) continue

    // no DataURL read; just queue
    void imagesFileReaderHandler(file, sidebar)(new Event('load'))
  }
}

export const processDropAndPasteImages = (eventData: DataTransfer, sidebar: JQuery) => {
  const extractUrlFromEventData = (ed: DataTransfer): string[] | null => {
    const html = ed.getData('text/html')
    if (!html) return null

    const images = domParser.parseFromString(html, 'text/html').querySelectorAll('img')
    if (!images || !images.length) return null

    // @ts-ignore
    const imageUrls = [...images].map((img) => img.src as string)
    const hasRestricted = imageUrls.some((iu) => RESTRICTED_DOMAINS.some((rd) => iu.includes(rd)))
    return hasRestricted ? null : imageUrls
  }

  const urlsFromEventDataHandler = async (urls: string[]) => {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i]
      const saveValue: SaveValueType = {imageSrc: url, id: randomString()}
      await addImageToQueue(saveValue, sidebar)
    }
  }

  // 1) try files first (better UX)
  const extractFilesFromEventData = (ed: DataTransfer): File[] => {
    const items: DataTransferItemList = ed.items
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item: DataTransferItem = items[i]
      if (!isFileImage(item)) continue
      const file = item.getAsFile()
      if (!file) continue
      files.push(file)
    }
    return files
  }

  const files: File[] = extractFilesFromEventData(eventData)
  if (files && files.length) return processImageFiles(files, sidebar)

  // 2) fallback to URLs from HTML
  const urls: string[] | null = extractUrlFromEventData(eventData)
  if (urls && urls.length) return void urlsFromEventDataHandler(urls)
}

export const getImageQueue = (): SaveValueType[] => imageQueue

/**
 * Upload all queued File items and mutate queue imageSrc -> stored path.
 * Must be awaited BEFORE creating ChatMessage.
 */
export const ensureUploadedQueue = async (sidebar: JQuery) => {
  // upload sequentially to avoid hammering FilePicker
  for (let i = 0; i < imageQueue.length; i++) {
    const item = imageQueue[i]
    if (!item.file) continue // URL-based item
    const oldSrc = item.imageSrc

    // if already uploaded (path) skip; we treat blob: as not uploaded
    if (!isBlobUrl(oldSrc)) continue

    const uploadedPath = await uploadImage(item)
    item.imageSrc = uploadedPath

    // clean blob url
    safeRevokeObjectUrl(oldSrc)
  }
}

export const removeAllFromQueue = (sidebar: JQuery) => {
  while (imageQueue.length) {
    const imageData: SaveValueType | undefined = imageQueue.pop()
    if (!imageData) continue

    if (imageData.file) safeRevokeObjectUrl(imageData.imageSrc)

    const imageElement = find(`#${imageData.id}`, sidebar)
    remove(imageElement)
  }

  const uploadArea: JQuery = find('#ci-chat-upload-area', sidebar)
  addClass(uploadArea, 'hidden')
}


