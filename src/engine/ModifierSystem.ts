import type { ModifierDef } from './types';

interface RegisteredModifier extends ModifierDef {
  pluginId: string;
}

export class ModifierSystem {
  private modifiers: RegisteredModifier[] = [];

  add(pluginId: string, modifier: ModifierDef): void {
    this.modifiers.push({ ...modifier, pluginId });
  }

  remove(pluginId: string): void {
    this.modifiers = this.modifiers.filter(m => m.pluginId !== pluginId);
  }

  compute(type: ModifierDef['type'], baseValue = 1): number {
    const relevant = this.modifiers.filter(m => m.type === type);

    let flatBonus = 0;
    let multiplier = 1;

    for (const mod of relevant) {
      if (mod.isMultiplier) {
        multiplier *= mod.value;
      } else {
        flatBonus += mod.value;
      }
    }

    return (baseValue + flatBonus) * multiplier;
  }
}
