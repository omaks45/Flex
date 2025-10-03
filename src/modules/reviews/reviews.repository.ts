/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Review, ReviewDocument } from './entities/review.entity';
import { FilterReviewDto } from './dto/filter-review.dto';

@Injectable()
export class ReviewsRepository {
    constructor(
        @InjectModel(Review.name)
        private readonly reviewModel: Model<ReviewDocument>,
    ) {}

    /**
     * Create a single review
     * Time Complexity: O(1)
     */
    async create(reviewData: Partial<Review>): Promise<ReviewDocument> {
        const review = new this.reviewModel(reviewData);
        return review.save();
    }

    /**
     * Bulk create or update reviews (upsert based on hostawayId)
     * Time Complexity: O(n) where n is number of reviews
     * Uses MongoDB's bulkWrite for efficient batch operations
     */
    async bulkUpsert(reviews: Partial<Review>[]): Promise<{ inserted: number; updated: number }> {
        const operations = reviews.map((review) => ({
        updateOne: {
            filter: { hostawayId: review.hostawayId },
            update: { $set: review },
            upsert: true,
        },
        }));

        const result = await this.reviewModel.bulkWrite(operations);
        
        return {
        inserted: result.upsertedCount,
        updated: result.modifiedCount,
        };
    }

    /**
     * Find reviews with filters, sorting, and pagination
     * Time Complexity: O(log n) for indexed queries + O(m) for result set
     * Uses MongoDB indexes for optimal performance
     */
    async findWithFilters(filters: FilterReviewDto) {
        const {
        page = 1,
        limit = 20,
        sortBy = 'submittedAt',
        sortOrder = 'desc',
        ...filterParams
        } = filters;

        // Build query dynamically
        const query = this.buildFilterQuery(filterParams);

        // Calculate pagination
        const skip = (page - 1) * limit;
        const sortOptions: any = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        // Execute query with count in parallel for better performance
        const [data, total] = await Promise.all([
        this.reviewModel
            .find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean()
            .exec(),
        this.reviewModel.countDocuments(query).exec(),
        ]);

        return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: page < Math.ceil(total / limit),
            hasPrevPage: page > 1,
        },
        };
    }

    /**
     * Build MongoDB filter query from DTO
     * Time Complexity: O(1)
     */
    private buildFilterQuery(filters: Partial<FilterReviewDto>): FilterQuery<ReviewDocument> {
        const query: FilterQuery<ReviewDocument> = {};

        if (filters.listingId) {
        query.listingId = filters.listingId;
        }

        if (filters.channel) {
        query.channel = filters.channel;
        }

        if (filters.status) {
        query.status = filters.status;
        }

        if (filters.minRating !== undefined) {
        query.averageCategoryRating = { $gte: filters.minRating };
        }

        if (filters.isApprovedForPublic !== undefined) {
        query.isApprovedForPublic = filters.isApprovedForPublic;
        }

        // Date range filter
        if (filters.startDate || filters.endDate) {
        query.submittedAt = {};
        if (filters.startDate) {
            query.submittedAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
            query.submittedAt.$lte = new Date(filters.endDate);
        }
        }

        // Guest name search (case-insensitive)
        if (filters.guestName) {
        query.guestName = { $regex: filters.guestName, $options: 'i' };
        }

        return query;
    }

    /**
     * Find review by ID
     * Time Complexity: O(1) - indexed lookup
     */
    async findById(id: string): Promise<ReviewDocument> {
        return this.reviewModel.findById(id).exec();
    }

    /**
     * Find review by Hostaway ID
     * Time Complexity: O(1) - indexed lookup
     */
    async findByHostawayId(hostawayId: number): Promise<ReviewDocument> {
        return this.reviewModel.findOne({ hostawayId }).exec();
    }

    /**
     * Update review by ID
     * Time Complexity: O(1)
     */
    async update(id: string, updateData: Partial<Review>): Promise<ReviewDocument> {
        return this.reviewModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();
    }

    /**
     * Bulk approve reviews
     * Time Complexity: O(n) where n is number of review IDs
     */
    async bulkApprove(reviewIds: string[], approvedBy: string): Promise<number> {
        const result = await this.reviewModel.updateMany(
        { _id: { $in: reviewIds } },
        {
            $set: {
            isApprovedForPublic: true,
            approvedBy,
            approvedAt: new Date(),
            },
        },
        );

        return result.modifiedCount;
    }

    /**
     * Get approved reviews for public display
     * Time Complexity: O(log n) + O(m)
     */
    async findApprovedReviews(listingId?: string, limit = 10) {
        const query: FilterQuery<ReviewDocument> = {
        isApprovedForPublic: true,
        status: 'published',
        };

        if (listingId) {
        query.listingId = listingId;
        }

        return this.reviewModel
        .find(query)
        .sort({ submittedAt: -1 })
        .limit(limit)
        .select('-managerNotes -approvedBy') // Exclude internal fields
        .lean()
        .exec();
    }

    /**
     * Get aggregated statistics
     * Time Complexity: O(n) but runs on MongoDB server
     * Uses aggregation pipeline for efficient computation
     */
    async getStatistics() {
        const stats = await this.reviewModel.aggregate([
        {
            $facet: {
            overview: [
                {
                $group: {
                    _id: null,
                    totalReviews: { $sum: 1 },
                    averageRating: { $avg: '$averageCategoryRating' },
                    approvedCount: {
                    $sum: { $cond: ['$isApprovedForPublic', 1, 0] },
                    },
                    pendingCount: {
                    $sum: { $cond: ['$isApprovedForPublic', 0, 1] },
                    },
                },
                },
            ],
            byChannel: [
                {
                $group: {
                    _id: '$channel',
                    count: { $sum: 1 },
                    avgRating: { $avg: '$averageCategoryRating' },
                },
                },
            ],
            byProperty: [
                {
                $group: {
                    _id: {
                    listingId: '$listingId',
                    listingName: '$listingName',
                    },
                    count: { $sum: 1 },
                    avgRating: { $avg: '$averageCategoryRating' },
                    approvedCount: {
                    $sum: { $cond: ['$isApprovedForPublic', 1, 0] },
                    },
                },
                },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ],
            ratingDistribution: [
                {
                $bucket: {
                    groupBy: '$averageCategoryRating',
                    boundaries: [0, 2, 4, 6, 8, 10],
                    default: 'Other',
                    output: {
                    count: { $sum: 1 },
                    },
                },
                },
            ],
            },
        },
        ]);

        return stats[0];
    }

    /**
     * Get reviews trend over time
     * Time Complexity: O(n)
     */
    async getReviewsTrend(days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return this.reviewModel.aggregate([
        {
            $match: {
            submittedAt: { $gte: startDate },
            },
        },
        {
            $group: {
            _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' },
            },
            count: { $sum: 1 },
            avgRating: { $avg: '$averageCategoryRating' },
            },
        },
        { $sort: { _id: 1 } },
        ]);
    }

    /**
     * Delete review by ID
     * Time Complexity: O(1)
     */
    async delete(id: string): Promise<ReviewDocument> {
        return this.reviewModel.findByIdAndDelete(id).exec();
    }

    /**
     * Get total count
     * Time Complexity: O(1) - MongoDB keeps count metadata
     */
    async count(query: FilterQuery<ReviewDocument> = {}): Promise<number> {
        return this.reviewModel.countDocuments(query).exec();
    }
}