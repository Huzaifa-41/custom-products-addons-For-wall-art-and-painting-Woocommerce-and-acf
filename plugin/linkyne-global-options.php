<?php
/**
 * Plugin Name: Linkyne Global Product Options
 * Description: Advanced custom options, Make.com shape matching, live pricing, and multi-slide gallery mockups.
 * Version: 2.0.1
 * Author: Linkyne
 * Author URI: https://linkyne.com/
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

// 1. Enqueue Scripts (Elementor Pro Safe Method)
add_action( 'wp_enqueue_scripts', 'linkyne_global_options_assets' );
function linkyne_global_options_assets() {
    // is_singular('product') forces it to load on Elementor custom templates
    if ( is_product() || is_singular( 'product' ) ) {
        wp_enqueue_style( 'linkyne-options-css', plugin_dir_url( __FILE__ ) . 'assets/css/linkyne-options.css', array(), '2.0.0' );
        wp_enqueue_script( 'linkyne-options-js', plugin_dir_url( __FILE__ ) . 'assets/js/linkyne-options.js', array( 'jquery' ), '2.0.0', true );
    }
}

// ==========================================
// SHORTCODE 1: THE STANDALONE GALLERY
// ==========================================
add_shortcode( 'linkyne_gallery', 'linkyne_render_gallery_shortcode' );
function linkyne_render_gallery_shortcode() {
    $product = wc_get_product( get_the_ID() );
    if ( ! $product ) return 'Please view on a product page.';
    
    $base_image_url = wp_get_attachment_image_url( $product->get_image_id(), 'full' );
    if ( ! $base_image_url ) return '';

    ob_start();
    // This creates a safe, isolated box for our CSS Sandwich
    echo '<div id="linkyne-standalone-gallery" data-base-image="' . esc_url($base_image_url) . '">';
    echo '<div class="linkyne-sandwich-wrapper default-view">';
    echo '<img class="linkyne-base-art default-art" src="' . esc_url($base_image_url) . '" style="position:relative; width:100%; height:auto; object-fit:contain;">';
    echo '</div>';
    echo '</div>';
    return ob_get_clean();
}

// ==========================================
// SHORTCODE 2: OPTIONS, PRICE & ADD TO CART
// ==========================================
add_shortcode( 'linkyne_options', 'linkyne_render_options_shortcode' );
function linkyne_render_options_shortcode() {
    $product = wc_get_product( get_the_ID() );
    if ( ! $product ) return 'Please view on a product page.'; 
    
    $product_tags = wp_get_post_terms( $product->get_id(), 'product_tag', array('fields' => 'names') );
    if ( is_wp_error( $product_tags ) ) { $product_tags = array(); }
    $base_price = $product->get_price() ? (float) $product->get_price() : 0;

    ob_start();
    
    echo '<form class="cart linkyne-custom-cart-form" action="' . esc_url( apply_filters( 'woocommerce_add_to_cart_form_action', $product->get_permalink() ) ) . '" method="post" enctype="multipart/form-data">';
    echo '<div class="linkyne-global-options-wrapper" data-base-price="' . esc_attr($base_price) . '">';
    
    if( function_exists('have_rows') && have_rows('linkyne_option_groups', 'option') ):
        while( have_rows('linkyne_option_groups', 'option') ) : the_row();
            
            $group_name     = get_sub_field('group_name');
            $target_tag     = get_sub_field('target_product_tag');
            $condition      = get_sub_field('conditional_parent_value');
            $display_type   = get_sub_field('display_type') ? get_sub_field('display_type') : 'button';
            $hide_labels    = get_sub_field('hide_image_labels'); // Grab the new ACF checkbox

            if ( !empty($target_tag) && !in_array($target_tag, $product_tags) ) { continue; }
            
            echo '<div class="linkyne-option-group" data-group="' . esc_attr($group_name) . '" data-condition="' . esc_attr($condition) . '">';
            
            // Output Title + Blank Span for JS to inject the name
            echo '<h4>' . esc_html($group_name);
            if ( $display_type === 'image' && $hide_labels ) {
                echo '<span class="linkyne-dynamic-title-append"></span>';
            }
            echo '</h4>';

            echo '<input type="hidden" name="linkyne_options[' . esc_attr($group_name) . ']" class="linkyne-hidden-selection" value="">';
            echo '<input type="hidden" name="linkyne_prices[' . esc_attr($group_name) . ']" class="linkyne-hidden-price" value="0">';
            
            // Add a special class if labels are hidden
            $hide_class = ($display_type === 'image' && $hide_labels) ? ' hide-labels-mode' : '';
            echo '<div class="linkyne-swatches-wrapper type-' . esc_attr($display_type) . $hide_class . '">';
            
            if( have_rows('group_options') ):
                while( have_rows('group_options') ) : the_row();
                    
                    $option_name = get_sub_field('option_name');
                    $price_type  = get_sub_field('price_type');
                    $price_val   = get_sub_field('price_value') ? get_sub_field('price_value') : 0;
                    $swatch_img  = get_sub_field('swatch_image'); 
                    
                    $gallery_data = array();
                    if( have_rows('gallery_images') ):
                        while( have_rows('gallery_images') ) : the_row();
                            $gallery_data[] = array(
                                'type'   => get_sub_field('image_type'),
                                'url'    => get_sub_field('media_file'),
                                'top'    => get_sub_field('sandwich_top'),
                                'left'   => get_sub_field('sandwich_left'),
                                'width'  => get_sub_field('sandwich_width'),
                                'height' => get_sub_field('sandwich_height')
                            );
                        endwhile;
                    endif;

                    echo '<div class="linkyne-swatch swatch-' . esc_attr($display_type) . '" 
                               data-value="' . esc_attr($option_name) . '" 
                               data-price-type="' . esc_attr($price_type) . '" 
                               data-price-val="' . esc_attr($price_val) . '"
                               data-gallery=\'' . htmlspecialchars(wp_json_encode($gallery_data), ENT_QUOTES, 'UTF-8') . '\'>';
                    
                    if ( $display_type === 'image' && $swatch_img ) { echo '<img src="' . esc_url($swatch_img) . '">'; }
                    
                    // We print the label in the HTML, but CSS will hide it if the checkbox was checked
                    echo '<span class="swatch-label">' . esc_html($option_name) . '</span>';
                    echo '</div>';

                endwhile;
            endif;
            echo '</div></div>';
        endwhile;
    endif;

    // --- REPLACE EVERYTHING AT THE BOTTOM WITH THIS ---
    
    // Create the Flexbox row wrapper
    echo '<div class="linkyne-action-row">';
    
    // The Price (Removed "Total:" and inline styles)
    echo '<div class="linkyne-live-price-wrapper"><span class="linkyne-live-total">' . wc_price( $product->get_price() ) . '</span></div>';
    
    // The Button (Added custom class, removed inline width)
    echo '<input type="hidden" name="add-to-cart" value="' . absint( $product->get_id() ) . '" />';
    echo '<button type="submit" class="single_add_to_cart_button button alt linkyne-cart-btn">Add To Cart</button>';
    
    echo '</div>'; // End action row
    
    echo '</div>'; // End global options wrapper
    echo '</form>';

    return ob_get_clean();
}

// 3. Cart & Order Logic (Unchanged - Keeps data flowing to Checkout)
add_filter( 'woocommerce_add_cart_item_data', 'linkyne_add_custom_options_to_cart', 10, 3 );
function linkyne_add_custom_options_to_cart( $cart_item_data, $product_id, $variation_id ) {
    if ( isset( $_POST['linkyne_options'] ) ) {
        $cart_item_data['linkyne_custom_options'] = sanitize_post( $_POST['linkyne_options'] );
        $cart_item_data['linkyne_custom_prices'] = sanitize_post( $_POST['linkyne_prices'] );
        
        $product = wc_get_product( $product_id );
        $base_price = (float) $product->get_price();
        $extra_cost = 0;
        foreach ( $_POST['linkyne_prices'] as $price ) { $extra_cost += (float) $price; }
        $cart_item_data['linkyne_final_price'] = $base_price + $extra_cost;
    }
    return $cart_item_data;
}

add_action( 'woocommerce_before_calculate_totals', 'linkyne_update_cart_prices', 10, 1 );
function linkyne_update_cart_prices( $cart_obj ) {
    if ( is_admin() && ! defined( 'DOING_AJAX' ) ) return;
    foreach ( $cart_obj->get_cart() as $key => $value ) {
        if ( isset( $value['linkyne_final_price'] ) ) { $value['data']->set_price( $value['linkyne_final_price'] ); }
    }
}

add_filter( 'woocommerce_get_item_data', 'linkyne_display_cart_options', 10, 2 );
function linkyne_display_cart_options( $item_data, $cart_item ) {
    if ( isset( $cart_item['linkyne_custom_options'] ) ) {
        foreach ( $cart_item['linkyne_custom_options'] as $group_name => $selected_value ) {
            if ( ! empty( $selected_value ) ) {
                $item_data[] = array( 'key' => sanitize_text_field( $group_name ), 'value' => sanitize_text_field( $selected_value ) );
            }
        }
    }
    return $item_data;
}

add_action( 'woocommerce_checkout_create_order_line_item', 'linkyne_save_order_options', 10, 4 );
function linkyne_save_order_options( $item, $cart_item_key, $values, $order ) {
    if ( isset( $values['linkyne_custom_options'] ) ) {
        foreach ( $values['linkyne_custom_options'] as $group_name => $selected_value ) {
            if ( ! empty( $selected_value ) ) {
                $item->add_meta_data( sanitize_text_field( $group_name ), sanitize_text_field( $selected_value ) );
            }
        }
    }
}
