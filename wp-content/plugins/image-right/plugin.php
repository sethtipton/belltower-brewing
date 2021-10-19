<?php
/**
 * Plugin Name: Image Right
 * Author: Seth Tipton
 * Version: 1.0.0
 */
  
function loadMyBlock() {
  wp_enqueue_script(
    'my-new-block',
    plugin_dir_url(__FILE__) . 'image-right.js',
    array('wp-blocks','wp-editor'),
    true
  );
}
   
add_action('enqueue_block_editor_assets', 'loadMyBlock');