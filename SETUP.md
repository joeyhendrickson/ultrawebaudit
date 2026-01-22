# Setup Guide

## Prerequisites

1. Node.js 18+ installed
2. OpenAI API key
3. Pinecone account and API key
4. Google Cloud Project with Drive API enabled
5. Google OAuth 2.0 credentials

## Initial Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.local.example` to `.env.local`
   - Fill in all required values (see below)

3. **Set up Google OAuth 2.0:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google Drive API
   - Create OAuth 2.0 credentials (Web application)
   - Add `http://localhost:3003/api/auth/google/callback` as authorized redirect URI
   - Copy Client ID and Client Secret to `.env.local`

4. **Get Google Refresh Token:**
   - Visit `/api/auth/google` to get the authorization URL
   - Authorize the application
   - Copy the refresh token from the callback response
   - Add it to `.env.local`

5. **Set up Pinecone:**
   - Create a Pinecone account at [pinecone.io](https://www.pinecone.io/)
   - Create an index (recommended: 1536 dimensions for OpenAI embeddings)
   - Copy API key and environment to `.env.local`

6. **Sync Google Drive files:**
   - Set `GOOGLE_DRIVE_FOLDER_ID` in `.env.local` to your root folder ID
   - Call `POST /api/google-drive/sync?folderId=YOUR_FOLDER_ID` to index files
   - This will process and chunk all files in the folder and upload to Pinecone

## Environment Variables

All required environment variables are listed in `.env.local.example`. Make sure to set:

- `OPENAI_API_KEY`: Your OpenAI API key
- `PINECONE_API_KEY`: Your Pinecone API key
- `PINECONE_ENVIRONMENT`: Your Pinecone environment (e.g., "us-east-1-aws")
- `PINECONE_INDEX_NAME`: Name of your Pinecone index
- `GOOGLE_CLIENT_ID`: Google OAuth 2.0 Client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth 2.0 Client Secret
- `GOOGLE_REFRESH_TOKEN`: Google OAuth 2.0 Refresh Token
- `GOOGLE_DRIVE_FOLDER_ID`: ID of the root folder in Google Drive

## Running the Application

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

## Deployment to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add all environment variables in Vercel project settings
4. Deploy

## Usage

### Chat Interface
- Navigate to the Chat Advisor tab
- Ask questions about ADA compliance
- The system will search the knowledge base and provide answers

### Document Processor
- Navigate to the Document Processor tab
- Upload a template document (supports .docx, .pdf, .txt)
- Use placeholders like `{{placeholder}}` or `[PLACEHOLDER]` in your template
- Click "Process Document" to fill in placeholders with relevant information
- Download the completed document

## Notes

- PDF generation currently returns text format. For proper PDF generation with formatting, consider using a PDF generation service or library with font support.
- The Google Drive sync process chunks documents by paragraphs. Large documents may take time to process.
- Make sure your Pinecone index has sufficient capacity for your document collection.





