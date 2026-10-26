import type { Document, Feature } from './types';
import type { Id } from '../sketch/types';
import { dimensionTable, setDimensionValues } from './equations';

/**
 * Configurations (Configurations panel), by design: a part or assembly has at least the
 * "Default" configuration; every configuration stores its own dimension values ("D1@Sketch1")
 * and which features are suppressed. The document always holds the values of the ACTIVE
 * configuration; switching captures the current values into the old configuration and applies
 * the new one (Modify Configurations table, Configure Dimension / Configure Feature).
 */
export interface Configuration {
  id: Id;
  name: string;
  description?: string;
  comment?: string;
  /** dimension values by name; a missing name keeps the value of the active configuration */
  dims: Record<string, number>;
  /** ids of the features suppressed in this configuration */
  suppressed: Id[];
  /** derived configuration: the parent it starts from */
  parentId?: Id;
  /** Description ▸ Use in bill of materials (default on) */
  descriptionInBom?: boolean;
  /** Bill of Materials Options: the part number shown (Document Name / Configuration Name / User Specified Name) */
  bomName?: 'document' | 'configuration' | 'user';
  bomUserName?: string;
  /** used as a sub-assembly: the BOM lists only the sub-assembly, not its components */
  hideChildrenInBom?: boolean;
  /** Advanced Options ▸ Suppress new features and mates (default on): features added in another configuration are suppressed here */
  suppressNew?: boolean;
  /** the features that existed when this configuration was last shown (new ones are not in it) */
  known?: Id[];
  /** Use configuration specific color */
  color?: string;
  /** Material ▸ Config…: a material for this configuration only */
  material?: { name: string; density: number; color: string };
}

/** BOM part number of a part in a configuration (Bill of Materials Options) */
export function bomPartNumber(part: Document, cfgName?: string): string {
  const cfg = configurationByName(part, cfgName) ?? activeConfiguration(part);
  if (cfg.bomName === 'configuration') return cfg.name;
  if (cfg.bomName === 'user' && cfg.bomUserName) return cfg.bomUserName;
  return part.name;
}

/** BOM description of a part in a configuration: the configuration description when Use in bill of materials is on */
export function bomDescription(part: Document, cfgName?: string): string {
  const cfg = configurationByName(part, cfgName) ?? activeConfiguration(part);
  if (cfg.description && cfg.descriptionInBom !== false) return cfg.description;
  return String(part.properties?.Description ?? (cfg.name !== 'Default' ? cfg.name : ''));
}

export const DEFAULT_CONFIGURATION_ID = 'cfg-default';

let seq = 0;
const cfgId = () => 'cfg-' + Date.now().toString(36) + (seq++).toString(36);

/** All configurations; a document without any has the single "Default". */
export function configurations(doc: Document): Configuration[] {
  if (doc.configurations && doc.configurations.length) return doc.configurations;
  return [{ id: DEFAULT_CONFIGURATION_ID, name: 'Default', dims: {}, suppressed: [] }];
}

export function activeConfiguration(doc: Document): Configuration {
  const list = configurations(doc);
  return list.find((c) => c.id === doc.activeConfiguration) ?? list[0];
}

export function configurationByName(doc: Document, name: string | undefined): Configuration | undefined {
  if (!name) return undefined;
  return configurations(doc).find((c) => c.name === name);
}

/** The configuration with the current dimension values and suppressed features of the document. */
export function captureConfiguration(doc: Document, cfg: Configuration): Configuration {
  const dims: Record<string, number> = {};
  for (const d of dimensionTable(doc)) dims[d.name] = d.value;
  return { ...cfg, dims, suppressed: doc.features.filter((f) => f.suppressed).map((f) => f.id), known: doc.features.map((f) => f.id) };
}

/** The document with the dimension values and suppression states of a configuration applied. */
export function applyConfiguration(doc: Document, cfg: Configuration): Document {
  let d = setDimensionValues(doc, cfg.dims);
  // Suppress new features and mates: features this configuration has not seen yet stay suppressed in it
  const known = cfg.known ? new Set(cfg.known) : null;
  const sup = new Set([...cfg.suppressed, ...(known && cfg.suppressNew !== false ? doc.features.filter((f) => !known.has(f.id)).map((f) => f.id) : [])]);
  let changed = false;
  const features: Feature[] = d.features.map((f) => {
    const s = sup.has(f.id);
    if (!!f.suppressed === s) return f;
    changed = true;
    return { ...f, suppressed: s } as Feature;
  });
  if (changed) d = { ...d, features };
  // configuration specific material, else the material of the other configurations
  if (cfg.material) d = { ...d, material: cfg.material };
  else if (doc.materialBase !== undefined) d = { ...d, material: doc.materialBase ?? undefined };
  return { ...d, configurations: configurations(doc), activeConfiguration: cfg.id };
}

/** The list with the active configuration refreshed from the document's current values. */
function withCaptured(doc: Document): Configuration[] {
  const active = activeConfiguration(doc);
  return configurations(doc).map((c) => (c.id === active.id ? captureConfiguration(doc, c) : c));
}

/** Show a configuration: capture the active one, then apply the target's values. */
export function activateConfiguration(doc: Document, id: Id): Document {
  const list = withCaptured(doc);
  const target = list.find((c) => c.id === id);
  if (!target) return doc;
  if (target.id === activeConfiguration(doc).id) return { ...doc, configurations: list, activeConfiguration: target.id };
  return applyConfiguration({ ...doc, configurations: list }, target);
}

/** Add Configuration: a copy of the active configuration's values, made active. */
export function addConfiguration(doc: Document, name: string, extra: Partial<Pick<Configuration, 'description' | 'comment' | 'parentId' | 'descriptionInBom' | 'bomName' | 'bomUserName' | 'hideChildrenInBom' | 'suppressNew' | 'color'>> = {}): Document {
  const list = withCaptured(doc);
  const active = list.find((c) => c.id === activeConfiguration(doc).id) ?? list[0];
  // a derived configuration starts from its parent's values
  const base = (extra.parentId ? list.find((c) => c.id === extra.parentId) : undefined) ?? active;
  const unique = uniqueName(list, name.trim() || 'Configuration');
  const cfg: Configuration = { id: cfgId(), name: unique, ...extra, dims: { ...base.dims }, suppressed: [...base.suppressed] };
  const d = { ...doc, configurations: [...list, cfg], activeConfiguration: cfg.id };
  return base === active ? d : applyConfiguration(d, cfg);
}

function uniqueName(list: Configuration[], name: string): string {
  if (!list.some((c) => c.name === name)) return name;
  let n = 2;
  while (list.some((c) => c.name === name + n)) n++;
  return name + n;
}

/** Delete a configuration (never the last one; deleting the active one shows the first other). */
export function deleteConfiguration(doc: Document, id: Id): Document {
  const list = withCaptured(doc);
  if (list.length <= 1 || !list.some((c) => c.id === id)) return doc;
  const rest = list.filter((c) => c.id !== id);
  if (activeConfiguration(doc).id === id) return applyConfiguration({ ...doc, configurations: rest }, rest[0]);
  return { ...doc, configurations: rest };
}

export function updateConfiguration(doc: Document, id: Id, patch: Partial<Pick<Configuration, 'name' | 'description' | 'comment' | 'descriptionInBom' | 'bomName' | 'bomUserName' | 'hideChildrenInBom' | 'suppressNew' | 'color'>>): Document {
  const list = configurations(doc);
  const name = patch.name !== undefined ? uniqueName(list.filter((c) => c.id !== id), patch.name.trim() || 'Configuration') : undefined;
  return { ...doc, configurations: list.map((c) => (c.id === id ? { ...c, ...patch, ...(name !== undefined ? { name } : {}) } : c)) };
}

/** Value of a dimension in a configuration (the active configuration reads the document). */
export function configurationDimension(doc: Document, cfg: Configuration, name: string, current: number): number {
  if (cfg.id === activeConfiguration(doc).id) return current;
  return cfg.dims[name] ?? current;
}

export function isSuppressedIn(doc: Document, cfg: Configuration, f: Feature): boolean {
  if (cfg.id === activeConfiguration(doc).id) return !!f.suppressed;
  return cfg.suppressed.includes(f.id);
}

/** Modify Configurations: set one dimension in one configuration (the active one changes the document). */
export function setConfigurationDimension(doc: Document, cfgId: Id, name: string, value: number): Document {
  const list = withCaptured(doc).map((c) => (c.id === cfgId ? { ...c, dims: { ...c.dims, [name]: value } } : c));
  const d: Document = { ...doc, configurations: list, activeConfiguration: activeConfiguration(doc).id };
  return cfgId === d.activeConfiguration ? setDimensionValues(d, { [name]: value }) : d;
}

/** Modify Configurations: suppress / unsuppress a feature in one configuration. */
export function setConfigurationSuppressed(doc: Document, cfgId: Id, featureId: Id, suppressed: boolean): Document {
  const list = withCaptured(doc).map((c) => {
    if (c.id !== cfgId) return c;
    const rest = c.suppressed.filter((x) => x !== featureId);
    return { ...c, suppressed: suppressed ? [...rest, featureId] : rest };
  });
  const d: Document = { ...doc, configurations: list, activeConfiguration: activeConfiguration(doc).id };
  if (cfgId !== d.activeConfiguration) return d;
  return { ...d, features: d.features.map((f) => (f.id === featureId && !!f.suppressed !== suppressed ? ({ ...f, suppressed } as Feature) : f)) };
}

const configuredCache = new WeakMap<Document, Map<string, Document>>();

/**
 * A part document as a named configuration (assembly components): the active configuration is
 * the document itself; others are applied once per (document, name) and cached so the assembly
 * rebuild cache keeps working on document identity.
 */
export function documentForConfiguration(part: Document, name: string | undefined): Document {
  const cfg = configurationByName(part, name);
  if (!cfg || cfg.id === activeConfiguration(part).id) return part;
  let m = configuredCache.get(part);
  if (!m) configuredCache.set(part, (m = new Map()));
  let d = m.get(cfg.id);
  if (!d) m.set(cfg.id, (d = activateConfiguration(part, cfg.id)));
  return d;
}
