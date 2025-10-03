/* eslint-disable prettier/prettier */
import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
    url: process.env.REDIS_URL,
    ttl: parseInt(process.env.REDIS_TTL, 10) || 300,
    // Additional options for Redis Cloud
    socket: {
        connectTimeout: 10000, // 10 seconds
        keepAlive: 5000,
    },
    // Retry strategy for connection failures
    retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
}));