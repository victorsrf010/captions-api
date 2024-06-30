const express = require('express');
const { exec } = require('child_process');
const speech = require('@google-cloud/speech');
const { Translate } = require('@google-cloud/translate').v2;
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

let captionsStore = {};

// Load Google Cloud credentials
let credentials;
try {
    const credentialsPathOrJson = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credentialsPathOrJson.startsWith('{')) {
        credentials = JSON.parse(credentialsPathOrJson);
    } else {
        const credentialsContent = fs.readFileSync(credentialsPathOrJson);
        credentials = JSON.parse(credentialsContent);
    }
} catch (error) {
    console.error("Error reading or parsing Google Cloud credentials:", error);
}

// Initialize Google Cloud clients
const speechClient = new speech.SpeechClient({ credentials });
const translateClient = new Translate({ credentials });

app.use(express.static(path.join(__dirname, 'public')));

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint to retrieve captions with pagination and language support
app.get('/captions', (req, res) => {
    const { start, end, language, videoUrl } = req.query;
    const videoCaptions = captionsStore[videoUrl] || [];
    let requestedCaptions = videoCaptions.filter(caption => caption.time >= start && caption.time < end);

    // Translate captions if a language other than English is requested
    if (language && language !== 'en-US') {
        requestedCaptions = requestedCaptions.map(caption => {
            const translation = caption.translations[language];
            return {
                ...caption,
                text: translation || caption.text
            };
        });
    }

    res.json(requestedCaptions);
});

// Endpoint to process video URL and generate captions
app.post('/process-video-url', async (req, res) => {
    const { videoUrl } = req.body;

    if (!videoUrl) {
        return res.status(400).send('No video URL provided.');
    }

    const tempDir = `/tmp/audio_segments`;
    fs.mkdirSync(tempDir, { recursive: true });

    const segmentPrefix = path.join(tempDir, 'segment');
    const segmentFormat = 'wav';

    // Split video into audio segments using ffmpeg
    const ffmpegCommand = `ffmpeg -i "${videoUrl}" -f segment -segment_time 10 -ac 1 -ar 16000 -vn ${segmentPrefix}_%03d.${segmentFormat}`;
    exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).send('Failed to split audio');
        }

        fs.readdir(tempDir, (err, files) => {
            if (err) {
                return res.status(500).send('Failed to read audio segments');
            }

            const segmentFiles = files.filter(file => file.endsWith(`.${segmentFormat}`));
            let transcriptions = [];
            captionsStore[videoUrl] = [];

            let processedFiles = 0;

            segmentFiles.forEach((file, index) => {
                const filePath = path.join(tempDir, file);
                const fileContent = fs.readFileSync(filePath);
                const audioBytes = fileContent.toString('base64');

                const audio = { content: audioBytes };
                const config = {
                    encoding: 'LINEAR16',
                    sampleRateHertz: 16000,
                    languageCode: 'en-US',
                };

                const request = { audio, config };

                // Transcribe audio segment using Google Cloud Speech-to-Text
                speechClient.recognize(request)
                    .then(data => {
                        const response = data[0];
                        const transcription = response.results.map(result => result.alternatives[0].transcript).join('\n');

                        captionsStore[videoUrl].push({
                            time: index * 10,
                            text: transcription,
                            translations: {}
                        });

                        transcriptions.push(transcription);
                        processedFiles++;
                        if (processedFiles === segmentFiles.length) {
                            res.send('Transcription complete and captions saved.');
                        }
                    })
                    .catch(err => {
                        if (processedFiles === segmentFiles.length) {
                            res.status(500).send('Failed to transcribe audio');
                        }
                    });
            });
        });
    });
});

// Endpoint to translate captions into the specified language
app.post('/translate-caption', async (req, res) => {
    const { videoUrl, language } = req.body;

    if (!videoUrl || !language) {
        return res.status(400).send('Video URL and language are required.');
    }

    const videoCaptions = captionsStore[videoUrl];
    if (!videoCaptions) {
        return res.status(404).send('Captions not found for the specified video.');
    }

    try {
        for (const caption of videoCaptions) {
            if (!caption.translations[language]) {
                const [translation] = await translateClient.translate(caption.text, language);
                caption.translations[language] = translation;
            }
        }
        res.send('Translation complete.');
    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).send('Translation failed.');
    }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});
