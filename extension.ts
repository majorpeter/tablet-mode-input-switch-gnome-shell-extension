import GObject from "gi://GObject";
import Gio from "gi://Gio";
import GLib from "gi://GLib";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import {
  QuickToggle,
  SystemIndicator,
} from "resource:///org/gnome/shell/ui/quickSettings.js";
import * as Dialog from "resource:///org/gnome/shell/ui/dialog.js";
import * as ModalDialog from "resource:///org/gnome/shell/ui/modalDialog.js";

/// @see https://gjs.guide/guides/gio/subprocesses.html#promise-wrappers
Gio._promisify(Gio.Subprocess.prototype, "communicate_utf8_async");

/**
 * Shows a message box modal dialog
 * @param message message to be shown
 * @param title optional title
 */
function showMessageDialog(message: string, title?: string) {
  const dialog = new ModalDialog.ModalDialog({
    destroyOnClose: false,
    styleClass: "my-dialog",
  });

  const messageLayout = new Dialog.MessageDialogContent({
    title: title ?? "Message",
    description: message,
  });
  dialog.contentLayout.add_child(messageLayout);

  dialog.setButtons([
    {
      label: "Ok",
      action: () => dialog.destroy(),
    },
  ]);
  dialog.open();
}

const TabletModeInputToggle = GObject.registerClass(
  class TabletModeInputToggle extends QuickToggle {
    constructor() {
      super({
        title: _("Tablet mode"),
        iconName: "pda-symbolic",
        toggleMode: true,
      });
    }
  }
);

const MySystemIndicator = GObject.registerClass(
  class MySystemIndicator extends SystemIndicator {
    static gsettingsOskEnableSchema = "org.gnome.desktop.a11y.applications";
    static gsettingsOskEnableKey = "screen-keyboard-enabled";

    _toggle = new TabletModeInputToggle();
    _extensionPath: string;
    _settings: Gio.Settings;
    _settingsChangeHandlerId: number;

    /**
     * @param extensionPath absolute path where the extension's files are (use Extension.path)
     */
    constructor(extensionPath: string) {
      super();
      this._extensionPath = extensionPath;

      this._toggle.connect("clicked", async () => {
        if (!(await this.setInputDisabled(this._toggle.checked))) {
          this._toggle.checked = !this._toggle.checked;
          return;
        }
        this.setOnScreenKeyboardEnabled(this._toggle.checked);
      });

      this.quickSettingsItems.push(this._toggle);

      this._settings = new Gio.Settings({
        schema: MySystemIndicator.gsettingsOskEnableSchema,
      });
      this._settingsChangeHandlerId = this._settings.connect(
        "changed",
        (settings, key) => {
          // re-enable on-screen keyboard if it was disabled while 'tablet mode' is on
          if (key == MySystemIndicator.gsettingsOskEnableKey) {
            const oskEnabled = settings.get_boolean(key);
            if (this._toggle.checked && !oskEnabled) {
              settings.set_boolean(
                MySystemIndicator.gsettingsOskEnableKey,
                true
              );
            }
          }
        }
      );
    }

    destroy() {
      this._settings.disconnect(this._settingsChangeHandlerId);
    }

    async setInputDisabled(disabled: boolean) {
      try {
        /// @note new Gio.Subprocess({argv: [], flags: ...}) does not work
        const proc = Gio.Subprocess.new(
          [
            `${this._extensionPath}/input-evt-inhibitor`,
            disabled ? "off" : "on",
          ],
          Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_MERGE
        );

        const [stdout] = await proc.communicate_utf8_async(null, null);
        if (!proc.get_successful()) {
          throw stdout;
        }
      } catch (e) {
        let message: string;
        if (e instanceof Error || e instanceof GLib.SpawnError) {
          message = e.toString();
        } else if (typeof e == "string") {
          message = e as string;
        } else {
          console.error(e);
          message = "Unknown error, check logs!";
        }
        showMessageDialog(message, _("Failed to execute subprocess!"));
        return false;
      }

      return true;
    }

    /**
     * @note same as the following command:
     *       gsettings set org.gnome.desktop.a11y.applications screen-keyboard-enabled true/false
     */
    setOnScreenKeyboardEnabled(enabled: boolean) {
      this._settings.set_boolean(
        MySystemIndicator.gsettingsOskEnableKey,
        enabled
      );
    }
  }
);

export default class extends Extension {
  _indicator?: SystemIndicator;

  enable() {
    this._indicator = new MySystemIndicator(this.path);
    Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
  }

  disable() {
    if (this._indicator) {
      this._indicator.quickSettingsItems.forEach((item) => item.destroy());
      this._indicator.destroy();
    }
  }
}
