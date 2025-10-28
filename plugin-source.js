export const pluginSourceCode = `<?php
/**
 * Plugin Name: Dev-Console Connector
 * Description: Securely connects your WordPress site to the Dev-Console application, enabling AI-powered management and development.
 * Version: 4.0.0
 * Author: PM-SHRI
 * Author URI: https://ponsrischool.in
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

// Prevent fatal error if class is already defined
if (class_exists('Dev_Console_Connector')) {
    // Check if it's a request to update the plugin file itself
    if (isset($_POST['action']) && $_POST['action'] === 'update_plugin_file' && isset($_POST['payload']['plugin_type']) && $_POST['payload']['plugin_type'] === 'connector') {
        // Allow the update to proceed
    } else {
        return;
    }
}

final class Dev_Console_Connector {

    private static $instance;
    const CONNECTOR_KEY_OPTION = 'dev_console_connector_key';
    const API_KEY_OPTION = 'dev_console_api_key';

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // On plugin activation, generate keys
        register_activation_hook(__FILE__, [$this, 'activate']);

        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_styles']);
    }

    /**
     * Plugin activation hook.
     */
    public function activate() {
        $this->init_keys(true); // Force regenerate on activation
    }
    
    /**
     * Enqueue styles for the admin page.
     */
    public function enqueue_admin_styles($hook) {
        if ($hook !== 'toplevel_page_dev-console-connector') {
            return;
        }
        wp_add_inline_style('wp-admin', $this->get_admin_css());
    }

    /**
     * Initializes security keys if they don't exist.
     */
    private function init_keys($force = false) {
        if ($force || !get_option(self::CONNECTOR_KEY_OPTION)) {
            update_option(self::CONNECTOR_KEY_OPTION, wp_generate_password(64, false, false));
        }
        if ($force || !get_option(self::API_KEY_OPTION)) {
            update_option(self::API_KEY_OPTION, wp_generate_password(64, false, false));
        }
    }

    /**
     * Adds the plugin's settings page to the WordPress admin menu.
     */
    public function add_admin_menu() {
        add_menu_page(
            'Dev-Console Connector',
            'Dev-Console',
            'manage_options',
            'dev-console-connector',
            [$this, 'create_settings_page_html'],
            'dashicons-code-standards',
            81
        );
    }

    /**
     * Handles POST requests for the settings page (e.g., regenerating keys).
     */
    private function handle_settings_page_post() {
        if (isset($_POST['dev_console_regenerate_keys']) && check_admin_referer('dev_console_regenerate_keys_nonce')) {
            $this->init_keys(true);
            echo '<div class="notice notice-success is-dismissible"><p>New security keys have been generated successfully.</p></div>';
        }
    }

    /**
     * Renders the HTML for the plugin's settings page.
     */
    public function create_settings_page_html() {
        if (!current_user_can('manage_options')) return;

        $this->init_keys();
        $this->handle_settings_page_post();

        $connector_key = get_option(self::CONNECTOR_KEY_OPTION);
        $api_key = get_option(self::API_KEY_OPTION);
        ?>
        <div class="wrap dev-console-wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <p>Use the following keys to connect your site to the Dev-Console application.</p>

            <div class="dc-card">
                <h2>Connection Keys</h2>
                <p>Enter these keys into the Dev-Console application to establish a secure connection.</p>
                <div class="dc-key-field">
                    <label for="connector_key">Connector Key</label>
                    <div class="dc-input-group">
                        <input type="text" id="connector_key" value="<?php echo esc_attr($connector_key); ?>" readonly>
                        <button class="button dc-copy-btn" data-clipboard-target="#connector_key">Copy</button>
                    </div>
                </div>
                <div class="dc-key-field">
                    <label for="api_key">API Key</label>
                    <div class="dc-input-group">
                        <input type="text" id="api_key" value="<?php echo esc_attr($api_key); ?>" readonly>
                        <button class="button dc-copy-btn" data-clipboard-target="#api_key">Copy</button>
                    </div>
                </div>
            </div>

            <div class="dc-card dc-card-danger">
                <h2>Regenerate Keys</h2>
                <p>If you suspect your keys have been compromised, you can regenerate them. This will immediately disconnect any currently connected applications.</p>
                <form method="post" action="">
                    <?php wp_nonce_field('dev_console_regenerate_keys_nonce'); ?>
                    <input type="hidden" name="dev_console_regenerate_keys" value="1">
                    <button type="submit" class="button button-primary" onclick="return confirm('Are you sure you want to regenerate the keys? This will break the existing connection.');">Regenerate Keys</button>
                </form>
            </div>
             <p class="dc-footer">Dev-Console Connector Version <?php echo esc_html($this->get_plugin_version()); ?></p>
        </div>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                if(typeof ClipboardJS === 'undefined') {
                    var script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.8/clipboard.min.js';
                    script.onload = function() {
                        initializeClipboard();
                    };
                    document.head.appendChild(script);
                } else {
                    initializeClipboard();
                }
                function initializeClipboard() {
                    var clipboard = new ClipboardJS('.dc-copy-btn');
                    clipboard.on('success', function(e) {
                        var originalText = e.trigger.innerHTML;
                        e.trigger.innerHTML = 'Copied!';
                        setTimeout(function() {
                            e.trigger.innerHTML = originalText;
                        }, 2000);
                        e.clearSelection();
                    });
                }
            });
        </script>
        <?php
    }

    /**
     * Registers the REST API routes.
     */
    public function register_rest_routes() {
        register_rest_route('dev-console/v1', '/execute', [
            'methods'  => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'handle_rest_request'],
            'permission_callback' => '__return_true' // We handle permissions manually.
        ]);
    }
    
    /**
     * Authenticates the incoming REST request.
     */
    private function authenticate_request($request) {
        $connector_key = $request->get_header('X-Connector-Key');
        $api_key = $request->get_header('X-Api-Key');

        if (!$connector_key || !$api_key) {
            return new WP_Error('auth_failed', 'Missing authentication headers.', ['status' => 401]);
        }
        if (!hash_equals(get_option(self::CONNECTOR_KEY_OPTION), $connector_key) || !hash_equals(get_option(self::API_KEY_OPTION), $api_key)) {
            return new WP_Error('auth_failed', 'Invalid authentication keys.', ['status' => 403]);
        }
        return true;
    }

    /**
     * Main handler for all incoming REST requests.
     */
    public function handle_rest_request(WP_REST_Request $request) {
        $auth = $this->authenticate_request($request);
        if (is_wp_error($auth)) {
            return $auth;
        }

        $body = $request->get_json_params();
        $action = isset($body['action']) ? sanitize_key($body['action']) : '';
        $payload = isset($body['payload']) ? $body['payload'] : [];

        $method_name = '_action_' . $action;
        if (method_exists($this, $method_name)) {
            try {
                $result = $this->{$method_name}($payload);
                return new WP_REST_Response(['success' => true, 'data' => $result], 200);
            } catch (Exception $e) {
                return new WP_REST_Response(['success' => false, 'message' => $e->getMessage()], 500);
            }
        }

        return new WP_REST_Response(['success' => false, 'message' => 'Invalid action specified.'], 400);
    }
    
    // --- START: Action Methods ---
    
    private function _action_ping($payload) {
        return ['message' => 'pong', 'connector_version' => $this->get_plugin_version()];
    }

    private function _action_list_assets($payload) {
        if (!function_exists('get_plugins') || !function_exists('wp_get_themes')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
            require_once ABSPATH . 'wp-admin/includes/theme.php';
        }
        $asset_type = $payload['assetType'];
        $results = [];

        if ($asset_type === 'plugin') {
            $plugins = get_plugins();
            foreach ($plugins as $path => $details) {
                $results[] = [
                    'type' => 'plugin',
                    'name' => $details['Name'],
                    'identifier' => $path,
                    'version' => $details['Version'],
                    'isActive' => is_plugin_active($path),
                ];
            }
        } elseif ($asset_type === 'theme') {
            $themes = wp_get_themes();
            $current_theme = get_stylesheet();
            foreach ($themes as $slug => $theme) {
                $results[] = [
                    'type' => 'theme',
                    'name' => $theme->get('Name'),
                    'identifier' => $slug,
                    'version' => $theme->get('Version'),
                    'isActive' => ($slug === $current_theme),
                ];
            }
        }
        return $results;
    }
    
     private function _action_toggle_asset_status($payload) {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        $asset_type = $payload['assetType'];
        $identifier = sanitize_text_field($payload['assetIdentifier']);
        $new_status = (bool) $payload['newStatus'];

        if ($asset_type === 'plugin') {
            if ($new_status) {
                activate_plugin($identifier);
            } else {
                deactivate_plugins($identifier);
            }
        } elseif ($asset_type === 'theme' && $new_status) {
            switch_theme($identifier);
        }
        return ['status' => 'ok'];
    }
    
    private function _action_delete_asset($payload) {
        require_once ABSPATH . 'wp-admin/includes/plugin.php';
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/theme.php';

        $asset_type = $payload['assetType'];
        $identifier = sanitize_text_field($payload['assetIdentifier']);
        
        if ($asset_type === 'plugin') {
            $result = delete_plugins([$identifier]);
            if (is_wp_error($result)) throw new Exception($result->get_error_message());
        } elseif ($asset_type === 'theme') {
            $result = delete_theme($identifier);
            if (is_wp_error($result)) throw new Exception($result->get_error_message());
        }
        return ['status' => 'deleted'];
    }

    private function _action_get_asset_files($payload) {
        $identifier = sanitize_text_field($payload['assetIdentifier']);
        $asset_type = $payload['assetType'];
        $base_path = '';

        if ($identifier === 'root') {
             $base_path = ABSPATH;
        } else if ($asset_type === 'plugin') {
            $base_path = WP_PLUGIN_DIR . '/' . dirname($identifier);
        } elseif ($asset_type === 'theme') {
            $base_path = get_theme_root() . '/' . $identifier;
        }

        if (empty($base_path) || !is_dir($base_path)) {
            throw new Exception("Asset directory not found.");
        }
        
        $base_path = realpath($base_path);
        
        // Security Check: ensure we are within allowed directories
        if (strpos($base_path, realpath(WP_CONTENT_DIR)) !== 0 && strpos($base_path, realpath(ABSPATH)) !== 0) {
            throw new Exception("Access denied to this directory.");
        }

        $files = [];
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base_path, RecursiveDirectoryIterator::SKIP_DOTS));
        
        foreach ($iterator as $file) {
            if ($file->isDir()) continue;
            // For root, show paths relative to ABSPATH, otherwise relative to asset base.
            $relative_path = ($identifier === 'root')
                ? str_replace(realpath(ABSPATH) . DIRECTORY_SEPARATOR, '', $file->getRealPath())
                : str_replace($base_path . DIRECTORY_SEPARATOR, '', $file->getRealPath());
            $files[] = ['name' => $relative_path];
        }
        return $files;
    }
    
     private function _action_read_file_content($payload) {
        $file_path = $this->get_validated_path($payload);
        if (!is_readable($file_path)) {
            throw new Exception("File is not readable or does not exist.");
        }
        return ['content' => file_get_contents($file_path)];
    }

    private function _action_write_file_content($payload) {
        $file_path = $this->get_validated_path($payload);
        $content = $payload['content']; // No sanitization, as it's code.

        $this->create_file_backup($file_path);
        
        if (file_put_contents($file_path, $content) === false) {
            throw new Exception("Failed to write to file. Check permissions.");
        }
        return ['status' => 'saved'];
    }

    private function _action_install_asset($payload) {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        
        $asset_type = $payload['assetType'];
        $asset_name = sanitize_file_name($payload['assetName']);
        $files = $payload['files'];
        $base_dir = '';

        if ($asset_type === 'plugin') {
            $base_dir = WP_PLUGIN_DIR;
        } elseif ($asset_type === 'theme') {
            $base_dir = get_theme_root();
        } else {
            throw new Exception("Invalid asset type.");
        }

        $asset_dir = $base_dir . '/' . $asset_name;
        if (!wp_mkdir_p($asset_dir)) {
            throw new Exception("Could not create asset directory.");
        }
        
        foreach ($files as $file) {
            $path_parts = explode('/', $file['name']);
            $file_name = sanitize_file_name(array_pop($path_parts));
            $sub_dir = implode('/', $path_parts);
            
            $full_dir = $asset_dir;
            if ($sub_dir) {
                $full_dir .= '/' . $sub_dir;
                if (!wp_mkdir_p($full_dir)) {
                    throw new Exception("Could not create subdirectory: " . $sub_dir);
                }
            }
            
            $file_path = $full_dir . '/' . $file_name;
            $decoded_content = base64_decode($file['content']);
            if (file_put_contents($file_path, $decoded_content) === false) {
                throw new Exception("Failed to write file: " . $file_name);
            }
        }
        return ['status' => 'installed'];
    }

    private function _action_get_db_tables($payload) {
        global $wpdb;
        $tables = $wpdb->get_results("SHOW TABLES", ARRAY_N);
        return array_map(function($row) { return $row[0]; }, $tables);
    }

    private function _action_execute_safe_db_query($payload) {
        global $wpdb;
        $query_type = $payload['queryType'];
        $params = $payload['params'];
        $results = [];

        switch ($query_type) {
            case 'get_options':
                $option_names = array_map('sanitize_text_field', $params['optionNames']);
                foreach ($option_names as $name) {
                    $results[] = ['option_name' => $name, 'option_value' => get_option($name)];
                }
                break;
            case 'list_posts':
                $args = [
                    'post_type' => sanitize_text_field($params['postType'] ?? 'post'),
                    'posts_per_page' => (int)($params['limit'] ?? 10),
                    'offset' => (int)($params['offset'] ?? 0),
                ];
                $query = new WP_Query($args);
                foreach ($query->posts as $post) {
                    $results[] = [
                        'ID' => $post->ID,
                        'post_title' => $post->post_title,
                        'post_status' => $post->post_status,
                        'post_date' => $post->post_date,
                    ];
                }
                break;
            default:
                throw new Exception("Unsupported safe query type.");
        }
        return $results;
    }

    private function _action_run_security_scan($payload) {
        $results = [];
        $results[] = [
            'id' => 'debug_mode',
            'title' => 'WP_DEBUG is Disabled in Production',
            'description' => 'Checks if WP_DEBUG constant is disabled on a production site.',
            'status' => defined('WP_DEBUG') && WP_DEBUG ? 'fail' : 'pass',
            'severity' => 'Medium',
            'recommendation' => 'Set WP_DEBUG to false in your wp-config.php file on live sites.'
        ];
        global $wp_version;
        $results[] = [
            'id' => 'wp_version',
            'title' => 'WordPress Version is Up-to-date',
            'description' => 'Checks if the current WordPress version is the latest.',
            'status' => 'info', // Can\'t check for latest version from here
            'severity' => 'Info',
            'recommendation' => 'Current version is ' . $wp_version . '. Always keep WordPress updated.'
        ];
        $admin_user = get_user_by('login', 'admin');
        $results[] = [
            'id' => 'default_admin',
            'title' => 'Default "admin" User Does Not Exist',
            'description' => 'Checks if the default "admin" username exists.',
            'status' => $admin_user ? 'fail' : 'pass',
            'severity' => 'High',
            'recommendation' => 'Delete the default "admin" user and create a new administrator with a unique username.'
        ];
        return $results;
    }
    
    private function _action_get_debug_log($payload) {
        $log_path = WP_CONTENT_DIR . '/debug.log';
        if (!is_readable($log_path)) {
            throw new Exception("debug.log not found or not readable. Ensure WP_DEBUG_LOG is enabled in wp-config.php.");
        }
        return ['content' => file_get_contents($log_path)];
    }
    
    private function _action_create_site_backup($payload) {
        $backup_dir = $this->get_backup_dir();
        $file_name = 'backup-' . date('Y-m-d_H-i-s') . '.zip';
        $zip_path = $backup_dir . '/' . $file_name;
        
        $zip = new ZipArchive();
        if ($zip->open($zip_path, ZipArchive::CREATE) !== TRUE) {
            throw new Exception("Cannot create zip archive.");
        }
        
        $source = realpath(WP_CONTENT_DIR);
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($source, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($files as $name => $file) {
            if (!$file->isDir()) {
                $filePath = $file->getRealPath();
                $relativePath = substr($filePath, strlen($source) + 1);
                $zip->addFile($filePath, $relativePath);
            }
        }
        $zip->close();
        
        return [
            'status' => 'Backup created',
            'fileName' => $file_name,
            'content' => base64_encode(file_get_contents($zip_path))
        ];
    }
    
    private function _action_list_site_backups($payload) {
        $backup_dir = $this->get_backup_dir();
        $files = array_diff(scandir($backup_dir), ['.', '..', '.htaccess', 'index.php']);
        $results = [];
        foreach($files as $file) {
             if (pathinfo($file, PATHINFO_EXTENSION) === 'zip') {
                $path = $backup_dir . '/' . $file;
                $results[] = [
                    'name' => $file,
                    'size' => filesize($path),
                    'date' => filemtime($path)
                ];
             }
        }
        return $results;
    }
    
     private function _action_update_plugin_file($payload) {
        if ($payload['plugin_type'] !== 'connector') {
            throw new Exception("This action is only for the connector plugin.");
        }
        $content = $payload['content'];
        $plugin_file_path = __FILE__;

        if (!is_writable($plugin_file_path)) {
             throw new Exception("Connector plugin file is not writable.");
        }
        
        if (file_put_contents($plugin_file_path, $content) === false) {
            throw new Exception("Failed to write new plugin content.");
        }
        return ['status' => 'Connector plugin updated. Please reactivate if necessary.'];
    }

    // --- START: Helper Methods ---

    private function get_validated_path($payload) {
        $identifier = sanitize_text_field($payload['assetIdentifier']);
        $asset_type = $payload['assetType'];
        $relative_path = $payload['relativePath']; // Will sanitize parts
        
        $base_path = '';
        if ($identifier === 'root') {
             $base_path = ABSPATH;
        } else if ($asset_type === 'plugin') {
            $base_path = WP_PLUGIN_DIR . '/' . dirname($identifier);
        } elseif ($asset_type === 'theme') {
            $base_path = get_theme_root() . '/' . $identifier;
        } else {
            throw new Exception("Invalid asset type for path validation.");
        }
        
        $base_path = realpath($base_path);
        
        // Prevent directory traversal by sanitizing each part of the relative path
        $path_parts = explode('/', $relative_path);
        $safe_parts = [];
        foreach ($path_parts as $part) {
            if ($part === '..') continue;
            $safe_parts[] = sanitize_file_name($part);
        }
        $safe_relative_path = implode('/', $safe_parts);
        
        $full_path = realpath($base_path . '/' . $safe_relative_path);

        // Security check: ensure the final real path starts with the expected base path
        if (!$full_path || strpos($full_path, $base_path) !== 0) {
            throw new Exception("Invalid file path or access denied.");
        }
        return $full_path;
    }

    private function create_file_backup($file_path) {
        $backup_dir = dirname($file_path) . '/.dc_backups';
        if (!is_dir($backup_dir)) wp_mkdir_p($backup_dir);

        $backup_file = $backup_dir . '/' . basename($file_path) . '.' . time() . '.bak';
        if (!copy($file_path, $backup_file)) {
            // Non-fatal, just log it.
            error_log('Dev-Console: Failed to create file backup for ' . $file_path);
        }
    }

    private function get_plugin_version() {
        $plugin_data = get_plugin_data(__FILE__);
        return $plugin_data['Version'];
    }

    private function get_backup_dir() {
        $upload_dir = wp_upload_dir();
        $backup_dir = $upload_dir['basedir'] . '/dev-console-backups';
        if (!is_dir($backup_dir)) {
            wp_mkdir_p($backup_dir);
            // Add security files
            file_put_contents($backup_dir . '/.htaccess', 'deny from all');
            file_put_contents($backup_dir . '/index.php', '<?php // Silence is golden.');
        }
        return $backup_dir;
    }
    
    private function get_admin_css() {
        return "
        .dev-console-wrap .dc-card { background: #fff; border: 1px solid #c3c4c7; border-radius: 4px; padding: 20px; margin-top: 20px; }
        .dev-console-wrap .dc-card h2 { margin-top: 0; }
        .dev-console-wrap .dc-key-field { margin-bottom: 15px; }
        .dev-console-wrap .dc-key-field label { font-weight: bold; display: block; margin-bottom: 5px; }
        .dev-console-wrap .dc-input-group { display: flex; }
        .dev-console-wrap .dc-input-group input { flex-grow: 1; font-family: monospace; }
        .dev-console-wrap .dc-copy-btn { margin-left: 5px; }
        .dev-console-wrap .dc-card-danger { border-left: 4px solid #d63638; }
        .dev-console-wrap .dc-footer { margin-top: 20px; color: #777; font-size: 12px; }
        ";
    }
}

function dev_console_connector_run() {
    return Dev_Console_Connector::get_instance();
}

dev_console_connector_run();
?>
`;