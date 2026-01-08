# YouTube Transcription Feature Setup

The YouTube Transcriber feature allows you to transcribe multiple YouTube videos using AI speech-to-text and automatically upload the transcripts to your Google Drive folder.

## Requirements

### 1. Install yt-dlp

The feature requires `yt-dlp` (or `youtube-dl` as fallback) to extract audio from YouTube videos.

**macOS:**
```bash
brew install yt-dlp
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install yt-dlp
```

**Linux (using pip):**
```bash
pip install yt-dlp
```

**Windows:**
```bash
# Using pip
pip install yt-dlp

# Or download from: https://github.com/yt-dlp/yt-dlp/releases
```

### 2. Verify Installation

Test that yt-dlp is installed correctly:
```bash
yt-dlp --version
```

### 3. Environment Variables

Make sure your `.env.local` file has:
- `OPENAI_API_KEY` - Required for Whisper transcription
- `GOOGLE_DRIVE_FOLDER_ID` - Required for automatic uploads
- `GOOGLE_CLIENT_ID` - Required for Google Drive uploads
- `GOOGLE_CLIENT_SECRET` - Required for Google Drive uploads
- `GOOGLE_REFRESH_TOKEN` - Required for Google Drive uploads

## How It Works

1. **User Input**: Enter one or more YouTube URLs (one per line)
2. **Audio Extraction**: The system uses `yt-dlp` to download and extract audio from each video
3. **Transcription**: OpenAI's Whisper API transcribes the audio to text
4. **Upload**: Transcripts are automatically uploaded to your Google Drive folder (if enabled)
5. **Download**: Users can download individual transcripts or all transcripts at once

## Usage

1. Click the hamburger menu (☰) in the top right
2. Select "YouTube Transcriber"
3. Paste YouTube URLs (one per line)
4. Toggle "Automatically upload transcripts to Google Drive" if desired
5. Click "Transcribe Videos"
6. Wait for processing to complete
7. Download transcripts individually or all at once

## Troubleshooting

### "Audio extraction tool not found"
- Make sure `yt-dlp` is installed and available in your PATH
- For Vercel deployments, you may need to use a custom Docker image with yt-dlp pre-installed
- Alternatively, consider using a serverless function with yt-dlp in a container

### "Failed to transcribe audio"
- Check that your `OPENAI_API_KEY` is valid and has access to Whisper API
- Ensure the audio file was successfully downloaded
- Check OpenAI API rate limits

### "Failed to upload file to Google Drive"
- Verify `GOOGLE_DRIVE_FOLDER_ID` is set correctly
- Check that your Google OAuth credentials are valid
- Ensure the refresh token hasn't expired

## Notes

- Videos are processed sequentially to avoid overwhelming the system
- Audio files are automatically cleaned up after transcription
- Transcripts are saved with the format: `{VideoTitle}_{VideoID}_transcript.txt`
- The feature works best with videos that have clear audio

## Deployment Considerations

For serverless deployments (like Vercel):
- yt-dlp needs to be available in the runtime environment
- Consider using a separate API service or Docker container
- Audio file size limits may apply (check your hosting provider's limits)
- Processing time may be limited by function timeout limits

For self-hosted deployments:
- Ensure yt-dlp is installed on the server
- Consider setting up a queue system for processing multiple videos
- Monitor disk space for temporary audio files





