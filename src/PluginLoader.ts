import * as fs from 'fs';
import * as path from 'path';
import { IEventRegistrar, IPlugin } from './IPlugin';
import { Logger } from './Logger';

export class PluginLoader {
    private registrar: IEventRegistrar;

    constructor(registrar: IEventRegistrar) {
        this.registrar = registrar;
    }

    async loadAll(pluginsDir: string): Promise<void> {
        if (!fs.existsSync(pluginsDir)) {
            Logger.warn(`Plugins directory not found: ${pluginsDir}`);
            return;
        }

        const entries = await fs.promises.readdir(pluginsDir, {
            withFileTypes: true
        });
        const dirs = entries.filter((e) => e.isDirectory());

        for (const dir of dirs) {
            await this.loadPlugin(path.join(pluginsDir, dir.name));
        }
    }

    private async loadPlugin(pluginDir: string): Promise<void> {
        const pluginPath = path.join(pluginDir, 'plugin.js');
        if (!fs.existsSync(pluginPath)) {
            Logger.warn(`No plugin.js found at ${pluginPath}, skipping`);
            return;
        }
        try {
            const mod = await import(pluginPath);
            const PluginClass = mod.default;
            const plugin: IPlugin = new PluginClass();
            await plugin.initialize(this.registrar);
            Logger.info(
                `Loaded plugin: ${plugin.name} v${plugin.version} — ${plugin.description}`
            );
        } catch (err) {
            Logger.error(`Failed to load plugin from ${pluginPath}: ${err}`);
        }
    }
}
