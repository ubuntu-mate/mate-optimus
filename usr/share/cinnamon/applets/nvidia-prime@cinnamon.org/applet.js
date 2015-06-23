const Applet = imports.ui.applet;
const Lang = imports.lang;
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Main = imports.ui.main;
const Util = imports.misc.util;
const PopupMenu = imports.ui.popupMenu;

function MyApplet(metadata, orientation, panel_height, instance_id) {
    this._init(metadata, orientation, panel_height, instance_id);
}

MyApplet.prototype = {
    __proto__: Applet.TextIconApplet.prototype,

    _init: function(metadata, orientation, panel_height, instance_id) {
        Applet.TextIconApplet.prototype._init.call(this, orientation, panel_height, instance_id);
        
        try {
            this.metadata = metadata;
            Main.systrayManager.registerRole("nvidia-prime", metadata.uuid);
            if (GLib.file_test("/usr/bin/nvidia-settings", GLib.FileTest.EXISTS) && GLib.file_test("/usr/bin/prime-select", GLib.FileTest.EXISTS)) {
                if (this._doCommand(["prime-supported"]) == "yes") {
                    let active_gpu = this._doCommand(["prime-select", "query"]);
                    if (active_gpu == "nvidia") {
                        this.set_applet_icon_name("prime-applet-nvidia");
                        this.set_applet_tooltip(_("Active graphics card: NVIDIA"));
                    }
                    else if (active_gpu == "intel") {
                        this.set_applet_icon_name("prime-applet-intel");
                        this.set_applet_tooltip(_("Active graphics card: Intel"));
                    }
                    else {
                        this.set_applet_icon_symbolic_name("dialog-error");
                        this.set_applet_tooltip(_("Active graphics card: " + active_gpu));
                    }           
                }
                else {
                    this.set_applet_icon_symbolic_name("dialog-error");
                    this.set_applet_tooltip(_("NVIDIA prime is not supported by your hardware."));
                }

                this.menuManager = new PopupMenu.PopupMenuManager(this);
                this.menu = new Applet.AppletPopupMenu(this, orientation);
                this.menuManager.addMenu(this.menu);

                this.actor.add_style_class_name('panel-status-button');

                this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
                this.menu.addAction(_("NVIDIA Settings"), Lang.bind(this, function() {
                    Util.spawn(["nvidia-settings", "-page", "PRIME Profiles"]);
                }));
            }
            else {
                this.set_applet_icon_symbolic_name("dialog-error");
                this.set_applet_tooltip(_("The NVIDIA drivers are not properly installed. Please install nvidia-settings and nvidia-prime."));
            }
        }
        catch (e) {
            global.logError(e);
        }
    },

    _doCommand: function(command) {
        [res,pid,fdin,fdout,fderr] = GLib.spawn_async_with_pipes(null, command, null, GLib.SpawnFlags.SEARCH_PATH, null);
        let outstream = new Gio.UnixInputStream({fd:fdout,close_fd:true});
        let stdout = new Gio.DataInputStream({base_stream: outstream});

        let [out, size] = stdout.read_line(null);

        if(out == null) {
            global.logError("nvidia-prime applet: Could not execute " + command);
        }
        else {
            return out.toString();
        }
    },
    
    on_applet_clicked: function(event) {
        this.menu.toggle();
    },

    on_applet_removed_from_panel: function() {
        Main.systrayManager.unregisterRole("nvidia-prime", this.metadata.uuid);
    }
};

function main(metadata, orientation, panel_height, instance_id) {
    let myApplet = new MyApplet(metadata, orientation, panel_height, instance_id);
    return myApplet;
}
