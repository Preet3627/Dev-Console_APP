
export const pluginSourceCode = `<?php
/**
 * Plugin Name: Dev-Console Connector
 * Description: Securely connects your WordPress site to the Dev-Console Co-Pilot application.
 * Version: 2.7.0
 * Author: PM-SHRI
 * Author URI: https://ponsrischool.in
 */

if (!defined('ABSPATH')) {
    exit;
}

// Prevent fatal error if class is already defined
if (class_exists('Dev_Console_Connector')) {
    return;
}

if (!defined('DC_CONNECTOR_KEY_OPTION')) { define('DC_CONNECTOR_KEY_OPTION', 'dc_connector_key'); }
if (!defined('DC_API_KEY_OPTION')) { define('DC_API_KEY_OPTION', 'dc_api_key'); }
if (!defined('DC_CORS_SETTINGS_OPTION')) { define('DC_CORS_SETTINGS_OPTION', 'dc_connector_cors_settings'); }
if (!defined('DC_BACKUP_DIR_FILES')) { define('DC_BACKUP_DIR_FILES', 'dev-console-backups/file-history'); }
if (!defined('DC_BACKUP_DIR_SITE')) { define('DC_BACKUP_DIR_SITE', 'dev-console-backups/site-backups'); }

// Custom exception for controlled, user-facing error messages.
class DC_Connector_Exception extends Exception {}

class Dev_Console_Connector {

    private static $instance;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        // Actions are now hooked in the init() method to ensure correct loading order.
    }

    /**
     * Initializes the plugin by setting up hooks.
     */
    public function init() {
        $this->check_and_create_options();
        add_action('rest_api_init', [$this, 'register_routes']);
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_filter('rest_pre_serve_request', [$this, 'handle_cors_headers'], 10, 4);
    }

    public function check_and_create_options() {
        // This runs on every page load but only acts if the options are missing.
        // It is a safer way to initialize options than using the activation hook.
        if (!get_option(DC_CONNECTOR_KEY_OPTION)) {
            if (!function_exists('wp_generate_password')) { require_once ABSPATH . 'wp-includes/pluggable.php'; }
            update_option(DC_CONNECTOR_KEY_OPTION, wp_generate_password(64, false, false));
        }
        if (!get_option(DC_API_KEY_OPTION)) {
            if (!function_exists('wp_generate_password')) { require_once ABSPATH . 'wp-includes/pluggable.php'; }
            update_option(DC_API_KEY_OPTION, wp_generate_password(64, false, false));
        }
        if (!get_option(DC_CORS_SETTINGS_OPTION)) { add_option(DC_CORS_SETTINGS_OPTION, ['allow_all' => false, 'allowed_origins' => "https://dev.ponsrischool.in\\nhttp://localhost:5173"]); }
    }

    public static function activate() {
        // This hook is intentionally left minimal to prevent fatal errors on activation.
        // Option creation is handled on the 'plugins_loaded' hook.
    }

    public function add_admin_menu() {
        add_menu_page('Dev-Console Connector', 'Connector', 'manage_options', 'dev-console-connector', [$this, 'create_settings_page_html'], 'dashicons-admin-plugins');
    }

    public function create_settings_page_html() {
        ?>
        <div class="wrap">
            <h1>Dev-Console Connector Settings</h1>
            <p>Use the details below to connect your Dev-Console application to this WordPress site.</p>

            <h2>Connection Keys</h2>
            <p>Copy these keys into the connection modal in the Dev-Console application.</p>
            <table class="form-table" role="presentation">
                <tbody>
                    <tr>
                        <th scope="row"><label for="dc_connector_key">Connector Key</label></th>
                        <td>
                            <input type="password" id="dc_connector_key" readonly value="<?php echo esc_attr(get_option(DC_CONNECTOR_KEY_OPTION)); ?>" class="regular-text" />
                            <button type="button" class="button button-secondary" onclick="toggleKeyVisibility('dc_connector_key', this)">Show</button>
                            <button type="button" class="button button-secondary" onclick="copyToClipboard('dc_connector_key', 'dc_connector_key_feedback')">Copy</button>
                            <span id="dc_connector_key_feedback" style="margin-left: 10px; color: green; vertical-align: middle;"></span>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="dc_api_key">API Key</label></th>
                        <td>
                            <input type="password" id="dc_api_key" readonly value="<?php echo esc_attr(get_option(DC_API_KEY_OPTION)); ?>" class="regular-text" />
                             <button type="button" class="button button-secondary" onclick="toggleKeyVisibility('dc_api_key', this)">Show</button>
                             <button type="button" class="button button-secondary" onclick="copyToClipboard('dc_api_key', 'dc_api_key_feedback')">Copy</button>
                             <span id="dc_api_key_feedback" style="margin-left: 10px; color: green; vertical-align: middle;"></span>
                        </td>
                    </tr>
                </tbody>
            </table>
            
            <hr/>

            <div id="dc-connector-settings-form">
                <?php
                $options = get_option(DC_CORS_SETTINGS_OPTION, ['allow_all' => false, 'allowed_origins' => "https://dev.ponsrischool.in\\nhttp://localhost:5173"]);
                ?>
                <h2>Security: Allowed Origins (CORS)</h2>
                <p>Control which frontend domains can access this site's Connector API.</p>
                <table class="form-table" role="presentation">
                    <tbody>
                         <tr>
                            <th scope="row">Allow All Origins</th>
                            <td>
                                <input type="checkbox" id="dc_connector_allow_all" name="allow_all" <?php checked(isset($options['allow_all']) && $options['allow_all'], true); ?> />
                                <p class="description"><strong>Warning:</strong> For development use only. Allows any domain to make requests.</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><label for="dc_connector_allowed_origins">Allowed Origins</label></th>
                            <td>
                                <textarea name="allowed_origins" rows="5" cols="50" class="large-text" id="dc_connector_allowed_origins"><?php echo esc_textarea($options['allowed_origins'] ?? ''); ?></textarea>
                                <p class="description">Enter allowed domains, one per line (e.g., https://dev.ponsrischool.in, http://localhost:5173).</p>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <p class="submit">
                    <button type="button" id="dc-save-connector-settings" class="button button-primary">Save CORS Settings</button>
                    <span id="dc-connector-spinner" class="spinner" style="float: none; vertical-align: middle; margin-left: 10px;"></span>
                    <span id="dc-connector-feedback" style="margin-left: 10px; vertical-align: middle;"></span>
                </p>
            </div>
        </div>
        <script>
            function toggleKeyVisibility(elementId, button) {
                var keyInput = document.getElementById(elementId);
                if (keyInput.type === 'password') {
                    keyInput.type = 'text';
                    button.textContent = 'Hide';
                } else {
                    keyInput.type = 'password';
                    button.textContent = 'Show';
                }
            }

            function copyToClipboard(elementId, feedbackId) {
                var copyText = document.getElementById(elementId);
                var feedbackSpan = document.getElementById(feedbackId);
                
                var originalType = copyText.type;
                if (originalType === 'password') {
                    copyText.type = 'text';
                }

                copyText.select();
                copyText.setSelectionRange(0, 99999);
                document.execCommand("copy");

                if (originalType === 'password') {
                    copyText.type = 'password';
                }
                
                feedbackSpan.textContent = 'Copied!';
                setTimeout(function() {
                    feedbackSpan.textContent = '';
                }, 2000);
            }

            document.addEventListener('DOMContentLoaded', function() {
                const allowAllCheckbox = document.getElementById('dc_connector_allow_all');
                const originsTextarea = document.getElementById('dc_connector_allowed_origins');
                const saveBtn = document.getElementById('dc-save-connector-settings');
                const spinner = document.getElementById('dc-connector-spinner');
                const feedback = document.getElementById('dc-connector-feedback');

                const toggleTextarea = () => {
                    if (originsTextarea && allowAllCheckbox) {
                        originsTextarea.disabled = allowAllCheckbox.checked;
                        originsTextarea.closest('tr').style.opacity = allowAllCheckbox.checked ? 0.6 : 1;
                    }
                };
                if (allowAllCheckbox) {
                    allowAllCheckbox.addEventListener('change', toggleTextarea);
                    toggleTextarea();
                }

                if (saveBtn) {
                    saveBtn.addEventListener('click', function() {
                        spinner.style.visibility = 'visible';
                        feedback.textContent = '';
                        saveBtn.disabled = true;

                        const data = {
                            allow_all: allowAllCheckbox.checked,
                            allowed_origins: originsTextarea.value
                        };

                        fetch('<?php echo esc_url_raw(rest_url('dev-console/v1/connector-settings')); ?>', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-WP-Nonce': '<?php echo wp_create_nonce('wp_rest'); ?>'
                            },
                            body: JSON.stringify(data)
                        })
                        .then(response => {
                            if (!response.ok) {
                               return response.json().then(err => { throw new Error(err.message || 'HTTP error!') });
                            }
                            return response.json();
                        })
                        .then(result => {
                            feedback.style.color = 'green';
                            feedback.textContent = 'Settings Saved!';
                        })
                        .catch(error => {
                            feedback.style.color = 'red';
                            feedback.textContent = 'Error: ' + error.message;
                        })
                        .finally(() => {
                            spinner.style.visibility = 'hidden';
                            saveBtn.disabled = false;
                            setTimeout(() => { feedback.textContent = ''; }, 3000);
                        });
                    });
                }
            });
        </script>
        <?php
    }
    
    public function handle_cors_headers($served, $result, $request, $server) {
        $origin = get_http_origin();
        if (!$origin) return $served;

        $cors_options = get_option(DC_CORS_SETTINGS_OPTION, ['allow_all' => false, 'allowed_origins' => '']);
        $allowed = !empty($cors_options['allow_all']);

        if (!$allowed) {
            $allowed_origins = array_map('trim', preg_split("/[\\r\\n,]+/", $cors_options['allowed_origins'] ?? ''));
            if (in_array($origin, $allowed_origins, true)) {
                $allowed = true;
            }
        }

        if ($allowed) {
            header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
            header('Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE');
            header('Access-Control-Allow-Headers: Content-Type, X-Connector-Key, X-Api-Key, Authorization');
            if ('OPTIONS' === $_SERVER['REQUEST_METHOD']) { status_header(200); exit(0); }
        }
        return $served;
    }

    public function register_routes() {
        register_rest_route('dev-console/v1', '/execute', ['methods' => 'POST', 'callback' => [$this, 'handle_execute'], 'permission_callback' => [$this, 'permission_check']]);
        register_rest_route('dev-console/v1', '/connector-settings', ['methods' => 'POST', 'callback' => [$this, 'handle_save_connector_settings'], 'permission_callback' => function() { return current_user_can('manage_options'); }]);
    }

    public function handle_save_connector_settings(WP_REST_Request $request) {
        $params = $request->get_json_params();
        update_option(DC_CORS_SETTINGS_OPTION, ['allow_all' => !empty($params['allow_all']), 'allowed_origins' => sanitize_textarea_field($params['allowed_origins'] ?? '')]);
        return new WP_REST_Response(['success' => true], 200);
    }

    public function permission_check(WP_REST_Request $request) {
        $key = $request->get_header('X-Connector-Key');
        $api_key = $request->get_header('X-Api-Key');
        if (!hash_equals(get_option(DC_CONNECTOR_KEY_OPTION), $key) || !hash_equals(get_option(DC_API_KEY_OPTION), $api_key)) {
            return new WP_Error('auth_failed', 'Invalid credentials provided in request headers.', ['status' => 403]);
        }
        return true;
    }

    public function handle_execute(WP_REST_Request $request) {
        $params = $request->get_json_params();
        $action = $params['action'] ?? null;
        if (!$action) { return new WP_Error('invalid_request', 'No action specified.', ['status' => 400]); }

        $method = 'action_' . $action;
        if (method_exists($this, $method)) {
            try {
                $data = $this->$method($params['payload'] ?? []);
                return new WP_REST_Response(['success' => true, 'data' => $data], 200);
            } catch (DC_Connector_Exception $e) {
                error_log('[Dev-Console Connector] Action Failed: ' . $e->getMessage());
                return new WP_Error('action_failed', $e->getMessage(), ['status' => 400]);
            } catch (Exception $e) {
                error_log('[Dev-Console Connector] Unhandled Exception: ' . $e->getMessage());
                return new WP_Error('server_error', 'An unexpected error occurred on the server. Check the server logs for more details.', ['status' => 500]);
            }
        }
        return new WP_Error('invalid_action', 'The specified action does not exist.', ['status' => 404]);
    }

    private function require_wp_admin_files() {
        if (!function_exists('get_plugin_data')) { require_once ABSPATH . 'wp-admin/includes/plugin.php'; }
        if (!function_exists('wp_get_themes')) { require_once ABSPATH . 'wp-admin/includes/theme.php'; }
        if (!function_exists('request_filesystem_credentials')) { require_once ABSPATH . 'wp-admin/includes/file.php'; }
    }

    private function get_asset_path($id, $type) { return $type === 'plugin' ? WP_PLUGIN_DIR . '/' . dirname($id) : get_theme_root() . '/' . $id; }
    
    private function backup_file($path, $id, $type, $rel_path) {
        if (!file_exists($path) || !is_readable($path)) { return; }
        $upload_dir = wp_upload_dir();
        $backup_dir = $upload_dir['basedir'] . '/' . DC_BACKUP_DIR_FILES . '/' . $type . '/' . dirname($id) . '/' . dirname($rel_path);
        wp_mkdir_p($backup_dir);
        $backup_path = $backup_dir . '/' . basename($rel_path) . '.' . time() . '.bak';
        if (!copy($path, $backup_path)) { error_log('[Dev-Console Connector] Failed to create backup for file: ' . $path); }
    }

    private function resolve_path($id, $type, $rel_path) {
        $base = ($id === 'root') ? ABSPATH : $this->get_asset_path($id, $type);
        $path = $base . '/' . $rel_path;
        
        $real_base = realpath($base);
        $real_path = realpath($path);

        if ($real_path === false || strpos($real_path, $real_base) !== 0) { throw new DC_Connector_Exception('Invalid file path or directory traversal attempt.'); }
        if ($id === 'root' && in_array(basename($path), ['wp-config.php', '.htaccess'])) { throw new DC_Connector_Exception('Editing this sensitive file is not permitted.'); }
        
        return $path;
    }

    private function action_get_db_tables($payload) {
        global $wpdb;
        return $wpdb->get_col("SHOW TABLES");
    }

    private function action_get_asset_files($payload) {
        $base_path = ($payload['assetIdentifier'] === 'root') ? ABSPATH : $this->get_asset_path($payload['assetIdentifier'], $payload['assetType']);
        $files = [];
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base_path, FilesystemIterator::SKIP_DOTS | FilesystemIterator::UNIX_PATHS), RecursiveIteratorIterator::SELF_FIRST);
        $exclusions = ['wp-admin', 'wp-includes', '.git', '.github', '.vscode', 'node_modules', 'vendor', 'wp-content/uploads', 'wp-content/cache', 'wp-content/upgrade', 'wp-config.php', '.htaccess', 'license.txt', 'readme.html'];
        $exclude_patterns = array_map(function($item) use ($base_path) { return '#^' . preg_quote($base_path . $item, '#') . '#'; }, $exclusions);

        foreach ($iterator as $file) {
            if ($payload['assetIdentifier'] === 'root') {
                $is_excluded = false;
                foreach ($exclude_patterns as $pattern) { if (preg_match($pattern, $file->getPathname())) { $is_excluded = true; break; } }
                if ($is_excluded) continue;
            }
            if ($file->isFile()) { $files[] = ['name' => ltrim(str_replace($base_path, '', $file->getPathname()), '/')]; }
        }
        usort($files, function($a, $b) { return strcmp($a['name'], $b['name']); });
        return $files;
    }

    private function action_read_file_content($payload) {
        $upload_dir = wp_upload_dir();
        $backup_base_dir = realpath($upload_dir['basedir'] . '/' . DC_BACKUP_DIR_FILES);
        $is_backup_read = strpos($payload['relativePath'], DC_BACKUP_DIR_FILES) !== false;

        if ($is_backup_read && $backup_base_dir) {
            $path = realpath($payload['relativePath']);
            if ($path === false || strpos($path, $backup_base_dir) !== 0) {
                throw new DC_Connector_Exception('Invalid backup file path.');
            }
        } else {
            $path = $this->resolve_path($payload['assetIdentifier'], $payload['assetType'], $payload['relativePath']);
        }

        if (!is_readable($path)) throw new DC_Connector_Exception('File not found or not readable.');
        $content = @file_get_contents($path);
        if ($content === false) { throw new DC_Connector_Exception('Could not read file content. Check file permissions.'); }
        return ['content' => $content];
    }

    private function action_write_file_content($payload) {
        if (defined('DISALLOW_FILE_EDIT') && DISALLOW_FILE_EDIT) {
            throw new DC_Connector_Exception('File editing is disabled on this site. To enable it, set DISALLOW_FILE_EDIT to false in your wp-config.php file.');
        }
        global $wp_filesystem;
        if (!WP_Filesystem()) { throw new DC_Connector_Exception('Could not initialize WordPress Filesystem. Please check your wp-config.php for FS_METHOD or define filesystem credentials.'); }
        $path = $this->resolve_path($payload['assetIdentifier'], $payload['assetType'], $payload['relativePath']);
        if (file_exists($path)) { $this->backup_file($path, $payload['assetIdentifier'], $payload['assetType'], $payload['relativePath']); }
        if (!$wp_filesystem->put_contents($path, $payload['content'], FS_CHMOD_FILE)) { throw new DC_Connector_Exception('Failed to write to file. This is likely a file permissions issue on your server. Ensure the web server has write access to the file: ' . esc_html($payload['relativePath'])); }
        return ['status' => 'ok'];
    }

    private function action_create_site_backup($payload) {
        $source_dir = WP_CONTENT_DIR;
        $upload_dir = wp_upload_dir();
        $backup_dir = $upload_dir['basedir'] . '/' . DC_BACKUP_DIR_SITE;
        if (!wp_mkdir_p($backup_dir)) { throw new DC_Connector_Exception('Could not create backup directory in \`wp-content/uploads\`. Check permissions.'); }
        
        $file_name = 'site-backup-' . date('Y-m-d-H-i-s') . '.zip';
        $zip_path = $backup_dir . '/' . $file_name;
        $zip = new ZipArchive();
        $content = false;

        try {
             if ($zip->open($zip_path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) { throw new DC_Connector_Exception('Cannot create backup zip file in \`wp-content/uploads\`. Check directory permissions.'); }
            
            $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($source_dir, RecursiveDirectoryIterator::SKIP_DOTS), RecursiveIteratorIterator::LEAVES_ONLY);
            foreach ($files as $name => $file) {
                if (!$file->isDir()) {
                    $filePath = $file->getRealPath();
                    $relativePath = substr($filePath, strlen($source_dir) + 1);
                    if (strpos($filePath, $backup_dir) === false) { $zip->addFile($filePath, $relativePath); }
                }
            }
            if (!$zip->close()) { throw new DC_Connector_Exception('Failed to finalize the backup archive. There might be an issue with file permissions or disk space.'); }
            
            $file_size = filesize($zip_path);
            if ($file_size > 50 * 1024 * 1024) { throw new DC_Connector_Exception('Backup file exceeds 50MB and cannot be transferred directly. Please use a dedicated backup solution.'); }

            $content = file_get_contents($zip_path);
            if ($content === false) { throw new DC_Connector_Exception('Could not read the created backup file for transfer.'); }
        } finally {
            if (file_exists($zip_path)) { unlink($zip_path); }
        }
        return ['status' => 'ok', 'fileName' => $file_name, 'content' => base64_encode($content)];
    }

    private function action_update_plugin_file($payload) {
        global $wp_filesystem;
        if (!WP_Filesystem()) { throw new DC_Connector_Exception('Could not initialize WordPress Filesystem. Please check your wp-config.php for FS_METHOD.'); }

        $path = __FILE__;
        if (!file_exists($path)) { throw new DC_Connector_Exception('Connector plugin file not found. The update cannot proceed.'); }
        
        copy($path, $path . '.bak');
        if (!$wp_filesystem->put_contents($path, $payload['content'], FS_CHMOD_FILE)) {
            copy($path . '.bak', $path); // Rollback on failure
            @unlink($path . '.bak');
            throw new DC_Connector_Exception('Failed to update plugin file. This is often a file permissions issue on your server.');
        }
        @unlink($path . '.bak');
        return ['status' => 'ok', 'message' => 'Connector plugin updated successfully.'];
    }

    private function action_ping($payload) {
        $this->require_wp_admin_files();
        $plugin_data = get_plugin_data(__FILE__);
        return [
            'message' => 'pong',
            'connector_version' => $plugin_data['Version']
        ];
    }

    private function action_list_assets($payload) {
        $this->require_wp_admin_files();
        $asset_type = $payload['assetType'];
        $results = [];
        if ($asset_type === 'plugin') {
            $all_plugins = get_plugins();
            $active_plugins = get_option('active_plugins');
            foreach ($all_plugins as $path => $details) {
                $results[] = [
                    'type' => 'plugin',
                    'name' => $details['Name'],
                    'identifier' => $path,
                    'version' => $details['Version'],
                    'isActive' => in_array($path, $active_plugins)
                ];
            }
        } else { // theme
            $all_themes = wp_get_themes();
            $active_theme = get_stylesheet();
            foreach ($all_themes as $slug => $theme) {
                $results[] = [
                    'type' => 'theme',
                    'name' => $theme->get('Name'),
                    'identifier' => $slug,
                    'version' => $theme->get('Version'),
                    'isActive' => $slug === $active_theme
                ];
            }
        }
        return $results;
    }

    private function action_toggle_asset_status($payload) {
        $this->require_wp_admin_files();
        $asset_type = $payload['assetType'];
        $id = $payload['assetIdentifier'];
        $new_status = $payload['newStatus'];

        if ($asset_type === 'plugin') {
            if ($new_status) {
                $result = activate_plugin($id);
                if (is_wp_error($result)) { throw new DC_Connector_Exception('Failed to activate plugin: ' . $result->get_error_message()); }
            } else {
                deactivate_plugins($id);
            }
        } else { // theme
            if ($new_status) {
                switch_theme($id);
            } else {
                throw new DC_Connector_Exception('Cannot deactivate the active theme. Switch to another theme to deactivate this one.');
            }
        }
        return ['status' => 'ok'];
    }

    private function action_delete_asset($payload) {
        $this->require_wp_admin_files();
        $asset_type = $payload['assetType'];
        $id = $payload['assetIdentifier'];

        if ($asset_type === 'plugin') {
            $result = delete_plugins([$id]);
             if (is_wp_error($result)) { throw new DC_Connector_Exception($result->get_error_message()); }
        } else {
            $result = delete_theme($id);
             if (is_wp_error($result)) { throw new DC_Connector_Exception($result->get_error_message()); }
        }
        return ['status' => 'ok'];
    }

    private function action_install_asset($payload) {
        global $wp_filesystem;
        if (!WP_Filesystem()) { throw new DC_Connector_Exception('Could not initialize WordPress Filesystem. Please check your wp-config.php for FS_METHOD.'); }

        $asset_type = $payload['assetType'];
        $asset_name_slug = sanitize_file_name($payload['assetName']);
        $files = $payload['files'];
        $base_path = ($asset_type === 'plugin') ? WP_PLUGIN_DIR : get_theme_root();
        $asset_dir = $base_path . '/' . $asset_name_slug;

        if ($wp_filesystem->exists($asset_dir)) {
            throw new DC_Connector_Exception(ucfirst($asset_type) . " folder '" . esc_html($asset_name_slug) . "' already exists.");
        }
        if (!$wp_filesystem->mkdir($asset_dir)) { throw new DC_Connector_Exception('Could not create directory for the new ' . $asset_type . '. Check server permissions.'); }

        foreach ($files as $file) {
            $path = $asset_dir . '/' . $file['name'];
            $dir = dirname($path);
            if (!$wp_filesystem->exists($dir)) {
                if (!$wp_filesystem->mkdir($dir, FS_CHMOD_DIR)) { throw new DC_Connector_Exception('Could not create subdirectory: ' . esc_html($dir)); }
            }
            if (!$wp_filesystem->put_contents($path, base64_decode($file['content']), FS_CHMOD_FILE)) {
                throw new DC_Connector_Exception('Failed to write file: ' . esc_html($file['name']));
            }
        }
        return ['status' => 'ok'];
    }
    
    private function action_get_file_history($payload) {
        $upload_dir = wp_upload_dir();
        $backup_dir = $upload_dir['basedir'] . '/' . DC_BACKUP_DIR_FILES . '/' . $payload['assetType'] . '/' . dirname($payload['assetIdentifier']) . '/' . dirname($payload['relativePath']);
        if (!is_dir($backup_dir)) return [];
        
        $files = @scandir($backup_dir);
        if ($files === false) { return []; }
        $backups = [];
        foreach ($files as $file) {
            if (strpos($file, basename($payload['relativePath'])) === 0 && strpos($file, '.bak') !== false) {
                 $parts = explode('.', $file);
                 $timestamp = $parts[count($parts) - 2];
                 $backups[] = ['path' => $backup_dir . '/' . $file, 'timestamp' => $timestamp];
            }
        }
        rsort($backups);
        return $backups;
    }

    private function action_restore_file($payload) {
        global $wp_filesystem;
        if (!WP_Filesystem()) { throw new DC_Connector_Exception('Could not initialize WordPress Filesystem. Please check your wp-config.php for FS_METHOD.'); }
        $target_path = $this->resolve_path($payload['assetIdentifier'], $payload['assetType'], $payload['relativePath']);
        $backup_path = $payload['backupPath'];

        $upload_dir = wp_upload_dir();
        if (strpos(realpath($backup_path), realpath($upload_dir['basedir'])) !== 0) {
            throw new DC_Connector_Exception('Invalid backup path. Directory traversal is not permitted.');
        }

        if (!file_exists($backup_path)) { throw new DC_Connector_Exception('Backup file not found.'); }
        
        $this->backup_file($target_path, $payload['assetIdentifier'], $payload['assetType'], $payload['relativePath']);
        
        if (!$wp_filesystem->copy($backup_path, $target_path, true)) {
            throw new DC_Connector_Exception('Failed to restore file. Check file permissions.');
        }
        return ['status' => 'ok'];
    }

    private function action_execute_safe_db_query($payload) {
        global $wpdb;
        $queryType = $payload['queryType'];
        $params = $payload['params'] ?? [];

        switch ($queryType) {
            case 'get_options':
                $optionNames = $params['optionNames'] ?? [];
                if (empty($optionNames) || !is_array($optionNames)) return [];
                $placeholders = implode(', ', array_fill(0, count($optionNames), '%s'));
                return $wpdb->get_results($wpdb->prepare("SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name IN ($placeholders)", ...$optionNames), ARRAY_A);
            case 'list_posts':
                $post_type = isset($params['postType']) ? sanitize_key($params['postType']) : 'post';
                $limit = isset($params['limit']) ? intval($params['limit']) : 10;
                $offset = isset($params['offset']) ? intval($params['offset']) : 0;
                 return get_posts(['post_type' => $post_type, 'numberposts' => $limit, 'offset' => $offset, 'post_status' => 'any']);
            default:
                throw new DC_Connector_Exception("Unsupported or invalid query type specified.");
        }
    }

    private function action_run_security_scan($payload) {
        global $wpdb;
        $results = [];
        $results[] = ['id' => 'wp_debug', 'title' => 'WP_DEBUG is Disabled on Live Site', 'status' => (defined('WP_DEBUG') && WP_DEBUG) ? 'fail' : 'pass', 'severity' => 'High', 'description' => 'WP_DEBUG should be turned off on a live website as it can expose sensitive information.', 'recommendation' => 'Set WP_DEBUG to false in your wp-config.php file for production environments.'];

        $response = wp_remote_get(get_site_url() . '/wp-includes/');
        if (is_wp_error($response)) {
             $dir_listing_status = 'warn';
             $dir_listing_desc = 'Could not check for directory listing. The site may not be publicly accessible from the server itself. Error: ' . $response->get_error_message();
        } else {
             $body = wp_remote_retrieve_body($response);
             $dir_listing_status = (strpos($body, '<title>Index of') !== false) ? 'fail' : 'pass';
             $dir_listing_desc = 'Directory listing can reveal sensitive file names to attackers.';
        }
        $results[] = ['id' => 'dir_listing', 'title' => 'Directory Listing is Disabled', 'status' => $dir_listing_status, 'severity' => 'Medium', 'description' => $dir_listing_desc, 'recommendation' => 'Add "Options -Indexes" to your .htaccess file to disable directory browsing.'];

        $admin_user = get_user_by('login', 'admin');
        $results[] = ['id' => 'default_admin', 'title' => 'Default "admin" User Does Not Exist', 'status' => $admin_user ? 'fail' : 'pass', 'severity' => 'High', 'description' => 'Using the default "admin" username makes brute-force attacks easier.', 'recommendation' => 'Create a new administrator account with a unique username and delete the default "admin" account.'];
$results[] = [
    'id' => 'file_edit', 
    'title' => 'File Editing Status', 
    'status' => (defined('DISALLOW_FILE_EDIT') && DISALLOW_FILE_EDIT) ? 'fail' : 'pass', 
    'severity' => 'Medium', 
    'description' => 'File editing must be enabled for the Dev-Console to write to files. If disabled, write operations will fail.', 
    'recommendation' => "To fix this, set \`define(\'DISALLOW_FILE_EDIT\', false);\` in your wp-config.php file or remove the line defining it."
];
        $results[] = ['id' => 'db_prefix', 'title' => 'Database Prefix is Not Default', 'status' => ($wpdb->prefix === 'wp_') ? 'fail' : 'pass', 'severity' => 'Medium', 'description' => 'Using the default "wp_" database prefix makes SQL injection attacks easier.', 'recommendation' => 'Use a unique database prefix. This requires a more involved process to change on an existing site.'];

        return $results;
    }

    private function action_get_debug_log($payload) {
        $log_path = WP_CONTENT_DIR . '/debug.log';
        if (!file_exists($log_path) || !is_readable($log_path)) {
            throw new DC_Connector_Exception('debug.log file does not exist or is not readable. Ensure WP_DEBUG_LOG is enabled in wp-config.php.');
        }
        $content = @file_get_contents($log_path);
        if ($content === false) { throw new DC_Connector_Exception('Could not read debug.log. Check file permissions.'); }
        return ['content' => $content];
    }

    private function action_list_site_backups($payload) {
        $upload_dir = wp_upload_dir();
        $backup_dir = $upload_dir['basedir'] . '/' . DC_BACKUP_DIR_SITE;
        if (!is_dir($backup_dir)) return [];

        $files = @scandir($backup_dir);
        if ($files === false) { return []; }
        $backups = [];
        foreach ($files as $file) {
            if (pathinfo($file, PATHINFO_EXTENSION) === 'zip') {
                $filepath = $backup_dir . '/' . $file;
                $backups[] = [
                    'name' => $file,
                    'size' => filesize($filepath),
                    'date' => filemtime($filepath)
                ];
            }
        }
        usort($backups, function($a, $b) { return $b['date'] - $a['date']; });
        return $backups;
    }
}

// Use a static method for the activation hook to prevent closure serialization issues.
register_activation_hook(__FILE__, ['Dev_Console_Connector', 'activate']);

/**
 * Initializes the plugin instance.
 *
 * This function is hooked to 'plugins_loaded' to ensure all WordPress functions and other plugins
 * have been loaded before our plugin's logic runs.
 */
function dev_console_connector_init() {
    Dev_Console_Connector::get_instance()->init();
}
add_action('plugins_loaded', 'dev_console_connector_init');
`;
