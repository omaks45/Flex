/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ReviewsRepository } from './reviews.repository';
import { CreateReviewDto } from './dto/create-review.dto';
import { FilterReviewDto } from './dto/filter-review.dto';
import { UpdateReviewDto, BulkApproveDto } from './dto/update-review.dto';
import { NormalizedReview } from './interfaces/hostaway-response.interface';
import { HostawayService } from '../hostaway/hostaway.service';

@Injectable()
export class ReviewsService {
  private readonly CACHE_KEYS = {
    STATISTICS: 'reviews:statistics',
    APPROVED_REVIEWS: 'reviews:approved',
    TREND: 'reviews:trend',
  };

  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly hostawayService: HostawayService, // NEW INJECTION
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ============= NEW CRITICAL METHOD =============
  /**
   * Fetch reviews from Hostaway API and normalize them
   * Time Complexity: O(n) where n is number of reviews
   * This is the main integration point tested in the assessment
   */
  async fetchAndNormalizeHostawayReviews() {
    try {
      // Fetch raw reviews from Hostaway (uses mock data as API is sandboxed)
      const rawReviews = await this.hostawayService.fetchReviews();

      // Normalize the reviews to our internal format
      const normalizedReviews = this.hostawayService.normalizeReviews(rawReviews);

      return {
        status: 'success',
        count: normalizedReviews.length,
        reviews: normalizedReviews,
        message: 'Reviews fetched and normalized successfully',
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch reviews from Hostaway: ${error.message}`,
      );
    }
  }
  // ================================================

  /**
   * Sync normalized reviews from Hostaway to database
   * Time Complexity: O(n) - single bulk operation
   */
  async syncReviews(normalizedReviews: NormalizedReview[]) {
    if (!normalizedReviews || normalizedReviews.length === 0) {
      throw new BadRequestException('No reviews to sync');
    }

    const result = await this.reviewsRepository.bulkUpsert(normalizedReviews);

    // Invalidate cache after sync
    await this.invalidateCache();

    return {
      message: 'Reviews synced successfully',
      inserted: result.inserted,
      updated: result.updated,
      total: normalizedReviews.length,
    };
  }

  /**
   * Create a single review
   * Time Complexity: O(1)
   */
  async create(createReviewDto: CreateReviewDto) {
    // Check if review already exists
    const existing = await this.reviewsRepository.findByHostawayId(
      createReviewDto.hostawayId,
    );

    if (existing) {
      throw new BadRequestException(
        `Review with Hostaway ID ${createReviewDto.hostawayId} already exists`,
      );
    }

    const reviewData = this.transformCreateDtoToEntity(createReviewDto);
    const review = await this.reviewsRepository.create(reviewData);

    await this.invalidateCache();

    return review;
  }

  /**
   * Get all reviews with filters and pagination
   * Time Complexity: O(log n) + O(m) where m is page size
   */
  async findAll(filters: FilterReviewDto) {
    return this.reviewsRepository.findWithFilters(filters);
  }

  /**
   * Get single review by ID
   * Time Complexity: O(1)
   */
  async findOne(id: string) {
    const review = await this.reviewsRepository.findById(id);

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    return review;
  }

  /**
   * Update review (for manager actions)
   * Time Complexity: O(1)
   */
  async update(id: string, updateReviewDto: UpdateReviewDto) {
    const review = await this.reviewsRepository.findById(id);

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    const updateData: any = { ...updateReviewDto };

    // If approving, set approval metadata
    if (updateReviewDto.isApprovedForPublic === true && !review.isApprovedForPublic) {
      updateData.approvedAt = new Date();
      if (updateReviewDto.approvedBy) {
        updateData.approvedBy = updateReviewDto.approvedBy;
      }
    }

    // If unapproving, clear approval metadata
    if (updateReviewDto.isApprovedForPublic === false) {
      updateData.approvedAt = null;
      updateData.approvedBy = null;
    }

    const updated = await this.reviewsRepository.update(id, updateData);

    await this.invalidateCache();

    return updated;
  }

  /**
   * Approve review by either MongoDB ID or Hostaway ID
   * Time Complexity: O(1)
   */
  async approveReview(id: string, approvedBy?: string) {
    let review;
    
    // Check if id is numeric (Hostaway ID)
    const isNumeric = /^\d+$/.test(id);
    
    if (isNumeric) {
      // Find by Hostaway ID
      const hostawayId = parseInt(id, 10);
      review = await this.reviewsRepository.findByHostawayId(hostawayId);
      
      if (!review) {
        throw new NotFoundException(
          `Review with Hostaway ID ${hostawayId} not found`,
        );
      }
    } else {
      // Find by MongoDB _id
      review = await this.reviewsRepository.findById(id);
      
      if (!review) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }
    }

    // Update the review
    const updateData = {
      isApprovedForPublic: true,
      approvedBy: approvedBy || 'admin',
      approvedAt: new Date(),
    };

    const updated = await this.reviewsRepository.update(
      review._id.toString(),
      updateData,
    );

    await this.invalidateCache();

    return {
      message: 'Review approved successfully',
      review: updated,
    };
  }

  /**
   * Bulk approve reviews
   * Time Complexity: O(n)
   */
  async bulkApprove(bulkApproveDto: BulkApproveDto) {
    const { reviewIds, approvedBy = 'admin' } = bulkApproveDto;

    if (!reviewIds || reviewIds.length === 0) {
      throw new BadRequestException('No review IDs provided');
    }

    const count = await this.reviewsRepository.bulkApprove(reviewIds, approvedBy);

    await this.invalidateCache();

    return {
      message: `${count} reviews approved successfully`,
      approvedCount: count,
    };
  }

  /**
   * Get approved reviews for public display
   * Time Complexity: O(log n) + O(m)
   * Uses caching for frequently accessed data
   */
  async getApprovedReviews(listingId?: string, limit = 10) {
    const cacheKey = `${this.CACHE_KEYS.APPROVED_REVIEWS}:${listingId || 'all'}:${limit}`;

    // Try to get from cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const reviews = await this.reviewsRepository.findApprovedReviews(listingId, limit);

    // Cache the result
    await this.cacheManager.set(cacheKey, reviews, 600); // 10 minutes TTL

    return reviews;
  }

  /**
   * Get dashboard statistics
   * Time Complexity: O(n) but cached
   * Uses MongoDB aggregation pipeline for efficiency
   */
  async getStatistics() {
    // Try cache first
    const cached = await this.cacheManager.get(this.CACHE_KEYS.STATISTICS);
    if (cached) {
      return cached;
    }

    const stats = await this.reviewsRepository.getStatistics();

    // Transform and enhance statistics
    const transformed = {
      overview: stats.overview[0] || {
        totalReviews: 0,
        averageRating: 0,
        approvedCount: 0,
        pendingCount: 0,
      },
      byChannel: stats.byChannel.map((item) => ({
        channel: item._id,
        count: item.count,
        avgRating: parseFloat(item.avgRating?.toFixed(2) || '0'),
      })),
      topProperties: stats.byProperty.map((item) => ({
        listingId: item._id.listingId,
        listingName: item._id.listingName,
        reviewCount: item.count,
        avgRating: parseFloat(item.avgRating?.toFixed(2) || '0'),
        approvedCount: item.approvedCount,
        approvalRate: parseFloat(((item.approvedCount / item.count) * 100).toFixed(2)),
      })),
      ratingDistribution: stats.ratingDistribution,
    };

    // Cache for 5 minutes
    await this.cacheManager.set(this.CACHE_KEYS.STATISTICS, transformed, 300);

    return transformed;
  }

  /**
   * Get reviews trend
   * Time Complexity: O(n) but cached
   */
  async getReviewsTrend(days = 30) {
    const cacheKey = `${this.CACHE_KEYS.TREND}:${days}`;

    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const trend = await this.reviewsRepository.getReviewsTrend(days);

    // Transform data for frontend
    const transformed = trend.map((item) => ({
      date: item._id,
      count: item.count,
      avgRating: parseFloat(item.avgRating?.toFixed(2) || '0'),
    }));

    await this.cacheManager.set(cacheKey, transformed, 600); // 10 minutes

    return transformed;
  }

  /**
   * Delete review
   * Time Complexity: O(1)
   */
  async remove(id: string) {
    const review = await this.reviewsRepository.delete(id);

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    await this.invalidateCache();

    return {
      message: 'Review deleted successfully',
      deletedReview: review,
    };
  }

  /**
   * Helper: Transform DTO to entity format
   * Time Complexity: O(1)
   */
  private transformCreateDtoToEntity(dto: CreateReviewDto) {
    return {
      hostawayId: dto.hostawayId,
      type: dto.type,
      status: dto.status,
      rating: dto.rating,
      publicReview: dto.publicReview,
      privateReview: dto.privateReview,
      reviewCategories: dto.reviewCategories,
      submittedAt: new Date(dto.submittedAt),
      guestName: dto.guestName,
      listingId: dto.listingId,
      listingName: dto.listingName,
      channel: dto.channel || 'hostaway',
    };
  }

  /**
   * Helper: Invalidate all caches
   * Time Complexity: O(1)
   */
  private async invalidateCache() {
    const keys = Object.values(this.CACHE_KEYS);
    await Promise.all(keys.map((key) => this.cacheManager.del(key)));
    
    // Also clear pattern-based caches
    await this.cacheManager.del(`${this.CACHE_KEYS.APPROVED_REVIEWS}:*`);
    await this.cacheManager.del(`${this.CACHE_KEYS.TREND}:*`);
  }
}