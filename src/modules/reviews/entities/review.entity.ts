/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema()
export class ReviewCategory {
    @Prop({ required: true })
    category: string;

    @Prop({ required: true, min: 0, max: 10 })
    rating: number;
}

export const ReviewCategorySchema = SchemaFactory.createForClass(ReviewCategory);

@Schema({ timestamps: true })
export class Review {
    @Prop({ required: true, unique: true })
    hostawayId: number;

    @Prop({ required: true, enum: ['host-to-guest', 'guest-to-host'] })
    type: string;

    @Prop({ required: true, enum: ['published', 'pending', 'draft'] })
    status: string;

    @Prop({ min: 0, max: 10, default: null })
    rating: number;

    @Prop({ required: true })
    publicReview: string;

    @Prop({ default: null })
    privateReview: string;

    @Prop({ type: [ReviewCategorySchema], default: [] })
    reviewCategories: ReviewCategory[];

    @Prop({ required: true })
    submittedAt: Date;

    @Prop({ required: true })
    guestName: string;

    @Prop({ required: true })
    listingId: string;

    @Prop({ required: true })
    listingName: string;

    @Prop({ default: 'hostaway' })
    channel: string;

    // Manager-specific fields
    @Prop({ default: false })
    isApprovedForPublic: boolean;

    @Prop({ default: null })
    approvedBy: string;

    @Prop({ default: null })
    approvedAt: Date;

    @Prop({ default: null })
    managerNotes: string;

    // Computed field for average category rating
    @Prop()
    averageCategoryRating: number;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Add indexes for better query performance
ReviewSchema.index({ listingId: 1, submittedAt: -1 });
ReviewSchema.index({ isApprovedForPublic: 1 });
ReviewSchema.index({ status: 1 });
ReviewSchema.index({ channel: 1 });
ReviewSchema.index({ rating: 1 });

// Pre-save hook to calculate average category rating
ReviewSchema.pre('save', function (next) {
    if (this.reviewCategories && this.reviewCategories.length > 0) {
        const sum = this.reviewCategories.reduce((acc, cat) => acc + cat.rating, 0);
        this.averageCategoryRating = sum / this.reviewCategories.length;
    }
    next();
});