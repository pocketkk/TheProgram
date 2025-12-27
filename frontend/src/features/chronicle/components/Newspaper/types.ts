/**
 * Type definitions for Newspaper components
 */

export interface NewspaperArticle {
  headline: string;
  content: string;
  year: number;
  significance?: string;
  source?: 'guardian' | 'nyt' | 'wikipedia' | 'system' | 'rss';
  /** URL for external articles (RSS, news sources) */
  url?: string;
  /** Feed name for RSS articles */
  feedTitle?: string;
  /** Article author */
  author?: string;
}

export interface NewspaperSection {
  name: string;
  articles: NewspaperArticle[];
}

export interface NewspaperContent {
  headline: string;
  date_display: string;
  sections: NewspaperSection[];
  style: 'victorian' | 'modern';
}
