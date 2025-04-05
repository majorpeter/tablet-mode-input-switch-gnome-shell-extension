import GObject from "gi://GObject";
/// @see https://gjs-docs.gnome.org/gio20~2.0/
import Gio from "gi://Gio";

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
 * @param {string} message message to be shown
 * @param {string?} title optional title
 */
function showMessageDialog(message, title) {
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
    _extensionPath;

    /**
     * @param {string} extensionPath absolute path where the extension's files are (use Extension.path)
     */
    constructor(extensionPath) {
      super();
      this._extensionPath = extensionPath;

      const toggle = new TabletModeInputToggle();
      toggle.connect("clicked", () => this.setInputDisabled(toggle.checked));

      this.quickSettingsItems.push(toggle);
    }

    /**
     * @param {bool} disabled
     */
    async setInputDisabled(disabled) {
      try {
        const proc = Gio.Subprocess.new(
          [
            `${this._extensionPath}/util/input-evt-inhibitor`,
            disabled ? "off" : "on",
          ],
          Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_MERGE
        );

        const [stdout] = await proc.communicate_utf8_async(null, null);
        if (!proc.get_successful()) {
          throw stdout;
        }
      } catch (e) {
        if (!(e instanceof String)) {
          e = e.toString();
        }
        showMessageDialog(e, _("Failed to execute subprocess!"));
      }
    }
  }
);

export default class extends Extension {
  enable() {
    this._indicator = new MySystemIndicator(this.path);
    Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicator);
  }

  disable() {
    this._indicator.quickSettingsItems.forEach((item) => item.destroy());
    this._indicator.destroy();
  }
}
