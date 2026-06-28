import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const ClockWidget = GObject.registerClass(
class ClockWidget extends St.BoxLayout {
    _init() {
        super._init({
            style_class: 'clock-container',
            reactive: true,
            can_focus: true,
            track_hover: true
        });

        this._configFile = Gio.File.new_for_path(
            GLib.build_filenamev([GLib.get_home_dir(), '.config', 'macstyle-clock-position.json'])
        );

        this._label = new St.Label({
            style_class: 'desktop-clock',
            text: this._getTime()
        });

        this._label.clutter_text.set_ellipsize(Pango.EllipsizeMode.NONE);
        this._label.clutter_text.set_line_wrap(false);
        this._label.clutter_text.set_single_line_mode(true);

        this.add_child(this._label);

        this._enableDrag();
        this._startTimer();
        
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            let [x, y, isDark] = this._loadPosition();
            this.set_position(x, y);
            this._updateTheme(isDark);
            return GLib.SOURCE_REMOVE;
        });
    }

    _getTime() {
        return GLib.DateTime.new_now_local().format("%H:%M");
    }

    _startTimer() {
        this._timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            this._label.set_text(this._getTime());
            
            // Kullanıcı ayarlardan temayı değiştirirse anlık yansıması için kontrol
            let [,, isDark] = this._loadPosition();
            this._updateTheme(isDark);
            
            return true;
        });
    }

    _updateTheme(isDark) {
        if (isDark) {
            this.remove_style_class_name('light-mode');
            this.add_style_class_name('dark-mode');
        } else {
            this.remove_style_class_name('dark-mode');
            this.add_style_class_name('light-mode');
        }
    }

    _enableDrag() {
        this._dragging = false;
        
        this.connect('button-press-event', (actor, event) => {
            this._dragging = true;
            let [x, y] = event.get_coords();
            let [ax, ay] = this.get_position();
            this._offset = [x - ax, y - ay];
            return Clutter.EVENT_STOP;
        });

        this.connect('motion-event', (actor, event) => {
            if (!this._dragging) return Clutter.EVENT_PROPAGATE;
            let [x, y] = event.get_coords();
            this.set_position(x - this._offset[0], y - this._offset[1]);
            return Clutter.EVENT_STOP;
        });

        this.connect('button-release-event', () => {
            if (this._dragging) {
                this._dragging = false;
                this._savePosition();
            }
            return Clutter.EVENT_STOP;
        });
    }

    _savePosition() {
        let [x, y, isDark] = this._loadPosition();
        let currentX = Math.round(this.get_position()[0]);
        let currentY = Math.round(this.get_position()[1]);
        
        let data = JSON.stringify({ x: currentX, y: currentY, darkMode: isDark });
        try {
            GLib.file_set_contents(this._configFile.get_path(), data);
        } catch (e) {
            console.error(`Saat pozisyonu kaydedilemedi: ${e.message}`);
        }
    }

    _loadPosition() {
        try {
            let [ok, contents] = GLib.file_get_contents(this._configFile.get_path());
            if (ok) {
                let pos = JSON.parse(new TextDecoder().decode(contents));
                return [pos.x ?? 200, pos.y ?? 200, pos.darkMode ?? true];
            }
        } catch (e) {}
        return [200, 200, true];
    }

    destroy() {
        if (this._timeout) {
            GLib.source_remove(this._timeout);
            this._timeout = null;
        }
        super.destroy();
    }
});

export default class MacStyleClockExtension extends Extension {
    enable() {
        this._clockWidget = new ClockWidget();
        
        if (Main.layoutManager._backgroundGroup) {
            Main.layoutManager._backgroundGroup.add_child(this._clockWidget);
        } else {
            Main.layoutManager.uiGroup.insert_child_at_index(this._clockWidget, 0);
        }
    }

    disable() {
        if (this._clockWidget) {
            if (Main.layoutManager._backgroundGroup) {
                Main.layoutManager._backgroundGroup.remove_child(this._clockWidget);
            } else {
                Main.layoutManager.uiGroup.remove_child(this._clockWidget);
            }
            this._clockWidget.destroy();
            this._clockWidget = null;
        }
    }
}
