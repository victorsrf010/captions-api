const express = require('express');
const { exec } = require('child_process');
const speech = require('@google-cloud/speech');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Import CORS
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS

let captions = []; // Array to store captions

// Google Cloud Speech-to-Text client setup
const client = new speech.SpeechClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint to retrieve captions with pagination
app.get('/captions', (req, res) => {
    const start = parseFloat(req.query.start) || 0;
    const end = parseFloat(req.query.end) || 5;
    const requestedCaptions = captions.filter(caption => caption.time >= start && caption.time < end);
    res.json(requestedCaptions);
});

// Endpoint to process video URL
app.post('/process-video-url', async (req, res) => {
    const videoUrl = req.body.videoUrl;
    if (!videoUrl) {
        return res.status(400).send('No video URL provided.');
    }

    const tempDir = `/tmp/audio_segments`; // Directory to store audio segments
    fs.mkdirSync(tempDir, { recursive: true }); // Ensure the directory exists

    try {
        // Stream the video using ffmpeg
        const segmentPrefix = path.join(tempDir, 'segment');
        const segmentFormat = 'wav'; // Define segment file format

        const ffmpegCommand = `ffmpeg -i "${videoUrl}" -f segment -segment_time 10 -ac 1 -ar 16000 -vn ${segmentPrefix}_%03d.${segmentFormat}`;

        exec(ffmpegCommand, (error) => {
            if (error) {
                console.error('Error splitting audio:', error);
                return res.status(500).send('Failed to split audio');
            }

            // Read the directory of segments
            fs.readdir(tempDir, (err, files) => {
                if (err) {
                    console.error('Error reading audio segments:', err);
                    return res.status(500).send('Failed to read audio segments');
                }

                // Filter out non-wav files and process each segment
                const segmentFiles = files.filter(file => file.endsWith(`.${segmentFormat}`));
                let transcriptions = [];
                captions = []; // Reset captions

                segmentFiles.forEach((file, index) => {
                    const filePath = path.join(tempDir, file);
                    const fileContent = fs.readFileSync(filePath);
                    const audioBytes = fileContent.toString('base64');

                    const audio = {
                        content: audioBytes,
                    };

                    const config = {
                        encoding: 'LINEAR16',
                        sampleRateHertz: 16000,
                        languageCode: 'en-US',
                    };

                    const request = {
                        audio: audio,
                        config: config,
                    };

                    client.recognize(request)
                        .then(data => {
                            const response = data[0];
                            const transcription = response.results
                                .map(result => result.alternatives[0].transcript)
                                .join('\n');

                            console.log(`Transcription for ${file}:`, transcription);

                            // Push transcription with timestamp (now using 10 seconds per segment)
                            captions.push({
                                time: index * 10, // Adjust this to match the new segment time
                                text: transcription
                            });

                            transcriptions.push(transcription);

                            // Check if all files have been processed
                            if (transcriptions.length === segmentFiles.length) {
                                res.send('Transcription complete and captions saved.');
                            }
                        })
                        .catch(err => {
                            console.error('ERROR:', err);
                            res.status(500).send('Failed to transcribe audio');
                        });
                });
            });
        });

    } catch (error) {
        console.error('Error processing video URL:', error);
        res.status(500).send('Failed to process video URL');
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
