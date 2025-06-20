# 🐱🎵 YtDl‑Nekochii

![nyatube-dl](https://files.catbox.moe/ov32ud.jpg)

> *Effortlessly download and manage YouTube videos with YtDl‑Nekochii.*

---

## 📜 Description

**YtDl‑Nekochii** is a tool designed for downloading and managing YouTube videos with ease. Its simple interface and powerful features make it ideal for anyone looking to build a personal video archive quickly and efficiently.

### ⚡️ Features

* ✅ **Automated Downloads** — Quickly download videos from YouTube.
* 🎞️ **Multiple Format Support** — Supports MP4, MP3, and more.
* 📰 **Complete Metadata Extraction** — Get title, description, thumbnail, and more.
* 💻 **Third‑party Compatibility** — Works seamlessly with `yt-dlp` and related libraries.

---

## ⚙️ Usage

### 1️⃣ Install

Make sure **Node.js** and **npm** are installed, then run:

```bash
git clone https://github.com/senochii/nyatube-dl.git
cd nyatube-dl
npm install
```

### 2️⃣ Run the Tool

Example for downloading a video:

```bash
curl "https://nekochii-ytdl.hf.space/video?url=https://www.youtube.com/watch?v=example"
```

### 3️⃣ Arguments & Options

* `video` — Get video files.
* `audio` — Get audio files.
* `--format` — Specify the desired format (`mp4`, `mp3`).

Example:

```bash
curl "https://nekochii-ytdl.hf.space/video?url=https://www.youtube.com/watch?v=example"
```

---

## 📝 Documentation

* 🌐 **Website:** [YtDl Main](https://nekochii-ytdl.hf.space)
* 📚 **API Reference:** [Nekochii Api's](https://nekochii-ytdl.hf.space)

---

## 👨‍💻 Author

Developed and Maintained by:

* 👤 **Name:** Senochiii
* 🐱 **GitHub:** [@Seneko](https://github.com/senochii)
* 📧 **Email:** [support@nekochii.com](support@archivends.my.id)

---

## 📂 Folder Structure

```
nyatube-dl/
├─ index.js           # Main app entry point
├─ cookie.json        # YouTube cookie for extracting data
├─ app.txt            # Usage documentation
├─ README.md          # Project documentation
├─ package.json       # App dependencies
```

---

## 🛠️ Dependencies

* 📥 [yt-dlp](https://github.com/yt-dlp/yt-dlp) — YouTube video downloader.
* 🌐 [axios](https://www.npmjs.com/package/axios) — HTTP requests.
* 🌈 [chalk](https://www.npmjs.com/package/chalk) — Colored terminal output.
* 📋 [form-data](https://www.npmjs.com/package/form-data) — Upload files and manage forms.

---

## ❤️ Support

If you find bugs or have feature requests, feel free to open an issue on [GitHub Issues](https://github.com/senochii/nyatube-dl/issues).

Thank you for using **YtDl‑Nekochii**! Enjoy downloading! 😺🎵
