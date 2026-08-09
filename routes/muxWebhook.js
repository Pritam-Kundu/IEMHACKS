const express = require('express');
const router = express.Router();
const Mux = require('@mux/mux-node');
const Lesson = require('../models/Lesson');

const mux = new Mux({
    tokenId: process.env.MUX_TOKEN_ID,
    tokenSecret: process.env.MUX_TOKEN_SECRET,
});

router.post('/', async (req, res) => {
    const signature = req.headers['mux-signature'];
    const webhookSecret = process.env.MUX_WEBHOOK_SECRET;
    
    let event;

    try {
        if (webhookSecret) {
            // Verify signature using the raw body buffer
            event = mux.webhooks.unwrap(req.body, req.headers, webhookSecret);
        } else {
            // Development fallback if webhook secret is not configured
            event = JSON.parse(req.body.toString('utf8'));
        }
    } catch (err) {
        console.error('Webhook signature verification failed.', err.message);
        return res.status(400).send('Webhook Error: ' + err.message);
    }

    try {
        console.log('Received Mux webhook event: ' + event.type);
        const asset = event.data;
        const assetId = asset.id;

        // Find the lesson associated with this asset
        const lesson = await Lesson.findOne({ muxAssetId: assetId });
        
        if (lesson) {
            switch (event.type) {
                case 'video.asset.ready':
                    lesson.muxStatus = 'ready';
                    if (asset.playback_ids && asset.playback_ids.length > 0) {
                        lesson.muxPlaybackId = asset.playback_ids[0].id;
                    }
                    if (asset.static_renditions && asset.static_renditions.status === 'ready' && asset.static_renditions.files) {
                        const highestQuality = asset.static_renditions.files.find(f => f.name === 'high.mp4') || asset.static_renditions.files[0];
                        if (highestQuality) {
                            lesson.muxDownloadUrl = 'https://stream.mux.com/' + lesson.muxPlaybackId + '/' + highestQuality.name;
                        }
                    }
                    await lesson.save();
                    break;
                case 'video.asset.errored':
                    lesson.muxStatus = 'errored';
                    await lesson.save();
                    break;
                case 'video.asset.static_renditions.ready':
                    if (asset.static_renditions && asset.static_renditions.files) {
                        const highestQuality = asset.static_renditions.files.find(f => f.name === 'high.mp4') || asset.static_renditions.files[0];
                        if (highestQuality) {
                            lesson.muxDownloadUrl = 'https://stream.mux.com/' + lesson.muxPlaybackId + '/' + highestQuality.name;
                            await lesson.save();
                        }
                    }
                    break;
            }
        }
    } catch (err) {
        console.error('Error processing Mux webhook:', err);
    }

    res.json({ received: true });
});

module.exports = router;
