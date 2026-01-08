'use client';

import { useState } from 'react';

interface TranscriptionJob {
  url: string;
  videoId: string;
  title?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress?: string;
  transcript?: string;
  fileId?: string;
  error?: string;
}

export default function YouTubeTranscriber({ onBack }: { onBack?: () => void }) {
  const [youtubeLinks, setYoutubeLinks] = useState<string>('');
  const [jobs, setJobs] = useState<TranscriptionJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoUpload, setAutoUpload] = useState(true);

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const parseLinks = (text: string): string[] => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const validLinks: string[] = [];
    
    for (const line of lines) {
      const videoId = extractVideoId(line);
      if (videoId) {
        validLinks.push(line);
      }
    }
    
    return validLinks;
  };

  const handleTranscribe = async () => {
    if (!youtubeLinks.trim()) {
      setError('Please enter at least one YouTube URL');
      return;
    }

    const links = parseLinks(youtubeLinks);
    if (links.length === 0) {
      setError('No valid YouTube URLs found. Please enter URLs in the format: https://www.youtube.com/watch?v=VIDEO_ID');
      return;
    }

    setIsProcessing(true);
    setError(null);
    
    // Initialize jobs
    const initialJobs: TranscriptionJob[] = links.map(link => ({
      url: link,
      videoId: extractVideoId(link) || 'unknown',
      status: 'pending',
    }));
    
    setJobs(initialJobs);

    // Process each video
    for (let i = 0; i < initialJobs.length; i++) {
      const job = initialJobs[i];
      
      setJobs(prev => prev.map((j, idx) => 
        idx === i ? { ...j, status: 'processing', progress: 'Starting transcription...' } : j
      ));

      try {
        const response = await fetch('/api/youtube/transcribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: job.url,
            autoUpload,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Include help message if available
          let errorMsg = data.error || 'Failed to transcribe video';
          if (data.help) {
            errorMsg += '\n\n' + data.help;
          } else if (data.details) {
            errorMsg += '\n\n' + data.details;
          }
          throw new Error(errorMsg);
        }

        setJobs(prev => prev.map((j, idx) => 
          idx === i ? {
            ...j,
            status: 'completed',
            title: data.title,
            transcript: data.transcript,
            fileId: data.fileId,
            progress: 'Completed',
          } : j
        ));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setJobs(prev => prev.map((j, idx) => 
          idx === i ? {
            ...j,
            status: 'error',
            error: errorMessage,
            progress: 'Failed',
          } : j
        ));
      }
    }

    setIsProcessing(false);
  };

  const downloadTranscript = (job: TranscriptionJob) => {
    if (!job.transcript) return;

    const blob = new Blob([job.transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.videoId}-transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    jobs.filter(j => j.transcript).forEach(job => {
      setTimeout(() => downloadTranscript(job), 100);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'processing':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const errorCount = jobs.filter(j => j.status === 'error').length;
  const processingCount = jobs.filter(j => j.status === 'processing').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Back to main"
              >
                <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              YouTube Transcriber
            </h2>
          </div>
        </div>
        <p className="text-gray-600 text-lg leading-relaxed">
          Transcribe multiple YouTube videos using AI speech-to-text. Transcripts will be saved as text files and can be automatically uploaded to your Google Drive folder to improve your knowledge base.
        </p>
      </div>

      {/* Input Section */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          YouTube URLs (one per line)
        </label>
        <textarea
          value={youtubeLinks}
          onChange={(e) => setYoutubeLinks(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=VIDEO_ID_1&#10;https://www.youtube.com/watch?v=VIDEO_ID_2&#10;https://youtu.be/VIDEO_ID_3"
          rows={6}
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white font-mono text-sm"
          disabled={isProcessing}
        />
        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoUpload}
              onChange={(e) => setAutoUpload(e.target.checked)}
              className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
              disabled={isProcessing}
            />
            <span className="text-sm text-gray-700">
              Automatically upload transcripts to Google Drive
            </span>
          </label>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleTranscribe}
            disabled={isProcessing || !youtubeLinks.trim()}
            className="px-8 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Transcribe Videos</span>
              </>
            )}
          </button>
          {jobs.length > 0 && completedCount > 0 && (
            <button
              type="button"
              onClick={downloadAll}
              className="px-6 py-3 bg-gray-100 text-gray-800 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Download All ({completedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Summary */}
      {jobs.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">
              Progress: {completedCount} completed, {processingCount} processing, {errorCount} failed
            </p>
            <p className="text-xs text-gray-500">
              {jobs.length} total video{jobs.length !== 1 ? 's' : ''}
            </p>
          </div>
          {jobs.length > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${(completedCount / jobs.length) * 100}%`,
                }}
              ></div>
            </div>
          )}
        </div>
      )}

      {/* Jobs List */}
      {jobs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800">Transcription Jobs</h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {jobs.map((job, index) => (
              <div
                key={index}
                className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <svg
                        className="w-5 h-5 text-gray-500"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 break-all"
                      >
                        {job.url}
                      </a>
                      <span className={`text-xs font-semibold ${getStatusColor(job.status)}`}>
                        {job.status.toUpperCase()}
                      </span>
                    </div>
                    {job.title && (
                      <p className="text-sm text-gray-600 mb-2 font-medium">{job.title}</p>
                    )}
                    {job.progress && (
                      <p className="text-xs text-gray-500">{job.progress}</p>
                    )}
                    {job.error && (
                      <p className="text-xs text-red-600 mt-2">{job.error}</p>
                    )}
                    {job.fileId && (
                      <p className="text-xs text-green-600 mt-2">
                        ✓ Uploaded to Google Drive (File ID: {job.fileId})
                      </p>
                    )}
                  </div>
                  {job.status === 'completed' && job.transcript && (
                    <button
                      type="button"
                      onClick={() => downloadTranscript(job)}
                      className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download
                    </button>
                  )}
                </div>
                {job.transcript && (
                  <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Transcript Preview:</p>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap line-clamp-6">
                      {job.transcript.substring(0, 500)}
                      {job.transcript.length > 500 ? '...' : ''}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}



