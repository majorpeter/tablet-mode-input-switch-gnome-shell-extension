import GObject from "gi://GObject";
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
    setInputDisabled(disabled) {
      const proc = new Gio.Subprocess({
        argv: [
          `${this._extensionPath}/util/input-evt-inhibitor`,
          disabled ? "off" : "on",
        ],
        flags: Gio.SubprocessFlags.NONE,
      });
      proc.init(null);
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
