# Chat Images (Foundry VTT)

Add **images to chat messages** in **Foundry VTT** via:

- Drag & drop image files into chat
- Paste images from clipboard (Ctrl+V)
- Embed image URLs (with a small syntax wrapper)
- Preview images in a queue before sending

This repository is a maintained fork focused on Foundry VTT **v13+** compatibility and UX polish.

---

## Features

- ✅ Paste image files into chat
- ✅ Drag & drop image files into chat
- ✅ Add multiple images per message
- ✅ Quick preview + remove individual images before sending
- ✅ Convert an image URL into an image using a simple marker

---

## Installation

### Option A — Install from a Release (recommended)

1. Download the latest `module.zip` from **Releases**
2. Extract to your Foundry data folder:

- `FoundryVTT/Data/modules/chat-images/`

3. Enable the module in your world:

- **Game Settings → Manage Modules → Chat Images**

### Option B — Install from source (dev)

```bash
npm install
npm run build
```

Then copy (or symlink) the `dist/` output into:

- `FoundryVTT/Data/modules/chat-images/`

---

## Usage

### Paste / Drop

- Drag an image file into the chat panel
- Or copy an image and press **Ctrl+V** in chat

### Convert an image URL into an image

Wrap the URL in the `!ci|...!` marker:

```
!ci|https://example.com/image.png!
```

This is intentional to avoid converting every random URL into an image automatically.

---

## Permissions (important)

To upload image **files** (paste/drop of actual files), users need:

- **Upload New Files** permission

Without it, they can still embed **image URLs**, but file uploads will be blocked (and users may see warnings).

---

## Example

![usage](./readme/example.gif)

---

## Foundry v13 notes

Foundry v13 introduced changes in the chat UI structure which can affect:

- chat notification integrations
- button placement inside chat controls

This fork prioritizes:

- reliable paste/drop behavior
- a clean preview queue experience
- uploads via Foundry FilePicker

---

## Troubleshooting

### Images don’t upload

- Confirm the user has **Upload New Files** permission
- Check module settings for upload directory (e.g. `uploaded-chat-images`)
- Open browser console (F12) and look for errors related to FilePicker uploads

### Paste/drop behaves weirdly with other modules

Some chat-enhancing modules/themes also hook paste/drop events.

When reporting issues, please include:

- Foundry version
- list of chat-related modules enabled
- theme name (if any)
- steps to reproduce
- console logs

---

## Credits

This project is a fork of the original **Chat Images** module by **bmarian**.

- Original repository: https://github.com/bmarian/chat-images

All credit for the original concept and implementation goes to the original author and contributors.

---

## License

See [LICENSE.md](./LICENSE.md).
