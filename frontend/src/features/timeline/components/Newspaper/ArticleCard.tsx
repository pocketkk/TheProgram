/**
 * Article Card Component
 *
 * Individual article display with headline, year, content, and optional significance.
 */

import { motion } from 'framer-motion';
import type { NewspaperArticle } from './types';

interface ArticleCardProps {
  article: NewspaperArticle;
  style: 'victorian' | 'modern';
  index: number;
}

export function ArticleCard({ article, style, index }: ArticleCardProps) {
  const isVictorian = style === 'victorian';

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.08,
        duration: 0.5,
        ease: 'easeOut',
      }}
      className={`
        p-4 rounded-lg
        ${isVictorian
          ? 'bg-amber-50/30 border-2 border-amber-700/20'
          : 'bg-white/50 border border-stone-300'
        }
      `}
    >
      {/* Year and source badges */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`
            inline-block px-3 py-1 rounded-full text-xs font-mono font-bold
            ${isVictorian
              ? 'bg-amber-700 text-amber-50'
              : 'bg-stone-700 text-white'
            }
          `}
        >
          {article.year}
        </div>
        {article.source && (
          <div
            className={`
              inline-block px-2 py-1 rounded-full text-xs font-medium
              ${article.source === 'guardian'
                ? 'bg-blue-600/80 text-white'
                : article.source === 'nyt'
                ? 'bg-slate-800/80 text-white'
                : article.source === 'wikipedia'
                ? 'bg-stone-500/80 text-white'
                : 'bg-cosmic-600/80 text-white'
              }
            `}
          >
            {article.source === 'guardian' ? 'Guardian'
              : article.source === 'nyt' ? 'NYT'
              : article.source === 'wikipedia' ? 'Wikipedia'
              : 'AI Generated'}
          </div>
        )}
      </div>

      {/* Headline */}
      <h3
        className={`
          font-accent font-bold mb-3 leading-tight
          ${isVictorian
            ? 'text-xl text-stone-900 border-b-2 border-amber-700/30 pb-2'
            : 'text-lg text-stone-800 border-b border-stone-300 pb-2'
          }
        `}
      >
        {article.headline}
      </h3>

      {/* Content */}
      <p
        className={`
          leading-relaxed mb-3
          ${isVictorian
            ? 'text-stone-800 font-serif text-sm'
            : 'text-stone-700 text-sm'
          }
        `}
      >
        {article.content}
      </p>

      {/* Significance note (if provided) */}
      {article.significance && (
        <div
          className={`
            mt-3 pt-3 border-t italic text-xs leading-relaxed
            ${isVictorian
              ? 'border-amber-700/30 text-amber-900'
              : 'border-stone-300 text-stone-600'
            }
          `}
        >
          <span className="font-bold not-italic">Historical Note:</span>{' '}
          {article.significance}
        </div>
      )}
    </motion.article>
  );
}
