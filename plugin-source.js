export const pluginSourceCode = `<?php
/**
 * Plugin Name: Dev-Console Connector
 * Plugin URI: https://ponsrischool.in
 * Description: Securely connects your WordPress site to the Dev-Console application, enabling AI-powered management and development.
 * Version: 4.2.0
 * Author: PM-SHRI
 * Author URI: https://ponsrischool.in
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly.
}

final class Dev_Console_Connector {

    private static $instance;
    const ACCESS_KEY_OPTION = 'dev_console_access_key';
    const CORS_ALLOW_ALL_OPTION = 'dev_console_cors_allow_all';
    const CORS_ALLOWED_ORIGINS_OPTION = 'dev_console_cors_allowed_origins';

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('rest_api_init', [$this, 'register_rest_routes']);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_styles']);
        add_action('plugins_loaded', [$this, 'init_settings']);
    }

    public function activate() {
        $this->init_settings(true);
    }
    
    public function enqueue_admin_styles($hook) {
        if ($hook !== 'toplevel_page_dev-console-connector') return;
        wp_add_inline_style('wp-admin', $this->get_admin_css());
    }

    private function init_settings($force = false) {
        if ($force || !get_option(self::ACCESS_KEY_OPTION)) {
            update_option(self::ACCESS_KEY_OPTION, wp_generate_password(64, false, false));
        }
        if (get_option(self::CORS_ALLOWED_ORIGINS_OPTION) === false) {
            update_option(self::CORS_ALLOWED_ORIGINS_OPTION, 'https://dev-console-app-delta.vercel.app/');
        }
        if (get_option(self::CORS_ALLOW_ALL_OPTION) === false) {
            update_option(self::CORS_ALLOW_ALL_OPTION, '0');
        }
    }

    public function add_admin_menu() {
        add_menu_page('Dev-Console Connector', 'Dev-Console', 'manage_options', 'dev-console-connector', [$this, 'create_settings_page_html'], 'dashicons-code-standards', 81);
    }

    private function handle_settings_page_post() {
        if (isset($_POST['dev_console_regenerate_key']) && check_admin_referer('dev_console_regenerate_key_nonce')) {
            $this->init_settings(true);
            echo '<div class="notice notice-success is-dismissible"><p>New Access Key has been generated successfully.</p></div>';
        }
        if (isset($_POST['dev_console_save_settings']) && check_admin_referer('dev_console_save_settings_nonce')) {
            $allow_all = isset($_POST['cors_allow_all']) ? '1' : '0';
            $allowed_origins = isset($_POST['cors_allowed_origins']) ? sanitize_textarea_field($_POST['cors_allowed_origins']) : '';
            
            update_option(self::CORS_ALLOW_ALL_OPTION, $allow_all);
            update_option(self::CORS_ALLOWED_ORIGINS_OPTION, $allowed_origins);
            echo '<div class="notice notice-success is-dismissible"><p>CORS settings saved.</p></div>';
        }
    }

    public function create_settings_page_html() {
        if (!current_user_can('manage_options')) return;
        $this->handle_settings_page_post();
        $access_key = get_option(self::ACCESS_KEY_OPTION);
        $cors_allow_all = get_option(self::CORS_ALLOW_ALL_OPTION, '0');
        $cors_allowed_origins = get_option(self::CORS_ALLOWED_ORIGINS_OPTION, '');
        ?>
        <div class="wrap dev-console-wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <p>Use the following key to connect your site to the Dev-Console application.</p>
            <div class="dc-card">
                <h2>Connection Key</h2>
                <div class="dc-key-field">
                    <label for="access_key">Access Key</label>
                    <div class="dc-input-group">
                        <input type="password" id="access_key" value="<?php echo esc_attr($access_key); ?>" readonly>
                        <button class="button dc-show-hide-btn" type="button">Show</button>
                        <button class="button dc-copy-btn" data-clipboard-target="#access_key">Copy</button>
                    </div>
                </div>
            </div>
            <div class="dc-card">
                <h2>CORS & Security</h2>
                <form method="post" action="">
                    <?php wp_nonce_field('dev_console_save_settings_nonce'); ?>
                    <table class="form-table">
                        <tr>
                            <th scope="row">Allow All Origins</th>
                            <td><label><input name="cors_allow_all" type="checkbox" value="1" <?php checked('1', $cors_allow_all); ?>> Enable access from any origin (<code>*</code>).</label></td>
                        </tr>
                        <tr>
                            <th scope="row"><label for="cors_allowed_origins">Allowed Origins</label></th>
                            <td>
                                <textarea name="cors_allowed_origins" id="cors_allowed_origins" class="large-text" rows="5"><?php echo esc_textarea($cors_allowed_origins); ?></textarea>
                                <p class="description">Enter one URL per line (e.g., https://dev-console.vercel.app).</p>
                            </td>
                        </tr>
                    </table>
                    <input type="hidden" name="dev_console_save_settings" value="1">
                    <?php submit_button('Save CORS Settings'); ?>
                </form>
            </div>
            <div class="dc-card dc-card-danger">
                <h2>Regenerate Access Key</h2>
                <form method="post" action="">
                    <?php wp_nonce_field('dev_console_regenerate_key_nonce'); ?>
                    <input type="hidden" name="dev_console_regenerate_key" value="1">
                    <button type="submit" class="button button-primary" onclick="return confirm('Are you sure? This will break the existing connection.');">Regenerate Key</button>
                </form>
            </div>
            <p class="dc-footer">Dev-Console Connector Version <?php echo esc_html($this->get_plugin_version()); ?></p>
        </div>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                const keyInput = document.getElementById('access_key'), showHideBtn = document.querySelector('.dc-show-hide-btn');
                if(keyInput && showHideBtn) showHideBtn.addEventListener('click', function() { keyInput.type = keyInput.type === 'password' ? 'text' : 'password'; this.textContent = keyInput.type === 'password' ? 'Show' : 'Hide'; });
                if(typeof ClipboardJS==='undefined'){ var s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.8/clipboard.min.js'; s.onload=c; document.head.appendChild(s); } else { c(); }
                function c(){ var b=new ClipboardJS('.dc-copy-btn'); b.on('success', function(e) { e.trigger.textContent='Copied!'; setTimeout(function(){e.trigger.textContent='Copy'},2000); e.clearSelection(); }); }
            });
        </script>
        <?php
    }

    /**
     * Registers REST routes and hooks into the REST API to handle CORS correctly.
     */
    public function register_rest_routes() {
        // Filter 1: Tell WordPress's built-in OPTIONS handler to allow our custom header.
        add_filter('rest_allowed_cors_headers', function ($allowed_headers) {
            $allowed_headers[] = 'X-Access-Key';
            return array_unique($allowed_headers);
        });

        // Filter 2: Add the correct Allow-Origin header to the actual POST response.
        add_filter('rest_post_dispatch', [$this, 'add_cors_headers_to_response'], 10, 3);

        register_rest_route('dev-console/v1', '/execute', [
            'methods'  => 'POST', // WordPress automatically handles the OPTIONS preflight.
            'callback' => [$this, 'handle_rest_request'],
            'permission_callback' => [$this, 'permission_check'],
        ]);
    }
    
    /**
     * Adds the Access-Control-Allow-Origin header to the final response.
     * Hooked into 'rest_post_dispatch'.
     */
    public function add_cors_headers_to_response($result, $server, $request) {
        // Only act on our specific route
        if (strpos($request->get_route(), '/dev-console/v1/execute') === false) {
            return $result;
        }
        $origin = $request->get_header('origin');
        if (!$origin) return $result;

        $allowed_origin = $this->get_allowed_origin($origin);
        if ($allowed_origin) {
            $server->send_header('Access-Control-Allow-Origin', $allowed_origin);
        }
        return $result;
    }

    /**
     * Checks permissions for the REST request (Origin and Access Key).
     * Used as the 'permission_callback' for the route.
     */
    public function permission_check(WP_REST_Request $request) {
        // 1. Check Origin for browser requests
        $origin = $request->get_header('origin');
        if ($origin && !$this->get_allowed_origin($origin)) {
            return new WP_Error('rest_forbidden_origin', 'CORS: Origin not allowed.', ['status' => 403]);
        }
        // 2. Check Access Key
        $access_key = $request->get_header('X-Access-Key');
        if (!$access_key) {
            return new WP_Error('auth_failed', 'Missing X-Access-Key header.', ['status' => 401]);
        }
        if (!hash_equals(get_option(self::ACCESS_KEY_OPTION), $access_key)) {
            return new WP_Error('auth_failed', 'Invalid Access Key.', ['status' => 403]);
        }
        return true;
    }

    /**
     * Main handler for all incoming REST requests.
     */
    public function handle_rest_request(WP_REST_Request $request) {
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
    
    // --- START: Action Methods (No changes below this line, only helper methods) ---
    private function _action_ping($payload) { return ['message' => 'pong', 'connector_version' => $this->get_plugin_version()]; }
    private function _action_list_assets($payload) { if (!function_exists('get_plugins')) { require_once ABSPATH . 'wp-admin/includes/plugin.php'; } if (!function_exists('wp_get_themes')) { require_once ABSPATH . 'wp-admin/includes/theme.php'; } $asset_type = $payload['assetType']; $results = []; if ($asset_type === 'plugin') { foreach (get_plugins() as $path => $details) { $results[] = ['type' => 'plugin', 'name' => $details['Name'], 'identifier' => $path, 'version' => $details['Version'], 'isActive' => is_plugin_active($path)]; } } elseif ($asset_type === 'theme') { $current_theme = get_stylesheet(); foreach (wp_get_themes() as $slug => $theme) { $results[] = ['type' => 'theme', 'name' => $theme->get('Name'), 'identifier' => $slug, 'version' => $theme->get('Version'), 'isActive' => ($slug === $current_theme)]; } } return $results; }
    private function _action_toggle_asset_status($payload) { require_once ABSPATH . 'wp-admin/includes/plugin.php'; $id = sanitize_text_field($payload['assetIdentifier']); if ($payload['assetType'] === 'plugin') { if ((bool)$payload['newStatus']) activate_plugin($id); else deactivate_plugins($id); } elseif ((bool)$payload['newStatus']) { switch_theme($id); } return ['status' => 'ok']; }
    private function _action_delete_asset($payload) { require_once ABSPATH . 'wp-admin/includes/plugin.php'; require_once ABSPATH . 'wp-admin/includes/file.php'; require_once ABSPATH . 'wp-admin/includes/theme.php'; $id = sanitize_text_field($payload['assetIdentifier']); if ($payload['assetType'] === 'plugin') $result = delete_plugins([$id]); else $result = delete_theme($id); if (is_wp_error($result)) throw new Exception($result->get_error_message()); return ['status' => 'deleted']; }
    private function _action_get_asset_files($payload) { $id = sanitize_text_field($payload['assetIdentifier']); $type = $payload['assetType']; $base_path = ''; if ($id === 'root') $base_path = ABSPATH; elseif ($type === 'plugin') $base_path = WP_PLUGIN_DIR . '/' . dirname($id); elseif ($type === 'theme') $base_path = get_theme_root() . '/' . $id; if (empty($base_path) || !is_dir($base_path)) throw new Exception("Asset directory not found."); $base_path = realpath($base_path); if (strpos($base_path, realpath(WP_CONTENT_DIR)) !== 0 && strpos($base_path, realpath(ABSPATH)) !== 0) throw new Exception("Access denied."); $files = []; $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($base_path, RecursiveDirectoryIterator::SKIP_DOTS)); foreach ($iterator as $file) { if ($file->isDir()) continue; $rel_path = str_replace(($id==='root'?realpath(ABSPATH):$base_path) . DIRECTORY_SEPARATOR, '', $file->getRealPath()); $files[] = ['name' => $rel_path]; } return $files; }
    private function _action_read_file_content($payload) { $file_path = $this->get_validated_path($payload); if (!is_readable($file_path)) throw new Exception("File not readable."); return ['content' => file_get_contents($file_path)]; }
    private function _action_write_file_content($payload) { $file_path = $this->get_validated_path($payload); $this->create_file_backup($file_path); if (file_put_contents($file_path, $payload['content']) === false) throw new Exception("Failed to write to file."); return ['status' => 'saved']; }
    private function _action_install_asset($payload) { require_once ABSPATH . 'wp-admin/includes/file.php'; $type = $payload['assetType']; $name = sanitize_file_name($payload['assetName']); $files = $payload['files']; $base_dir = ($type === 'plugin') ? WP_PLUGIN_DIR : get_theme_root(); $asset_dir = $base_dir . '/' . $name; if (!wp_mkdir_p($asset_dir)) throw new Exception("Could not create asset directory."); foreach ($files as $file) { $path_parts = explode('/', $file['name']); $file_name = sanitize_file_name(array_pop($path_parts)); $sub_dir = implode('/', $path_parts); $full_dir = $asset_dir . ($sub_dir ? '/' . $sub_dir : ''); if ($sub_dir && !wp_mkdir_p($full_dir)) throw new Exception("Could not create subdirectory: " . $sub_dir); if (file_put_contents($full_dir . '/' . $file_name, base64_decode($file['content'])) === false) throw new Exception("Failed to write file: " . $file_name); } return ['status' => 'installed']; }
    private function _action_get_db_tables($payload) { global $wpdb; return array_map(function($r){return $r[0];}, $wpdb->get_results("SHOW TABLES", ARRAY_N)); }
    private function _action_execute_safe_db_query($payload) { global $wpdb; $type = $payload['queryType']; $params = $payload['params']; $results = []; switch($type){ case 'get_options': foreach(array_map('sanitize_text_field',$params['optionNames']) as $n){$results[]=['option_name'=>$n,'option_value'=>get_option($n)];} break; case 'list_posts': $q=new WP_Query(['post_type'=>sanitize_text_field($params['postType']??'post'),'posts_per_page'=>(int)($params['limit']??10),'offset'=>(int)($params['offset']??0)]); foreach($q->posts as $p){$results[]=['ID'=>$p->ID,'post_title'=>$p->post_title,'post_status'=>$p->post_status,'post_date'=>$p->post_date];} break; default: throw new Exception("Unsupported safe query.");} return $results; }
    private function _action_run_security_scan($payload) { global $wp_version; $results = []; $results[] = ['id' => 'debug_mode', 'title' => 'WP_DEBUG is Disabled', 'status' => defined('WP_DEBUG')&&WP_DEBUG?'fail':'pass', 'severity' => 'Medium', 'recommendation' => 'Set WP_DEBUG to false in wp-config.php on live sites.']; $results[] = ['id' => 'wp_version', 'title' => 'WordPress Version', 'status' => 'info', 'severity' => 'Info', 'recommendation' => 'Current version is '.$wp_version.'. Keep WordPress updated.']; $results[] = ['id' => 'default_admin', 'title' => 'Default "admin" User', 'status' => get_user_by('login','admin')?'fail':'pass', 'severity' => 'High', 'recommendation' => 'Delete the default "admin" user.']; return $results; }
    private function _action_get_debug_log($payload) { $log_path = WP_CONTENT_DIR . '/debug.log'; if (!is_readable($log_path)) throw new Exception("debug.log not found or not readable."); return ['content' => file_get_contents($log_path)]; }
    private function _action_create_site_backup($payload) { $dir=$this->get_backup_dir();$name='backup-'.date('Y-m-d_H-i-s').'.zip';$path=$dir.'/'.$name;$zip=new ZipArchive();if($zip->open($path,ZipArchive::CREATE)!==TRUE)throw new Exception("Cannot create zip.");$src=realpath(WP_CONTENT_DIR);$files=new RecursiveIteratorIterator(new RecursiveDirectoryIterator($src,RecursiveDirectoryIterator::SKIP_DOTS),RecursiveIteratorIterator::LEAVES_ONLY);foreach($files as $n=>$f){if(!$f->isDir()){$fp=$f->getRealPath();$rp=substr($fp,strlen($src)+1);$zip->addFile($fp,$rp);}}$zip->close();return['status'=>'Backup created','fileName'=>$name,'content'=>base64_encode(file_get_contents($path))]; }
    private function _action_list_site_backups($payload) { $dir=$this->get_backup_dir();$files=array_diff(scandir($dir),['.','..','.htaccess','index.php']);$results=[];foreach($files as $f){if(pathinfo($f,PATHINFO_EXTENSION)==='zip'){$p=$dir.'/'.$f;$results[]=['name'=>$f,'size'=>filesize($p),'date'=>filemtime($p)];}}return $results; }
    private function _action_update_plugin_file($payload) { if($payload['plugin_type']!=='connector')throw new Exception("Action only for connector."); if(!is_writable(__FILE__))throw new Exception("Connector file not writable."); if(file_put_contents(__FILE__,$payload['content'])===false)throw new Exception("Failed to write new content."); return ['status' => 'Connector updated.']; }
    private function _action_get_seo_data($payload) { return ['site_title' => get_option('blogname',''), 'tagline' => get_option('blogdescription',''), 'is_public' => (bool)get_option('blog_public','1')]; }
    private function _action_update_seo_data($payload) { if(isset($payload['site_title']))update_option('blogname',sanitize_text_field($payload['site_title'])); if(isset($payload['tagline']))update_option('blogdescription',sanitize_text_field($payload['tagline'])); if(isset($payload['is_public']))update_option('blog_public',$payload['is_public']?'1':'0'); return ['status' => 'ok']; }

    // --- START: Helper Methods ---
    private function get_allowed_origin($origin) {
        if (get_option(self::CORS_ALLOW_ALL_OPTION, '0') === '1') {
            return '*';
        }
        $allowed_origins_raw = get_option(self::CORS_ALLOWED_ORIGINS_OPTION, '');
        $allowed_origins = array_filter(array_map('trim', explode("\n", $allowed_origins_raw)));
        if (in_array($origin, $allowed_origins)) {
            return $origin;
        }
        return null;
    }
    private function get_validated_path($payload) { $id = sanitize_text_field($payload['assetIdentifier']); $type = $payload['assetType']; $rel_path = $payload['relativePath']; $base_path = ''; if ($id==='root') $base_path = ABSPATH; elseif ($type==='plugin') $base_path = WP_PLUGIN_DIR . '/' . dirname($id); elseif ($type==='theme') $base_path = get_theme_root() . '/' . $id; else throw new Exception("Invalid asset type."); $base_path=realpath($base_path); $safe_parts=[]; foreach(explode('/',$rel_path)as $part){if($part==='..')continue; $safe_parts[]=sanitize_file_name($part);} $safe_rel_path=implode('/',$safe_parts); $full_path=realpath($base_path.'/'.$safe_rel_path); if(!$full_path||strpos($full_path,$base_path)!==0)throw new Exception("Invalid file path."); return $full_path; }
    private function create_file_backup($file_path) { $dir=dirname($file_path).'/.dc_backups'; if(!is_dir($dir))wp_mkdir_p($dir); $backup_file=$dir.'/'.basename($file_path).'.'.time().'.bak'; if(!copy($file_path,$backup_file))error_log('Dev-Console: Failed backup for '.$file_path); }
    private function get_plugin_version() { if(!function_exists('get_plugin_data'))require_once(ABSPATH.'wp-admin/includes/plugin.php'); return get_plugin_data(__FILE__)['Version']; }
    private function get_backup_dir() { $dir=wp_upload_dir()['basedir'].'/dev-console-backups'; if(!is_dir($dir)){wp_mkdir_p($dir);file_put_contents($dir.'/.htaccess','deny from all');file_put_contents($dir.'/index.php','<?php // Silence is golden.');} return $dir; }
    private function get_admin_css() { return ".dev-console-wrap .dc-card{background:#fff;border:1px solid #c3c4c7;border-radius:4px;padding:20px;margin-top:20px}.dev-console-wrap .dc-card h2{margin-top:0}.dev-console-wrap .dc-key-field label{font-weight:700;display:block;margin-bottom:5px}.dev-console-wrap .dc-input-group{display:flex}.dev-console-wrap .dc-input-group input{flex-grow:1;font-family:monospace}.dev-console-wrap .dc-copy-btn,.dev-console-wrap .dc-show-hide-btn{margin-left:5px}.dev-console-wrap .dc-card-danger{border-left:4px solid #d63638}.dev-console-wrap .dc-footer{margin-top:20px;color:#777;font-size:12px}"; }
}

function dev_console_connector_run() { Dev_Console_Connector::get_instance(); }
add_action('plugins_loaded', 'dev_console_connector_run');

function dev_console_connector_activate() { Dev_Console_Connector::get_instance()->activate(); }
register_activation_hook(__FILE__, 'dev_console_connector_activate');
?>
`;