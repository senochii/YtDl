import express from "express";
import cors from "cors";
import fs from "fs";
import fetch from 'node-fetch';
import path from "path";
import ytdl from "@distube/ytdl-core";
import ytSearch from "yt-search";
import cp from "child_process";
import os from "os";
import favicon from "serve-favicon";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Plan Scraper dimana ribet kalo pake ytdl-core disebabkan harus menggunakan cookies

const y2mate = {
    headers: {
        "Referer": "https://y2mate.nu/",
        "Origin": "https://y2mate.nu/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0"
    },

    hit: async (url, description, returnType = "text") => {
        try {
            const listReturnType = ["text", "json"]
            if (!listReturnType.includes(returnType)) throw Error(`return type ${returnType} is invalid. `)
            let result
            const response = await fetch(url, {
                headers: y2mate.headers,
            })
            const data = await response.text()
            result = data
            if(!response.ok) throw Error(`${response.status} ${response.statusText}\n${data.split("\n").slice(0,4).join("\n") + "\n...." || null}`)

            try {
                if (returnType == listReturnType[1]) {
                    result = JSON.parse(data)
                }
            } catch (error) {
                throw Error(`gagal mengubah return type menjadi ${returnType}. ${error.message}`)
            }
            return {result, response}
        } catch (error) {
            throw Error("hit gagal pada " + description
                + "\n" + error.message
            )
        }
    },

    getAuthCode: async () => {
        console.log("[y2mate] downloading homepage")
        
        const {result: html, response} = await y2mate.hit("https://y2mate.nu","hit homepage y2mate")
        const valueOnHtml = html.match(/<script>(.*?)<\/script>/)?.[1]
        if (!valueOnHtml) throw Error(`gagal mendapatkan match regex untuk code value di html`)

        try {
            eval(valueOnHtml)
        } catch (error) {
            throw Error(`eval lu gagal bos di yang eval valueOnHtml\n${error.message}`)
        }

        const srcPath = html.match(/src="(.*?)"/)?.[1]
        if (!srcPath) throw Error(`gagal mendapatkan srcPath untuk download file javascript`)

        const url = new URL(response.url).origin + srcPath

        console.log("[y2mate] downloading js file")
        const {result : jsCode} = await y2mate.hit(url, "download js file y2mate")
        const authCode = jsCode.match(/authorization\(\){(.*?)}function/)?.[1]
        if (!authCode) throw Error(`gagal mendapatkan match regex untuk auth function code`)

        const newAuthCode = authCode.replace("id(\"y2mate\").src", `"${url}"`)

        let authString
        try {
            authString = eval(`(()=>{${newAuthCode}})()`)
        } catch (error) {
            throw Error(`eval lu gagal bos pas nyoba buat dapetin authString\n${error.message}`)
        }

        return authString
    },

    getYoutubeId: async (youtubeUrl) => {
        console.log("[youtube.com] get video id from your youtube url")
        const headers = {
            "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0"
        }
        const resp = await fetch(youtubeUrl, {
            "method": "HEAD",
            headers
        })
        if (!resp.ok) throw Error(`gagal mendapatkan id video ${resp.status} ${resp.statusText}`)
        let videoId
        videoId = new URL(resp.url)?.searchParams?.get("v")
        if (!videoId) {
            videoId = resp.url.match(/https:\/\/www.youtube.com\/shorts\/(.*?)(?:\?|$)/)?.[1]
            if (!videoId) throw Error(`bruh lu kirim link apa tuh bro`)
        }
        return { videoId, url : resp.url }
    },

    download: async (youtubeUrl, format="mp3") => {
        const validFormats = ["mp3","mp4"]
        if(!validFormats.includes(format)) throw Error (`${format} is invalid format. available format ${validFormats.join(", ")}`)
        const delay = async (ms) => new Promise(r => setTimeout(r,ms))
        const { videoId, url } = await y2mate.getYoutubeId(youtubeUrl)
        
        const authCode = await y2mate.getAuthCode()
        console.log("[y2mate] hit init api")
        const url1 = `https://d.ecoe.cc/api/v1/init?a=${authCode}&_=${Math.random()}`
        const {result: resultInit} = await y2mate.hit(url1, "init api", "json")
        if (resultInit.error != "0") throw Error (`ada error di init api. proses di hentikan\n${resultInit}`)
        console.log("[y2mate] hit convert url")
        const url2 = new URL (resultInit.convertURL)
        url2.searchParams.append("v",videoId)
        url2.searchParams.append("f", format)
        url2.searchParams.append("_", Math.random())
        const {result : resultConvert} = await y2mate.hit(url2, "hit convert", "json")
        let { downloadURL, progressURL, redirectURL, error: errorFromConvertUrl } = resultConvert
        if (errorFromConvertUrl) throw Error(`there was error found after fetch convertURL probably bad youtube video id`)
        if (redirectURL) {
            ({ downloadURL, progressURL } = (await y2mate.hit(redirectURL, "fetch redirectURL","json")).result)
            console.log(`[y2mate] got directed`)
        }
        let { error, progress, title } = {}
        while (progress != 3) {
            const api3 = new URL(progressURL)
            api3.searchParams.append("_", Math.random());
            ({ error, progress, title } = (await y2mate.hit(api3, "cek progressURL", "json")).result)

            let status = progress == 3 ? "UwU sukses 🎉" :
                progress == 2 ? "(👉ﾟヮﾟ)👉 poke server" :
                    progress == 1 ? "(👉ﾟヮﾟ)👉 poke server" :
                        progress == 0 ? "(👉ﾟヮﾟ)👉 poke server" : "❌ tetot"

            console.log(status)

            // error checking
            if (error) throw Error(`there was an error value while doing loop check. the error code is ${error}. probably the video is too looong. or not compatible or > 45 mins`)
            if (progress != 3) await delay(5000) // 5 sec delay before next checking request, if progress done no more waiting
        }

        const result = { title, downloadURL, url }
        return result
    },
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 7860;

app.use(cors());
app.use(express.json());
app.use(favicon(path.join(__dirname, "favicon.ico")));
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
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const date = new Date(dateString);
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

// const getVideoInfo = async (url) => {
//   const info = await ytdl.getInfo(url);
//   const details = info.videoDetails;
//   return {
//     title: details.title,
//     description: details.description || "Tidak ada deskripsi",
//     thumbnail: details.thumbnails.pop().url,
//     duration: `${Math.floor(details.lengthSeconds / 60)}:${details.lengthSeconds % 60} menit`,
//     uploader: details.author.name,
//     uploadDate: formatDate(details.uploadDate),
//     views: formatNumber(details.viewCount),
//     likes: formatNumber(details.likes || 0),
//   };
// };

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
    owner: "https://github.com/senochii",
    uptime: new Date(process.uptime() * 1000).toUTCString().split(" ")[4],
    status,
  });
});

// app.all("/video", async (req, res) => {
//   const url = getParam(req, "url");
//   if (!url || !ytdl.validateURL(url))
//     return res.status(400).json({ error: "URL tidak valid" });
//   try {
//     const infoFull = await ytdl.getInfo(url);
//     const videoFormat = ytdl.chooseFormat(infoFull.formats, {
//       filter: "videoandaudio",
//       quality: "highest",
//     });
//     const info = await getVideoInfo(url);
//     const filename = `video-${Date.now()}.mp4`;
//     const writePath = path.join(tempDir, filename);
//     const videoStream = ytdl(url, { format: videoFormat });
//     const writeStream = fs.createWriteStream(writePath);
//     videoStream.pipe(writeStream);
//     writeStream.on("finish", () => {
//       res.json({
//         info,
//         result: {
//           quality: videoFormat.qualityLabel || "Tidak diketahui",
//           size: videoFormat.contentLength
//             ? formatBytes(parseInt(videoFormat.contentLength))
//             : "Ukuran tidak tersedia",
//           url: `${req.protocol}://${req.get("host")}/files/${filename}`,
//         },
//       });
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Gagal memproses video", details: error.message });
//   }
// });

// app.all("/audio", async (req, res) => {
//   const url = getParam(req, "url");
//   if (!url || !ytdl.validateURL(url))
//     return res.status(400).json({ error: "URL tidak valid" });
//   try {
//     const infoFull = await ytdl.getInfo(url);
//     const audioFormat = ytdl.chooseFormat(infoFull.formats, { filter: "audioonly" });
//     const info = await getVideoInfo(url);
//     const filename = `audio-${Date.now()}.mp3`;
//     const writePath = path.join(tempDir, filename);
//     const audioStream = ytdl(url, { format: audioFormat });
//     const writeStream = fs.createWriteStream(writePath);
//     audioStream.pipe(writeStream);
//     writeStream.on("finish", () => {
//       res.json({
//         info,
//         result: {
//           quality: `${audioFormat.audioBitrate} kbps`,
//           size: audioFormat.contentLength
//             ? formatBytes(parseInt(audioFormat.contentLength))
//             : "Ukuran tidak tersedia",
//           url: `${req.protocol}://${req.get("host")}/files/${filename}`,
//         },
//       });
//     });
//   } catch (error) {
//     res.status(500).json({ error: "Gagal memproses audio", details: error.message });
//   }
// });

app.all("/video", async (req, res) => {
  const url = getParam(req, "url");
  if (!url) return res.status(400).json({ error: "URL tidak valid" });
  try {
    const { title, downloadURL } = await y2mate.download(url, "mp4");

    const filename = `video-${Date.now()}.mp4`;
    const writePath = path.join(tempDir, filename);

    const response = await fetch(downloadURL);
    const stream = fs.createWriteStream(writePath);
    response.body.pipe(stream);
    stream.on("finish", () => {
      res.json({
        info: { title },
        result: {
          url: `${req.protocol}://${req.get("host")}/files/${filename}`,
          quality: "unknown (via ytdl-core)",
        },
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Gagal memproses video", details: error.message });
  }
});

app.all("/audio", async (req, res) => {
  const url = getParam(req, "url");
  if (!url) return res.status(400).json({ error: "URL tidak valid" });
  try {
    const { title, downloadURL } = await y2mate.download(url, "mp3");

    const filename = `audio-${Date.now()}.mp3`;
    const writePath = path.join(tempDir, filename);

    const response = await fetch(downloadURL);
    const stream = fs.createWriteStream(writePath);
    response.body.pipe(stream);
    stream.on("finish", () => {
      res.json({
        info: { title },
        result: {
          url: `${req.protocol}://${req.get("host")}/files/${filename}`,
          quality: "128kbps+ (via ytdl-core)",
        },
      });
    });
  } catch (error) {
    res.status(500).json({ error: "Gagal memproses audio", details: error.message });
  }
});

app.all("/search", async (req, res) => {
  const query = getParam(req, "query");
  if (!query) return res.status(400).json({ error: "Parameter 'query' wajib diisi" });
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