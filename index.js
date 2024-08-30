// Set memory and max duration for the function
// @vercel/functions/memory=3009
// @vercel/functions/maxDuration=60

const express = require("express");
const fs = require("fs");
const cors = require("cors");
// const ffmpeg = require("ffmpeg");
// const Ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");

ffmpeg.setFfmpegPath(ffmpegStatic);

const app = express();
app.use(express.json({ limit: "200mb" })); // To handle large base64 payloads
app.use(cors());

app.post("/media", async (req, res) => {
  const { audioBase64, videoBase64 } = req.body;

  try {
    // Decode base64 to binary and save as files
    const audioBuffer = Buffer.from(audioBase64, "base64");
    const videoBuffer = Buffer.from(videoBase64, "base64");

    // fs.writeFileSync("input.webm", audioBuffer);
    // fs.writeFileSync("reversed.webm", videoBuffer);

    // Process the files with FFmpeg
    // const process = new ffmpeg("input.webm");
    // process.then(
    //   (video) => {
    //     console.log("video==", video);
    //     video
    //       .addCommand("-i", "reversed.webm")
    //       .addCommand("-c:v", "copy")
    //       .addCommand("-c:a", "aac")
    //       .save("output.mp4", (error, file) => {
    //         if (!error) {
    //           // Read the output file and convert it to base64
    //           const mp4Buffer = fs.readFileSync("output.mp4");
    //           const mp4Base64 = mp4Buffer.toString("base64");

    //           // Clean up temporary files
    //           fs.unlinkSync("input.webm");
    //           fs.unlinkSync("reversed.webm");
    //           fs.unlinkSync("output.mp4");

    //           // Return the resulting MP4 file in base64 format
    //           res.json({ mp4Base64 });
    //         } else {
    //           console.error("Error during processing:", error);
    //           res.status(500).json({ error: "Processing error" });
    //         }
    //       });
    //   },
    //   (err) => {
    //     console.error("Error:", err);
    //     res.status(500).json({ error: "File processing error" });
    //   }
    // );

    // Use fluent-ffmpeg to combine the files

    // Create input streams from buffers
    // const audioStream = require("stream").Readable.from(audioBuffer);
    // const videoStream = require("stream").Readable.from(videoBuffer);

    // ffmpeg()
    //   .input("input.webm")
    //   .input("reversed.webm")
    //   .outputOptions("-c:v copy")
    //   .outputOptions("-c:a aac")
    //   .on("end", () => {
    //     console.log("tseting");
    //     const mp4Buffer = fs.readFileSync("output.mp4");
    //     const mp4Base64 = mp4Buffer.toString("base64");

    //     // Clean up temporary files
    //     fs.unlinkSync("input.webm");
    //     fs.unlinkSync("reversed.webm");
    //     fs.unlinkSync("output.mp4");

    //     // Return the resulting MP4 file in base64 format
    //     res.json({ mp4Base64 });
    //   })
    //   .on("error", (err) => {
    //     console.error("Error during processing:", err);
    //     res.status(500).json({ error: "Processing error" });
    //   })
    //   .save("output.mp4"); // Save output as MP4

    // Create temporary files
    const audioFilePath = "input_audio.webm";
    const videoFilePath = "input_video.webm";
    const outputFilePath = "output.mp4";

    fs.writeFileSync(audioFilePath, audioBuffer);
    fs.writeFileSync(videoFilePath, videoBuffer);

    // Use fluent-ffmpeg to combine the files
    ffmpeg()
      .input(videoFilePath)
      .input(audioFilePath)
      .inputFormat("webm")
      .outputOptions("-c:v copy") // Copy video stream
      .outputOptions("-c:a aac") // Encode audio stream
      .on("end", () => {
        console.log("Processing finished successfully.");

        // Read the output file as base64
        const mp4Buffer = fs.readFileSync(outputFilePath);
        const mp4Base64 = mp4Buffer.toString("base64");

        // Clean up temporary files
        fs.unlinkSync(audioFilePath);
        fs.unlinkSync(videoFilePath);
        fs.unlinkSync(outputFilePath);

        // Send the base64 encoded video
        res.json({ videoBase64: `data:video/mp4;base64,${mp4Base64}` });
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
