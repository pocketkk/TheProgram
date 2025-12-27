/**
 * Article Grid Component
 *
 * Two-column grid layout for displaying newspaper articles.
 */

import { ArticleCard } from './ArticleCard';
import type { NewspaperArticle } from './types';

interface ArticleGridProps {
  articles: NewspaperArticle[];
  style: 'victorian' | 'modern';
  onFeedback?: (articleId: string, feedback: 'more' | 'less') => void;
}

export function ArticleGrid({ articles, style, onFeedback }: ArticleGridProps) {
  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-500 font-accent">No articles in this section</p>
      </div>
    );
  }

  return (
    <div
      className="
        grid grid-cols-1 md:grid-cols-2 gap-4
        mb-6
      "
    >
      {articles.map((article, index) => (
        <ArticleCard
          key={article.id || `${article.year}-${index}`}
          article={article}
          style={style}
          index={index}
          onFeedback={onFeedback}
        />
      ))}
    </div>
  );
}
