<?php

return [
    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'paymentpoint' => [
        'base_url' => env('PAYMENTPOINT_BASE_URL', 'https://sandbox-api.paymentpoint.co/v1'),
        'api_key' => env('PAYMENTPOINT_API_KEY'),
        'api_secret' => env('PAYMENTPOINT_API_SECRET'),
        'webhook_secret' => env('PAYMENTPOINT_WEBHOOK_SECRET'),
    ],

    'palmpay' => [
        'base_url' => env('PALMPAY_BASE_URL', 'https://sandbox-api.palmpay.com/v1'),
        'api_key' => env('PALMPAY_API_KEY'),
        'secret_key' => env('PALMPAY_SECRET_KEY'),
    ],

    'twilio' => [
        'account_sid' => env('TWILIO_ACCOUNT_SID'),
        'auth_token' => env('TWILIO_AUTH_TOKEN'),
        'from_number' => env('TWILIO_FROM_NUMBER'),
    ],
];
