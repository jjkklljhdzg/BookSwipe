// lib/recommendation/types.ts
export interface BookInteraction {
  id: number;
  title: string;
  author: string;
  genres: string;
}

export interface BookForRecommendation {
  id: number;
  title: string;
  author: string;
  genres: string;
}

export interface RecommendationRequest {
  userId: number;
  limit?: number;
}