/**
 * Newspaper Frame Component
 *
 * Main container assembling all newspaper components with paper texture and styling.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Masthead } from './Masthead';
import { SectionTabs } from './SectionTabs';
import { ArticleGrid } from './ArticleGrid';
import { PageControls } from './PageControls';
import { PageFlip } from './PageFlip';
import type { NewspaperContent } from './types';

interface NewspaperFrameProps {
  content: NewspaperContent;
  isLoading?: boolean;
}

export function NewspaperFrame({ content, isLoading }: NewspaperFrameProps) {
  const [activeSection, setActiveSection] = useState(content.sections[0]?.name || '');
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');

  // Get current section data
  const currentSectionData = content.sections.find((s) => s.name === activeSection);
  const sectionNames = content.sections.map((s) => s.name);

  // Pagination - split articles into pages (6 articles per page for 2-column grid)
  const articlesPerPage = 6;
  const articles = currentSectionData?.articles || [];
  const totalPages = Math.ceil(articles.length / articlesPerPage);
  const [currentPage, setCurrentPage] = useState(1);

  const startIndex = (currentPage - 1) * articlesPerPage;
  const endIndex = startIndex + articlesPerPage;
  const currentArticles = articles.slice(startIndex, endIndex);

  const handleSectionChange = (section: string) => {
    if (section === activeSection) return;

    const currentIndex = sectionNames.indexOf(activeSection);
    const newIndex = sectionNames.indexOf(section);
    setFlipDirection(newIndex > currentIndex ? 'next' : 'prev');
    setActiveSection(section);
    setCurrentPage(1); // Reset to first page when changing sections
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setFlipDirection('prev');
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setFlipDirection('next');
      setCurrentPage(currentPage + 1);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-amber-700 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="font-accent text-stone-600">Preparing the Chronicle...</p>
        </div>
      </div>
    );
  }

  const isVictorian = content.style === 'victorian';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-6xl mx-auto"
    >
      {/* Paper container with texture and shadow */}
      <div
        className={`
          relative rounded-lg shadow-2xl overflow-hidden
          ${isVictorian
            ? 'bg-gradient-to-br from-amber-400/70 via-amber-300/60 to-amber-400/70'
            : 'bg-gradient-to-br from-stone-400/70 via-stone-300/60 to-stone-400/70'
          }
        `}
        style={{
          boxShadow: isVictorian
            ? '0 20px 50px rgba(120, 53, 15, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
            : '0 20px 50px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        }}
      >
        {/* Paper texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Main content */}
        <div className="relative p-8 md:p-12">
          {/* Masthead */}
          <Masthead dateDisplay={content.date_display} style={content.style} />

          {/* Section tabs */}
          <SectionTabs
            sections={sectionNames}
            activeSection={activeSection}
            onSectionChange={handleSectionChange}
            style={content.style}
          />

          {/* Article content with page flip animation */}
          <PageFlip direction={flipDirection} pageKey={`${activeSection}-${currentPage}`}>
            <ArticleGrid articles={currentArticles} style={content.style} />
          </PageFlip>

          {/* Page controls */}
          {totalPages > 1 && (
            <PageControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPrev={handlePrevPage}
              onNext={handleNextPage}
              style={content.style}
            />
          )}
        </div>

        {/* Decorative corner flourishes for Victorian style */}
        {isVictorian && (
          <>
            {/* Top-left corner */}
            <div className="absolute top-0 left-0 w-24 h-24 pointer-events-none">
              <svg viewBox="0 0 100 100" className="w-full h-full text-amber-700/20">
                <path
                  d="M 0 0 Q 30 0 50 20 Q 70 40 70 70 L 0 70 Z"
                  fill="currentColor"
                />
              </svg>
            </div>

            {/* Top-right corner */}
            <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none">
              <svg viewBox="0 0 100 100" className="w-full h-full text-amber-700/20">
                <path
                  d="M 100 0 Q 70 0 50 20 Q 30 40 30 70 L 100 70 Z"
                  fill="currentColor"
                />
              </svg>
            </div>

            {/* Bottom-left corner */}
            <div className="absolute bottom-0 left-0 w-24 h-24 pointer-events-none">
              <svg viewBox="0 0 100 100" className="w-full h-full text-amber-700/20">
                <path
                  d="M 0 100 Q 30 100 50 80 Q 70 60 70 30 L 0 30 Z"
                  fill="currentColor"
                />
              </svg>
            </div>

            {/* Bottom-right corner */}
            <div className="absolute bottom-0 right-0 w-24 h-24 pointer-events-none">
              <svg viewBox="0 0 100 100" className="w-full h-full text-amber-700/20">
                <path
                  d="M 100 100 Q 70 100 50 80 Q 30 60 30 30 L 100 30 Z"
                  fill="currentColor"
                />
              </svg>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
