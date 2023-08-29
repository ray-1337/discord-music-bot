// for commandCache
interface CommandSmallDetails {
  path: string;
  raw: string;
}

// command handler section
interface CommandInfo {
  name?: string;
  description?: string;
}

interface CommandInterface {
  config: CommandConfig;
  info: CommandInfo;
  run: (client: import("oceanic.js").Client, interaction: import("oceanic.js").CommandInteraction, ...args) => Promise<void>;
  args?: import("oceanic.js").ApplicationCommandOptionsWithValue[];
}

interface CommandConfig {
  permissions?: (keyof typeof import("oceanic.js")["Constants"]["Permissions"])[];
}