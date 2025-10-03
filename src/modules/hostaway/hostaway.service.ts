/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { HostawayApiResponse, HostawayReview, NormalizedReview } from '../reviews/interfaces/hostaway-response.interface';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class HostawayService {
    private readonly logger = new Logger(HostawayService.name);
    private readonly axiosInstance: AxiosInstance;
    private readonly accountId: string;
    private readonly apiKey: string;

    constructor(private readonly configService: ConfigService) {
        this.accountId = this.configService.get<string>('HOSTAWAY_ACCOUNT_ID');
        this.apiKey = this.configService.get<string>('HOSTAWAY_API_KEY');

        // Create axios instance with Hostaway API configuration
        this.axiosInstance = axios.create({
        baseURL: this.configService.get<string>('HOSTAWAY_BASE_URL') || 'https://api.hostaway.com/v1',
        headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
        },
        timeout: 10000,
        });
    }

    /**
     * Fetch reviews from Hostaway API
     * Time Complexity: O(1) - HTTP request
     * 
     * Note: The Hostaway API is sandboxed and will return 403.
     * This is expected - we fall back to mock data as per requirements.
     */
    async fetchReviews(): Promise<HostawayReview[]> {
        try {
        this.logger.log('Attempting to fetch reviews from Hostaway API...');

        const response = await this.axiosInstance.get<HostawayApiResponse>(
            `/reviews?accountId=${this.accountId}`,
        );

        if (response.data?.result && response.data.result.length > 0) {
            this.logger.log(`✅ Fetched ${response.data.result.length} reviews from Hostaway API`);
            return response.data.result;
        }

        // API returned no data (sandboxed)
        this.logger.warn('⚠️  Hostaway API returned no reviews (sandboxed). Using mock data...');
        return this.getMockReviews();

        } catch (error) {
        // 403 is expected for sandboxed API
        if (error.response?.status === 403) {
            this.logger.warn('⚠️  Hostaway API access restricted (403 - Expected for sandbox). Using mock data...');
        } else {
            this.logger.error(`❌ Failed to fetch from Hostaway API: ${error.message}`);
        }
        
        return this.getMockReviews();
        }
    }

    /**
     * Normalize Hostaway reviews to internal format
     * Time Complexity: O(n) where n is number of reviews
     */
    normalizeReviews(hostawayReviews: HostawayReview[]): NormalizedReview[] {
        return hostawayReviews.map((review) => this.normalizeReview(review));
    }

    /**
     * Normalize a single review
     * Time Complexity: O(1)
     */
    private normalizeReview(review: HostawayReview): NormalizedReview {
        const avgRating = this.calculateAverageRating(review.reviewCategory);
        const listingId = review.listingId || this.generateListingId(review.listingName);

        return {
        hostawayId: review.id,
        type: review.type,
        status: review.status,
        rating: review.rating,
        publicReview: review.publicReview || '',
        privateReview: review.privateReview || null,
        reviewCategories: review.reviewCategory.map((cat) => ({
            category: cat.category,
            rating: cat.rating,
        })),
        submittedAt: new Date(review.submittedAt),
        guestName: review.guestName,
        listingId,
        listingName: review.listingName,
        channel: 'hostaway',
        averageCategoryRating: avgRating,
        };
    }

    /**
     * Calculate average rating from review categories
     */
    private calculateAverageRating(categories: { category: string; rating: number }[]): number {
        if (!categories || categories.length === 0) return 0;
        const sum = categories.reduce((acc, cat) => acc + cat.rating, 0);
        return parseFloat((sum / categories.length).toFixed(2));
    }

    /**
     * Generate a consistent listingId from listingName
     */
    private generateListingId(listingName: string): string {
        return listingName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
    }

    /**
     * Get mock reviews from JSON file
     * Time Complexity: O(1)
     */
    private getMockReviews(): HostawayReview[] {
        try {
        // Path to mock data file
        const mockDataPath = path.join(process.cwd(), 'mock-data', 'hostaway-reviews.json');
        
        if (fs.existsSync(mockDataPath)) {
            const fileContent = fs.readFileSync(mockDataPath, 'utf-8');
            const mockData = JSON.parse(fileContent);
            
            this.logger.log(`✅ Loaded ${mockData.result?.length || 0} mock reviews from file`);
            return mockData.result || [];
        }
        
        this.logger.warn('⚠️  Mock data file not found. Using hardcoded fallback data...');
        return this.getHardcodedMockData();

        } catch (error) {
        this.logger.error(`❌ Failed to load mock data file: ${error.message}`);
        this.logger.log('Using hardcoded fallback data...');
        return this.getHardcodedMockData();
        }
    }

    /**
     * Hardcoded mock data (final fallback)
     */
    private getHardcodedMockData(): HostawayReview[] {
        this.logger.log('📦 Using hardcoded mock data (25 reviews)');
        
        return [
        {
            id: 7453,
            type: 'host-to-guest',
            status: 'published',
            rating: null,
            publicReview: 'Shane and family are wonderful! Would definitely host again :)',
            reviewCategory: [
            { category: 'cleanliness', rating: 10 },
            { category: 'communication', rating: 10 },
            { category: 'respect_house_rules', rating: 10 },
            ],
            submittedAt: '2020-08-21 22:45:14',
            guestName: 'Shane Finkelstein',
            listingName: '2B N1 A - 29 Shoreditch Heights',
        },
        {
            id: 7454,
            type: 'guest-to-host',
            status: 'published',
            rating: 9,
            publicReview: 'Amazing property in a great location. The apartment was clean and well-maintained. Host was very responsive and helpful. Would definitely stay again!',
            reviewCategory: [
            { category: 'cleanliness', rating: 9 },
            { category: 'communication', rating: 10 },
            { category: 'location', rating: 10 },
            { category: 'value', rating: 8 },
            ],
            submittedAt: '2024-09-15 14:30:22',
            guestName: 'Emma Thompson',
            listingName: 'Luxury Studio - Central London',
        },
        {
            id: 7455,
            type: 'guest-to-host',
            status: 'published',
            rating: 8,
            publicReview: 'Good stay overall. The place was as described. Minor issues with WiFi but host fixed it quickly.',
            reviewCategory: [
            { category: 'cleanliness', rating: 8 },
            { category: 'communication', rating: 9 },
            { category: 'amenities', rating: 7 },
            ],
            submittedAt: '2024-10-01 09:15:30',
            guestName: 'Michael Chen',
            listingName: 'Cozy 1BR Apartment - Shoreditch',
        },
        {
            id: 7456,
            type: 'guest-to-host',
            status: 'published',
            rating: 10,
            publicReview: 'Absolutely perfect! The property exceeded all expectations. Beautifully decorated, spotlessly clean, and in an unbeatable location. The host went above and beyond to make our stay comfortable.',
            reviewCategory: [
            { category: 'cleanliness', rating: 10 },
            { category: 'communication', rating: 10 },
            { category: 'location', rating: 10 },
            { category: 'value', rating: 10 },
            { category: 'amenities', rating: 10 },
            ],
            submittedAt: '2024-09-28 16:45:00',
            guestName: 'Sarah Martinez',
            listingName: 'Penthouse Suite - Tower Bridge View',
        },
        {
            id: 7457,
            type: 'guest-to-host',
            status: 'published',
            rating: 7,
            publicReview: 'Decent stay. Location was great but the apartment could use some updates. Heating was inconsistent.',
            reviewCategory: [
            { category: 'cleanliness', rating: 7 },
            { category: 'communication', rating: 8 },
            { category: 'location', rating: 9 },
            { category: 'value', rating: 6 },
            { category: 'amenities', rating: 6 },
            ],
            submittedAt: '2024-09-20 11:20:15',
            guestName: 'David Wilson',
            listingName: 'Studio Flat - Camden Town',
        },
        {
            id: 7458,
            type: 'host-to-guest',
            status: 'published',
            rating: null,
            publicReview: 'Great guests! Very respectful and left the place in excellent condition. Welcome back anytime!',
            reviewCategory: [
            { category: 'cleanliness', rating: 10 },
            { category: 'communication', rating: 9 },
            { category: 'respect_house_rules', rating: 10 },
            ],
            submittedAt: '2024-09-18 09:30:00',
            guestName: 'Jennifer Lee',
            listingName: 'Modern Loft - Hackney',
        },
        {
            id: 7459,
            type: 'guest-to-host',
            status: 'published',
            rating: 9,
            publicReview: 'Wonderful experience! The apartment is exactly as shown in photos. Great coffee shops and restaurants nearby. Highly recommend!',
            reviewCategory: [
            { category: 'cleanliness', rating: 9 },
            { category: 'communication', rating: 10 },
            { category: 'location', rating: 10 },
            { category: 'value', rating: 8 },
            ],
            submittedAt: '2024-09-25 14:15:30',
            guestName: 'Robert Taylor',
            listingName: 'Charming 2BR - Notting Hill',
        },
        {
            id: 7460,
            type: 'guest-to-host',
            status: 'published',
            rating: 6,
            publicReview: 'Average stay. The location was the main positive. However, noise from the street was an issue and some appliances weren\'t working properly.',
            reviewCategory: [
            { category: 'cleanliness', rating: 7 },
            { category: 'communication', rating: 6 },
            { category: 'location', rating: 8 },
            { category: 'value', rating: 5 },
            { category: 'amenities', rating: 5 },
            ],
            submittedAt: '2024-09-12 10:00:00',
            guestName: 'Amanda Brown',
            listingName: 'Compact Studio - Kings Cross',
        },
        {
            id: 7461,
            type: 'guest-to-host',
            status: 'published',
            rating: 10,
            publicReview: 'This place is a gem! Beautifully designed, comfortable bed, amazing shower pressure. The host was incredibly helpful with local recommendations. Can\'t wait to come back!',
            reviewCategory: [
            { category: 'cleanliness', rating: 10 },
            { category: 'communication', rating: 10 },
            { category: 'location', rating: 9 },
            { category: 'value', rating: 10 },
            { category: 'amenities', rating: 10 },
            ],
            submittedAt: '2024-10-02 18:20:45',
            guestName: 'Lisa Anderson',
            listingName: 'Designer Apartment - Soho',
        },
        {
            id: 7462,
            type: 'host-to-guest',
            status: 'published',
            rating: null,
            publicReview: 'Lovely couple! Easy communication and very tidy. Would happily host them again.',
            reviewCategory: [
            { category: 'cleanliness', rating: 9 },
            { category: 'communication', rating: 10 },
            { category: 'respect_house_rules', rating: 9 },
            ],
            submittedAt: '2024-09-22 15:45:00',
            guestName: 'James Wright',
            listingName: '2B N1 A - 29 Shoreditch Heights',
        },
        {
            id: 7463,
            type: 'guest-to-host',
            status: 'published',
            rating: 8,
            publicReview: 'Great stay! The apartment was clean and comfortable. Check-in was smooth. Only minor issue was the WiFi speed but overall very satisfied.',
            reviewCategory: [
            { category: 'cleanliness', rating: 9 },
            { category: 'communication', rating: 8 },
            { category: 'location', rating: 8 },
            { category: 'value', rating: 8 },
            { category: 'amenities', rating: 7 },
            ],
            submittedAt: '2024-09-30 12:30:00',
            guestName: 'Maria Garcia',
            listingName: 'Bright 1BR - Islington',
        },
        {
            id: 7464,
            type: 'guest-to-host',
            status: 'published',
            rating: 9,
            publicReview: 'Fantastic location and beautiful space. Everything was exactly as described. The host provided excellent local tips. Highly recommend for anyone visiting London!',
            reviewCategory: [
            { category: 'cleanliness', rating: 9 },
            { category: 'communication', rating: 10 },
            { category: 'location', rating: 10 },
            { category: 'value', rating: 8 },
            { category: 'amenities', rating: 9 },
            ],
            submittedAt: '2024-09-27 16:00:00',
            guestName: 'Thomas Mueller',
            listingName: 'Luxury Studio - Central London',
        },
        {
            id: 7465,
            type: 'guest-to-host',
            status: 'published',
            rating: 7,
            publicReview: 'Nice place overall but had some issues with water pressure. Location is excellent and host was responsive when we reported problems.',
            reviewCategory: [
            { category: 'cleanliness', rating: 8 },
            { category: 'communication', rating: 9 },
            { category: 'location', rating: 9 },
            { category: 'value', rating: 6 },
            { category: 'amenities', rating: 6 },
            ],
            submittedAt: '2024-09-14 09:45:00',
            guestName: 'Sophie Dubois',
            listingName: 'Modern Flat - Chelsea',
        },
        {
            id: 7466,
            type: 'host-to-guest',
            status: 'published',
            rating: null,
            publicReview: 'Perfect guests! They treated the home with respect and followed all house rules. Communication was excellent throughout.',
            reviewCategory: [
            { category: 'cleanliness', rating: 10 },
            { category: 'communication', rating: 10 },
            { category: 'respect_house_rules', rating: 10 },
            ],
            submittedAt: '2024-09-19 13:15:00',
            guestName: 'Oliver Smith',
            listingName: 'Cozy 1BR Apartment - Shoreditch',
        },
        {
            id: 7467,
            type: 'guest-to-host',
            status: 'published',
            rating: 10,
            publicReview: 'One of the best places we\'ve stayed! Immaculately clean, great amenities, and the host went out of their way to make us feel welcome. The location is perfect for exploring London.',
            reviewCategory: [
            { category: 'cleanliness', rating: 10 },
            { category: 'communication', rating: 10 },
            { category: 'location', rating: 10 },
            { category: 'value', rating: 9 },
            { category: 'amenities', rating: 10 },
            ],
            submittedAt: '2024-10-01 17:30:00',
            guestName: 'Elena Popov',
            listingName: 'Stylish Apartment - Mayfair',
        },
        {
            id: 7468,
            type: 'guest-to-host',
            status: 'published',
            rating: 8,
            publicReview: 'Very nice apartment in a great neighborhood. Everything was clean and well-maintained. Would definitely recommend to friends!',
            reviewCategory: [
            { category: 'cleanliness', rating: 9 },
            { category: 'communication', rating: 8 },
            { category: 'location', rating: 9 },
            { category: 'value', rating: 8 },
            { category: 'amenities', rating: 8 },
            ],
            submittedAt: '2024-09-24 11:00:00',
            guestName: 'Carlos Rodriguez',
            listingName: 'Charming 2BR - Notting Hill',
        },
        {
            id: 7469,
            type: 'guest-to-host',
            status: 'published',
            rating: 9,
            publicReview: 'Excellent stay! The apartment is beautiful and the area is fantastic. Host was very helpful and responsive. Only small issue was parking but that\'s not the host\'s fault.',
            reviewCategory: [
            { category: 'cleanliness', rating: 9 },
            { category: 'communication', rating: 10 },
            { category: 'location', rating: 9 },
            { category: 'value', rating: 9 },
            { category: 'amenities', rating: 9 },
            ],
            submittedAt: '2024-09-26 14:45:00',
            guestName: 'Yuki Tanaka',
            listingName: 'Modern Loft - Hackney',
        },
        {
            id: 7470,
            type: 'host-to-guest',
            status: 'published',
            rating: null,
            publicReview: 'Wonderful family! Very respectful and communicative. Left the apartment in pristine condition. Highly recommend!',
            reviewCategory: [
            { category: 'cleanliness', rating: 10 },
            { category: 'communication', rating: 9 },
            { category: 'respect_house_rules', rating: 10 },
            ],
            submittedAt: '2024-09-23 10:30:00',
            guestName: 'Anna Schmidt',
            listingName: 'Family-Friendly 3BR - Richmond',
        },
        {
            id: 7471,
            type: 'guest-to-host',
            status: 'published',
            rating: 7,
            publicReview: 'Good location and the host was nice. However, the apartment could be cleaner and some facilities need updating. Overall okay for the price.',
            reviewCategory: [
            { category: 'cleanliness', rating: 6 },
            { category: 'communication', rating: 8 },
            { category: 'location', rating: 9 },
            { category: 'value', rating: 7 },
            { category: 'amenities', rating: 6 },
            ],
            submittedAt: '2024-09-16 15:20:00',
            guestName: 'Mohammed Ali',
            listingName: 'Budget Studio - Bethnal Green',
        },
        {
            id: 7472,
            type: 'guest-to-host',
            status: 'published',
            rating: 10,
            publicReview: 'Absolutely loved this place! Everything was perfect - from the comfortable bed to the fully equipped kitchen. The host\'s attention to detail is impressive. Will definitely book again!',
            reviewCategory: [
            { category: 'cleanliness', rating: 10 },
            { category: 'communication', rating: 10 },
            { category: 'location', rating: 10 },
            { category: 'value', rating: 10 },
            { category: 'amenities', rating: 10 },
            ],
            submittedAt: '2024-09-29 19:15:00',
            guestName: 'Isabella Rossi',
            listingName: 'Penthouse Suite - Tower Bridge View',
        },
        {
            id: 7473,
            type: 'guest-to-host',
            status: 'published',
            rating: 8,
            publicReview: 'Great experience overall. The apartment is lovely and well-located. Check-in was easy and the host provided clear instructions. Minor noise from neighbors but manageable.',
            reviewCategory: [
            { category: 'cleanliness', rating: 8 },
            { category: 'communication', rating: 9 },
            { category: 'location', rating: 9 },
            { category: 'value', rating: 8 },
            { category: 'amenities', rating: 8 },
            ],
            submittedAt: '2024-09-21 13:00:00',
            guestName: 'Pierre Dubois',
            listingName: 'Elegant 1BR - Kensington',
        },
        {
            id: 7474,
            type: 'host-to-guest',
            status: 'published',
            rating: null,
            publicReview: 'Great guest! Clean, respectful, and easy to communicate with. Would definitely host again.',
            reviewCategory: [
            { category: 'cleanliness', rating: 9 },
            { category: 'communication', rating: 10 },
            { category: 'respect_house_rules', rating: 9 },
            ],
            submittedAt: '2024-09-17 11:45:00',
            guestName: 'Olivia Johnson',
            listingName: 'Designer Apartment - Soho',
        },
        {
            id: 7475,
            type: 'guest-to-host',
            status: 'published',
            rating: 9,
            publicReview: 'Wonderful stay in London! The apartment exceeded our expectations. Clean, comfortable, and in a vibrant neighborhood. The host was extremely helpful with restaurant recommendations.',
            reviewCategory: [
            { category: 'cleanliness', rating: 10 },
            { category: 'communication', rating: 10 },
            { category: 'location', rating: 9 },
            { category: 'value', rating: 9 },
            { category: 'amenities', rating: 9 },
            ],
            submittedAt: '2024-09-28 16:30:00',
            guestName: 'Lars Andersen',
            listingName: 'Contemporary 2BR - Shoreditch',
        },
        {
            id: 7476,
            type: 'guest-to-host',
            status: 'published',
            rating: 6,
            publicReview: 'The apartment was okay but didn\'t quite meet expectations based on the photos. Location was good but the building was quite noisy. Host was responsive which was appreciated.',
            reviewCategory: [
            { category: 'cleanliness', rating: 7 },
            { category: 'communication', rating: 8 },
            { category: 'location', rating: 7 },
            { category: 'value', rating: 5 },
            { category: 'amenities', rating: 6 },
            ],
            submittedAt: '2024-09-13 10:15:00',
            guestName: 'Nina Kowalski',
            listingName: 'City View Studio - Canary Wharf',
        },
        {
            id: 7477,
            type: 'guest-to-host',
            status: 'published',
            rating: 10,
            publicReview: 'Perfect in every way! This is how all rentals should be. Spotless, comfortable, great location, and an amazing host. Thank you for a memorable stay!',
            reviewCategory: [
            { category: 'cleanliness', rating: 10 },
            { category: 'communication', rating: 10 },
            { category: 'location', rating: 10 },
            { category: 'value', rating: 10 },
            { category: 'amenities', rating: 10 },
            ],
            submittedAt: '2024-10-02 20:00:00',
            guestName: 'Hannah Cohen',
            listingName: 'Luxury Studio - Central London',
        },
        ];
    }
}