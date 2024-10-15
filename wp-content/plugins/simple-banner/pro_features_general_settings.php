<!-- <span style="color: limegreen;">NEW</span> -->
<div style="margin-top:10px;padding: 0 10px;border: 2px solid gold;border-radius: 10px;background-color: #fafafa;">

    <h2><span style="padding-right:10px">Pro Features - General Settings</span>
        <?php
            if (!get_option('pro_version_enabled')) {
                echo '<a class="button-primary" href="https://rpetersendev.gumroad.com/l/simple-banner" target="_blank">Purchase Pro License</a>';
            }
        ?>
    </h2>

    <table class="form-table">
        <!-- Permissions -->
        <?php if ( in_array( 'administrator', (array) wp_get_current_user()->roles ) ): ?>
            <tr valign="top">
                <th scope="row">
                    Permissions
                    <div>Allow roles to edit Simple Banner.<br><i>Applies to all banners</i></div>
                </th>
                <td>
                    <div id="simple_banner_pro_permissions">
                        <?php
                            $roles = get_editable_roles();
                            $disabled = !get_option('pro_version_enabled');
                            $permissions_array = get_option('permissions_array');
                            foreach (get_editable_roles() as $role_name => $role_info) {
                                if ($role_name == 'administrator') {
                                    continue;
                                }
                                $allowed = current_user_can( 'manage_simple_banners' );
                                $checkbox = '<input type="checkbox"';
                                $checkbox .= $disabled ? 'disabled ' : '';
                                $checkbox .= (!$disabled && in_array($role_name, explode(",", $permissions_array))) ? 'checked ' : '';
                                $checkbox .= 'value="' . $role_name . '">';
                                $checkbox .= $role_name;
                                $checkbox .= '</input><br>';
                                echo $checkbox;
                            }
                        ?>
                        </dl>
                    </div>
                </td>
            </tr>
        <?php endif; ?>
        <?php
            if (get_option('pro_version_enabled')) {
                echo '<input type="text" hidden id="permissions_array" name="permissions_array" value="'. get_option('permissions_array') . '" />';
            }
        ?>
        <!-- Debug Mode -->
        <tr valign="top">
            <th scope="row">
                Debug Mode
                <div>If enabled, will log all variables in the console of your browser.<br><i>Applies to all banners</i></div>
            </th>
            <td>
                <?php
                    if (get_option('pro_version_enabled')) {
                        $checked = get_option('simple_banner_debug_mode') ? 'checked ' : '';
                        echo '<input type="checkbox" '. $checked . ' name="simple_banner_debug_mode" />';
                    } else {
                        echo '<input type="checkbox" disabled />';
                    }
                ?>
            </td>
        </tr>
    </table>
    <?php
        // Need to set these hidden values in the form so they are not set to null on save
        echo '<input type="text" hidden id="pro_version_enabled" name="pro_version_enabled" value="'. get_option('pro_version_enabled') . '" />';
        echo '<input type="text" hidden id="pro_version_activation_code" name="pro_version_activation_code" value="'. get_option('pro_version_activation_code') . '" />';
    ?>
</div>