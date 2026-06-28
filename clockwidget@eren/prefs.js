import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class MacStyleClockPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({ title: 'Görünüm Ayarları' });
        page.add(group);
        window.add(page);

        // Hem satır hem switch işlevini bir arada gören modern Adw.SwitchRow kullandık
        const toggleRow = new Adw.SwitchRow({
            title: 'Koyu Tema (Dark Mode)',
            active: this._loadDarkMode()
        });

        // Switch durumunun değişmesini dinleyen sinyal
        toggleRow.connect('notify::active', (widget) => {
            this._saveDarkMode(widget.active);
        });

        group.add(toggleRow);
    }

    _getConfigFile() {
        return Gio.File.new_for_path(
            GLib.build_filenamev([GLib.get_home_dir(), '.config', 'macstyle-clock-position.json'])
        );
    }

    _loadDarkMode() {
        try {
            let [ok, contents] = GLib.file_get_contents(this._getConfigFile().get_path());
            if (ok) {
                let pos = JSON.parse(new TextDecoder().decode(contents));
                return pos.darkMode ?? true;
            }
        } catch (e) {}
        return true;
    }

    _saveDarkMode(isDark) {
        let file = this._getConfigFile();
        let currentData = { x: 200, y: 200, darkMode: true };
        try {
            let [ok, contents] = GLib.file_get_contents(file.get_path());
            if (ok) currentData = JSON.parse(new TextDecoder().decode(contents));
        } catch (e) {}

        currentData.darkMode = isDark;
        GLib.file_set_contents(file.get_path(), JSON.stringify(currentData));
    }
}
