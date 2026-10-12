import { Settings } from "@oh-my-pi/pi-coding-agent";
import { orderedSettings } from "@oh-my-pi/pi-coding-agent/config/all-settings";
import { lookup, type AnySetting } from "@oh-my-pi/pi-coding-agent/config/registry";
import { config } from "../lib/config";

let settingsPromise: Promise<Settings> | undefined;

function getSettings(): Promise<Settings> {
  settingsPromise ??= Settings.loadIsolated({ cwd: config.ompDefaultCwd });
  return settingsPromise;
}

function publicSetting(setting: AnySetting, settings: Settings) {
  const ui = setting.ui;
  const secret = setting.isCredential;
  const value = setting.get(settings);
  return {
    id: setting.id,
    type: setting.type,
    label: ui?.label ?? setting.id,
    description: ui?.description ?? "",
    tab: ui?.tab ?? "internal",
    group: ui?.group ?? "General",
    warning: ui?.warning,
    condition: ui?.condition,
    options: Array.isArray(ui?.options) ? ui.options : undefined,
    runtimeOptions: ui?.options === "runtime",
    enumValues: setting.enumValues,
    defaultValue: secret ? null : setting.default,
    value: secret ? null : value,
    configured: setting.isConfigured(settings),
    hasValue: value !== undefined && value !== null && value !== "",
    secret,
    provenance: setting.provenance(settings),
    envName: setting.envName ?? null,
    envFallback: setting.envFallback ?? false,
  };
}

export async function listOmpSettings() {
  const settings = await getSettings();
  return {
    configPath: settings.getAgentDir(),
    settings: orderedSettings().map((setting) => publicSetting(setting, settings)),
  };
}

export async function updateOmpSetting(id: string, value: unknown) {
  const setting = lookup(id);
  if (!setting) throw new Error(`Unknown OMP setting: ${id}`);
  if (value === undefined) throw new Error("A value is required");
  const settings = await getSettings();
  setting.set(settings, value);
  await settings.flush();
  return publicSetting(setting, settings);
}

export async function resetOmpSetting(id: string) {
  const setting = lookup(id);
  if (!setting) throw new Error(`Unknown OMP setting: ${id}`);
  const settings = await getSettings();
  setting.unset(settings);
  await settings.flush();
  return publicSetting(setting, settings);
}
