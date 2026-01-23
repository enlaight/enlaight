import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from './ui/button';
import { useSearch } from '@/contexts/SearchContext';
import { SendHorizontal, X } from 'lucide-react';
import { SearchService } from '@/services/SearchService';
import { useStore } from '@/store/useStore';
import { useNavigate } from 'react-router-dom';

interface SearchBarProps {
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({ className = "" }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { currentQuery, update } = useStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const { onSearchFocusRequest } = useSearch();

  useEffect(() => {
    onSearchFocusRequest(() => {
      if (isMobile) {
        setIsExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        inputRef.current?.focus();
      }
    });
  }, [onSearchFocusRequest, isMobile]);

  const handleSetQuery = (value) => {
    update("currentQuery", value);
  }

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!currentQuery.trim() || !currentQuery.length) return;

    if (window.location.pathname !== "/search") {
      navigate('/search');
    }

    update("query", currentQuery);
    update("loadingSearch", true);
    update("searchResults", []);

    try {
      const { results } = await SearchService.post(currentQuery);
      update("searchResults", results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      update("loadingSearch", false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleSearch = () => {
    setIsExpanded(!isExpanded);
    if (isExpanded) {
      update("currentQuery", "");
      update("query", "");
      update("searchResults", []);
    }
  };

  if (isMobile) {
    return (
      <div className={`relative ${className}`}>
        {!isExpanded ? (
          <Button
            onClick={toggleSearch}
            variant="ghost"
            size="icon"
            aria-label={t('common.search')}
            className="p-2 rounded-full hover:bg-accent transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 19 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
            >
              <path d="M8.19303 13.05C7.125 13.05 6.08096 12.7333 5.19292 12.1399C4.30488 11.5466 3.61274 10.7032 3.20403 9.71649C2.79531 8.72977 2.68837 7.64401 2.89673 6.59651C3.10509 5.54902 3.6194 4.58683 4.37461 3.83162C5.12983 3.07642 6.09202 2.56212 7.13953 2.35376C8.18704 2.1454 9.27282 2.25234 10.2595 2.66105C11.2463 3.06977 12.0897 3.7619 12.683 4.64992C13.2764 5.53795 13.5931 6.58198 13.5931 7.65C13.5915 9.08167 13.022 10.4543 12.0097 11.4666C10.9973 12.4789 9.62473 13.0484 8.19303 13.05ZM8.19303 3.6C7.39201 3.6 6.60898 3.83753 5.94295 4.28255C5.27692 4.72757 4.75782 5.36009 4.45128 6.10013C4.14474 6.84017 4.06454 7.65449 4.22081 8.44011C4.37708 9.22574 4.76281 9.94738 5.32922 10.5138C5.89563 11.0802 6.61728 11.4659 7.40291 11.6222C8.18854 11.7784 9.00287 11.6982 9.74292 11.3917C10.483 11.0852 11.1155 10.5661 11.5605 9.90006C12.0056 9.23404 12.2431 8.45101 12.2431 7.65C12.242 6.5762 11.815 5.54669 11.0557 4.7874C10.2964 4.02811 9.26684 3.60107 8.19303 3.6Z" fill="currentColor" />
              <path d="M15.6181 15.75C15.4391 15.75 15.2674 15.6788 15.1409 15.5522L12.4408 12.8522C12.3179 12.7249 12.2498 12.5544 12.2514 12.3774C12.2529 12.2004 12.3239 12.0311 12.4491 11.906C12.5742 11.7808 12.7435 11.7099 12.9205 11.7083C13.0975 11.7068 13.268 11.7748 13.3953 11.8978L16.0953 14.5978C16.1897 14.6922 16.254 14.8124 16.28 14.9434C16.306 15.0743 16.2927 15.21 16.2416 15.3333C16.1905 15.4566 16.104 15.562 15.993 15.6362C15.8821 15.7104 15.7516 15.75 15.6181 15.75Z" fill="currentColor" />
            </svg>
          </Button>
        ) : (
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-2 shadow-lg fixed left-4 right-16 top-4 z-50"
            role="search"
            aria-label="Search form"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 19 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="flex-shrink-0"
            >
              <path d="M8.19303 13.05C7.125 13.05 6.08096 12.7333 5.19292 12.1399C4.30488 11.5466 3.61274 10.7032 3.20403 9.71649C2.79531 8.72977 2.68837 7.64401 2.89673 6.59651C3.10509 5.54902 3.6194 4.58683 4.37461 3.83162C5.12983 3.07642 6.09202 2.56212 7.13953 2.35376C8.18704 2.1454 9.27282 2.25234 10.2595 2.66105C11.2463 3.06977 12.0897 3.7619 12.683 4.64992C13.2764 5.53795 13.5931 6.58198 13.5931 7.65C13.5915 9.08167 13.022 10.4543 12.0097 11.4666C10.9973 12.4789 9.62473 13.0484 8.19303 13.05ZM8.19303 3.6C7.39201 3.6 6.60898 3.83753 5.94295 4.28255C5.27692 4.72757 4.75782 5.36009 4.45128 6.10013C4.14474 6.84017 4.06454 7.65449 4.22081 8.44011C4.37708 9.22574 4.76281 9.94738 5.32922 10.5138C5.89563 11.0802 6.61728 11.4659 7.40291 11.6222C8.18854 11.7784 9.00287 11.6982 9.74292 11.3917C10.483 11.0852 11.1155 10.5661 11.5605 9.90006C12.0056 9.23404 12.2431 8.45101 12.2431 7.65C12.242 6.5762 11.815 5.54669 11.0557 4.7874C10.2964 4.02811 9.26684 3.60107 8.19303 3.6Z" fill="currentColor" />
              <path d="M15.6181 15.75C15.4391 15.75 15.2674 15.6788 15.1409 15.5522L12.4408 12.8522C12.3179 12.7249 12.2498 12.5544 12.2514 12.3774C12.2529 12.2004 12.3239 12.0311 12.4491 11.906C12.5742 11.7808 12.7435 11.7099 12.9205 11.7083C13.0975 11.7068 13.268 11.7748 13.3953 11.8978L16.0953 14.5978C16.1897 14.6922 16.254 14.8124 16.28 14.9434C16.306 15.0743 16.2927 15.21 16.2416 15.3333C16.1905 15.4566 16.104 15.562 15.993 15.6362C15.8821 15.7104 15.7516 15.75 15.6181 15.75Z" fill="currentColor" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={currentQuery}
              onChange={(e) => handleSetQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('common.search')}
              className="flex-1 bg-transparent border-none outline-none text-sm pr-2"
              aria-label={t('common.search')}
              autoFocus
            />
            <Button
              type="button"
              onClick={() => handleSearch()}
              disabled={!currentQuery.trim()}
              className="h-[18px] w-[18px] p-0 rounded-full bg-brand-yellow hover:bg-brand-yellow-hover disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              aria-label="Send search"
            >
              <SendHorizontal className="h-3 w-3 text-white" />
            </Button>
            <Button
              type="button"
              onClick={toggleSearch}
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0"
              aria-label="Close search"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex w-full max-w-[500px] flex-col justify-center items-start gap-2 border relative bg-white pl-4 rounded-full border-gray-200 ${className}`}
      aria-label="Search form"
    >
      <div className="flex items-center gap-2 self-stretch relative p-0">
        <svg
          width="19"
          height="18"
          viewBox="0 0 19 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="search-icon w-[18px] h-[18px] flex-shrink-0"
        >
          <path d="M8.19303 13.05C7.125 13.05 6.08096 12.7333 5.19292 12.1399C4.30488 11.5466 3.61274 10.7032 3.20403 9.71649C2.79531 8.72977 2.68837 7.64401 2.89673 6.59651C3.10509 5.54902 3.6194 4.58683 4.37461 3.83162C5.12983 3.07642 6.09202 2.56212 7.13953 2.35376C8.18704 2.1454 9.27282 2.25234 10.2595 2.66105C11.2463 3.06977 12.0897 3.7619 12.683 4.64992C13.2764 5.53795 13.5931 6.58198 13.5931 7.65C13.5915 9.08167 13.022 10.4543 12.0097 11.4666C10.9973 12.4789 9.62473 13.0484 8.19303 13.05ZM8.19303 3.6C7.39201 3.6 6.60898 3.83753 5.94295 4.28255C5.27692 4.72757 4.75782 5.36009 4.45128 6.10013C4.14474 6.84017 4.06454 7.65449 4.22081 8.44011C4.37708 9.22574 4.76281 9.94738 5.32922 10.5138C5.89563 11.0802 6.61728 11.4659 7.40291 11.6222C8.18854 11.7784 9.00287 11.6982 9.74292 11.3917C10.483 11.0852 11.1155 10.5661 11.5605 9.90006C12.0056 9.23404 12.2431 8.45101 12.2431 7.65C12.242 6.5762 11.815 5.54669 11.0557 4.7874C10.2964 4.02811 9.26684 3.60107 8.19303 3.6Z" fill="#6B7280" />
          <path d="M15.6181 15.75C15.4391 15.75 15.2674 15.6788 15.1409 15.5522L12.4408 12.8522C12.3179 12.7249 12.2498 12.5544 12.2514 12.3774C12.2529 12.2004 12.3239 12.0311 12.4491 11.906C12.5742 11.7808 12.7435 11.7099 12.9205 11.7083C13.0975 11.7068 13.268 11.7748 13.3953 11.8978L16.0953 14.5978C16.1897 14.6922 16.254 14.8124 16.28 14.9434C16.306 15.0743 16.2927 15.21 16.2416 15.3333C16.1905 15.4566 16.104 15.562 15.993 15.6362C15.8821 15.7104 15.7516 15.75 15.6181 15.75Z" fill="#6B7280" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={currentQuery}
          onChange={(e) => handleSetQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('common.search')}
          className="flex-[1_0_0] self-stretch text-black text-sm font-normal leading-[17.5px] bg-transparent border-none outline-none placeholder-gray-500 pr-2"
          aria-label={t('common.search')}
        />
        {currentQuery.length > 0 && (
          <X className="w-4 h-4 text-gray-500 cursor-pointer" onClick={() => handleSetQuery('')} />
        )}
        <Button
          type="button"
          variant="default"
          onClick={() => handleSearch()}
          className="h-[43px] rounded-full disabled:cursor-not-allowed flex-shrink-0"
          style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, border: '2px solid white' }}
          aria-label="Send search"
        >
          <SendHorizontal className="w-8 h-8 text-white" style={{ width: 18, height: 18 }} />
        </Button>
      </div>
    </div>
  );
};
