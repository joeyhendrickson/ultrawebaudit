# Quick Guide: Vectorize Google Drive Files

## The Problem

You're getting permission errors because the OAuth token doesn't have access to the files. This usually happens when:
- Files are owned by someone else (shared with you)
- The token was created before proper permissions were granted
- Files need explicit permission from the owner

## Solution: Re-authorize and Vectorize

### Step 1: Get a New Authorization URL

Run this command to get the authorization URL:

```bash
npm run get-token
```

This will print a URL. **Open it in your browser**.

### Step 2: Authorize the Application

1. Sign in with the **Google account that owns or has access** to the files
2. **Grant all permissions** when prompted
3. You'll be redirected to a URL that looks like:
   ```
   http://localhost:3003/api/auth/google/callback?code=4/0Aean...
   ```

### Step 3: Extract the Code

Copy the `code` parameter from the URL (everything after `code=`).

### Step 4: Exchange Code for Refresh Token

Run this command with your code:

```bash
npm run authorize --code=YOUR_CODE_HERE
```

Replace `YOUR_CODE_HERE` with the actual code from the URL.

### Step 5: Update .env.local

The script will output a new `GOOGLE_REFRESH_TOKEN`. Update your `.env.local` file:

```env
GOOGLE_REFRESH_TOKEN=1//0new_refresh_token_here
```

### Step 6: Vectorize the Files

Now run the vectorization script:

```bash
npm run vectorize
```

This will:
- Download all files from your Google Drive folder
- Extract text from PDFs, DOCX, and text files
- Create chunks
- Generate embeddings
- Upload to Pinecone

## Alternative: If Files Are Owned by Someone Else

If the files are owned by another Google account:

1. **Option A**: Have the file owner share the folder with your Google account with "Viewer" or "Editor" permissions
2. **Option B**: Use the Google account that owns the files for authorization
3. **Option C**: Ask the owner to grant your OAuth app access to the files

## Troubleshooting

### Still Getting Permission Errors?

1. **Check file ownership**: Make sure you're using the Google account that has access
2. **Re-authorize**: The token might be stale - get a new one
3. **Check sharing**: Files must be shared with your account in Google Drive
4. **Scope issues**: Make sure you granted "See and download all your Google Drive files" permission

### Files Not Processing?

- Check that files are PDF, DOCX, or TXT format
- Some PDFs might be image-only (scanned) and won't extract text
- Check the console output for specific error messages

## What the Script Does

The `vectorize` script will:
1. ✅ List all files in your Google Drive folder
2. ✅ Download each file
3. ✅ Extract text (PDF, DOCX, TXT)
4. ✅ Create chunks (paragraphs, sentences, or fixed-size)
5. ✅ Generate embeddings using OpenAI
6. ✅ Upload to Pinecone with metadata
7. ✅ Show a summary of processed files

You'll see progress for each file and a final summary at the end.





