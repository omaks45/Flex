/* eslint-disable prettier/prettier */
export interface HostawayReviewCategory {
    category: string;
    rating: number;
}

export interface HostawayReview {
    id: number;
    type: string;
    status: string;
    rating: number | null;
    publicReview: string;
    privateReview?: string;
    reviewCategory: HostawayReviewCategory[];
    submittedAt: string;
    guestName: string;
    listingName: string;
    listingId?: string;
    channelId?: number;
}

export interface HostawayApiResponse {
    status: string;
    result: HostawayReview[];
    count?: number;
    limit?: number;
    offset?: number;
}

export interface NormalizedReview {
    hostawayId: number;
    type: string;
    status: string;
    rating: number | null;
    publicReview: string;
    privateReview: string | null;
    reviewCategories: {
        category: string;
        rating: number;
    }[];
    submittedAt: Date;
    guestName: string;
    listingId: string;
    listingName: string;
    channel: string;
    averageCategoryRating: number;
}