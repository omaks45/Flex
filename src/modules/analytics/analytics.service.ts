/* eslint-disable prettier/prettier */
import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Review, ReviewDocument } from '../reviews/entities/review.entity';
import { AnalyticsFilterDto } from './dto/analytics-filter.dto';

@Injectable()
export class AnalyticsService {
  private readonly CACHE_PREFIX = 'analytics';
  private readonly DEFAULT_CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Get comprehensive dashboard summary
   * Time Complexity: O(n) - aggregation pipeline
   * Includes: total reviews, avg rating, approval rates, recent activity
   */
  async getSummary(filters: AnalyticsFilterDto = {}) {
    const cacheKey = `${this.CACHE_PREFIX}:summary:${JSON.stringify(filters)}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const dateFilter = this.buildDateFilter(filters);

    const [overview, recentActivity, approvalStats, channelBreakdown] = await Promise.all([
      this.getOverviewStats(dateFilter),
      this.getRecentActivity(dateFilter),
      this.getApprovalStats(dateFilter),
      this.getChannelBreakdown(dateFilter),
    ]);

    const summary = {
      overview,
      recentActivity,
      approvalStats,
      channelBreakdown,
      generatedAt: new Date(),
    };

    await this.cacheManager.set(cacheKey, summary, this.DEFAULT_CACHE_TTL);
    return summary;
  }

  /**
   * Get per-property performance breakdown
   * Time Complexity: O(n) - aggregation
   * Shows: review count, avg rating, approval rate, latest review per property
   */
  async getPropertyBreakdown(filters: AnalyticsFilterDto = {}) {
    const cacheKey = `${this.CACHE_PREFIX}:by-property:${JSON.stringify(filters)}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const dateFilter = this.buildDateFilter(filters);
    const matchStage: any = { ...dateFilter };

    if (filters.channel) {
      matchStage.channel = filters.channel;
    }

    if (filters.listingId) {
      matchStage.listingId = filters.listingId;
    }

    const properties = await this.reviewModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            listingId: '$listingId',
            listingName: '$listingName',
          },
          totalReviews: { $sum: 1 },
          approvedReviews: {
            $sum: { $cond: ['$isApprovedForPublic', 1, 0] },
          },
          pendingReviews: {
            $sum: { $cond: ['$isApprovedForPublic', 0, 1] },
          },
          avgRating: { $avg: '$averageCategoryRating' },
          minRating: { $min: '$averageCategoryRating' },
          maxRating: { $max: '$averageCategoryRating' },
          latestReviewDate: { $max: '$submittedAt' },
          reviewCategories: { $push: '$reviewCategories' },
        },
      },
      {
        $project: {
          listingId: '$_id.listingId',
          listingName: '$_id.listingName',
          totalReviews: 1,
          approvedReviews: 1,
          pendingReviews: 1,
          avgRating: { $round: ['$avgRating', 2] },
          minRating: { $round: ['$minRating', 2] },
          maxRating: { $round: ['$maxRating', 2] },
          approvalRate: {
            $round: [
              { $multiply: [{ $divide: ['$approvedReviews', '$totalReviews'] }, 100] },
              2,
            ],
          },
          latestReviewDate: 1,
          performance: {
            $cond: {
              if: { $gte: ['$avgRating', 8.5] },
              then: 'excellent',
              else: {
                $cond: {
                  if: { $gte: ['$avgRating', 7] },
                  then: 'good',
                  else: {
                    $cond: {
                      if: { $gte: ['$avgRating', 5] },
                      then: 'fair',
                      else: 'needs_improvement',
                    },
                  },
                },
              },
            },
          },
        },
      },
      { $sort: { avgRating: -1, totalReviews: -1 } },
    ]);

    const result = {
      properties,
      totalProperties: properties.length,
      generatedAt: new Date(),
    };

    await this.cacheManager.set(cacheKey, result, this.DEFAULT_CACHE_TTL);
    return result;
  }

  /**
   * Get reviews breakdown by channel
   * Time Complexity: O(n)
   */
  async getChannelBreakdown(dateFilter: any = {}) {
    const matchStage: any = { ...dateFilter };

    return this.reviewModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$channel',
          count: { $sum: 1 },
          avgRating: { $avg: '$averageCategoryRating' },
          approvedCount: {
            $sum: { $cond: ['$isApprovedForPublic', 1, 0] },
          },
        },
      },
      {
        $project: {
          channel: '$_id',
          count: 1,
          avgRating: { $round: ['$avgRating', 2] },
          approvedCount: 1,
          approvalRate: {
            $round: [
              { $multiply: [{ $divide: ['$approvedCount', '$count'] }, 100] },
              2,
            ],
          },
        },
      },
      { $sort: { count: -1 } },
    ]);
  }

  /**
   * Get time-based trends for charts
   * Time Complexity: O(n)
   */
  async getTrends(filters: AnalyticsFilterDto = {}) {
    const cacheKey = `${this.CACHE_PREFIX}:trends:${JSON.stringify(filters)}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const days = filters.days || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const matchStage: any = { submittedAt: { $gte: startDate } };

    if (filters.listingId) {
      matchStage.listingId = filters.listingId;
    }

    if (filters.channel) {
      matchStage.channel = filters.channel;
    }

    const dailyTrend = await this.reviewModel.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$submittedAt' },
          },
          count: { $sum: 1 },
          avgRating: { $avg: '$averageCategoryRating' },
          approvedCount: {
            $sum: { $cond: ['$isApprovedForPublic', 1, 0] },
          },
        },
      },
      {
        $project: {
          date: '$_id',
          count: 1,
          avgRating: { $round: ['$avgRating', 2] },
          approvedCount: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    const result = {
      dailyTrend,
      period: `${days} days`,
      startDate,
      endDate: new Date(),
    };

    await this.cacheManager.set(cacheKey, result, this.DEFAULT_CACHE_TTL);
    return result;
  }

  /**
   * Get rating breakdown by category
   * Time Complexity: O(n)
   */
  async getCategoryBreakdown(filters: AnalyticsFilterDto = {}) {
    const cacheKey = `${this.CACHE_PREFIX}:categories:${JSON.stringify(filters)}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const dateFilter = this.buildDateFilter(filters);
    const matchStage: any = { ...dateFilter };

    if (filters.listingId) {
      matchStage.listingId = filters.listingId;
    }

    if (filters.channel) {
      matchStage.channel = filters.channel;
    }

    const categories = await this.reviewModel.aggregate([
      { $match: matchStage },
      { $unwind: '$reviewCategories' },
      {
        $group: {
          _id: '$reviewCategories.category',
          avgRating: { $avg: '$reviewCategories.rating' },
          count: { $sum: 1 },
          minRating: { $min: '$reviewCategories.rating' },
          maxRating: { $max: '$reviewCategories.rating' },
        },
      },
      {
        $project: {
          category: '$_id',
          avgRating: { $round: ['$avgRating', 2] },
          count: 1,
          minRating: 1,
          maxRating: 1,
        },
      },
      { $sort: { avgRating: -1 } },
    ]);

    await this.cacheManager.set(cacheKey, categories, this.DEFAULT_CACHE_TTL);
    return categories;
  }

  /**
   * Get insights and recurring issues
   * Time Complexity: O(n)
   */
  async getInsights(filters: AnalyticsFilterDto = {}) {
    const cacheKey = `${this.CACHE_PREFIX}:insights:${JSON.stringify(filters)}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const dateFilter = this.buildDateFilter(filters);

    const [
      lowRatedReviews,
      highRatedReviews,
      categoryInsights,
      propertyInsights,
    ] = await Promise.all([
      this.getLowRatedReviews(dateFilter),
      this.getHighRatedReviews(dateFilter),
      this.getCategoryInsights(dateFilter),
      this.getPropertyInsights(dateFilter),
    ]);

    const insights = {
      alerts: this.generateAlerts(lowRatedReviews, categoryInsights),
      strengths: this.generateStrengths(highRatedReviews, categoryInsights),
      recommendations: this.generateRecommendations(categoryInsights, propertyInsights),
      lowRatedReviews: lowRatedReviews.slice(0, 5),
      highRatedReviews: highRatedReviews.slice(0, 5),
    };

    await this.cacheManager.set(cacheKey, insights, this.DEFAULT_CACHE_TTL);
    return insights;
  }

  // ============= PRIVATE HELPER METHODS =============

  /**
   * Build date filter from DTO
   */
  private buildDateFilter(filters: AnalyticsFilterDto) {
    const filter: any = {};

    if (filters.startDate || filters.endDate) {
      filter.submittedAt = {};
      if (filters.startDate) {
        filter.submittedAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        filter.submittedAt.$lte = new Date(filters.endDate);
      }
    }

    return filter;
  }

  /**
   * Get overview statistics
   */
  private async getOverviewStats(dateFilter: any) {
    const result = await this.reviewModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          avgRating: { $avg: '$averageCategoryRating' },
          approvedCount: {
            $sum: { $cond: ['$isApprovedForPublic', 1, 0] },
          },
          pendingCount: {
            $sum: { $cond: ['$isApprovedForPublic', 0, 1] },
          },
          uniqueProperties: { $addToSet: '$listingId' },
        },
      },
      {
        $project: {
          totalReviews: 1,
          avgRating: { $round: ['$avgRating', 2] },
          approvedCount: 1,
          pendingCount: 1,
          uniquePropertiesCount: { $size: '$uniqueProperties' },
          approvalRate: {
            $round: [
              { $multiply: [{ $divide: ['$approvedCount', '$totalReviews'] }, 100] },
              2,
            ],
          },
        },
      },
    ]);

    return result[0] || {
      totalReviews: 0,
      avgRating: 0,
      approvedCount: 0,
      pendingCount: 0,
      uniquePropertiesCount: 0,
      approvalRate: 0,
    };
  }
  /**
   * Get recent activity
   * If no date filter provided, get last 30 days
   * If date filter provided, respect it
   */
  private async getRecentActivity(dateFilter: any) {
    const activityFilter = { ...dateFilter };
    
    // If no date filter was provided, default to last 30 days
    if (!dateFilter.submittedAt) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      activityFilter.submittedAt = { $gte: thirtyDaysAgo };
    }

    return this.reviewModel
      .find(activityFilter)
      .select('listingName guestName averageCategoryRating submittedAt isApprovedForPublic')
      .sort({ submittedAt: -1 })
      .limit(10)
      .lean();
  }

  /**
   * Get approval statistics
   */
  private async getApprovalStats(dateFilter: any) {
    const pendingReviews = await this.reviewModel
      .find({ isApprovedForPublic: false, ...dateFilter })
      .select('listingName guestName averageCategoryRating submittedAt')
      .sort({ submittedAt: -1 })
      .limit(10)
      .lean();

    const avgPendingRating = pendingReviews.length > 0
      ? pendingReviews.reduce((sum, r) => sum + (r.averageCategoryRating || 0), 0) / pendingReviews.length
      : 0;

    return {
      pendingCount: pendingReviews.length,
      avgPendingRating: parseFloat(avgPendingRating.toFixed(2)),
      pendingReviews,
    };
  }

  /**
   * Get low-rated reviews (< 7)
   */
  private async getLowRatedReviews(dateFilter: any) {
    return this.reviewModel
      .find({ averageCategoryRating: { $lt: 7 }, ...dateFilter })
      .select('listingName guestName publicReview averageCategoryRating submittedAt reviewCategories')
      .sort({ averageCategoryRating: 1, submittedAt: -1 })
      .limit(10)
      .lean();
  }

  /**
   * Get high-rated reviews (>= 9)
   */
  private async getHighRatedReviews(dateFilter: any) {
    return this.reviewModel
      .find({ averageCategoryRating: { $gte: 9 }, ...dateFilter })
      .select('listingName guestName publicReview averageCategoryRating submittedAt')
      .sort({ averageCategoryRating: -1, submittedAt: -1 })
      .limit(10)
      .lean();
  }

  /**
   * Get category insights (average ratings per category)
   */
  private async getCategoryInsights(dateFilter: any) {
    return this.reviewModel.aggregate([
      { $match: dateFilter },
      { $unwind: '$reviewCategories' },
      {
        $group: {
          _id: '$reviewCategories.category',
          avgRating: { $avg: '$reviewCategories.rating' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          category: '$_id',
          avgRating: { $round: ['$avgRating', 2] },
          count: 1,
        },
      },
      { $sort: { avgRating: 1 } },
    ]);
  }

  /**
   * Get property insights (properties with lowest ratings)
   */
  private async getPropertyInsights(dateFilter: any) {
    return this.reviewModel.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$listingId',
          listingName: { $first: '$listingName' },
          avgRating: { $avg: '$averageCategoryRating' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          listingId: '$_id',
          listingName: 1,
          avgRating: { $round: ['$avgRating', 2] },
          count: 1,
        },
      },
      { $sort: { avgRating: 1 } },
      { $limit: 5 },
    ]);
  }

  /**
   * Generate alerts based on data
   */
  private generateAlerts(lowRatedReviews: any[], categoryInsights: any[]) {
    const alerts = [];

    // Alert for low-rated reviews
    if (lowRatedReviews.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Low-Rated Reviews Detected',
        message: `${lowRatedReviews.length} reviews with ratings below 7.0 require attention`,
        priority: 'high',
      });
    }

    // Alert for consistently low category ratings
    const lowCategories = categoryInsights.filter((c) => c.avgRating < 7);
    if (lowCategories.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Category Performance Issues',
        message: `${lowCategories.map((c) => c.category).join(', ')} ratings are below 7.0`,
        priority: 'medium',
      });
    }

    return alerts;
  }

  /**
   * Generate strengths based on data
   */
  private generateStrengths(highRatedReviews: any[], categoryInsights: any[]) {
    const strengths = [];

    // Strength for high-rated reviews
    if (highRatedReviews.length > 0) {
      strengths.push({
        title: 'Excellent Guest Satisfaction',
        message: `${highRatedReviews.length} reviews with 9+ ratings`,
        impact: 'positive',
      });
    }

    // Strength for high-performing categories
    const topCategories = categoryInsights.filter((c) => c.avgRating >= 9);
    if (topCategories.length > 0) {
      strengths.push({
        title: 'Outstanding Category Performance',
        message: `${topCategories.map((c) => c.category).join(', ')} exceed 9.0 average`,
        impact: 'positive',
      });
    }

    return strengths;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(categoryInsights: any[], propertyInsights: any[]) {
    const recommendations = [];

    // Recommendations based on low categories
    const lowCategories = categoryInsights.filter((c) => c.avgRating < 7);
    lowCategories.forEach((cat) => {
      recommendations.push({
        category: cat.category,
        currentRating: cat.avgRating,
        recommendation: `Focus on improving ${cat.category} - consider guest feedback and implement action plan`,
        expectedImpact: 'Could increase overall rating by 0.5-1.0 points',
      });
    });

    // Recommendations for underperforming properties
    propertyInsights.forEach((prop) => {
      if (prop.avgRating < 7) {
        recommendations.push({
          property: prop.listingName,
          currentRating: prop.avgRating,
          recommendation: `Schedule property inspection and address common issues`,
          expectedImpact: 'Improve property rating to 8+',
        });
      }
    });

    return recommendations;
  }
}