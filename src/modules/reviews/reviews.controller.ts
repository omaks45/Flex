/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { FilterReviewDto } from './dto/filter-review.dto';
import { UpdateReviewDto, BulkApproveDto } from './dto/update-review.dto';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // ============= NEW CRITICAL ENDPOINT =============
  @Get('hostaway')
  @ApiOperation({ 
    summary: 'Fetch and normalize reviews from Hostaway API',
    description: 'This endpoint fetches reviews from Hostaway API (or mock data) and returns normalized, structured data. This is the main integration point tested in the assessment.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Reviews fetched and normalized successfully',
    schema: {
      example: {
        status: 'success',
        count: 3,
        reviews: [
          {
            hostawayId: 7453,
            type: 'host-to-guest',
            status: 'published',
            rating: null,
            publicReview: 'Shane and family are wonderful!',
            reviewCategories: [
              { category: 'cleanliness', rating: 10 },
            ],
            submittedAt: '2020-08-21T22:45:14.000Z',
            guestName: 'Shane Finkelstein',
            listingId: 'listing-123',
            listingName: '2B N1 A - 29 Shoreditch Heights',
            channel: 'hostaway',
            averageCategoryRating: 10
          }
        ]
      }
    }
  })
  @ApiResponse({ status: 500, description: 'Failed to fetch reviews from Hostaway' })
  async getHostawayReviews() {
    return this.reviewsService.fetchAndNormalizeHostawayReviews();
  }
  // ================================================

  @Post()
  @ApiOperation({ summary: 'Create a new review' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data or duplicate' })
  create(@Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(createReviewDto);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Sync reviews from Hostaway', 
    description: 'Bulk upsert normalized reviews from Hostaway API' 
  })
  @ApiResponse({ status: 200, description: 'Reviews synced successfully' })
  @ApiResponse({ status: 400, description: 'No reviews to sync' })
  syncReviews(@Body() reviews: any[]) {
    return this.reviewsService.syncReviews(reviews);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reviews with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  findAll(@Query() filters: FilterReviewDto) {
    return this.reviewsService.findAll(filters);
  }

  @Get('public')
  @ApiOperation({ 
    summary: 'Get approved reviews for public display',
    description: 'Returns only approved and published reviews' 
  })
  @ApiQuery({ name: 'listingId', required: false, description: 'Filter by listing ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of reviews to return (default: 10)' })
  @ApiResponse({ status: 200, description: 'Approved reviews retrieved successfully' })
  getApprovedReviews(
    @Query('listingId') listingId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.getApprovedReviews(listingId, limit || 10);
  }

  @Get('statistics')
  @ApiOperation({ 
    summary: 'Get dashboard statistics',
    description: 'Returns aggregated stats for dashboard (cached)' 
  })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  getStatistics() {
    return this.reviewsService.getStatistics();
  }

  @Get('trend')
  @ApiOperation({ summary: 'Get reviews trend over time' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days (default: 30)' })
  @ApiResponse({ status: 200, description: 'Trend data retrieved successfully' })
  getReviewsTrend(@Query('days') days?: number) {
    return this.reviewsService.getReviewsTrend(days || 30);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single review by ID' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Review found' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update a review',
    description: 'Update review approval status or manager notes' 
  })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
    return this.reviewsService.update(id, updateReviewDto);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a review for public display' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Review approved successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  approve(
    @Param('id') id: string,
    @Body('approvedBy') approvedBy?: string,
  ) {
    return this.reviewsService.update(id, {
      isApprovedForPublic: true,
      approvedBy: approvedBy || 'admin',
    });
  }

  @Post('bulk-approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk approve multiple reviews' })
  @ApiResponse({ status: 200, description: 'Reviews approved successfully' })
  @ApiResponse({ status: 400, description: 'No review IDs provided' })
  bulkApprove(@Body() bulkApproveDto: BulkApproveDto) {
    return this.reviewsService.bulkApprove(bulkApproveDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}