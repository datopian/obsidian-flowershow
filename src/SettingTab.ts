import { App, PluginSettingTab } from "obsidian";

import FlowershowPlugin from "../main";
import SettingView from "./SettingView"

export default class FlowershowSettingTab extends PluginSettingTab {
    plugin: FlowershowPlugin;

    constructor(app: App, plugin: FlowershowPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async display(): Promise<void> {
        const { containerEl } = this;
        const settingView = new SettingView(
            containerEl,
            this.plugin.settings,
            async () => await this.plugin.saveData(this.plugin.settings)
        );
        await settingView.initialize();
    }
}
