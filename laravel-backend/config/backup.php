<?php

return [
    /*
    |--------------------------------------------------------------------------
    | FlexCloud Backup Configuration
    |--------------------------------------------------------------------------
    */

    'enabled' => env('BACKUP_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Storage Disk
    |--------------------------------------------------------------------------
    | The disk where backups will be stored.
    | Options: 'local', 's3'
    */
    'disk' => env('BACKUP_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Backup Path
    |--------------------------------------------------------------------------
    */
    'path' => env('BACKUP_PATH', 'backups'),

    /*
    |--------------------------------------------------------------------------
    | Encryption
    |--------------------------------------------------------------------------
    */
    'encryption' => [
        'enabled' => env('BACKUP_ENCRYPTION_ENABLED', true),
        'cipher' => 'AES-256-CBC',
    ],

    /*
    |--------------------------------------------------------------------------
    | Compression
    |--------------------------------------------------------------------------
    */
    'compression' => [
        'enabled' => true,
        'format' => 'gzip', // gzip, zip
    ],

    /*
    |--------------------------------------------------------------------------
    | Retention Policy
    |--------------------------------------------------------------------------
    */
    'retention' => [
        'platform' => [
            'days' => env('BACKUP_PLATFORM_RETENTION_DAYS', 30),
            'max_count' => env('BACKUP_PLATFORM_MAX_COUNT', 30),
        ],
        'tenant' => [
            'days' => env('BACKUP_TENANT_RETENTION_DAYS', 14),
            'max_count' => env('BACKUP_TENANT_MAX_COUNT', 10),
        ],
        'keep_minimum' => 1, // Always keep at least 1 backup
    ],

    /*
    |--------------------------------------------------------------------------
    | MySQL Dump Settings
    |--------------------------------------------------------------------------
    */
    'mysqldump' => [
        'path' => env('MYSQLDUMP_PATH', '/usr/bin/mysqldump'),
        'extra_options' => [
            '--single-transaction',
            '--quick',
            '--lock-tables=false',
            '--routines',
            '--triggers',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | MySQL Import Settings
    |--------------------------------------------------------------------------
    */
    'mysql' => [
        'path' => env('MYSQL_PATH', '/usr/bin/mysql'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Timeouts
    |--------------------------------------------------------------------------
    */
    'timeouts' => [
        'backup' => env('BACKUP_TIMEOUT', 600), // 10 minutes
        'restore' => env('RESTORE_TIMEOUT', 900), // 15 minutes
        'queue_retry' => 3,
    ],

    /*
    |--------------------------------------------------------------------------
    | Notifications
    |--------------------------------------------------------------------------
    */
    'notifications' => [
        'enabled' => env('BACKUP_NOTIFICATIONS_ENABLED', true),
        'channels' => ['mail', 'database'],
        'notify_on' => [
            'backup_completed' => true,
            'backup_failed' => true,
            'restore_completed' => true,
            'restore_failed' => true,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Schedule
    |--------------------------------------------------------------------------
    */
    'schedule' => [
        'platform' => [
            'enabled' => true,
            'time' => '03:00', // UTC
        ],
        'tenants' => [
            'enabled' => true,
            'time' => '03:30', // UTC
        ],
        'cleanup' => [
            'enabled' => true,
            'time' => '04:00', // UTC
        ],
    ],
];
