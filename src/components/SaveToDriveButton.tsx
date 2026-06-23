import React, { useState, useEffect } from 'react';
import { Cloud, Check, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { getAccessToken, googleSignIn, uploadFileToDrive, initAuth } from '../lib/googleDrive';

interface SaveToDriveButtonProps {
  filename: string;
  content: string;
  mimeType: string;
  className?: string;
  buttonText?: string;
}

export default function SaveToDriveButton({
  filename,
  content,
  mimeType,
  className = '',
  buttonText = 'Сохранить на Диск'
}: SaveToDriveButtonProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [fileUrl, setFileUrl] = useState<string>('');

  // Track auth state to display appropriate button state
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthenticated(getAccessToken() !== null);
    };

    checkAuth();
    const unsubscribe = initAuth(
      () => setIsAuthenticated(true),
      () => setIsAuthenticated(false)
    );
    return () => unsubscribe();
  }, []);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setStatus('saving');
    setErrorMessage('');

    try {
      let token = getAccessToken();
      if (!token) {
        // Prompt for Google sign in first
        const result = await googleSignIn();
        if (!result) {
          throw new Error('Авторизация отклонена');
        }
        setIsAuthenticated(true);
      }

      const res = await uploadFileToDrive(filename, content, mimeType);
      setStatus('success');
      if (res.webViewLink) {
        setFileUrl(res.webViewLink);
      }

      // Reset to idle after 5 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 5000);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMessage(err.message || 'Ошибка сохранения на Google Диск');
    }
  };

  if (status === 'saving') {
    return (
      <button
        disabled
        className={`flex items-center gap-1.5 justify-center px-4 py-2 text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 rounded-[10px] transition select-none ${className}`}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Сохраняем...</span>
      </button>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-[10px] select-none">
          <Check className="w-3.5 h-3.5" />
          <span>Успешно!</span>
        </span>
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-2 text-xs font-bold bg-[#30ABE9]/10 text-[#30ABE9] hover:bg-[#30ABE9]/20 border border-[#30ABE9]/20 rounded-[10px] transition cursor-pointer"
            title="Открыть на Google Диске"
          >
            <span>Открыть</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 justify-center px-4 py-2 text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-[10px] transition cursor-pointer ${className}`}
          title={errorMessage}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Повторить</span>
        </button>
        <span className="text-[10px] text-red-500 font-medium max-w-[150px] truncate" title={errorMessage}>
          {errorMessage}
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={handleSave}
      className={`flex items-center gap-1.5 justify-center px-4 py-2 text-xs font-extrabold transition-all duration-200 border cursor-pointer select-none rounded-[10px] ${
        isAuthenticated
          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200'
          : 'bg-[#30ABE9]/10 hover:bg-[#30ABE9]/15 text-[#30ABE9] border-[#30ABE9]/20'
      } ${className}`}
    >
      <Cloud className="w-3.5 h-3.5 shrink-0" />
      <span>{isAuthenticated ? buttonText : 'Войти и Сохранить'}</span>
    </button>
  );
}
