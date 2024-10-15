<!-- <span style="color: limegreen;">NEW</span> -->
<div id="free_section<?php echo $banner_id ?>" class="simple-banner-settings-section" style="<?php echo $banner_id === '' ? '' : 'display:none;' ?>padding: 0 10px;border: 2px solid #24282e;border-radius: 10px;background-color: #fafafa;">
    <table class="form-table">
        <!-- Hide -->
        <tr valign="top">
            <th scope="row">
                Hide Simple Banner
                <div>This will hide the banner by applying <code>display: none;</code> to the HTML element</div>
            </th>
            <td>
                <!-- -->
                <input type="radio" name="hide_simple_banner<?php echo $banner_id ?>" value="yes" <?php echo ((get_option('hide_simple_banner' . $banner_id) == 'yes') ? 'checked' : '' ); ?>>
                <label for="yes">yes</label>
                <br>
                <input type="radio" name="hide_simple_banner<?php echo $banner_id ?>" value="no" <?php echo ((get_option('hide_simple_banner' . $banner_id) == 'yes') ? '' : 'checked' ); ?>>
                <label for="no">no</label>
                <!-- -->
            </td>
        </tr>
        <!-- Prepend element -->
        <tr valign="top">
            <th scope="row">
                Prepend element
                <div>This inserts the banner HTML at the top of the <code>&#60;body&#62;</code> element or the <code>&#60;header&#62;</code> element. Default is <code>&#60;body&#62;</code>.</div>
            </th>
            <td>
                <!-- -->
                <input type="radio" name="simple_banner_prepend_element<?php echo $banner_id ?>" value="body" <?php echo ((get_option('simple_banner_prepend_element' . $banner_id) == 'header') ? '' : 'checked' ); ?>>
                <label for="body"><code>&#60;body&#62;</code></label>
                <br>
                <input type="radio" name="simple_banner_prepend_element<?php echo $banner_id ?>" value="header" <?php echo ((get_option('simple_banner_prepend_element' . $banner_id) == 'header') ? 'checked' : '' ); ?>>
                <label for="header"><code>&#60;header&#62;</code></label>
                <!-- -->
            </td>
        </tr>
        <!-- Close Button -->
        <tr valign="top">
            <th scope="row">
                Close button enabled
                <div>
                    This feature uses strictly necessary cookies which do not require consent from users per <a href="https://gdpr.eu/cookies/">GDPR</a> guidelines
                </div>
            </th>
            <td>
                <?php
                    $checked = get_option('close_button_enabled' . $banner_id) ? 'checked ' : '';
                    echo '<input type="checkbox" id="close_button_enabled' . $banner_id . '" '. $checked . ' name="close_button_enabled' . $banner_id . '" />';
                ?>
            </td>
        </tr>
        <!-- Close Button -->
        <tr valign="top">
            <th scope="row">
                Close button expiration
                <div>
                    Enter the amount of days until the banner should reappear (e.g. <code>14</code>), fractions of days (e.g. <code>0.5</code>), or the exact day and time (e.g. <code>21 Feb 2022 15:53:22 GMT</code>). Default is 0.
                </div>
            </th>
            <td style="vertical-align:top;">
                <input id="close_button_expiration<?php echo $banner_id ?>" name="close_button_expiration<?php echo $banner_id ?>" style="width:60%;"
                                value="<?php echo esc_attr( get_option('close_button_expiration' . $banner_id) ); ?>" />
            </td>
        </tr>
        <!-- Font Size -->
        <tr valign="top">
            <th scope="row">
                Simple Banner Font Size
                <div>Leaving this blank sets the default to your theme CSS value</div>
            </th>
            <td style="vertical-align:top;">
                <input type="text" id="simple_banner_font_size<?php echo $banner_id ?>" name="simple_banner_font_size<?php echo $banner_id ?>" placeholder="font-size"
                                value="<?php echo esc_attr( get_option('simple_banner_font_size' . $banner_id) ); ?>" />
                <span>e.g. 16px</span>
            </td>
        </tr>
        <!-- Background Color -->
        <tr valign="top">
            <th scope="row">
                Simple Banner Background Color
                <div>Leaving this blank sets the color to the default value <code>#024985</code></div>
            </th>
            <td style="vertical-align:top;">
                <input type="text" id="simple_banner_color<?php echo $banner_id ?>" name="simple_banner_color<?php echo $banner_id ?>" placeholder="Hex value"
                                value="<?php echo esc_attr( get_option('simple_banner_color' . $banner_id) ); ?>" />
                <input style="height: 30px;width: 100px;vertical-align: inherit;" type="color" id="simple_banner_color_show<?php echo $banner_id ?>"
                                value="<?php echo ((get_option('simple_banner_color' . $banner_id) == '') ? '#024985' : esc_attr( get_option('simple_banner_color' . $banner_id) )); ?>">
            </td>
        </tr>
        <!-- Text Color -->
        <tr valign="top">
            <th scope="row">
                Simple Banner Text Color
                <div>Leaving this blank sets the color to the default value <code>white</code></div>
            </th>
            <td style="vertical-align:top;">
                <input type="text" id="simple_banner_text_color<?php echo $banner_id ?>" name="simple_banner_text_color<?php echo $banner_id ?>" placeholder="Hex value"
                                value="<?php echo esc_attr( get_option('simple_banner_text_color' . $banner_id) ); ?>" />
                <input style="height: 30px;width: 100px;vertical-align: inherit;" type="color" id="simple_banner_text_color_show<?php echo $banner_id ?>"
                                value="<?php echo ((get_option('simple_banner_text_color' . $banner_id) == '') ? '#ffffff' : esc_attr( get_option('simple_banner_text_color' . $banner_id) )); ?>">
            </td>
        </tr>
        <!-- Link Color-->
        <tr valign="top">
            <th scope="row">
                Simple Banner Link Color
                <div>Leaving this blank sets the color to the default value <code>#f16521</code></div>
            </th>
            <td style="vertical-align:top;">
                <input type="text" id="simple_banner_link_color<?php echo $banner_id ?>" name="simple_banner_link_color<?php echo $banner_id ?>" placeholder="Hex value"
                                value="<?php echo esc_attr( get_option('simple_banner_link_color' . $banner_id) ); ?>" />
                <input style="height: 30px;width: 100px;vertical-align: inherit;" type="color" id="simple_banner_link_color_show<?php echo $banner_id ?>"
                                value="<?php echo ((get_option('simple_banner_link_color' . $banner_id) == '') ? '#f16521' : esc_attr( get_option('simple_banner_link_color' . $banner_id) )); ?>">
            </td>
        </tr>
        <!-- Close Color-->
        <tr valign="top">
            <th scope="row">
                Simple Banner Close Button Color
                <div>Leaving this blank sets the color to the default value <code>black</code></div>
            </th>
            <td style="vertical-align:top;">
                <input type="text" id="simple_banner_close_color<?php echo $banner_id ?>" name="simple_banner_close_color<?php echo $banner_id ?>" placeholder="Hex value"
                                value="<?php echo esc_attr( get_option('simple_banner_close_color' . $banner_id) ); ?>" />
                <input style="height: 30px;width: 100px;vertical-align: inherit;" type="color" id="simple_banner_close_color_show<?php echo $banner_id ?>"
                                value="<?php echo ((get_option('simple_banner_close_color' . $banner_id) == '') ? 'black' : esc_attr( get_option('simple_banner_close_color' . $banner_id) )); ?>">
            </td>
        </tr>
        <!-- Text Contents -->
        <tr valign="top">
            <th scope="row">
                Simple Banner Text
                <div>Leaving this blank removes the banner</div>
            </th>
                <td>
                    <textarea id="simple_banner_text<?php echo $banner_id ?>" class="large-text code" style="height: 150px;width: 97%;" name="simple_banner_text<?php echo $banner_id ?>"><?php echo esc_textarea(get_option('simple_banner_text' . $banner_id)); ?></textarea>
                </td>
        </tr>
        <!-- Custom CSS -->
        <tr valign="top">
            <th scope="row">
                Simple Banner Custom CSS
            </th>
            <td>
                <span>CSS will be applied directly to the <code>simple-banner<?php echo $banner_id ?></code> class, the <code>simple-banner-scrolling<?php echo $banner_id ?></code> class for styles applied as the page scrolls, the <code>simple-banner-text<?php echo $banner_id ?></code> class for text specific styles, and the <code>simple-banner-button<?php echo $banner_id ?></code> class for close button specific styles.</span>
                <strong style="color:red;">Be very careful, bad CSS can break the banner.</strong>
            </td>
        </tr>
        <tr valign="top">
            <th scope="row">
                <div>.simple-banner<?php echo $banner_id ?> {</div>
                <textarea id="simple_banner_custom_css<?php echo $banner_id ?>" class="code" style="height: 150px;width: 90%;" name="simple_banner_custom_css<?php echo $banner_id ?>"><?php echo esc_textarea(get_option('simple_banner_custom_css' . $banner_id)); ?></textarea>
                <div>}</div>
            </th>
            <td>
                <div style="display:flex">
                    <div style="flex-grow:1;">
                        <div>.simple-banner-scrolling<?php echo $banner_id ?> {</div>
                        <textarea id="simple_banner_scrolling_custom_css<?php echo $banner_id ?>" class="code" style="height: 150px;width: 90%;" name="simple_banner_scrolling_custom_css<?php echo $banner_id ?>"><?php echo esc_textarea(get_option('simple_banner_scrolling_custom_css' . $banner_id)); ?></textarea>
                        <div>}</div>
                    </div>
                    <div style="flex-grow:1;">
                        <div>.simple-banner-text<?php echo $banner_id ?> {</div>
                        <textarea id="simple_banner_text_custom_css<?php echo $banner_id ?>" class="code" style="height: 150px;width: 90%;" name="simple_banner_text_custom_css<?php echo $banner_id ?>"><?php echo esc_textarea(get_option('simple_banner_text_custom_css' . $banner_id)); ?></textarea>
                        <div>}</div>
                    </div>
                    <div style="flex-grow:1;">
                        <div>.simple-banner-button<?php echo $banner_id ?> {</div>
                        <textarea id="simple_banner_button_css<?php echo $banner_id ?>" class="code" style="height: 150px;width: 90%;" name="simple_banner_button_css<?php echo $banner_id ?>"><?php echo esc_textarea(get_option('simple_banner_button_css' . $banner_id)); ?></textarea>
                        <div>}</div>
                    </div>
                </div>
            </td>
        </tr>
        <!-- Position -->
        <tr valign="top">
            <th scope="row">
                Simple Banner Position
                <div>
                    Change the <code>position</code> value of your banner<br>
                    <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/CSS/position">More info</a>
                </div>
            </th>
            <td style="vertical-align:top;">
                <!-- -->
                <input type="radio" name="simple_banner_position<?php echo $banner_id ?>" value="footer" <?php echo ((get_option('simple_banner_position' . $banner_id) == 'footer') ? 'checked' : '' ); ?>>
                <label for="footer"><strong>footer:</strong> <span>The banner is fixed on the bottom of the window. Updates the banner position with the following css attributes <code>position: fixed;bottom: 0;</code></span></label><br>
                <!-- -->
                <input type="radio" name="simple_banner_position<?php echo $banner_id ?>" value="static" <?php echo ((get_option('simple_banner_position' . $banner_id) == 'static') ? 'checked' : '' ); ?>>
                <label for="static"><strong>static:</strong> <span>Default value. Elements render in order, as they appear in the document flow</span></label><br>
                <!-- -->
                <input type="radio" name="simple_banner_position<?php echo $banner_id ?>" value="absolute" <?php echo ((get_option('simple_banner_position' . $banner_id) == 'absolute') ? 'checked' : '' ); ?>>
                <label for="absolute"><strong>absolute:</strong> <span>The element is positioned relative to its first positioned (not static) ancestor element</span></label><br>
                <!-- -->
                <input type="radio" name="simple_banner_position<?php echo $banner_id ?>" value="fixed" <?php echo ((get_option('simple_banner_position' . $banner_id) == 'fixed') ? 'checked' : '' ); ?>>
                <label for="fixed"><strong>fixed:</strong> <span>The element is positioned relative to the browser window</span></label><br>
                <!-- -->
                <input type="radio" name="simple_banner_position<?php echo $banner_id ?>" value="relative" <?php echo ((get_option('simple_banner_position' . $banner_id) == 'relative') ? 'checked' : '' ); ?>>
                <label for="relative"><strong>relative:</strong> <span>The element is positioned relative to its normal position, so <code>left:20px</code> adds 20 pixels to the element's LEFT position</span></label><br>
                <!-- -->
                <input type="radio" name="simple_banner_position<?php echo $banner_id ?>" value="sticky" <?php echo ((get_option('simple_banner_position' . $banner_id) == 'sticky') ? 'checked' : '' ); ?>>
                <label for="sticky"><strong>sticky:</strong> <span>The element is positioned based on the user's scroll position</span></label><br>
                <div style="padding-left: 10px;">
                    A sticky element toggles between relative and fixed, depending on the scroll position.
                    It is positioned relative until a given offset position is met in the viewport - then it "sticks" in place (like position:fixed).<br>
                    <i>Note: Not supported in IE/Edge 15 or earlier. Supported in Safari from version 6.1 with a -webkit- prefix.</i></div>
                <!-- -->
                <input type="radio" name="simple_banner_position<?php echo $banner_id ?>" value="initial" <?php echo ((get_option('simple_banner_position' . $banner_id) == 'initial') ? 'checked' : '' ); ?>>
                <label for="initial"><strong>initial:</strong> <span>Sets this property to its default value.</span></label><br>
                <!-- -->
                <input type="radio" name="simple_banner_position<?php echo $banner_id ?>" value="inherit" <?php echo ((get_option('simple_banner_position' . $banner_id) == 'inherit') ? 'checked' : '' ); ?>>
                <label for="inherit"><strong>inherit:</strong> <span>Inherits this property from its parent element.</span></label><br>
            </td>
        </tr>
        <!-- Header Margin -->
        <tr valign="top">
            <th scope="row">
                Header Top Margin
                <?php 
                    if ($i === 1) {
                        echo '<div>Apply margin to the top of your theme header</div><div style="color:red;">Will be disabled if banner is hidden, disabled, or closed</div>';
                    }
                ?>
            </th>
            <td style="vertical-align:top;">
                <?php 
                    if ($i === 1) {
                        echo '<input type="text" id="header_margin" name="header_margin" placeholder="margin-top" value="'.get_option('header_margin').'" /><span>e.g. 40px</span>';
                    } else {
                        echo '<b>Only available on Banner #1 as multiple header margin values would override each other.</b>';
                    }
                ?>
            </td>
        </tr>
        <!-- Header Padding -->
        <tr valign="top">
            <th scope="row">
                Header Top Padding
                <?php 
                    if ($i === 1) {
                        echo '<div>Apply padding to the top of your theme header</div><div style="color:red;">Will be disabled if banner is hidden, disabled, or closed</div>';
                    }
                ?>
            </th>
            <td style="vertical-align:top;">
                <?php 
                    if ($i === 1) {
                        echo '<input type="text" id="header_padding" name="header_padding" placeholder="padding-top" value="'.get_option('header_padding').'" /><span>e.g. 40px</span>';
                    } else {
                        echo '<b>Only available on Banner #1 as multiple header padding values would override each other.</b>';
                    }
                ?>
            </td>
        </tr>
        <!-- Z-Index -->
        <tr valign="top">
            <th scope="row">
                z-index
                <div>
                    CSS property sets the z-order of the banner
                    <div>Default value <code>99999</code></div>
                    <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/CSS/z-index">More info</a>
                </div>
            </th>
            <td style="vertical-align:top;">
                <input type="number" id="simple_banner_z_index<?php echo $banner_id ?>" name="simple_banner_z_index<?php echo $banner_id ?>" placeholder="z-index"
                                value="<?php echo esc_attr( get_option('simple_banner_z_index' . $banner_id) ); ?>" />
            </td>
        </tr>
        <!-- wp_body_open -->
        <?php if ( function_exists( 'wp_body_open' ) ): ?>
            <tr valign="top">
                <th scope="row">
                    wp_body_open enabled
                    <div>
                        If enabled, will use the <a href="https://developer.wordpress.org/reference/functions/wp_body_open/">wp_body_open</a> action to insert the banner to your site. This can be used to eliminate Cumulative Layout Shift issues. It will also disable the <code>Prepend element</code> and <code>Insert Inside Element</code> setting.
                    </div>
                </th>
                <td>
                    <?php
                        if ($i === 1) {
                            $checked = get_option('wp_body_open_enabled') ? 'checked ' : '';
                            echo '<input type="checkbox" id="wp_body_open_enabled" '. $checked . ' name="wp_body_open_enabled" />';
                        } else {
                            echo '<b>Only available on Banner #1.</b>';
                        }
                    ?>
                </td>
            </tr>
        <?php endif; ?>

    </table>
</div>
