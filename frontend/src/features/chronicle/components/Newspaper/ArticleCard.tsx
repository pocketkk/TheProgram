/**
 * Article Card Component
 *
 * Individual article display with headline, year, content, and optional significance.
 * Supports external links for RSS articles.
 */

import { ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import type { NewspaperArticle } from './types';

interface ArticleCardProps {
  article: NewspaperArticle;
  style: 'victorian' | 'modern';
  index: number;
}

export function ArticleCard({ article, style, index }: ArticleCardProps) {
  const isVictorian = style === 'victorian';
  const isRss = article.source === 'rss';

  // Get source display info
  const getSourceBadge = () => {
    if (!article.source) return null;

    let bgClass = 'bg-cosmic-600/80';
    let label = 'AI Generated';

    switch (article.source) {
      case 'guardian':
        bgClass = 'bg-blue-600/80';
        label = 'Guardian';
        break;
      case 'nyt':
        bgClass = 'bg-slate-800/80';
        label = 'NYT';
        break;
      case 'wikipedia':
        bgClass = 'bg-stone-500/80';
        label = 'Wikipedia';
        break;
      case 'rss':
        bgClass = 'bg-orange-600/80';
        label = article.feedTitle || 'RSS';
        break;
    }

    return { bgClass, label };
  };

  const sourceBadge = getSourceBadge();

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
          ? 'bg-amber-400/30 border-2 border-amber-700/20'
          : 'bg-stone-400/30 border border-stone-500/30'
        }
      `}
    >
      {/* Year and source badges */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
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
        {sourceBadge && (
          <div
            className={`
              inline-block px-2 py-1 rounded-full text-xs font-medium truncate max-w-[150px]
              ${sourceBadge.bgClass} text-white
            `}
            title={sourceBadge.label}
          >
            {sourceBadge.label}
          </div>
        )}
        {article.author && (
          <div className="text-xs text-stone-600 truncate max-w-[120px]" title={article.author}>
            by {article.author}
          </div>
        )}
      </div>

      {/* Headline - with link for external articles */}
      <h3
        className={`
          font-accent font-bold mb-3 leading-tight
          ${isVictorian
            ? 'text-xl text-stone-900 border-b-2 border-amber-700/40 pb-2'
            : 'text-lg text-stone-900 border-b border-stone-600/50 pb-2'
          }
        `}
      >
        {article.url ? (
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-amber-700 transition-colors inline-flex items-center gap-1.5 group"
          >
            {article.headline}
            <ExternalLink className="h-4 w-4 opacity-50 group-hover:opacity-100 flex-shrink-0" />
          </a>
        ) : (
          article.headline
        )}
      </h3>

      {/* Content */}
      <p
        className={`
          leading-relaxed mb-3
          ${isVictorian
            ? 'text-stone-800 font-serif text-sm'
            : 'text-stone-800 text-sm'
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
              ? 'border-amber-700/40 text-stone-700'
              : 'border-stone-500/50 text-stone-600'
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
