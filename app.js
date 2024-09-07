const express = require("express");
const fs = require("fs");
const cors = require("cors");
const { default: axios } = require("axios");
const path = require("path"); // Add this line

const ffmpegStatic = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegStatic);

const videoFolder = path.join(__dirname, "videos");

if (!fs.existsSync(videoFolder)) {
  fs.mkdirSync(videoFolder);
}

const app = express();
app.use(express.json({ limit: "600mb" })); // To handle large base64 payloads
app.use(cors());
app.use("/videos", express.static(videoFolder));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Increase the request timeout
app.use((req, res, next) => {
  req.setTimeout(10 * 60 * 1000); // 10 minutes
  next();
});

app.get("/test", (req, res) => {
  return res.json({ msg: "Hi, it's working!" });
});

app.post("/media", async (req, res) => {
  const { audioUrl, videoUrl } = req.body;

  const outputId = videoUrl.split("/presentation/")[1].split("/")[0];

  try {
    // Decode base64 to binary and save as files
    const audioFilePath = "input_audio.webm";
    const videoFilePath = "input_video.webm";

    const outputFilePath = path.join(videoFolder, `output_${outputId}.mp4`);

    if (fs.existsSync(outputFilePath)) {
      const videoUrl = `/videos/output_${outputId}.mp4`;
      return res.json({ message: "Video already exists.", videoUrl });
    }

    // Download the audio and video files temporarily
    const downloadFile = async (url, filePath) => {
      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
      });
      return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(filePath);
        response.data.pipe(fileStream);
        fileStream.on("finish", resolve);
        fileStream.on("error", reject);
      });
    };

    // Wait for both files to download
    await Promise.all([
      downloadFile(audioUrl, audioFilePath),
      downloadFile(videoUrl, videoFilePath),
    ]);

    // new code, sending video url
    ffmpeg()
      .input(videoFilePath)
      .input(audioFilePath)
      .inputFormat("webm")
      .outputOptions("-c:v copy") // Copy video stream
      .outputOptions("-c:a aac") // Encode audio stream
      .on("end", () => {
        console.log("Processing finished successfully.");

        // Clean up temporary files
        fs.unlinkSync(audioFilePath);
        fs.unlinkSync(videoFilePath);

        // Schedule deletion of the output file after 1 hour
        setTimeout(() => {
          fs.unlinkSync(outputFilePath);
          console.log(`Deleted file: ${outputFilePath}`);
        }, 259200000); // 3 days milliseconds

        // Send response with the video link
        const videoUrl = `/videos/output_${outputId}.mp4`; // Update this line
        res.json({ message: "Video saved successfully.", videoUrl }); // Update this line
      })
      .on("error", (err) => {
        console.error("Error during processing:", err);
        fs.unlinkSync(audioFilePath);
        fs.unlinkSync(videoFilePath);
        res.status(500).json({ error: "Processing error" });
      })
      .save(outputFilePath); // Save output as MP4

    // try ending
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
