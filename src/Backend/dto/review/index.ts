export interface ReviewListQueryDto {
  productId?: string;
  userId?: string;
  page?: string;
  limit?: string;
}

export interface CreateReviewDto {
  productId?: number;
  rating?: number;
  comment?: string | null;
}

export interface UpdateReviewDto {
  rating?: number;
  comment?: string | null;
}

export interface ReviewDto {
  id: number;
  userId: number;
  productId: number;
  rating: number;
  comment: string | null;
  createdAt: Date;
  userName: string | null;
  productName: string | null;
}
