const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const ytdl = require("@distube/ytdl-core");
const ytSearch = require("yt-search");
const cp = require("child_process");
const os = require("os");

const app = express();
const PORT = 7860;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const tempDir = path.join("/tmp", "public");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
app.use("/files", express.static(tempDir));

const formatBytes = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + sizes[i];
};
const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const formatDate = (dateString) => {
  const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const date = new Date(dateString);
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};
const getVideoInfo = async (url) => {
  const info = await ytdl.getInfo(url);
  const details = info.videoDetails;
  return {
    title: details.title,
    description: details.description || "Tidak ada deskripsi",
    thumbnail: details.thumbnails.pop().url,
    duration: `${Math.floor(details.lengthSeconds / 60)}:${details.lengthSeconds % 60} menit`,
    uploader: details.author.name,
    uploadDate: formatDate(details.uploadDate),
    views: formatNumber(details.viewCount),
    likes: formatNumber(details.likes || 0),
  };
};
const getParam = (req, key) => req.method === "GET" ? req.query[key] : req.body[key];

const utils = {
  formatSize: (bytes) => {
    if (bytes === 0) return "0 B";
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
  },
};

app.all("/", (_, res) => {
  const status = {};
  status["diskUsage"] = cp.execSync("du -sh").toString().split("\t")[0];

  const used = process.memoryUsage();
  for (let x in used) {
    status[x] = utils.formatSize(used[x]);
  }

  const totalmem = os.totalmem();
  const freemem = os.freemem();
  status["memoryUsage"] = `${utils.formatSize(totalmem - freemem)} / ${utils.formatSize(totalmem)}`;

  const id = process.env.SPACE_ID;

  res.json({
    message: id
      ? `Go to https://hf.co/spaces/${id}/discussions for discuss`
      : "Hello World!",
    owner: "https://github.com/swndyy",
    uptime: new Date(process.uptime() * 1000).toUTCString().split(" ")[4],
    status,
  });
});

// Route /video
app.all("/video", async (req, res) => {
  const url = getParam(req, "url");
  if (!url || !ytdl.validateURL(url))
    return res.status(400).json({ error: "URL tidak valid" });
  try {
    const infoFull = await ytdl.getInfo(url);
    const videoFormat = ytdl.chooseFormat(infoFull.formats, {
      filter: "videoandaudio",
      quality: "highest",
    });
    const info = await getVideoInfo(url);
    const filename = `video-${Date.now()}.mp4`;
    const writePath = path.join(tempDir, filename);
    const videoStream = ytdl(url, { format: videoFormat });
    const writeStream = fs.createWriteStream(writePath);
    videoStream.pipe(writeStream);
    writeStream.on("finish", () => {
      res.json({
        info,
        result: {
          quality: videoFormat.qualityLabel || "Tidak diketahui",
          size: videoFormat.contentLength
            ? formatBytes(parseInt(videoFormat.contentLength))
            : "Ukuran tidak tersedia",
          url: `${req.protocol}://${req.get("host")}/files/${filename}`,
        },
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Gagal memproses video", details: error.message });
  }
});

// Route /audio
app.all("/audio", async (req, res) => {
  const url = getParam(req, "url");
  if (!url || !ytdl.validateURL(url))
    return res.status(400).json({ error: "URL tidak valid" });
  try {
    const infoFull = await ytdl.getInfo(url);
    const audioFormat = ytdl.chooseFormat(infoFull.formats, { filter: "audioonly" });
    const info = await getVideoInfo(url);
    const filename = `audio-${Date.now()}.mp3`;
    const writePath = path.join(tempDir, filename);
    const audioStream = ytdl(url, { format: audioFormat });
    const writeStream = fs.createWriteStream(writePath);
    audioStream.pipe(writeStream);
    writeStream.on("finish", () => {
      res.json({
        info,
        result: {
          quality: `${audioFormat.audioBitrate} kbps`,
          size: audioFormat.contentLength
            ? formatBytes(parseInt(audioFormat.contentLength))
            : "Ukuran tidak tersedia",
          url: `${req.protocol}://${req.get("host")}/files/${filename}`,
        },
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Gagal memproses audio", details: error.message });
  }
});

// Route /search
app.all("/search", async (req, res) => {
  const query = getParam(req, "q");
  if (!query) return res.status(400).json({ error: "Parameter 'q' wajib diisi" });
  try {
    const result = await ytSearch(query);
    const videos = result.videos.map((video) => ({
      title: video.title,
      channel: video.author.name,
      views: formatNumber(video.views),
      duration: video.timestamp,
      uploaded: video.ago,
      url: video.url,
      thumbnail: video.thumbnail,
    }));

    res.json({ query, results: videos });
  } catch (error) {
    res.status(500).json({ error: "Gagal memproses pencarian", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});