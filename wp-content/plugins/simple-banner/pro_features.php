<!-- <span style="color: limegreen;">NEW</span> -->
<div id="pro_section<?php echo $banner_id ?>" class="simple-banner-settings-section" style="<?php echo $banner_id === '' ? '' : 'display:none;' ?>padding: 0 10px;border: 2px solid gold;border-radius: 10px;background-color: #fafafa;">

    <h2><span style="padding-right:10px">Pro Features</span>
        <?php
            if (!get_option('pro_version_enabled')) {
                echo '<a class="button-primary" href="https://rpetersendev.gumroad.com/l/simple-banner" target="_blank">Purchase Pro License</a>';
            }
        ?>
    </h2>

    <table class="form-table">
        <!-- Activation Code -->
        <tr valign="top" style="<?php if (get_option('pro_version_enabled')) { echo 'display: none;'; } ?>">
            <th scope="row">
                License key
            </th>
            <td>
                <input type="text" style="border: 2px solid gold;border-radius: 5px;width:60%;" id="simple_banner_pro_license_key" name="simple_banner_pro_license_key" value="<?php echo esc_attr(get_option('simple_banner_pro_license_key')); ?>" />
            </td>
        </tr>
        <!-- Insert After Element -->
        <tr valign="top">
            <th scope="row">
                Insert Inside Element
                <div>
                    Insert the banner inside a specific element on your page.
                    (e.g. <code>header</code> for the header element or <code>#main-navigation</code> for an id attribute). This will override the <code>Prepend element</code> setting.
                </div>
            </th>
            <td style="vertical-align:top;">
                <?php
                    if (get_option('pro_version_enabled')) {
                        echo '<input name="simple_banner_insert_inside_element' . $banner_id . '" style="width:60%;" value="'. esc_attr(get_option('simple_banner_insert_inside_element' . $banner_id)) . '" />';
                        echo '<div>
                            <strong>
                                Note: This feature uses <code>document.querySelector()</code> and will select the first element match.
                                It will also accept combinations of CSS selectors. More information <a target="_blank" href="https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors">here</a>.
                            </strong>
                        </div>';
                    } else {
                        echo '<input style="width:60%;" disabled />';
                    }
                ?>
            </td>
        </tr>
        <!-- Start After Date -->
        <tr valign="top">
            <th scope="row">
                Start After Date
                <div>
                    This can start showing the banner after a given date. Use UTC time to avoid daylight savings time issues (e.g. <code>21 Feb 2022 15:53:22 UTC</code>).
                </div>
            </th>
            <td style="vertical-align:top;">
                <?php
                    if (get_option('pro_version_enabled')) {
                        echo '<input name="simple_banner_start_after_date' . $banner_id . '" style="width:60%;" value="'. esc_attr(get_option('simple_banner_start_after_date' . $banner_id)) . '" />';
                    } else {
                        echo '<input style="width:60%;" disabled />';
                    }
                ?>
            </td>
        </tr>
        <!-- Remove After Date -->
        <tr valign="top">
            <th scope="row">
                Remove After Date
                <div>
                    This can stop showing the banner after a given date. Use UTC time to avoid daylight savings time issues (e.g. <code>21 Feb 2022 15:53:22 UTC</code>).
                </div>
            </th>
            <td style="vertical-align:top;">
                <?php
                    if (get_option('pro_version_enabled')) {
                        echo '<input name="simple_banner_remove_after_date' . $banner_id . '" style="width:60%;" value="'. esc_attr(get_option('simple_banner_remove_after_date' . $banner_id)) . '" />';
                    } else {
                        echo '<input style="width:60%;" disabled />';
                    }
                ?>
            </td>
        </tr>
        <!-- Disabled on Posts -->
        <tr valign="top">
            <th scope="row">
                Disabled on Posts
                <div>
                    Disable Simple Banner on all posts.
                </div>
            </th>
            <td style="padding-top:0;">
                <?php
                    if (get_option('pro_version_enabled')) {
                        $checked = get_option('disabled_on_posts' . $banner_id) ? 'checked ' : '';
                        echo '<input type="checkbox" '. $checked . ' name="disabled_on_posts' . $banner_id . '" />';
                    } else {
                        echo '<input type="checkbox" disabled />';
                    }
                ?>
            </td>
        </tr>
        <!-- Disable Page Paths -->
        <tr valign="top">
            <th scope="row">
                Disable Page Paths
                <div>
                    Disable Simple Banner on pages by path, comma separated. Paths match <code>window.location.pathname</code>. Use wildcard <code>*</code> to match multiple paths. e.g.
                    <li>
                        disable on www.test.com/shop and www.test.com/cart: <code>/shop,/cart</code>
                    </li>
                    <li>
                        disable on all www.test.com/shop paths: <code>/shop*</code>
                    </li>
                    <li>
                        disable on paths ending with /shop: <code>*/shop</code>
                    </li>
                    <li>
                        disable on paths containing shop: <code>*shop*</code>
                    </li>
                </div>

            </th>
            <td style="vertical-align:top;">
                <?php
                    if (get_option('pro_version_enabled')) {
                        echo '<input name="simple_banner_disabled_page_paths' . $banner_id . '" style="width:60%;" value="'. esc_attr(get_option('simple_banner_disabled_page_paths' . $banner_id)) . '" />';
                    } else {
                        echo '<input style="width:60%;" disabled />';
                    }
                ?>
            </td>
        </tr>
        <!-- Disabled Pages -->
        <tr valign="top">
            <th scope="row">
                Disabled Pages
                <div>Disable Simple Banner on the following pages.</div>
            </th>
            <td>
                <div id="simple_banner_pro_disabled_pages<?php echo $banner_id ?>">
                    <?php
                        $disabled = !get_option('pro_version_enabled');
                        $disabled_pages_array = array_filter(explode(',', get_option('disabled_pages_array' . $banner_id)));
                        $frontpage_id = get_option( 'page_on_front' ); // page_on_front returns 0 if value hasn't been set
                        if ($frontpage_id == 0) {
                            $frontpage_id = 1;
                        }
                        $parent_checkbox = '<input type="checkbox" ';
                        $parent_checkbox .= $disabled ? 'disabled ' : '';
                        $parent_checkbox .= (!$disabled && in_array($frontpage_id, $disabled_pages_array)) ? 'checked ' : '';
                        $parent_checkbox .= 'value="' . $frontpage_id . '">';
                        $parent_checkbox .= get_option( 'blogname' ) . ' | ' . get_site_url() . ' ';
                        $parent_checkbox .= '</input><br>';
                        echo $parent_checkbox;

                        $pages = get_pages(array(
                            'exclude' => array($frontpage_id) // exclude frontpage_id
                        ));
                        foreach ( $pages as $page ) {
                            $checkbox = '<input type="checkbox"';
                            $checkbox .= $disabled ? 'disabled ' : '';
                            $checkbox .= (!$disabled && in_array($page->ID, $disabled_pages_array)) ? 'checked ' : '';
                            $checkbox .= 'value="' . $page->ID . '">';
                            $checkbox .= $page->post_title . ' | ' . get_page_link( $page->ID ) . ' ';
                            $checkbox .= '</input><br>';
                            echo $checkbox;
                        }
                    ?>
                </div>
            </td>
        </tr>
        <!-- Website Custom CSS -->
        <tr valign="top">
            <th scope="row">
                Website Custom CSS
                <div>CSS will be applied to the entire website</div>
            </th>
            <td>
                <?php
                    if (get_option('pro_version_enabled')) {
                        echo '<textarea style="height: 150px;width: 75%;" name="site_custom_css' . $banner_id . '">'. esc_textarea(get_option('site_custom_css' . $banner_id)) . '</textarea>';
                    } else {
                        echo '<textarea style="height: 150px;width: 75%;" disabled></textarea>';
                    }
                ?>
            </td>
        </tr>
        <tr valign="top">
            <th scope="row" style="padding-top:0;">
                Keep CSS if banner is hidden, disabled, or closed?
            </th>
            <td style="padding-top:0;">
                <?php
                    if (get_option('pro_version_enabled')) {
                        $checked = get_option('keep_site_custom_css' . $banner_id) ? 'checked ' : '';
                        echo '<input type="checkbox" '. $checked . ' name="keep_site_custom_css' . $banner_id . '" />';
                    } else {
                        echo '<input type="checkbox" disabled />';
                    }
                ?>
            </td>
        </tr>
        <!-- Website Custom JS -->
        <tr valign="top">
            <th scope="row">
                Website Custom JS
                <div>JavaScript will be applied to the entire website</div>
            </th>
            <td>
                <?php
                    if (get_option('pro_version_enabled')) {
                        echo '<textarea style="height: 150px;width: 75%;" name="site_custom_js' . $banner_id . '">'. esc_textarea(get_option('site_custom_js' . $banner_id)) . '</textarea>';
                    } else {
                        echo '<textarea style="height: 150px;width: 75%;" disabled></textarea>';
                    }
                ?>
            </td>
        </tr>
        <tr valign="top">
            <th scope="row" style="padding-top:0;">
                Keep JS if banner is hidden, disabled, or closed?
            </th>
            <td style="padding-top:0;">
                <?php
                    if (get_option('pro_version_enabled')) {
                        $checked = get_option('keep_site_custom_js' . $banner_id) ? 'checked ' : '';
                        echo '<input type="checkbox" '. $checked . ' name="keep_site_custom_js' . $banner_id . '" />';
                    } else {
                        echo '<input type="checkbox" disabled />';
                    }
                ?>
            </td>
        </tr>
    </table>
    <?php
        if (get_option('pro_version_enabled')) {
            echo '<input type="text" hidden id="disabled_pages_array' . $banner_id . '" name="disabled_pages_array' . $banner_id . '" value="'. get_option('disabled_pages_array' . $banner_id) . '" />';
        }
    ?>
</div>
