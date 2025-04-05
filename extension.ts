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
    _extensionPath: string;

    /**
     * @param extensionPath absolute path where the extension's files are (use Extension.path)
     */
    constructor(extensionPath: string) {
      super();
      this._extensionPath = extensionPath;

      const toggle = new TabletModeInputToggle();
      toggle.connect("clicked", async () => {
        if (!(await this.setInputDisabled(toggle.checked))) {
          toggle.checked = !toggle.checked;
        }
      });

      this.quickSettingsItems.push(toggle);
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
