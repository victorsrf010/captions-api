# Captions API

Captions API is a web application that processes video URLs to generate and display captions. It supports transcription in English and translation into multiple languages.

## Features

- Transcribe audio from video URLs using Google Cloud Speech-to-Text.
- Translate captions into various languages using Google Cloud Translate.
- Display captions dynamically based on video playback.
- Support for multiple languages: English, German, Portuguese, Spanish, French, Romanian.

## Getting Started

### Prerequisites

- Node.js
- Google Cloud credentials with access to Speech-to-Text and Translate APIs.
- `ffmpeg` installed on your system.

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/captions-api.git
   cd captions-api

2. Install the dependencies:

   ```bash
   npm install
   
3. Create a .env file in the root directory with the following content:

    ````bash
   GOOGLE_APPLICATION_CREDENTIALS=./path-to-your-google-cloud-credentials.json

### Running the Application

1. Start the server

    ```bash
    node server.js
   
2. Open `http://localhost:3001` in your web browser.

## Usage

- Enter the video URL as a query parameter in the URL bar, e.g., `http://localhost:3001/?videoUrl=https://example.com/video.mp4`.
- Select the desired language from the dropdown menu to translate the captions.
- The video will display captions as it plays.

### Environment Variables

- `GOOGLE_APPLICATION_CREDENTIALS`: Path to the Google Cloud credentials JSON file or the JSON string itself.

[//]: # (## Contributing)

[//]: # ()
[//]: # (Contributions are welcome! Please submit a pull request or open an issue to discuss any changes.)

[//]: # ()
[//]: # (## License)

[//]: # ()
[//]: # (This project is licensed under the MIT License - see the [LICENSE]&#40;LICENSE&#41; file for details.)

