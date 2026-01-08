'use client';

import { useState, useRef } from 'react';

interface ScannedURL {
  url: string;
  depth: number;
  status: 'pending' | 'scanning' | 'analyzed' | 'error';
  analysis?: {
    risks: string[];
    summary: string;
    riskLevel: 'low' | 'medium' | 'high';
    issues: Array<{
      type: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      tag?: string;
      location?: string;
      outdatedText?: string;
      currentText?: string;
      suggestedReplacement?: string;
      reasoning?: string;
      priority?: 'immediate' | 'high' | 'medium' | 'low';
    }>;
    outdatedTermsFound?: string[];
    updatePriority?: 'low' | 'medium' | 'high';
    currentRelevance?: {
      isRelevant: boolean;
      reason: string;
      accurateContent?: string[];
      needsUpdating?: string[];
    };
    futureRelevance?: {
      isRelevant: boolean;
      reason?: string;
      reasoning?: string;
      shouldUpdate?: boolean;
      shouldArchive?: boolean;
    };
    messagingStrategy?: {
      currentState?: string;
      transitionMessage?: string;
      tone?: string;
      keyMessages?: string[];
    };
    instructorRecommendations?: {
      addDevShellLink?: boolean;
      devShellLinkText?: string;
      workshopMention?: string;
      ultraFeaturesToHighlight?: string[];
      transitionGuidance?: string;
    };
    specificChanges?: Array<{
      action: 'replace' | 'add' | 'remove' | 'update';
      currentText?: string;
      newText?: string;
      location?: string;
      reason?: string;
    }>;
    documentStructure?: {
      semanticElements: {
        main: number;
        nav: number;
        article: number;
        section: number;
        aside: number;
        header: number;
        footer: number;
      };
      headingHierarchy: Array<{ level: number; count: number; order: number[] }>;
      formStructure: Array<{
        id: string;
        hasLabel: boolean;
        hasAriaLabel: boolean;
        hasAriaLabelledBy: boolean;
        type: string;
      }>;
      tableStructure: Array<{
        hasHeaders: boolean;
        hasScope: boolean;
        hasCaption: boolean;
        hasSummary: boolean;
      }>;
      ariaRoles: string[];
      landmarks: string[];
    };
  };
  rewritten?: boolean;
  rewrittenContent?: string;
}

export default function WebsiteScanner({ onBack }: { onBack?: () => void }) {
  const [baseUrl, setBaseUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [scannedURLs, setScannedURLs] = useState<ScannedURL[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState<{
    current: number;
    total: number;
    currentUrl: string;
  } | null>(null);

  const MAX_URLS = 100;
  const MAX_DEPTH = 3;

  const validateUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleScan = async () => {
    if (!baseUrl.trim()) {
      setError('Please enter a website URL');
      return;
    }

    const urlToScan = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    
    if (!validateUrl(urlToScan)) {
      setError('Please enter a valid URL (e.g., example.com or https://example.com)');
      return;
    }

    setIsScanning(true);
    setError(null);
    setScannedURLs([]);
    setScanProgress({ current: 0, total: 0, currentUrl: 'Starting scan...' });

    try {
      const response = await fetch('/api/website/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: urlToScan,
          maxUrls: MAX_URLS,
          maxDepth: MAX_DEPTH,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to scan website' }));
        throw new Error(errorData.error || 'Failed to scan website');
      }

      const data = await response.json();

      if (data.success && data.urls) {
        const urls: ScannedURL[] = data.urls.map((urlData: any) => ({
          url: urlData.url,
          depth: urlData.depth,
          status: 'pending' as const,
        }));
        setScannedURLs(urls);
        setScanProgress(null);
      } else {
        throw new Error(data.error || 'Failed to scan website');
      }
    } catch (error) {
      console.error('Scan error:', error);
      setError(error instanceof Error ? error.message : 'Failed to scan website');
      setScanProgress(null);
    } finally {
      setIsScanning(false);
    }
  };

  const handleAnalyze = async () => {
    if (scannedURLs.length === 0) {
      setError('Please scan a website first');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const urlsToAnalyze = scannedURLs.map((s) => s.url);

      const response = await fetch('/api/website/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: urlsToAnalyze,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `HTTP ${response.status}: ${response.statusText}` 
        }));
        console.error('Analysis API error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to analyze URLs`);
      }

      const data = await response.json();
      console.log('Analysis response:', data);

      if (data.success && data.results) {
        setScannedURLs(
          scannedURLs.map((scanned) => {
            const result = data.results.find((r: any) => r.url === scanned.url);
            if (result) {
              return {
                ...scanned,
                status: 'analyzed' as const,
                analysis: {
                  risks: result.risks || [],
                  summary: result.summary || 'No issues found',
                  riskLevel: result.riskLevel || 'low',
                  issues: result.issues || [],
                  outdatedTermsFound: result.outdatedTermsFound || [],
                  updatePriority: result.updatePriority || result.riskLevel || 'low',
                  currentRelevance: result.currentRelevance,
                  futureRelevance: result.futureRelevance,
                  messagingStrategy: result.messagingStrategy,
                  instructorRecommendations: result.instructorRecommendations,
                  specificChanges: result.specificChanges || [],
                  documentStructure: result.documentStructure, // Optional, for backward compatibility
                },
              };
            }
            return scanned;
          })
        );
      } else {
        throw new Error(data.error || 'Failed to analyze URLs');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to analyze URLs';
      setError(`Analysis failed: ${errorMessage}. Check the browser console for details.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRewrite = async () => {
    if (scannedURLs.length === 0) {
      setError('Please scan and analyze URLs first');
      return;
    }

    const unanalyzed = scannedURLs.filter((s) => !s.analysis);
    if (unanalyzed.length > 0) {
      setError('Please analyze all URLs before rewriting');
      return;
    }

    setIsRewriting(true);
    setError(null);

    try {
      const urlsToRewrite = scannedURLs.map((s) => ({
        url: s.url,
        analysis: s.analysis,
      }));

      const response = await fetch('/api/website/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: urlsToRewrite,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to rewrite content' }));
        throw new Error(errorData.error || 'Failed to rewrite content');
      }

      const data = await response.json();

      if (data.success && data.rewritten) {
        setScannedURLs(
          scannedURLs.map((scanned) => {
            const rewritten = data.rewritten.find((r: any) => r.url === scanned.url);
            if (rewritten) {
              return {
                ...scanned,
                rewritten: true,
                rewrittenContent: rewritten.content,
              };
            }
            return scanned;
          })
        );
      } else {
        throw new Error(data.error || 'Failed to rewrite content');
      }
    } catch (error) {
      console.error('Rewrite error:', error);
      setError(error instanceof Error ? error.message : 'Failed to rewrite content');
    } finally {
      setIsRewriting(false);
    }
  };

  const downloadRewritten = (url: ScannedURL) => {
    if (!url.rewrittenContent) return;

    const blob = new Blob([url.rewrittenContent], { type: 'text/html' });
    const urlObj = new URL(url.url);
    const filename = `${urlObj.hostname}-${urlObj.pathname.replace(/\//g, '-') || 'index'}.html`;
    
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'analyzed':
        return 'text-green-600';
      case 'scanning':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

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
            <div className="w-12 h-12 bg-gradient-to-br from-black to-black rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Website Scanner
            </h2>
          </div>
        </div>
        <p className="text-gray-600 text-lg leading-relaxed">
          Scan websites for outdated Blackboard Learn messaging. The scanner will analyze the top-level URL and up to {MAX_URLS} URLs 
          across {MAX_DEPTH} layers deep, then identify outdated messaging and generate updated content for Blackboard Ultra.
        </p>
      </div>

      {/* URL Input Section */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Website URL
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="example.com or https://example.com"
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all bg-white"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !isScanning) {
                handleScan();
              }
            }}
          />
          <button
            type="button"
            onClick={handleScan}
            disabled={isScanning || !baseUrl.trim()}
            className="px-8 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isScanning ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Scan Website</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scan Progress */}
      {scanProgress && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">
              {scanProgress.currentUrl}
            </span>
            <span className="text-sm text-blue-600">
              {scanProgress.current} / {scanProgress.total}
            </span>
          </div>
          {scanProgress.total > 0 && (
            <div className="w-full bg-blue-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{
                  width: `${(scanProgress.current / scanProgress.total) * 100}%`,
                }}
              ></div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {scannedURLs.length > 0 && (
        <div className="flex items-center justify-between bg-white border-2 border-gray-200 rounded-xl p-4">
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {scannedURLs.length} URL{scannedURLs.length !== 1 ? 's' : ''} found
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {scannedURLs.filter((s) => s.status === 'analyzed').length} analyzed
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || scannedURLs.length === 0}
              className="px-6 py-2 bg-black text-white rounded-lg font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze for Outdated Messaging'}
            </button>
            {scannedURLs.every((s) => s.analysis) && (
              <button
                type="button"
                onClick={handleRewrite}
                disabled={isRewriting || scannedURLs.some((s) => !s.analysis)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isRewriting ? 'Rewriting...' : 'Update to Ultra Messaging'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* URL List */}
      {scannedURLs.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800">Scanned URLs</h3>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {scannedURLs.map((scanned, index) => (
              <div
                key={index}
                className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <svg
                        className="w-5 h-5 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                        />
                      </svg>
                      <a
                        href={scanned.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 break-all"
                      >
                        {scanned.url}
                      </a>
                      <span className="text-xs text-gray-500">(Depth: {scanned.depth})</span>
                      <span className={`text-xs font-semibold ${getStatusColor(scanned.status)}`}>
                        {scanned.status.toUpperCase()}
                      </span>
                    </div>

                    {scanned.analysis && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRiskColor(
                              scanned.analysis.riskLevel
                            )}`}
                          >
                            {scanned.analysis.riskLevel.toUpperCase()} RISK
                          </span>
                        </div>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Summary:</p>
                          <p className="text-sm text-gray-600">{scanned.analysis.summary}</p>
                        </div>
                        {scanned.analysis.risks.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              Identified Risks:
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                              {scanned.analysis.risks.map((risk, riskIndex) => (
                                <li key={riskIndex} className="text-sm text-gray-600">
                                  {risk}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {scanned.analysis.outdatedTermsFound && scanned.analysis.outdatedTermsFound.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              Outdated Terms Found:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {scanned.analysis.outdatedTermsFound.map((term, termIndex) => (
                                <span
                                  key={termIndex}
                                  className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold"
                                >
                                  {term}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {scanned.analysis.issues.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              Messaging Issues to Update:
                            </p>
                            <div className="space-y-2">
                              {scanned.analysis.issues.map((issue, issueIndex) => (
                                <div
                                  key={issueIndex}
                                  className={`p-3 rounded border ${
                                    issue.severity === 'high'
                                      ? 'bg-red-50 border-red-200'
                                      : issue.severity === 'medium'
                                      ? 'bg-yellow-50 border-yellow-200'
                                      : 'bg-blue-50 border-blue-200'
                                  }`}
                                >
                                  <div className="flex items-start justify-between mb-1">
                                    <p className="text-xs font-semibold text-gray-700">
                                      {issue.type}
                                    </p>
                                    {issue.tag && (
                                      <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded font-mono">
                                        {issue.tag}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600 mb-1">{issue.description}</p>
                                  {issue.reasoning && (
                                    <div className="mt-2 p-2 bg-blue-50 rounded mb-1">
                                      <p className="text-xs font-semibold text-gray-700">Why:</p>
                                      <p className="text-xs text-blue-700">{issue.reasoning}</p>
                                    </div>
                                  )}
                                  {(issue.outdatedText || issue.currentText) && (
                                    <div className="mt-2 p-2 bg-gray-100 rounded mb-1">
                                      <p className="text-xs font-semibold text-gray-700">Current:</p>
                                      <p className="text-xs text-red-600 line-through">{issue.currentText || issue.outdatedText}</p>
                                    </div>
                                  )}
                                  {issue.suggestedReplacement && (
                                    <div className="mt-2 p-2 bg-green-50 rounded mb-1">
                                      <p className="text-xs font-semibold text-gray-700">Suggested:</p>
                                      <p className="text-xs text-green-700">{issue.suggestedReplacement}</p>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 mt-2">
                                    {issue.location && (
                                      <p className="text-xs text-gray-500 italic">Location: {issue.location}</p>
                                    )}
                                    {issue.priority && (
                                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                        issue.priority === 'immediate' ? 'bg-red-100 text-red-800' :
                                        issue.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                        issue.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {issue.priority.toUpperCase()} PRIORITY
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {scanned.analysis.updatePriority && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm font-semibold text-gray-700 mb-1">
                              Update Priority:
                            </p>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                scanned.analysis.updatePriority === 'high'
                                  ? 'bg-red-100 text-red-800'
                                  : scanned.analysis.updatePriority === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {scanned.analysis.updatePriority.toUpperCase()} PRIORITY
                            </span>
                          </div>
                        )}
                        {scanned.analysis.currentRelevance && (
                          <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              Current Relevance (Blackboard Learn):
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                scanned.analysis.currentRelevance.isRelevant
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {scanned.analysis.currentRelevance.isRelevant ? 'RELEVANT' : 'NOT RELEVANT'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-700 mb-2">{scanned.analysis.currentRelevance.reason}</p>
                            {scanned.analysis.currentRelevance.accurateContent && scanned.analysis.currentRelevance.accurateContent.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-semibold text-gray-600 mb-1">Still Accurate:</p>
                                <ul className="list-disc list-inside text-xs text-gray-600">
                                  {scanned.analysis.currentRelevance.accurateContent.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {scanned.analysis.currentRelevance.needsUpdating && scanned.analysis.currentRelevance.needsUpdating.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-semibold text-gray-600 mb-1">Needs Updating:</p>
                                <ul className="list-disc list-inside text-xs text-gray-600">
                                  {scanned.analysis.currentRelevance.needsUpdating.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        {scanned.analysis.futureRelevance && (
                          <div className="mt-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              Future Relevance (Blackboard Ultra):
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                scanned.analysis.futureRelevance.isRelevant
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {scanned.analysis.futureRelevance.isRelevant ? 'RELEVANT' : 'NOT RELEVANT'}
                              </span>
                              {scanned.analysis.futureRelevance.shouldUpdate && (
                                <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                                  SHOULD UPDATE
                                </span>
                              )}
                              {scanned.analysis.futureRelevance.shouldArchive && (
                                <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-800">
                                  SHOULD ARCHIVE
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-700">{scanned.analysis.futureRelevance.reasoning || scanned.analysis.futureRelevance.reason}</p>
                          </div>
                        )}
                        {scanned.analysis.messagingStrategy && (
                          <div className="mt-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              Messaging Strategy:
                            </p>
                            {scanned.analysis.messagingStrategy.currentState && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-gray-600 mb-1">Current State (Learn):</p>
                                <p className="text-xs text-gray-700">{scanned.analysis.messagingStrategy.currentState}</p>
                              </div>
                            )}
                            {scanned.analysis.messagingStrategy.transitionMessage && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-gray-600 mb-1">Transition Message (Ultra):</p>
                                <p className="text-xs text-gray-700">{scanned.analysis.messagingStrategy.transitionMessage}</p>
                              </div>
                            )}
                            {scanned.analysis.messagingStrategy.tone && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-gray-600 mb-1">Recommended Tone:</p>
                                <p className="text-xs text-gray-700">{scanned.analysis.messagingStrategy.tone}</p>
                              </div>
                            )}
                            {scanned.analysis.messagingStrategy.keyMessages && scanned.analysis.messagingStrategy.keyMessages.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1">Key Messages:</p>
                                <ul className="list-disc list-inside text-xs text-gray-700">
                                  {scanned.analysis.messagingStrategy.keyMessages.map((msg, idx) => (
                                    <li key={idx}>{msg}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                        {scanned.analysis.instructorRecommendations && (
                          <div className="mt-3 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              📚 Instructor Recommendations:
                            </p>
                            {scanned.analysis.instructorRecommendations.addDevShellLink && (
                              <div className="mb-3 p-2 bg-white rounded border border-yellow-200">
                                <p className="text-xs font-semibold text-gray-700 mb-1">Dev Shell Link:</p>
                                <a 
                                  href="https://www.cs-cc.edu/ultra" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                                >
                                  www.cs-cc.edu/ultra
                                </a>
                                {scanned.analysis.instructorRecommendations.devShellLinkText && (
                                  <p className="text-xs text-gray-600 mt-1 italic">
                                    Suggested text: "{scanned.analysis.instructorRecommendations.devShellLinkText}"
                                  </p>
                                )}
                              </div>
                            )}
                            {scanned.analysis.instructorRecommendations.workshopMention && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-gray-600 mb-1">Workshop Mention:</p>
                                <p className="text-xs text-gray-700">{scanned.analysis.instructorRecommendations.workshopMention}</p>
                              </div>
                            )}
                            {scanned.analysis.instructorRecommendations.ultraFeaturesToHighlight && scanned.analysis.instructorRecommendations.ultraFeaturesToHighlight.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-gray-600 mb-1">Ultra Features to Highlight:</p>
                                <ul className="list-disc list-inside text-xs text-gray-700">
                                  {scanned.analysis.instructorRecommendations.ultraFeaturesToHighlight.map((feature, idx) => (
                                    <li key={idx}>{feature}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {scanned.analysis.instructorRecommendations.transitionGuidance && (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1">Transition Guidance:</p>
                                <p className="text-xs text-gray-700">{scanned.analysis.instructorRecommendations.transitionGuidance}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {scanned.analysis.specificChanges && scanned.analysis.specificChanges.length > 0 && (
                          <div className="mt-3 p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                              📝 Specific Changes Required:
                            </p>
                            <div className="space-y-3">
                              {scanned.analysis.specificChanges.map((change, idx) => (
                                <div key={idx} className="p-3 bg-white rounded border border-gray-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                      change.action === 'replace' ? 'bg-orange-100 text-orange-800' :
                                      change.action === 'add' ? 'bg-green-100 text-green-800' :
                                      change.action === 'remove' ? 'bg-red-100 text-red-800' :
                                      'bg-blue-100 text-blue-800'
                                    }`}>
                                      {change.action.toUpperCase()}
                                    </span>
                                    {change.location && (
                                      <span className="text-xs text-gray-500">Location: {change.location}</span>
                                    )}
                                  </div>
                                  {change.currentText && (
                                    <div className="mb-2 p-2 bg-gray-100 rounded">
                                      <p className="text-xs font-semibold text-gray-600 mb-1">Current:</p>
                                      <p className="text-xs text-gray-700 line-through">{change.currentText}</p>
                                    </div>
                                  )}
                                  {change.newText && (
                                    <div className="mb-2 p-2 bg-green-50 rounded">
                                      <p className="text-xs font-semibold text-gray-600 mb-1">New:</p>
                                      <p className="text-xs text-green-700">{change.newText}</p>
                                    </div>
                                  )}
                                  {change.reason && (
                                    <p className="text-xs text-gray-600 italic">Why: {change.reason}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {scanned.analysis.documentStructure && (
                          <div className="mt-4 border-t border-gray-200 pt-4">
                            <p className="text-sm font-semibold text-gray-700 mb-3">
                              Document Structure Analysis
                            </p>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <p className="text-xs font-semibold text-gray-600 mb-2">Semantic Elements:</p>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">&lt;main&gt;:</span>
                                    <span className="font-semibold">{scanned.analysis.documentStructure.semanticElements.main}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">&lt;nav&gt;:</span>
                                    <span className="font-semibold">{scanned.analysis.documentStructure.semanticElements.nav}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">&lt;article&gt;:</span>
                                    <span className="font-semibold">{scanned.analysis.documentStructure.semanticElements.article}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">&lt;section&gt;:</span>
                                    <span className="font-semibold">{scanned.analysis.documentStructure.semanticElements.section}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">&lt;header&gt;:</span>
                                    <span className="font-semibold">{scanned.analysis.documentStructure.semanticElements.header}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">&lt;footer&gt;:</span>
                                    <span className="font-semibold">{scanned.analysis.documentStructure.semanticElements.footer}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <p className="text-xs font-semibold text-gray-600 mb-2">Structure Details:</p>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Headings:</span>
                                    <span className="font-semibold">
                                      {scanned.analysis.documentStructure.headingHierarchy.reduce((sum, h) => sum + h.count, 0)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Form Fields:</span>
                                    <span className="font-semibold">{scanned.analysis.documentStructure.formStructure.length}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Tables:</span>
                                    <span className="font-semibold">{scanned.analysis.documentStructure.tableStructure.length}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">ARIA Roles:</span>
                                    <span className="font-semibold">{scanned.analysis.documentStructure.ariaRoles.length}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Landmarks:</span>
                                    <span className="font-semibold">{scanned.analysis.documentStructure.landmarks.length}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            {scanned.analysis.documentStructure.headingHierarchy.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-gray-600 mb-2">Heading Hierarchy:</p>
                                <div className="flex gap-2 flex-wrap">
                                  {scanned.analysis.documentStructure.headingHierarchy.map((h, idx) => (
                                    <span key={idx} className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                      H{h.level}: {h.count}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {scanned.analysis.documentStructure.landmarks.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-600 mb-2">Landmark Regions:</p>
                                <div className="flex gap-2 flex-wrap">
                                  {scanned.analysis.documentStructure.landmarks.map((landmark, idx) => (
                                    <span key={idx} className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                                      {landmark}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {scanned.rewritten && (
                      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm font-semibold text-green-800 mb-2">
                          ✓ Content has been updated with Blackboard Ultra messaging
                        </p>
                        <button
                          type="button"
                          onClick={() => downloadRewritten(scanned)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                        >
                          Download Updated HTML
                        </button>
                      </div>
                    )}
                  </div>
                </div>
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
